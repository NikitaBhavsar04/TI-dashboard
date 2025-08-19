import { connectToDatabase } from '@/lib/db';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract token from cookies
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Super admin required.' });
    }

    const { format = 'json', dateFrom, dateTo } = req.query;

    const db = await connectToDatabase();
    const trackingCollection = db.collection('emailTracking');

    // Build query with date filters if provided
    let query = {};
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo);
      }
    }

    // Get all tracking data
    const trackingData = await trackingCollection.find(query).toArray();

    if (format === 'csv') {
      // Generate CSV format
      const csvHeaders = [
        'Tracking ID',
        'Email',
        'Advisory ID',
        'Open Count',
        'Click Count',
        'Created At',
        'Last Open At',
        'Last Click At',
        'Total Events'
      ];

      const csvRows = trackingData.map(record => [
        record.trackingId || '',
        record.email || '',
        record.advisoryId || '',
        record.openCount || 0,
        record.clickCount || 0,
        record.createdAt ? new Date(record.createdAt).toISOString() : '',
        record.lastOpenAt ? new Date(record.lastOpenAt).toISOString() : '',
        record.lastClickAt ? new Date(record.lastClickAt).toISOString() : '',
        record.events ? record.events.length : 0
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="email-analytics-${new Date().toISOString().split('T')[0]}.csv"`);
      res.status(200).send(csvContent);

    } else {
      // Return JSON format
      const summary = {
        totalRecords: trackingData.length,
        totalOpens: trackingData.reduce((sum, record) => sum + (record.openCount || 0), 0),
        totalClicks: trackingData.reduce((sum, record) => sum + (record.clickCount || 0), 0),
        uniqueOpens: trackingData.filter(record => (record.openCount || 0) > 0).length,
        uniqueClicks: trackingData.filter(record => (record.clickCount || 0) > 0).length,
        dateRange: {
          from: dateFrom || null,
          to: dateTo || null
        },
        exportedAt: new Date().toISOString()
      };

      res.status(200).json({
        summary,
        data: trackingData
      });
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
}
