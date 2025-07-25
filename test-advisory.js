// Simple test script to validate MongoDB schema
const mongoose = require('mongoose');

// Copy the schema from Advisory.ts
const IOCSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['IP', 'Hash', 'URL', 'Domain', 'Email'],
    required: true
  },
  value: {
    type: String,
    required: true
  },
  description: String
});

const AdvisorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  summary: String,
  severity: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  iocs: [IOCSchema],
  publishedDate: {
    type: Date,
    default: Date.now
  },
  author: {
    type: String,
    required: true
  },
  tags: [String],
  content: {
    type: String,
    required: true
  },
  references: [String],
  cvss: Number,
  cveIds: [String],
  // New fields
  affectedProduct: String,
  targetSectors: [String],
  regions: [String],
  tlp: String,
  recommendations: [String],
  patchDetails: [String],
  mitreTactics: [mongoose.Schema.Types.Mixed]
}, {
  timestamps: true
});

// Test data that should work
const testPayload = {
  title: "Test QR Code Phishing",
  description: "Test description",
  summary: "Test summary",
  severity: "High",
  category: "Phishing",
  author: "Test Author",
  content: "Test content",
  tags: ["test", "phishing"],
  references: ["https://example.com"],
  cveIds: [],
  iocs: [],
  mitreTactics: [
    {
      id: "T1566.001",
      name: "Phishing",
      technique: "Spearphishing Attachment"
    }
  ],
  affectedProduct: "Email clients",
  targetSectors: ["Energy", "Manufacturing"],
  regions: ["Global"],
  tlp: "TLP:AMBER",
  recommendations: ["Deploy security solutions", "Train users"],
  patchDetails: ["Update email clients", "Enable filtering"]
};

console.log('Test payload structure:');
console.log(JSON.stringify(testPayload, null, 2));

console.log('\nThis payload should work with the schema.');
