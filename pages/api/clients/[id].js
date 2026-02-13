// pages/api/clients/[id].js
import dbConnect from '../../../lib/db';
import Client from '../../../models/Client';
import { requireAuth } from '../../../lib/auth';
import { logActivity } from '../../../lib/auditLogger';

export default async function handler(req, res) {
  try {
    await dbConnect();

    // Verify authentication
    const currentUser = requireAuth(req);
    if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        await handleGet(req, res, id, currentUser);
        break;
      case 'PUT':
        await handlePut(req, res, id, currentUser);
        break;
      case 'DELETE':
        await handleDelete(req, res, id, currentUser);
        break;
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
      return res.status(401).json({ error: error.message });
    }
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleGet(req, res, id, currentUser) {
  try {
    const client = await Client.findById(id);
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Filter email for admin role
    const clientObj = client.toObject();
    if (currentUser.role !== 'super_admin') {
      delete clientObj.emails;
      clientObj.emailCount = client.emails?.length || 0;
    }

    // Log the activity
    await logActivity(currentUser, {
      action: 'client_viewed',
      resource: 'client',
      resourceId: id,
      details: `Viewed client: ${client.name}, emails visible: ${currentUser.role === 'super_admin'}`
    }, req);

    res.status(200).json(clientObj);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ message: 'Failed to fetch client' });
  }
}

async function handlePut(req, res, id, currentUser) {
  try {
    const { client_id, client_name, name, emails, fw_index, description, isActive } = req.body;

    if (!client_id || !client_name || !name || !emails || !emails.length || !fw_index) {
      return res.status(400).json({ message: 'client_id, client_name, name, fw_index, and at least one email are required' });
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

    // Check if client_id already exists (excluding current client)
    const existingClientId = await Client.findOne({
      client_id: client_id.trim(),
      _id: { $ne: id }
    });

    if (existingClientId) {
      return res.status(409).json({ message: 'client_id already exists' });
    }

    // Check if fw_index already exists (excluding current client)
    const existingFwIndex = await Client.findOne({
      fw_index: fw_index.trim(),
      _id: { $ne: id }
    });

    if (existingFwIndex) {
      return res.status(409).json({ message: 'fw_index already exists' });
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
        client_id: client_id.trim(),
        client_name: client_name.trim(),
        name: name.trim(),
        emails: emails.map(email => email.toLowerCase().trim()),
        fw_index: fw_index.trim(),
        description: description?.trim(),
        isActive: isActive !== undefined ? isActive : true
      },
      { new: true, runValidators: true }
    );

    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Log the activity
    await logActivity(currentUser, {
      action: 'client_updated',
      resource: 'client',
      resourceId: id,
      details: `Updated client: ${updatedClient.name}`
    }, req);

    // Filter response for admin
    const responseClient = updatedClient.toObject();
    if (currentUser.role !== 'super_admin') {
      delete responseClient.emails;
      responseClient.emailCount = updatedClient.emails?.length || 0;
    }

    res.status(200).json({
      message: 'Client updated successfully',
      client: responseClient
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

async function handleDelete(req, res, id, currentUser) {
  try {
    // Only super_admin can delete clients
    if (currentUser.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super administrators can delete clients' });
    }

    const deletedClient = await Client.findByIdAndDelete(id);

    if (!deletedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Log the activity
    await logActivity(currentUser, {
      action: 'client_deleted',
      resource: 'client',
      resourceId: id,
      details: `Deleted client: ${deletedClient.name} with ${deletedClient.emails.length} emails`
    }, req);

    res.status(200).json({
      message: 'Client deleted successfully',
      client: {
        _id: deletedClient._id,
        name: deletedClient.name
      }
    });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ message: 'Failed to delete client' });
  }
}
