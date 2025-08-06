// emailModel.js
const mongoose = require('mongoose');

const EmailSchema = new mongoose.Schema({
  to: {
    type: [String],
    required: true,
    validate: {
      validator: function(emails) {
        return emails.every(email => /.+@.+\..+/.test(email));
      },
      message: 'All emails must be valid'
    }
  },
  cc: {
    type: [String],
    default: [],
    validate: {
      validator: function(emails) {
        return emails.every(email => /.+@.+\..+/.test(email));
      },
      message: 'All CC emails must be valid'
    }
  },
  bcc: {
    type: [String],
    default: [],
    validate: {
      validator: function(emails) {
        return emails.every(email => /.+@.+\..+/.test(email));
      },
      message: 'All BCC emails must be valid'
    }
  },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  customMessage: { type: String, default: '' },
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ['scheduled', 'sent', 'failed'], default: 'scheduled' },
  error: { type: String },
  sentAt: { type: Date },
  advisoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Advisory' },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' }, // For client-based emails
  emailType: { type: String, enum: ['individual', 'client'], default: 'individual' },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.models.Email || mongoose.model('Email', EmailSchema);
