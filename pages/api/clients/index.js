// pages/api/clients/index.js
import dbConnect from '../../../lib/db';
import Client from '../../../models/Client';
import { verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  try {
    await dbConnect();

    // Verify admin access
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    switch (req.method) {
      case 'GET':
        await handleGet(req, res);
        break;
      case 'POST':
        await handlePost(req, res, decoded.userId);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleGet(req, res) {
  try {
    const { search, active } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { emails: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    const clients = await Client.find(query)
      .sort({ name: 1 })
      .select('name emails description isActive createdAt');

    res.status(200).json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ message: 'Failed to fetch clients' });
  }
}

async function handlePost(req, res, userId) {
  try {
    const { name, emails, description } = req.body;

    if (!name || !emails || !emails.length) {
      return res.status(400).json({ message: 'Name and at least one email are required' });
    }

    // Validate all emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid email addresses', 
        invalidEmails 
      });
    }

    // Check if client name already exists
    const existingClient = await Client.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingClient) {
      return res.status(409).json({ message: 'Client name already exists' });
    }

    const client = new Client({
      name: name.trim(),
      emails: emails.map(email => email.toLowerCase().trim()),
      description: description?.trim()
    });

    await client.save();

    res.status(201).json({
      message: 'Client created successfully',
      client: {
        _id: client._id,
        name: client.name,
        emails: client.emails,
        description: client.description,
        isActive: client.isActive
      }
    });
  } catch (error) {
    console.error('Create client error:', error);
    if (error.code === 11000) {
      res.status(409).json({ message: 'Client with this name already exists' });
    } else {
      res.status(500).json({ message: 'Failed to create client' });
    }
  }
}
