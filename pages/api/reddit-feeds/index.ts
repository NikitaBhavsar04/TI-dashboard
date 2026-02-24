import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { requireAuth, requireAdmin } from '@/lib/auth';

const CONFIG_PATH = path.join(process.cwd(), 'backend', 'config.yaml');

interface RedditSubreddit {
  subreddit: string;
  enabled: boolean;
}

interface ConfigData {
  run_profile?: string;
  workspace?: string;
  filters?: {
    keywords?: string[];
    cve_regex?: string;
  };
  reddit?: {
    enabled?: boolean;
    subreddits?: (string | RedditSubreddit)[];
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      // Require authentication to view Reddit subreddits
      requireAuth(req);

      // Read config.yaml
      const fileContents = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = yaml.load(fileContents) as ConfigData;

      const rawSubreddits = config?.reddit?.subreddits || [];
      
      // Normalize subreddits to include enabled status
      const subreddits = rawSubreddits.map(subreddit => {
        if (typeof subreddit === 'string') {
          return { subreddit, enabled: true };
        }
        return subreddit;
      });

      return res.status(200).json({ 
        success: true,
        subreddits 
      });
    } catch (error: any) {
      if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
        return res.status(401).json({ 
          success: false,
          error: error.message 
        });
      }
      console.error('Error reading config.yaml:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to read Reddit subreddits',
        subreddits: [] 
      });
    }
  } 
  
  else if (req.method === 'POST') {
    try {
      // Require admin role to add subreddits
      requireAdmin(req);

      const { subreddit } = req.body;

      if (!subreddit || typeof subreddit !== 'string') {
        return res.status(400).json({ 
          success: false,
          error: 'Subreddit name is required' 
        });
      }

      // Validate subreddit name format (alphanumeric and underscores)
      if (!/^[a-zA-Z0-9_]+$/.test(subreddit)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid subreddit name format' 
        });
      }

      // Read current config
      const fileContents = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = yaml.load(fileContents) as ConfigData;

      // Initialize structure if needed
      if (!config.reddit) {
        config.reddit = { enabled: true, subreddits: [] };
      }
      if (!config.reddit.subreddits) {
        config.reddit.subreddits = [];
      }

      // Check for duplicates (case-insensitive)
      const existingSubreddits = config.reddit.subreddits.map(sub => 
        typeof sub === 'string' ? sub.toLowerCase() : sub.subreddit.toLowerCase()
      );
      
      if (existingSubreddits.includes(subreddit.toLowerCase())) {
        return res.status(400).json({ 
          success: false,
          error: 'Subreddit already exists' 
        });
      }

      // Add new subreddit with enabled status
      config.reddit.subreddits.push({ subreddit, enabled: true });

      // Write back to file
      const yamlStr = yaml.dump(config, {
        lineWidth: -1, // Prevent line wrapping
        quotingType: '"',
        forceQuotes: false
      });
      
      fs.writeFileSync(CONFIG_PATH, yamlStr, 'utf8');

      return res.status(200).json({ 
        success: true,
        message: 'Subreddit added successfully',
        subreddits: config.reddit.subreddits
      });
    } catch (error: any) {
      if (error.message === 'Authentication required' || error.message === 'Admin access required') {
        return res.status(error.message === 'Authentication required' ? 401 : 403).json({ 
          success: false,
          error: error.message 
        });
      }
      console.error('Error adding subreddit:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to add subreddit' 
      });
    }
  } 
  
  else if (req.method === 'DELETE') {
    try {
      // Require admin role to delete subreddits
      requireAdmin(req);

      const { subreddit } = req.body;

      if (!subreddit || typeof subreddit !== 'string') {
        return res.status(400).json({ 
          success: false,
          error: 'Subreddit name is required' 
        });
      }

      // Read current config
      const fileContents = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = yaml.load(fileContents) as ConfigData;

      if (!config.reddit?.subreddits) {
        return res.status(404).json({ 
          success: false,
          error: 'No subreddits found' 
        });
      }

      // Find and remove the subreddit (case-insensitive)
      const originalLength = config.reddit.subreddits.length;
      config.reddit.subreddits = config.reddit.subreddits.filter(sub => {
        const subredditName = typeof sub === 'string' ? sub : sub.subreddit;
        return subredditName.toLowerCase() !== subreddit.toLowerCase();
      });

      if (config.reddit.subreddits.length === originalLength) {
        return res.status(404).json({ 
          success: false,
          error: 'Subreddit not found' 
        });
      }

      // Write back to file
      const yamlStr = yaml.dump(config, {
        lineWidth: -1,
        quotingType: '"',
        forceQuotes: false
      });
      
      fs.writeFileSync(CONFIG_PATH, yamlStr, 'utf8');

      return res.status(200).json({ 
        success: true,
        message: 'Subreddit removed successfully',
        subreddits: config.reddit.subreddits
      });
    } catch (error: any) {
      if (error.message === 'Authentication required' || error.message === 'Admin access required') {
        return res.status(error.message === 'Authentication required' ? 401 : 403).json({ 
          success: false,
          error: error.message 
        });
      }
      console.error('Error removing subreddit:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to remove subreddit' 
      });
    }
  } 
  
  else if (req.method === 'PATCH') {
    try {
      // Require admin role to modify subreddits
      requireAdmin(req);

      const { subreddit, enabled } = req.body;

      if (!subreddit || typeof subreddit !== 'string') {
        return res.status(400).json({ 
          success: false,
          error: 'Subreddit name is required' 
        });
      }

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ 
          success: false,
          error: 'Enabled status is required' 
        });
      }

      // Read current config
      const fileContents = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = yaml.load(fileContents) as ConfigData;

      if (!config.reddit?.subreddits) {
        return res.status(404).json({ 
          success: false,
          error: 'No subreddits found' 
        });
      }

      // Find and update the subreddit (case-insensitive)
      let found = false;
      config.reddit.subreddits = config.reddit.subreddits.map(sub => {
        const subredditName = typeof sub === 'string' ? sub : sub.subreddit;
        if (subredditName.toLowerCase() === subreddit.toLowerCase()) {
          found = true;
          return { subreddit: subredditName, enabled };
        }
        return typeof sub === 'string' ? { subreddit: sub, enabled: true } : sub;
      });

      if (!found) {
        return res.status(404).json({ 
          success: false,
          error: 'Subreddit not found' 
        });
      }

      // Write back to file
      const yamlStr = yaml.dump(config, {
        lineWidth: -1,
        quotingType: '"',
        forceQuotes: false
      });
      
      fs.writeFileSync(CONFIG_PATH, yamlStr, 'utf8');

      return res.status(200).json({ 
        success: true,
        message: `Subreddit ${enabled ? 'enabled' : 'disabled'} successfully`,
        subreddits: config.reddit.subreddits
      });
    } catch (error: any) {
      if (error.message === 'Authentication required' || error.message === 'Admin access required') {
        return res.status(error.message === 'Authentication required' ? 401 : 403).json({ 
          success: false,
          error: error.message 
        });
      }
      console.error('Error toggling subreddit:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to toggle subreddit' 
      });
    }
  }
  
  else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'PATCH']);
    return res.status(405).json({ 
      success: false,
      error: `Method ${req.method} Not Allowed` 
    });
  }
}
