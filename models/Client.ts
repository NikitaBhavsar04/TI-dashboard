import mongoose, { Document, Schema } from 'mongoose';

export interface IClient extends Document {
  _id: string;
  client_id: string;
  client_name: string;
  name: string;
  emails: string[];
  fw_index: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>({
  client_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  client_name: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  emails: [{
    type: String,
    required: true,
    lowercase: true,
    trim: true
  }],
  cc_emails: [{
    type: String,
    required: false,
    lowercase: true,
    trim: true
  }],
  bcc_emails: [{
    type: String,
    required: false,
    lowercase: true,
    trim: true
  }],
  fw_index: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for searching - separate indexes since text index doesn't support arrays
ClientSchema.index({ client_id: 1 }, { unique: true });
ClientSchema.index({ fw_index: 1 }, { unique: true });
ClientSchema.index({ name: 'text' });
ClientSchema.index({ emails: 1 });
ClientSchema.index({ isActive: 1 });

const Client = mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);

export default Client;
