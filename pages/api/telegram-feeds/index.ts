import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const CONFIG_PATH = path.join(process.cwd(), 'backend', 'config.yaml');

interface TelegramChannel {
  channel: string;
  enabled: boolean;
}

interface ConfigData {
  run_profile?: string;
  workspace?: string;
  filters?: {
    keywords?: string[];
    cve_regex?: string;
  };
  telegram?: {
    enabled?: boolean;
    channels?: (string | TelegramChannel)[];
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      // Read config.yaml
      const fileContents = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = yaml.load(fileContents) as ConfigData;

      const rawChannels = config?.telegram?.channels || [];
      
      // Normalize channels to include enabled status
      const channels = rawChannels.map(channel => {
        if (typeof channel === 'string') {
          return { channel, enabled: true };
        }
        return channel;
      });

      return res.status(200).json({ 
        success: true,
        channels 
      });
    } catch (error) {
      console.error('Error reading config.yaml:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to read Telegram channels',
        channels: [] 
      });
    }
  } 
  
  else if (req.method === 'POST') {
    try {
      const { channel } = req.body;

      if (!channel || typeof channel !== 'string') {
        return res.status(400).json({ 
          success: false,
          error: 'Channel name is required' 
        });
      }

      // Validate channel name format (alphanumeric and underscores)
      if (!/^[a-zA-Z0-9_]+$/.test(channel)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid channel name format' 
        });
      }

      // Read current config
      const fileContents = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = yaml.load(fileContents) as ConfigData;

      // Initialize structure if needed
      if (!config.telegram) {
        config.telegram = { enabled: true, channels: [] };
      }
      if (!config.telegram.channels) {
        config.telegram.channels = [];
      }

      // Check for duplicates (case-insensitive)
      const existingChannels = config.telegram.channels.map(ch => 
        typeof ch === 'string' ? ch.toLowerCase() : ch.channel.toLowerCase()
      );
      
      if (existingChannels.includes(channel.toLowerCase())) {
        return res.status(400).json({ 
          success: false,
          error: 'Telegram channel already exists' 
        });
      }

      // Add new channel with enabled status
      config.telegram.channels.push({ channel, enabled: true });

      // Write back to file
      const yamlStr = yaml.dump(config, {
        lineWidth: -1, // Prevent line wrapping
        quotingType: '"',
        forceQuotes: false
      });
      
      fs.writeFileSync(CONFIG_PATH, yamlStr, 'utf8');

      return res.status(200).json({ 
        success: true,
        message: 'Telegram channel added successfully',
        channels: config.telegram.channels
      });
    } catch (error) {
      console.error('Error adding Telegram channel:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to add Telegram channel' 
      });
    }
  } 
  
  else if (req.method === 'DELETE') {
    try {
      const { channel } = req.body;

      if (!channel || typeof channel !== 'string') {
        return res.status(400).json({ 
          success: false,
          error: 'Channel name is required' 
        });
      }

      // Read current config
      const fileContents = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = yaml.load(fileContents) as ConfigData;

      if (!config.telegram?.channels) {
        return res.status(404).json({ 
          success: false,
          error: 'No Telegram channels found' 
        });
      }

      // Find and remove the channel (case-insensitive)
      const originalLength = config.telegram.channels.length;
      config.telegram.channels = config.telegram.channels.filter(ch => {
        const channelName = typeof ch === 'string' ? ch : ch.channel;
        return channelName.toLowerCase() !== channel.toLowerCase();
      });

      if (config.telegram.channels.length === originalLength) {
        return res.status(404).json({ 
          success: false,
          error: 'Telegram channel not found' 
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
        message: 'Telegram channel removed successfully',
        channels: config.telegram.channels
      });
    } catch (error) {
      console.error('Error removing Telegram channel:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to remove Telegram channel' 
      });
    }
  } 
  
  else if (req.method === 'PATCH') {
    try {
      const { channel, enabled } = req.body;

      if (!channel || typeof channel !== 'string') {
        return res.status(400).json({ 
          success: false,
          error: 'Channel name is required' 
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

      if (!config.telegram?.channels) {
        return res.status(404).json({ 
          success: false,
          error: 'No Telegram channels found' 
        });
      }

      // Find and update the channel (case-insensitive)
      let found = false;
      config.telegram.channels = config.telegram.channels.map(ch => {
        const channelName = typeof ch === 'string' ? ch : ch.channel;
        if (channelName.toLowerCase() === channel.toLowerCase()) {
          found = true;
          return { channel: channelName, enabled };
        }
        return typeof ch === 'string' ? { channel: ch, enabled: true } : ch;
      });

      if (!found) {
        return res.status(404).json({ 
          success: false,
          error: 'Telegram channel not found' 
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
        message: `Telegram channel ${enabled ? 'enabled' : 'disabled'} successfully`,
        channels: config.telegram.channels
      });
    } catch (error) {
      console.error('Error toggling Telegram channel:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to toggle Telegram channel' 
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
