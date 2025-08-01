// pages/api/schedule-email.js
const mongoose = require('mongoose');
const Email = require('../../lib/emailModel');
const { agenda } = require('../../lib/agenda');
require('dotenv').config();

async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  await connectDB();
  const { to, subject, body, scheduledDate } = req.body;

  // Validate
  if (!to || !subject || !body || !scheduledDate) return res.status(400).json({ message: 'Missing required fields' });
  if (!/.+@.+\..+/.test(to)) return res.status(400).json({ message: 'Invalid email address' });
  const scheduledAt = new Date(scheduledDate);
  if (isNaN(scheduledAt.getTime())) return res.status(400).json({ message: 'Invalid date' });
  if (scheduledAt < new Date()) return res.status(400).json({ message: 'Cannot schedule for the past' });

  try {
    const emailDoc = await Email.create({ to, subject, body, scheduledAt });
    await agenda.start();
    await agenda.schedule(scheduledAt, 'send-scheduled-email', { emailId: emailDoc._id });
    res.status(201).json({ message: 'Email scheduled', id: emailDoc._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to schedule email', error: err.message });
  }
}
