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

        // Debug: inspect iocs before normalization
        try {
          const rawIocs = (req.body && req.body.iocs) || undefined;
          console.log('DEBUG: rawIocs type:', typeof rawIocs, 'isArray:', Array.isArray(rawIocs));
          if (Array.isArray(rawIocs)) {
            rawIocs.forEach((it: any, idx: number) => {
              console.log(`DEBUG: rawIocs[${idx}] type:`, typeof it, 'value:', it);
            });
          } else {
            console.log('DEBUG: rawIocs value:', rawIocs);
          }
        } catch (dbgErr) {
          console.warn('DEBUG: failed to inspect rawIocs', dbgErr);
        }
        
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

        // Normalize IOCs: accept stringified JSON or array of JSON strings
        const safeParseIocs = (raw: string) => {
          // Try direct JSON parse first
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
            // Attempt to convert JS-style object/array literal (single quotes, unquoted keys)
            try {
              // Add quotes around keys: key: -> "key":
              let s = raw.replace(/([a-zA-Z0-9_\-]+)\s*:/g, '"$1":');
              // Replace single quotes with double quotes
              s = s.replace(/'/g, '"');
              const parsed2 = JSON.parse(s);
              return Array.isArray(parsed2) ? parsed2 : [parsed2];
            } catch (e2) {
              // As a last resort, try to extract simple IP/Hash/URL entries with regex
              const entries: any[] = [];
              const itemMatches = raw.match(/\{[^}]*\}/g);
              if (itemMatches) {
                for (const m of itemMatches) {
                  try {
                    let t = m.replace(/([a-zA-Z0-9_\-]+)\s*:/g, '"$1":').replace(/'/g, '"');
                    const obj = JSON.parse(t);
                    entries.push(obj);
                  } catch (_) {
                    // skip
                  }
                }
              }
              return entries.length > 0 ? entries : null;
            }
          }
        };

        try {
          if (req.body.iocs) {
            if (typeof req.body.iocs === 'string') {
              const parsed = safeParseIocs(req.body.iocs as string);
              if (parsed) req.body.iocs = parsed;
            } else if (Array.isArray(req.body.iocs)) {
              // If items are strings (possibly JSON), parse each
              const normalized: any[] = [];
              for (const item of req.body.iocs) {
                if (typeof item === 'string') {
                  const parsedItem = safeParseIocs(item);
                  if (parsedItem) {
                    // flatten if parsedItem is an array
                    normalized.push(...parsedItem);
                    continue;
                  }
                  // keep original string if parsing failed
                  normalized.push(item);
                } else {
                  normalized.push(item);
                }
              }
              req.body.iocs = normalized;
            }
            console.log('Normalized iocs:', JSON.stringify(req.body.iocs, null, 2));
          }
        } catch (e) {
          console.warn('Failed to normalize iocs:', e);
        }

        // Final defensive normalization: ensure every ioc is a plain object {type,value,description}
        try {
          if (Array.isArray(req.body.iocs)) {
            const final: any[] = [];
            for (const item of req.body.iocs) {
              if (typeof item === 'object' && item !== null) {
                final.push(item);
                continue;
              }

              if (typeof item === 'string') {
                // Trim and attempt to parse
                const trimmed = item.trim();
                let parsed = null;
                try { parsed = JSON.parse(trimmed); } catch (_e) {
                  try {
                    // convert single quotes and unquoted keys
                    let s = trimmed.replace(/([a-zA-Z0-9_\-]+)\s*:/g, '"$1":').replace(/'/g, '"');
                    parsed = JSON.parse(s);
                  } catch (_e2) {
                    // try to extract object literal
                    const m = trimmed.match(/\{[^}]*\}/);
                    if (m) {
                      try {
                        let s2 = m[0].replace(/([a-zA-Z0-9_\-]+)\s*:/g, '"$1":').replace(/'/g, '"');
                        parsed = JSON.parse(s2);
                      } catch (_e3) {
                        parsed = null;
                      }
                    }
                  }
                }

                if (Array.isArray(parsed)) {
                  // if parsing produced an array, take objects from it
                  for (const p of parsed) if (typeof p === 'object' && p !== null) final.push(p);
                } else if (parsed && typeof parsed === 'object') {
                  final.push(parsed);
                } else {
                  // couldn't parse - skip or log
                  console.warn('Unparsed IOC string skipped:', item);
                }
              } else {
                console.warn('Unexpected IOC item type, skipping:', typeof item, item);
              }
            }

            req.body.iocs = final;
            console.log('Final normalized iocs:', JSON.stringify(req.body.iocs, null, 2));
          }
        } catch (e) {
          console.warn('Final IOC normalization failed:', e);
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
