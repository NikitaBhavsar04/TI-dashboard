import type { NextApiRequest, NextApiResponse } from 'next'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import dbConnect from '@/lib/db'
import Advisory from '@/models/Advisory'
import { requireAdmin } from '@/lib/auth'

// Use local backend folder within Threat-Advisory
const BACKEND_PATH = path.resolve(process.cwd(), 'backend')
const SCRIPT_PATH = path.join(BACKEND_PATH, 'generate_advisories.py')

function findAutomationPath() {
  if (fs.existsSync(SCRIPT_PATH)) {
    return SCRIPT_PATH
  }
  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    requireAdmin(req)
  } catch (e: any) {
    return res.status(403).json({ error: 'Admin required' })
  }

  const script = findAutomationPath()
  if (!script) return res.status(500).json({ error: 'Backend script not found at: ' + SCRIPT_PATH })

  const python = process.env.PYTHON_PATH || 'python'

  const maxItems = typeof req.body?.maxItems === 'number' ? req.body.maxItems : 3

  // Set working directory to the ThreatAdvisory-Automation folder
  const workingDir = path.dirname(script)

  const child = spawn(python, [script, String(maxItems)], { 
    windowsHide: true,
    cwd: workingDir
  })
  let stdout = ''
  let stderr = ''

  child.stdout.on('data', (data) => { stdout += data.toString() })
  child.stderr.on('data', (data) => { stderr += data.toString() })

  child.on('close', async (code) => {
    console.log('[auto-feed] Process exited with code:', code)
    console.log('[auto-feed] stdout length:', stdout.length)
    if (stderr) console.error('[auto-feed] stderr:', stderr)

    try {
      // Extract JSON from stdout (may have log messages before it)
      const jsonMatch = stdout.match(/\{.*"generated".*\}/s)
      const jsonStr = jsonMatch ? jsonMatch[0] : stdout
      
      console.log('[auto-feed] Extracted JSON:', jsonStr.substring(0, 200))
      
      const parsed = JSON.parse(jsonStr || '{}')
      if (parsed.error) return res.status(500).json(parsed)

      const generated = parsed.generated || []
      console.log('[auto-feed] Generated count:', generated.length)

      // Connect to DB
      await dbConnect()
      console.log('[auto-feed] Connected to DB')

      const inserted: any[] = []
      for (const g of generated) {
        try {
          console.log('[auto-feed] Processing:', g.advisory_id)

          // Try to read the JSON file first (if it exists alongside HTML)
          let jsonData: any = null
          if (g.html_path) {
            const jsonPath = g.html_path.replace('.html', '.json')
            if (fs.existsSync(jsonPath)) {
              try {
                const jsonContent = fs.readFileSync(jsonPath, 'utf8')
                jsonData = JSON.parse(jsonContent)
                console.log('[auto-feed] Loaded JSON data for', g.advisory_id)
              } catch (e) {
                console.log('[auto-feed] No JSON file found, using generated data')
              }
            }
          }

          const htmlContent = g.html_path && fs.existsSync(g.html_path)
            ? fs.readFileSync(g.html_path, 'utf8')
            : ''

          const severityMap: any = {
            'CRITICAL': 'Critical',
            'HIGH': 'High',
            'MEDIUM': 'Medium',
            'LOW': 'Low'
          }

          // Extract data from JSON if available, otherwise use Python output (g)
          const data = jsonData || g
          
          console.log('[auto-feed] Data source:', jsonData ? 'JSON file' : 'Python output')
          console.log('[auto-feed] Available fields in data:', Object.keys(data))
          
          // Use data from Python output with proper field mapping
          const title = data.title || g.title || 'Auto Advisory'
          const execSummary = data.exec_summary || data.executiveSummary || title
          const description = execSummary
          const htmlFileName = g.html_path ? path.basename(g.html_path) : null
          
          // Parse CVEs
          const cveIds = data.cves || data.cveIds || []
          
          // Parse affected products
          let affectedProducts = data.affected_product 
            ? (Array.isArray(data.affected_product) ? data.affected_product : [data.affected_product])
            : data.affectedProducts || []
          
          // Parse MITRE tactics
          const mitreTactics = (data.mitre || []).map((m: any) => ({
            tacticName: m.tactic || m.tacticName || '',
            techniqueId: m.techniqueId || m.technique_id || m.id || '',
            technique: m.technique || ''
          }))
          
          const advisoryData = {
            // Core fields
            title: title,
            description: description,
            executiveSummary: execSummary,
            severity: severityMap[(data.criticality || g.criticality || '').toUpperCase()] || 'Medium',
            category: data.threat_type || data.category || 'General',
            iocs: [],
            publishedDate: new Date(data.published || Date.now()),
            author: 'AutoFeed',
            tags: [],
            content: htmlContent,
            references: data.references || [],
            cveIds: cveIds,
            
            // Fields from HTML template (exact mapping)
            advisoryId: g.advisory_id || data.advisory_id,
            affectedProducts: affectedProducts,
            affectedProduct: data.affected_product || (affectedProducts.length > 0 ? affectedProducts[0] : ''),
            targetSectors: data.sectors || data.targetSectors || [],
            regions: data.regions || [],
            tlp: data.tlp || 'AMBER',
            recommendations: data.recommendations || [],
            patchDetails: Array.isArray(data.patch_details) ? data.patch_details : (data.patch_details ? [data.patch_details] : []),
            mitreTactics: mitreTactics,
            htmlFileName: htmlFileName,
            threatType: data.threat_type || data.threatCategory || '',
            criticality: data.criticality || g.criticality || 'MEDIUM',
            vendor: data.vendor || '',
            fullTitle: data.full_title || title
          }
          
          console.log('[auto-feed] Advisory data being saved:', {
            advisoryId: advisoryData.advisoryId,
            title: advisoryData.title,
            threatType: advisoryData.threatType,
            criticality: advisoryData.criticality,
            tlp: advisoryData.tlp,
            affectedProduct: advisoryData.affectedProduct,
            affectedProducts: advisoryData.affectedProducts,
            sectors: advisoryData.targetSectors,
            regions: advisoryData.regions,
            cveCount: advisoryData.cveIds.length,
            mitreCount: advisoryData.mitreTactics.length
          })
          
          const doc = new Advisory(advisoryData)

          const saved = await doc.save()
          console.log('[auto-feed] Saved to DB:', saved._id)
          
          // Create viewable URL for the HTML file
          const viewUrl = htmlFileName ? `/api/workspace/${htmlFileName}` : null
          
          inserted.push({ 
            advisoryId: g.advisory_id, 
            dbId: saved._id,
            viewUrl,
            databaseUrl: `/advisory/${saved._id}`
          })
        } catch (e) {
          console.error('[auto-feed] save error', e)
        }
      }

      console.log('[auto-feed] Total inserted:', inserted.length)
      return res.status(200).json({ ok: true, inserted, generated })
    } catch (err) {
      console.error('[auto-feed] parse error', err)
      return res.status(500).json({ error: 'Failed to parse automation output', details: stderr || err?.toString() })
    }
  })
}
