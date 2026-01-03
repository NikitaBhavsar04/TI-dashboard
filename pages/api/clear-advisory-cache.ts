import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { requireAdmin } from '@/lib/auth'

const BACKEND_PATH = path.resolve(process.cwd(), 'backend')
const WORKSPACE_PATH = path.join(BACKEND_PATH, 'workspace')
const CACHE_FILE = path.join(WORKSPACE_PATH, 'seen_items.json')

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
    // Check if cache file exists
    if (!fs.existsSync(CACHE_FILE)) {
      return res.status(200).json({ 
        message: 'Cache file does not exist - already clear',
        cacheFile: CACHE_FILE
      })
    }

    // Read current cache to show user what's being cleared
    const cacheContent = fs.readFileSync(CACHE_FILE, 'utf8')
    const cacheData = JSON.parse(cacheContent)
    const itemCount = Array.isArray(cacheData) ? cacheData.length : 0

    // Clear the cache by writing an empty array
    fs.writeFileSync(CACHE_FILE, '[]', 'utf8')

    console.log(`[clear-advisory-cache] Cleared ${itemCount} cached items`)

    return res.status(200).json({ 
      message: 'Advisory cache cleared successfully',
      clearedItems: itemCount,
      cacheFile: CACHE_FILE,
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
