import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { requireAdmin } from '@/lib/auth'

const BACKEND_PATH = path.resolve(process.cwd(), 'backend')
const WORKSPACE_PATH = path.resolve(process.cwd(), 'backend', 'workspace')
// The backend uses seen_ids.json, not seen_items.json
const CACHE_FILE = path.join(WORKSPACE_PATH, 'seen_ids.json')
const LEGACY_CACHE_FILE = path.join(WORKSPACE_PATH, 'seen_items.json')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    requireAdmin(req)
  } catch (e: any) {
    return res.status(403).json({ error: 'Admin required' })
  }

  try {
    let totalCleared = 0
    const clearedFiles: string[] = []

    // Clear the main cache file (seen_ids.json)
    if (fs.existsSync(CACHE_FILE)) {
      const cacheContent = fs.readFileSync(CACHE_FILE, 'utf8')
      const cacheData = JSON.parse(cacheContent)
      const itemCount = Array.isArray(cacheData) ? cacheData.length : 0
      
      // Clear by writing an empty array
      fs.writeFileSync(CACHE_FILE, '[]', 'utf8')
      
      totalCleared += itemCount
      clearedFiles.push(`seen_ids.json (${itemCount} items)`)
      console.log(`[clear-advisory-cache] Cleared ${itemCount} items from seen_ids.json`)
    }

    // Also clear legacy cache file if it exists
    if (fs.existsSync(LEGACY_CACHE_FILE)) {
      const legacyContent = fs.readFileSync(LEGACY_CACHE_FILE, 'utf8')
      const legacyData = JSON.parse(legacyContent)
      const legacyCount = Array.isArray(legacyData) ? legacyData.length : 0
      
      fs.writeFileSync(LEGACY_CACHE_FILE, '[]', 'utf8')
      
      totalCleared += legacyCount
      clearedFiles.push(`seen_items.json (${legacyCount} items)`)
      console.log(`[clear-advisory-cache] Cleared ${legacyCount} items from seen_items.json`)
    }

    if (totalCleared === 0) {
      return res.status(200).json({ 
        message: 'Cache files are already empty',
        cacheFiles: [CACHE_FILE, LEGACY_CACHE_FILE]
      })
    }

    return res.status(200).json({ 
      message: 'Advisory cache cleared successfully',
      clearedItems: totalCleared,
      clearedFiles: clearedFiles,
      note: 'The system will now process RSS items again, including previously seen ones'
    })

  } catch (error: any) {
    console.error('[clear-advisory-cache] Error:', error)
    return res.status(500).json({ 
      error: 'Failed to clear cache',
      details: error.message 
    })
  }
}
