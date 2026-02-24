import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { requireAuth, requireAdmin } from '@/lib/auth';

const CONFIG_PATH = path.join(process.cwd(), 'backend', 'config.yaml');

interface RssFeedItem {
  url: string;
  enabled: boolean;
}

interface ConfigData {
  run_profile?: string;
  workspace?: string;
  filters?: {
    keywords?: string[];
    cve_regex?: string;
  };
  sources?: {
    rss?: (string | RssFeedItem)[];
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      // Require authentication to view RSS feeds
      requireAuth(req);

      // Read config.yaml
      const fileContents = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = yaml.load(fileContents) as ConfigData;

      const rawFeeds = config?.sources?.rss || [];
      
      // Normalize feeds to include enabled status
      const feeds = rawFeeds.map(feed => {
        if (typeof feed === 'string') {
          return { url: feed, enabled: true };
        }
        return feed;
      });

      return res.status(200).json({ 
        success: true,
        feeds 
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
        error: 'Failed to read RSS feeds',
        feeds: [] 
      });
    }
  } 
  
  else if (req.method === 'POST') {
    try {
      // Require admin role to add RSS feeds
      requireAdmin(req);

      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ 
          success: false,
          error: 'URL is required' 
        });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid URL format' 
        });
      }

      // Read current config
      const fileContents = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = yaml.load(fileContents) as ConfigData;

      // Initialize structure if needed
      if (!config.sources) {
        config.sources = {};
      }
      if (!config.sources.rss) {
        config.sources.rss = [];
      }

      // Check for duplicates
      if (config.sources.rss.includes(url)) {
        return res.status(400).json({ 
          success: false,
          error: 'RSS feed already exists' 
        });
      }

      // Add new feed with enabled status
      config.sources.rss.push({ url, enabled: true });

      // Write back to file
      const yamlStr = yaml.dump(config, {
        lineWidth: -1, // Prevent line wrapping
        quotingType: '"',
        forceQuotes: false
      });
      
      fs.writeFileSync(CONFIG_PATH, yamlStr, 'utf8');

      return res.status(200).json({ 
        success: true,
        message: 'RSS feed added successfully',
        feeds: config.sources.rss
      });
    } catch (error: any) {
      if (error.message === 'Authentication required' || error.message === 'Admin access required') {
        return res.status(error.message === 'Authentication required' ? 401 : 403).json({ 
          success: false,
          error: error.message 
        });
      }
      console.error('Error adding RSS feed:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to add RSS feed' 
      });
    }
  } 
  
  else if (req.method === 'DELETE') {
    try {
      // Require admin role to delete RSS feeds
      requireAdmin(req);

      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ 
          success: false,
          error: 'URL is required' 
        });
      }

      // Read current config
      const fileContents = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = yaml.load(fileContents) as ConfigData;

      if (!config.sources?.rss) {
        return res.status(404).json({ 
          success: false,
          error: 'No RSS feeds found' 
        });
      }

      // Find and remove the feed
      const originalLength = config.sources.rss.length;
      config.sources.rss = config.sources.rss.filter(feed => {
        const feedUrl = typeof feed === 'string' ? feed : feed.url;
        return feedUrl !== url;
      });

      if (config.sources.rss.length === originalLength) {
        return res.status(404).json({ 
          success: false,
          error: 'RSS feed not found' 
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
        message: 'RSS feed removed successfully',
        feeds: config.sources.rss
      });
    } catch (error: any) {
      if (error.message === 'Authentication required' || error.message === 'Admin access required') {
        return res.status(error.message === 'Authentication required' ? 401 : 403).json({ 
          success: false,
          error: error.message 
        });
      }
      console.error('Error removing RSS feed:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to remove RSS feed' 
      });
    }
  } 
  
  else if (req.method === 'PATCH') {
    try {
      // Require admin role to modify RSS feeds
      requireAdmin(req);

      const { url, enabled } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ 
          success: false,
          error: 'URL is required' 
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

      if (!config.sources?.rss) {
        return res.status(404).json({ 
          success: false,
          error: 'No RSS feeds found' 
        });
      }

      // Find and update the feed
      let found = false;
      config.sources.rss = config.sources.rss.map(feed => {
        const feedUrl = typeof feed === 'string' ? feed : feed.url;
        if (feedUrl === url) {
          found = true;
          return { url, enabled };
        }
        return typeof feed === 'string' ? { url: feed, enabled: true } : feed;
      });

      if (!found) {
        return res.status(404).json({ 
          success: false,
          error: 'RSS feed not found' 
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
        message: `RSS feed ${enabled ? 'enabled' : 'disabled'} successfully`,
        feeds: config.sources.rss
      });
    } catch (error: any) {
      if (error.message === 'Authentication required' || error.message === 'Admin access required') {
        return res.status(error.message === 'Authentication required' ? 401 : 403).json({ 
          success: false,
          error: error.message 
        });
      }
      console.error('Error toggling RSS feed:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to toggle RSS feed' 
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
