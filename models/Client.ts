import mongoose, { Document, Schema } from 'mongoose';

export interface IClient extends Document {
  _id: string;
  name: string;
  emails: string[];
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>({
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
    trim: true,
    validate: {
      validator: function(email: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  }],
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
ClientSchema.index({ name: 'text' });
ClientSchema.index({ emails: 1 });
ClientSchema.index({ isActive: 1 });

const Client = mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);

export default Client;
