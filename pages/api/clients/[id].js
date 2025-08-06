// pages/api/clients/[id].js
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

    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        await handleGet(req, res, id);
        break;
      case 'PUT':
        await handlePut(req, res, id);
        break;
      case 'DELETE':
        await handleDelete(req, res, id);
        break;
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleGet(req, res, id) {
  try {
    const client = await Client.findById(id);
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.status(200).json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ message: 'Failed to fetch client' });
  }
}

async function handlePut(req, res, id) {
  try {
    const { name, emails, description, isActive } = req.body;

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

    // Check if client name already exists (excluding current client)
    const existingClient = await Client.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: id }
    });
    
    if (existingClient) {
      return res.status(409).json({ message: 'Client name already exists' });
    }

    const updatedClient = await Client.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        emails: emails.map(email => email.toLowerCase().trim()),
        description: description?.trim(),
        isActive: isActive !== undefined ? isActive : true
      },
      { new: true, runValidators: true }
    );

    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.status(200).json({
      message: 'Client updated successfully',
      client: updatedClient
    });
  } catch (error) {
    console.error('Update client error:', error);
    if (error.code === 11000) {
      res.status(409).json({ message: 'Client with this name already exists' });
    } else {
      res.status(500).json({ message: 'Failed to update client' });
    }
  }
}

async function handleDelete(req, res, id) {
  try {
    const deletedClient = await Client.findByIdAndDelete(id);

    if (!deletedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.status(200).json({
      message: 'Client deleted successfully',
      client: deletedClient
    });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ message: 'Failed to delete client' });
  }
}
