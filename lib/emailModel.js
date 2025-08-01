// emailModel.js
const mongoose = require('mongoose');

const EmailSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true,
    validate: {
      validator: v => /.+@.+\..+/.test(v),
      message: props => `${props.value} is not a valid email!`
    }
  },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ['scheduled', 'sent', 'failed'], default: 'scheduled' },
  error: { type: String },
  sentAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.models.Email || mongoose.model('Email', EmailSchema);
