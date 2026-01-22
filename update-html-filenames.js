const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory';

// Advisory Schema (minimal)
const advisorySchema = new mongoose.Schema({
  advisoryId: String,
  htmlFileName: String,
  title: String,
  description: String,
  severity: String,
  category: String,
  affectedProducts: [String],
  vendor: String,
  cves: [String],
  targetSectors: [String],
  regions: [String],
  recommendations: [String],
  patchDetails: String,
  references: [String],
  tlp: String,
  mitreTactics: [String],
  publishedDate: Date,
  source: String,
}, { timestamps: true });

const Advisory = mongoose.model('Advisory', advisorySchema);

async function generateHTML(advisory) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'backend', 'generate_html.py');
    const workspacePath = path.join(__dirname, 'workspace');
    
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
    }

    const advisoryData = JSON.stringify({
      advisory_id: advisory.advisoryId,
      title: advisory.title,
      criticality: advisory.severity,
      threat_type: advisory.category,
      exec_summary_parts: advisory.description ? advisory.description.split('\n\n').filter(p => p.trim()) : [],
      affected_product: advisory.affectedProducts && advisory.affectedProducts.length > 0 
        ? advisory.affectedProducts.join(', ') 
        : 'Not specified',
      vendor: advisory.vendor || 'Unknown',
      cves: advisory.cves || [],
      sectors: advisory.targetSectors || ['General'],
      regions: advisory.regions || ['Global'],
      recommendations: advisory.recommendations || [],
      patch_details: advisory.patchDetails,
      references: advisory.references || [],
      tlp: advisory.tlp || 'AMBER',
      mitre: advisory.mitreTactics || [],
      published: advisory.publishedDate,
      source: advisory.source || 'Manual Entry',
    });

    const pythonProcess = spawn('python', [scriptPath], {
      cwd: path.join(__dirname, 'backend'),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    pythonProcess.stdin.write(advisoryData);
    pythonProcess.stdin.end();

    let stderr = '';

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        const htmlFileName = `${advisory.advisoryId}.html`;
        const htmlPath = path.join(workspacePath, htmlFileName);
        
        if (fs.existsSync(htmlPath)) {
          resolve({ success: true, htmlPath: htmlFileName });
        } else {
          resolve({ success: false, error: 'HTML file was not created' });
        }
      } else {
        resolve({ success: false, error: stderr || 'Failed to generate HTML' });
      }
    });

    pythonProcess.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
}

async function main() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find all advisories without htmlFileName
    const advisories = await Advisory.find({
      $or: [
        { htmlFileName: { $exists: false } },
        { htmlFileName: null },
        { htmlFileName: '' }
      ]
    });

    console.log(`📋 Found ${advisories.length} advisories without HTML file names\n`);

    let successCount = 0;
    let failCount = 0;

    for (const advisory of advisories) {
      console.log(`Processing: ${advisory.advisoryId}`);
      
      // Check if HTML file already exists in workspace
      const expectedFileName = `${advisory.advisoryId}.html`;
      const workspacePath = path.join(__dirname, 'workspace', expectedFileName);
      
      if (fs.existsSync(workspacePath)) {
        // HTML file exists, just update the database
        advisory.htmlFileName = expectedFileName;
        await advisory.save();
        console.log(`  Updated with existing file: ${expectedFileName}`);
        successCount++;
      } else {
        // Generate new HTML file
        const result = await generateHTML(advisory);
        
        if (result.success) {
          advisory.htmlFileName = result.htmlPath;
          await advisory.save();
          console.log(`  Generated and updated: ${result.htmlPath}`);
          successCount++;
        } else {
          console.log(`  ❌ Failed: ${result.error}`);
          failCount++;
        }
      }
      
      console.log('');
    }

    console.log('='.repeat(60));
    console.log(`Successfully updated: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

main();
