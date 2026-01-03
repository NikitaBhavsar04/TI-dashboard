import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { path: filePath } = req.query
    
    if (!filePath || !Array.isArray(filePath)) {
      return res.status(400).json({ error: 'Invalid path' })
    }

    // Construct the full path to the workspace file
    const workspacePath = path.resolve(process.cwd(), 'backend', 'workspace', ...filePath)
    
    // Security check: ensure the path is within workspace directory
    const workspaceRoot = path.resolve(process.cwd(), 'backend', 'workspace')
    if (!workspacePath.startsWith(workspaceRoot)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Check if file exists
    if (!fs.existsSync(workspacePath)) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Read and serve the file
    const fileContent = fs.readFileSync(workspacePath, 'utf8')
    
    // Set content type based on file extension
    const ext = path.extname(workspacePath).toLowerCase()
    const contentType = ext === '.html' ? 'text/html' : 
                       ext === '.json' ? 'application/json' : 
                       'text/plain'
    
    res.setHeader('Content-Type', contentType)
    res.status(200).send(fileContent)
  } catch (error: any) {
    console.error('Error serving workspace file:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
