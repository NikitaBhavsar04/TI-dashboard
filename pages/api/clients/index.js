// pages/api/clients/index.js
import dbConnect from '../../../lib/db';
import Client from '../../../models/Client';
import { requireAuth } from '../../../lib/auth';
import { logActivity } from '../../../lib/auditLogger';

export default async function handler(req, res) {
  try {
    await dbConnect();

    // Verify authentication - require admin or above
    const currentUser = requireAuth(req);
    if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    switch (req.method) {
      case 'GET':
        await handleGet(req, res, currentUser);
        break;
      case 'POST':
        await handlePost(req, res, currentUser);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST']);
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

async function handleGet(req, res, currentUser) {
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
      .select('client_id client_name name emails cc_emails bcc_emails fw_index description isActive createdAt');

    // Filter email addresses for admin role
    const filteredClients = clients.map(client => {
      const clientObj = client.toObject();
      
      // Only super_admin can see email addresses
      if (currentUser.role !== 'super_admin') {
        const count = (client.emails?.length || 0) + (client.cc_emails?.length || 0) + (client.bcc_emails?.length || 0);
        
        delete clientObj.emails;
        delete clientObj.cc_emails;
        delete clientObj.bcc_emails;
        
        clientObj.emailCount = count; // Provide count instead
      }
      
      return clientObj;
    });

    // Log the activity
    await logActivity(currentUser, {
      action: 'client_viewed',
      resource: 'client_list',
      details: `Viewed ${clients.length} clients, emails visible: ${currentUser.role === 'super_admin'}`
    }, req);

    res.status(200).json(filteredClients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ message: 'Failed to fetch clients' });
  }
}

async function handlePost(req, res, currentUser) {
  try {
    const { client_id, client_name, name, emails, cc_emails, bcc_emails, fw_index, description } = req.body;

    if (!client_id || !client_name || !name || !emails || !emails.length || !fw_index) {
      return res.status(400).json({ message: 'client_id, client_name, name, fw_index, and at least one email are required' });
    }

    // Validate email function
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validateEmails = (emailList) => {
      if (!emailList || !Array.isArray(emailList)) return [];
      return emailList.filter(email => !emailRegex.test(email));
    };

    const invalidEmails = validateEmails(emails);
    const invalidCcEmails = validateEmails(cc_emails);
    const invalidBccEmails = validateEmails(bcc_emails);

    if (invalidEmails.length > 0 || invalidCcEmails.length > 0 || invalidBccEmails.length > 0) {
      return res.status(400).json({
        message: 'Invalid email addresses',
        invalidEmails: [...invalidEmails, ...invalidCcEmails, ...invalidBccEmails]
      });
    }

    // Check if client_id already exists
    const existingClientId = await Client.findOne({ client_id: client_id.trim() });
    if (existingClientId) {
      return res.status(409).json({ message: 'client_id already exists' });
    }

    // Check if fw_index already exists
    const existingFwIndex = await Client.findOne({ fw_index: fw_index.trim() });
    if (existingFwIndex) {
      return res.status(409).json({ message: 'fw_index already exists' });
    }

    // Check if client name already exists
    const existingClient = await Client.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingClient) {
      return res.status(409).json({ message: 'Client name already exists' });
    }

    const client = new Client({
      client_id: client_id.trim(),
      client_name: client_name.trim(),
      name: name.trim(),
      emails: emails.map(email => email.toLowerCase().trim()),
      cc_emails: cc_emails ? cc_emails.map(email => email.toLowerCase().trim()) : [],
      bcc_emails: bcc_emails ? bcc_emails.map(email => email.toLowerCase().trim()) : [],
      fw_index: fw_index.trim(),
      description: description?.trim(),
      createdBy: currentUser.username
    });

    await client.save();

    // Log the activity
    await logActivity(currentUser, {
      action: 'client_created',
      resource: 'client',
      resourceId: client._id.toString(),
      details: `Created client: ${client.name} with ${client.emails.length} emails`
    }, req);

    // Filter response for admin
    const responseClient = {
      _id: client._id,
      client_id: client.client_id,
      client_name: client.client_name,
      name: client.name,
      fw_index: client.fw_index,
      description: client.description,
      isActive: client.isActive
    };

    // Only super_admin gets email addresses in response
    if (currentUser.role === 'super_admin') {
      responseClient.emails = client.emails;
    } else {
      responseClient.emailCount = client.emails.length;
    }

    res.status(201).json({
      message: 'Client created successfully',
      client: responseClient
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
