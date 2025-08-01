import mongoose, { Schema, Document } from 'mongoose';

export interface IScheduledEmail extends Document {
  advisoryId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  customMessage?: string;
  scheduledDate: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  createdBy: string;
  createdAt: Date;
  sentAt?: Date;
  errorMessage?: string;
  retryCount: number;
}

const ScheduledEmailSchema = new Schema({
  advisoryId: {
    type: String,
    required: true,
    ref: 'Advisory'
  },
  to: [{
    type: String,
    required: true,
    trim: true
  }],
  cc: [{
    type: String,
    trim: true
  }],
  bcc: [{
    type: String,
    trim: true
  }],
  subject: {
    type: String,
    required: true,
    trim: true
  },
  customMessage: {
    type: String,
    trim: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'cancelled'],
    default: 'pending'
  },
  createdBy: {
    type: String,
    required: true,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  sentAt: {
    type: Date
  },
  errorMessage: {
    type: String
  },
  retryCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient querying of pending scheduled emails
ScheduledEmailSchema.index({ scheduledDate: 1, status: 1 });
ScheduledEmailSchema.index({ createdBy: 1 });

export default mongoose.models.ScheduledEmail || mongoose.model<IScheduledEmail>('ScheduledEmail', ScheduledEmailSchema);
