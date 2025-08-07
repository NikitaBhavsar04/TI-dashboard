import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Advisory from '@/models/Advisory';
import { requireAuth, requireAdmin } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        // Public access for viewing advisories (but you can require auth if needed)
        const { search, category, severity } = req.query;
        
        let query: any = {};
        
        if (search) {
          query.$text = { $search: search as string };
        }
        
        if (category) {
          query.category = category;
        }
        
        if (severity) {
          query.severity = severity;
        }
        
        const advisories = await Advisory.find(query).sort({ publishedDate: -1 });
        res.status(200).json(advisories);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch advisories' });
      }
      break;

    case 'POST':
      try {
        // Only admin can create advisories
        const currentUser = requireAdmin(req);
        
        console.log('=== ADVISORY CREATION DEBUG ===');
        console.log('Raw payload received:', JSON.stringify(req.body, null, 2));
        
        // Check specific fields
        console.log('Checking specific fields:');
        console.log('- mitreTactics:', req.body.mitreTactics);
        console.log('- affectedProduct:', req.body.affectedProduct);
        console.log('- targetSectors:', req.body.targetSectors);
        console.log('- regions:', req.body.regions);
        console.log('- tlp:', req.body.tlp);
        console.log('- recommendations:', req.body.recommendations);
        console.log('- patchDetails:', req.body.patchDetails);
        
        // Add the current user as author if not specified
        if (!req.body.author) {
          req.body.author = currentUser.username;
        }
        
        // Transform affectedProduct (singular string) to affectedProducts (array)
        if (req.body.affectedProduct && typeof req.body.affectedProduct === 'string') {
          // Split by comma if multiple products are listed, or create array with single item
          req.body.affectedProducts = req.body.affectedProduct.split(',').map((product: string) => product.trim()).filter((product: string) => product.length > 0);
          console.log('Transformed affectedProduct to affectedProducts:', req.body.affectedProducts);
        }
        
        const advisory = new Advisory(req.body);
        console.log('Advisory object before save:', JSON.stringify(advisory.toObject(), null, 2));
        
        const savedAdvisory = await advisory.save();
        console.log('Advisory object after save:', JSON.stringify(savedAdvisory.toObject(), null, 2));
        
        // Double-check by fetching from DB
        const fetchedAdvisory = await Advisory.findById(savedAdvisory._id);
        console.log('Advisory fetched from DB:', JSON.stringify(fetchedAdvisory?.toObject(), null, 2));
        
        res.status(201).json(savedAdvisory);
      } catch (error: any) {
        if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
          return res.status(401).json({ error: error.message });
        }
        console.error('Error creating advisory:', error);
        res.status(400).json({ error: 'Failed to create advisory', details: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
