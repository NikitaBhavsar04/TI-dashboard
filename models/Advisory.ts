import mongoose, { Schema, Document } from 'mongoose';

export interface IAdvisory extends Document {
  title: string;
  description: string;
  summary?: string;
  executiveSummary?: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category: string;
  threatId?: string;
  iocs: {
    type: 'IP' | 'Hash' | 'URL' | 'Domain' | 'Email';
    value: string;
    description?: string;
  }[];
  publishedDate: Date;
  author: string;
  tags: string[];
  content: string;
  references: string[];
  cvss?: number;
  cveIds: string[];
  // Fields from HTML template
  advisoryId?: string;          // advisory_id
  affectedProducts?: string[];  // affected_product (array form)
  affectedProduct?: string;     // affected_product (single string from HTML)
  targetSectors?: string[];     // sectors
  regions?: string[];           // regions
  tlp?: string;                 // TLP classification
  recommendations?: string[];   // recommendations
  patchDetails?: string[];      // patch_details
  mitreTactics?: any[];        // MITRE ATT&CK tactics
  htmlFileName?: string;        // HTML file reference
  threatType?: string;          // threat_type
  criticality?: string;         // criticality (same as severity)
  vendor?: string;              // vendor
  fullTitle?: string;           // full_title from RSS
  // Mongoose timestamps
  createdAt?: Date;             // When advisory was created in database
  updatedAt?: Date;             // When advisory was last updated
}

const IOCSchema = new Schema({
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

const AdvisorySchema = new Schema({
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
  executiveSummary: String,
  severity: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  threatId: String,
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
  // Fields from HTML template
  advisoryId: String,           // advisory_id
  affectedProducts: [String],   // affected_product (array)
  affectedProduct: String,      // affected_product (single string)
  targetSectors: [String],      // sectors
  regions: [String],            // regions
  tlp: String,                  // TLP classification
  recommendations: [String],    // recommendations
  patchDetails: [String],       // patch_details
  mitreTactics: [Schema.Types.Mixed], // MITRE tactics
  htmlFileName: String,         // HTML file reference
  threatType: String,           // threat_type
  criticality: String,          // criticality
  vendor: String,               // vendor
  fullTitle: String             // full_title from RSS
}, {
  timestamps: true
});

AdvisorySchema.index({ title: 'text', description: 'text', content: 'text' });

export default mongoose.models.Advisory || mongoose.model<IAdvisory>('Advisory', AdvisorySchema);
