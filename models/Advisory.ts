import mongoose, { Schema, Document } from 'mongoose';

export interface IAdvisory extends Document {
  title: string;
  description: string;
  summary?: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category: string;
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
  // New fields
  affectedProduct?: string;
  targetSectors?: string[];
  regions?: string[];
  tlp?: string;
  recommendations?: string[];
  patchDetails?: string[];
  mitreTactics?: any[];
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
  mitreTactics: [Schema.Types.Mixed]
}, {
  timestamps: true
});

AdvisorySchema.index({ title: 'text', description: 'text', content: 'text' });

export default mongoose.models.Advisory || mongoose.model<IAdvisory>('Advisory', AdvisorySchema);
