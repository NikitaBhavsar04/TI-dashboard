import { NextApiRequest, NextApiResponse } from 'next';
import PDFKit from 'pdfkit';
import dbConnect from '@/lib/db';
import Advisory from '@/models/Advisory';
import { formatDate } from '@/lib/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const advisory = await Advisory.findById(req.query.id);
    
    if (!advisory) {
      return res.status(404).json({ error: 'Advisory not found' });
    }

    // Create PDF
    const doc = new PDFKit({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="advisory-${advisory._id}.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Title
    doc.fontSize(20).text('THREAT ADVISORY', 50, 50);
    doc.fontSize(16).text(advisory.title, 50, 80);
    
    // Metadata
    doc.fontSize(10);
    doc.text(`Published: ${formatDate(advisory.publishedDate)}`, 50, 120);
    doc.text(`Author: ${advisory.author}`, 50, 135);
    doc.text(`Severity: ${advisory.severity}`, 50, 150);
    doc.text(`Category: ${advisory.category}`, 50, 165);
    
    // Summary
    if (advisory.summary) {
      doc.fontSize(14).text('SUMMARY', 50, 200);
      doc.fontSize(10).text(advisory.summary, 50, 220, { width: 500 });
    }
    
    // Description
    doc.fontSize(14).text('DESCRIPTION', 50, 280);
    doc.fontSize(10).text(advisory.description, 50, 300, { width: 500 });
    
    // Content
    doc.fontSize(14).text('DETAILS', 50, 380);
    doc.fontSize(10).text(advisory.content, 50, 400, { width: 500 });
    
    // IOCs
    if (advisory.iocs.length > 0) {
      doc.addPage();
      doc.fontSize(14).text('INDICATORS OF COMPROMISE', 50, 50);
      
      let yPosition = 80;
      advisory.iocs.forEach((ioc: any) => {
        doc.fontSize(10);
        doc.text(`${ioc.type}: ${ioc.value}`, 50, yPosition);
        if (ioc.description) {
          doc.text(`Description: ${ioc.description}`, 70, yPosition + 15);
          yPosition += 35;
        } else {
          yPosition += 20;
        }
      });
    }
    
    // References
    if (advisory.references.length > 0) {
      doc.fontSize(14).text('REFERENCES', 50, yPosition + 30);
      advisory.references.forEach((ref: string, index: number) => {
        doc.fontSize(10).text(`${index + 1}. ${ref}`, 50, yPosition + 60 + (index * 15));
      });
    }

    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}
