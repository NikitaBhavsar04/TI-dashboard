import React, { useState, useEffect } from 'react';
import { Mail, X, Plus, Minus, Save, Clock, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ScheduledEmail {
  _id: string;
  advisoryId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  customMessage?: string;
  scheduledDate: string;
  status: string;
}

interface EditScheduledEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduledEmail: ScheduledEmail | null;
  onUpdate: () => void;
}

const EditScheduledEmailModal: React.FC<EditScheduledEmailModalProps> = ({
  isOpen,
  onClose,
  scheduledEmail,
  onUpdate
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showCC, setShowCC] = useState(false);
  const [showBCC, setShowBCC] = useState(false);
  const [emailData, setEmailData] = useState({
    to: [''],
    cc: [''],
    bcc: [''],
    subject: '',
    customMessage: '',
    scheduledDate: '',
    scheduledTime: ''
  });

  useEffect(() => {
    if (scheduledEmail && isOpen) {
      // Convert UTC stored time back to IST for editing (add 5:30)
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const scheduleDate = new Date(scheduledEmail.scheduledDate);
      const istDate = new Date(scheduleDate.getTime() + istOffsetMs);
      const dateStr = istDate.toISOString().split('T')[0];
      const timeStr = istDate.toTimeString().split(' ')[0].substring(0, 5);

      setEmailData({
        to: scheduledEmail.to.length > 0 ? scheduledEmail.to : [''],
        cc: scheduledEmail.cc.length > 0 ? scheduledEmail.cc : [''],
        bcc: scheduledEmail.bcc.length > 0 ? scheduledEmail.bcc : [''],
        subject: scheduledEmail.subject,
        customMessage: scheduledEmail.customMessage || '',
        scheduledDate: dateStr,
        scheduledTime: timeStr
      });

      setShowCC(scheduledEmail.cc.length > 0);
      setShowBCC(scheduledEmail.bcc.length > 0);
    }
  }, [scheduledEmail, isOpen]);

  const addEmailField = (field: 'to' | 'cc' | 'bcc') => {
    setEmailData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeEmailField = (field: 'to' | 'cc' | 'bcc', index: number) => {
    setEmailData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateEmailField = (field: 'to' | 'cc' | 'bcc', index: number, value: string) => {
    setEmailData(prev => ({
      ...prev,
      [field]: prev[field].map((email, i) => i === index ? value : email)
    }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Filter out empty email addresses
      const cleanedData = {
        to: emailData.to.filter(email => email.trim()),
        cc: emailData.cc.filter(email => email.trim()),
        bcc: emailData.bcc.filter(email => email.trim()),
        subject: emailData.subject,
        customMessage: emailData.customMessage
      };

      if (cleanedData.to.length === 0) {
        alert('Please add at least one recipient email address');
        return;
      }

      // Validate email addresses
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const allEmails = [...cleanedData.to, ...cleanedData.cc, ...cleanedData.bcc];
      const invalidEmails = allEmails.filter(email => !emailRegex.test(email));
      
      if (invalidEmails.length > 0) {
        alert(`Invalid email addresses: ${invalidEmails.join(', ')}`);
        return;
      }

      // Validate scheduled date/time with IST timezone
      if (!emailData.scheduledDate || !emailData.scheduledTime) {
        alert('Please select both date and time for scheduled email');
        return;
      }

      const userLocalTime = new Date(`${emailData.scheduledDate}T${emailData.scheduledTime}`);
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const userIntendedUTC = new Date(userLocalTime.getTime() - istOffsetMs);
      const nowUTC = new Date();
      
      if (userIntendedUTC <= nowUTC) {
        alert('Scheduled time must be in the future (India Standard Time)');
        return;
      }

      const updateData = {
        ...cleanedData,
        scheduledDate: scheduledDateTime.toISOString()
      };

      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/scheduled-emails/${scheduledEmail?._id}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (response.ok) {
        alert('Scheduled email updated successfully!');
        onUpdate();
        onClose();
      } else {
        alert(`Failed to update: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating scheduled email:', error);
      alert('Failed to update scheduled email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !scheduledEmail) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/20 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-cyan-400" />
            <h2 className="text-xl font-orbitron font-bold text-white">Edit Scheduled Email</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* To Field */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              To: <span className="text-red-400">*</span>
            </label>
            {emailData.to.map((email, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => updateEmailField('to', index, e.target.value)}
                  placeholder="recipient@example.com"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
                />
                {emailData.to.length > 1 && (
                  <button
                    onClick={() => removeEmailField('to', index)}
                    className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addEmailField('to')}
              className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add recipient
            </button>
          </div>

          {/* CC/BCC Toggle Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setShowCC(!showCC)}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"
            >
              {showCC ? 'Hide CC' : 'Add CC'}
            </button>
            <button
              onClick={() => setShowBCC(!showBCC)}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"
            >
              {showBCC ? 'Hide BCC' : 'Add BCC'}
            </button>
          </div>

          {/* CC Field */}
          {showCC && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">CC:</label>
              {emailData.cc.map((email, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmailField('cc', index, e.target.value)}
                    placeholder="cc@example.com"
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    onClick={() => removeEmailField('cc', index)}
                    className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addEmailField('cc')}
                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add CC
              </button>
            </div>
          )}

          {/* BCC Field */}
          {showBCC && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">BCC:</label>
              {emailData.bcc.map((email, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmailField('bcc', index, e.target.value)}
                    placeholder="bcc@example.com"
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    onClick={() => removeEmailField('bcc', index)}
                    className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addEmailField('bcc')}
                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add BCC
              </button>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Subject:</label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Custom Message (Optional):</label>
            <textarea
              value={emailData.customMessage}
              onChange={(e) => setEmailData(prev => ({ ...prev, customMessage: e.target.value }))}
              placeholder="Add a custom message that will appear at the top of the email..."
              rows={4}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none resize-vertical"
            />
          </div>

          {/* Schedule Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date:
              </label>
              <input
                type="date"
                value={emailData.scheduledDate}
                onChange={(e) => setEmailData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Time:
              </label>
              <input
                type="time"
                value={emailData.scheduledTime}
                onChange={(e) => setEmailData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 text-white rounded-lg transition-colors"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditScheduledEmailModal;
