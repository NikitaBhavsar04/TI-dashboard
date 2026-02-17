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
  
  // Parse as UTC first (add Z if not present) to avoid timezone issues
  const dateStr = scheduledDate.endsWith('Z') ? scheduledDate : scheduledDate + 'Z';
  const userInputTime = new Date(dateStr);
  if (isNaN(userInputTime.getTime())) return res.status(400).json({ message: 'Invalid date' });
  
  // IST is UTC+5:30
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  
  // User enters time in IST, convert to UTC for comparison
  const userIntendedUTC = new Date(userInputTime.getTime() - istOffsetMs);
  const nowUTC = new Date();
  
  if (userIntendedUTC < nowUTC) return res.status(400).json({ message: 'Cannot schedule for the past (IST)' });

  try {
    const emailDoc = await Email.create({ to, subject, body, scheduledAt: userIntendedUTC });
    await agenda.start();
    await agenda.schedule(userIntendedUTC, 'send-scheduled-email', { emailId: emailDoc._id });
    res.status(201).json({ message: 'Email scheduled', id: emailDoc._id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to schedule email', error: err.message });
  }
}
