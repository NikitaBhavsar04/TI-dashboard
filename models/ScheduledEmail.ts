import mongoose, { Schema, Document } from 'mongoose';

export interface IScheduledEmail extends Document {
  advisoryId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  from?: string;  // Email account sending this email
  sentByName?: string;  // Admin username who sent this email
  clientId?: string;
  clientName?: string;
  emailType?: 'general' | 'dedicated';  // Whether this was a general or dedicated advisory
  body?: string;  // Pre-generated HTML body — avoids re-generation at send time
  subject: string;
  customMessage?: string;
  scheduledDate: Date;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  createdBy: string;
  createdAt: Date;
  sentAt?: Date;
  errorMessage?: string;
  retryCount: number;
  trackingId?: string;
  opens: Array<{
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
  }>;
  openedAt?: Date;
  isOpened: boolean;
  lockedAt?: Date;
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
  from: {
    type: String,
    trim: true
  },
  sentByName: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  clientId: {
    type: String,
    trim: true
  },
  clientName: {
    type: String,
    trim: true
  },
  emailType: {
    type: String,
    enum: ['general', 'dedicated'],
    default: 'general'
  },
  body: {
    type: String  // Pre-generated HTML body stored at queue time
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
    enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'],
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
  },
  trackingId: {
    type: String,
    unique: true,
    sparse: true
  },
  opens: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  openedAt: {
    type: Date
  },
  isOpened: {
    type: Boolean,
    default: false
  },
  lockedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient querying of pending scheduled emails
ScheduledEmailSchema.index({ scheduledDate: 1, status: 1 });
ScheduledEmailSchema.index({ createdBy: 1 });

// In development, delete the cached Mongoose model whenever this module is
// re-evaluated (hot-module replacement) so schema changes are picked up
// immediately without a full server restart.
if (process.env.NODE_ENV !== 'production') {
  delete (mongoose.models as any).ScheduledEmail;
}

export default mongoose.models.ScheduledEmail || mongoose.model<IScheduledEmail>('ScheduledEmail', ScheduledEmailSchema);
