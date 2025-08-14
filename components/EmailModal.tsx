import React, { useState, useEffect } from 'react';
import { X, Send, Clock, Calendar, Plus, Minus, Users, Search, Mail, UserCheck } from 'lucide-react';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisory: {
    _id: string;
    title: string;
    severity: string;
    description: string;
    author: string;
    publishedDate: string;
    threat_type?: string[];
    affected_systems?: string[];
    recommendations?: string;
  };
}

interface Client {
  _id: string;
  name: string;
  emails?: string[]; // Available for super_admin users
  emailCount?: number; // Available for admin users when emails are not provided
  description?: string;
  isActive: boolean;
}

export default function EmailModal({ isOpen, onClose, advisory }: EmailModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [individualEmails, setIndividualEmails] = useState<string[]>(['']);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [sendMethod, setSendMethod] = useState<'clients' | 'individual'>('clients');
  
  // Email content
  const [subject, setSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      // Set default subject
      setSubject(`Threat Advisory: ${advisory.title}`);
      // Set default scheduled date to today
      const today = new Date();
      setScheduledDate(today.toISOString().split('T')[0]);
      setScheduledTime('09:00');
    }
  }, [isOpen, advisory.title]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched clients data:', data); // Debug log
        const validClients = Array.isArray(data) ? data.filter((client: Client) => client && client.isActive) : [];
        console.log('Valid clients:', validClients); // Debug log
        setClients(validClients);
      } else {
        console.error('Failed to fetch clients:', response.status, response.statusText);
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]); // Ensure we always have a valid array
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (Array.isArray(client.emails) && client.emails.some(email => email.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const toggleClientSelection = (clientId: string) => {
    if (!clientId) return;
    setSelectedClients(prev => {
      const currentSelection = Array.isArray(prev) ? prev : [];
      return currentSelection.includes(clientId)
        ? currentSelection.filter(id => id !== clientId)
        : [...currentSelection, clientId];
    });
  };

  const addIndividualEmail = () => {
    setIndividualEmails(prev => {
      const currentEmails = Array.isArray(prev) ? prev : [''];
      return [...currentEmails, ''];
    });
  };

  const removeIndividualEmail = (index: number) => {
    setIndividualEmails(prev => {
      const currentEmails = Array.isArray(prev) ? prev : [''];
      return currentEmails.filter((_, i) => i !== index);
    });
  };

  const updateIndividualEmail = (index: number, email: string) => {
    setIndividualEmails(prev => {
      const currentEmails = Array.isArray(prev) ? prev : [''];
      return currentEmails.map((e, i) => i === index ? email : e);
    });
  };

  const getSelectedRecipientsCount = () => {
    if (sendMethod === 'clients') {
      const selectedClientObjects = clients.filter(c => selectedClients.includes(c._id));
      return selectedClientObjects.reduce((total, client) => {
        // Use emailCount if emails array is not available (admin users)
        const emailCount = Array.isArray(client.emails) ? client.emails.length : (client.emailCount || 0);
        return total + emailCount;
      }, 0);
    } else {
      return individualEmails.filter(email => email.trim()).length;
    }
  };

  const handleSendEmail = async () => {
    if (sendMethod === 'clients' && Array.isArray(selectedClients) && selectedClients.length === 0) {
      alert('Please select at least one client');
      return;
    }

    if (sendMethod === 'individual' && Array.isArray(individualEmails) && individualEmails.filter(e => e.trim()).length === 0) {
      alert('Please enter at least one email address');
      return;
    }

    if (isScheduled && (!scheduledDate || !scheduledTime)) {
      alert('Please select a date and time for scheduling');
      return;
    }

    if (!subject.trim()) {
      alert('Please enter a subject');
      return;
    }

    setIsLoading(true);

    try {
      // Build recipients array for the API
      let recipients = [];
      
      if (sendMethod === 'clients') {
        // Convert selected client IDs to recipient objects
        recipients = selectedClients.map(clientId => ({
          type: 'client',
          id: clientId
        }));
      } else {
        // Individual emails
        const validEmails = individualEmails.filter(e => e.trim());
        if (validEmails.length > 0) {
          recipients = [{
            type: 'individual',
            emails: validEmails
          }];
        }
      }

      const payload = {
        advisoryId: advisory._id,
        recipients,
        subject,
        customMessage,
        ...(isScheduled && {
          scheduledDate,
          scheduledTime,
          isScheduled: true
        })
      };

      console.log('Sending payload:', payload); // Debug log

      const response = await fetch('/api/emails/send-advisory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        alert(isScheduled ? 'Email scheduled successfully!' : 'Email sent successfully!');
        onClose();
        // Reset form
        setSelectedClients([]);
        setIndividualEmails(['']);
        setCustomMessage('');
        setIsScheduled(false);
      } else {
        console.error('API Error Response:', result);
        alert(`Error: ${result.message}`);
        if (result.errors && result.errors.length > 0) {
          console.error('Additional errors:', result.errors);
        }
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-panel-hover max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={(e) => { e.preventDefault(); handleSendEmail(); }} className="space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-600/50">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neon-blue/20 border border-neon-blue/50">
                <Mail className="h-5 w-5 text-neon-blue" />
              </div>
              <div>
                <h2 className="font-orbitron font-bold text-xl text-white">
                  Send Advisory Email
                </h2>
                <p className="text-slate-400 font-rajdhani text-sm">
                  {advisory.title}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 transition-all duration-200"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          <div className="px-6 space-y-6">
            
            {/* Send Method Selection */}
            <div>
              <label className="block text-slate-400 font-rajdhani text-sm mb-3">
                Send Method
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setSendMethod('clients')}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                    sendMethod === 'clients'
                      ? 'bg-neon-blue/20 border-neon-blue/50 text-neon-blue'
                      : 'bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span className="font-rajdhani font-medium">Select Clients</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSendMethod('individual')}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                    sendMethod === 'individual'
                      ? 'bg-neon-blue/20 border-neon-blue/50 text-neon-blue'
                      : 'bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  <span className="font-rajdhani font-medium">Enter Individual Emails</span>
                </button>
              </div>
            </div>

            {/* Client Selection */}
            {sendMethod === 'clients' && (
              <div>
                <label className="block text-slate-400 font-rajdhani text-sm mb-3">
                  Select Clients ({selectedClients.length} selected)
                </label>
                
                {/* Role-based access note */}
                <div className="mb-3 p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                  <p className="text-blue-300 font-rajdhani text-xs">
                    📧 Admin users can send emails but see email counts only. Super Admin users can view actual email addresses.
                  </p>
                </div>
                
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50"
                  />
                </div>

                {/* Client List */}
                <div className="max-h-60 overflow-y-auto border border-slate-600/50 rounded-lg bg-slate-800/30">
                  {!Array.isArray(filteredClients) || filteredClients.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 font-rajdhani">
                      {searchTerm ? 'No clients found' : 'No active clients available'}
                    </div>
                  ) : (
                    filteredClients.map((client) => (
                      <div
                        key={client._id}
                        className={`p-3 border-b border-slate-600/30 last:border-b-0 cursor-pointer transition-all duration-200 ${
                          selectedClients.includes(client._id)
                            ? 'bg-neon-blue/10 border-l-4 border-l-neon-blue'
                            : 'hover:bg-slate-700/30'
                        }`}
                        onClick={() => toggleClientSelection(client._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                              selectedClients.includes(client._id)
                                ? 'bg-neon-blue border-neon-blue'
                                : 'border-slate-400'
                            }`}>
                              {selectedClients.includes(client._id) && (
                                <UserCheck className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <div>
                              <div className="font-rajdhani font-medium text-white">
                                {client.name}
                              </div>
                              <div className="text-slate-400 font-rajdhani text-sm">
                                {Array.isArray(client.emails) ? client.emails.length : (client.emailCount || 0)} email{(Array.isArray(client.emails) ? client.emails.length : (client.emailCount || 0)) !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-slate-500 font-rajdhani text-xs">
                            {Array.isArray(client.emails) && client.emails.slice(0, 2).map((email, idx) => (
                              <div key={idx}>{email}</div>
                            ))}
                            {!Array.isArray(client.emails) && client.emailCount && (
                              <div>{client.emailCount} email{client.emailCount !== 1 ? 's' : ''} available</div>
                            )}
                            {!Array.isArray(client.emails) && !client.emailCount && <div>No emails available</div>}
                            {Array.isArray(client.emails) && client.emails.length > 2 && (
                              <div>+{client.emails.length - 2} more</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Individual Email Input */}
            {sendMethod === 'individual' && (
              <div>
                <label className="block text-slate-400 font-rajdhani text-sm mb-3">
                  Email Addresses
                </label>
                <div className="space-y-3">
                  {Array.isArray(individualEmails) && individualEmails.map((email, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateIndividualEmail(index, e.target.value)}
                        placeholder="email@example.com"
                        className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50"
                      />
                      {Array.isArray(individualEmails) && individualEmails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIndividualEmail(index)}
                          className="p-2 bg-red-500/20 border border-red-400/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-all duration-200"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addIndividualEmail}
                    className="flex items-center space-x-2 px-4 py-2 bg-neon-green/20 border border-neon-green/50 rounded-lg text-neon-green hover:bg-neon-green/30 transition-all duration-200"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="font-rajdhani font-medium">Add Email</span>
                  </button>
                </div>
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50"
                required
              />
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                Custom Message (Optional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a custom message that will appear before the advisory content..."
                rows={3}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50 resize-none"
              />
            </div>

            {/* Schedule Options */}
            <div className="glass-panel-hover p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-neon-blue" />
                  <div>
                    <h4 className="font-rajdhani font-medium text-white">Schedule Email</h4>
                    <p className="text-slate-400 font-rajdhani text-sm">Send this email at a specific time</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScheduled(!isScheduled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isScheduled ? 'bg-neon-blue' : 'bg-slate-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isScheduled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {isScheduled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani focus:outline-none focus:border-neon-blue/50"
                      required={isScheduled}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani focus:outline-none focus:border-neon-blue/50"
                      required={isScheduled}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Recipients Summary */}
            {getSelectedRecipientsCount() > 0 && (
              <div className="glass-panel-hover p-4">
                <div className="flex items-center space-x-2 text-neon-green">
                  <UserCheck className="h-4 w-4" />
                  <span className="font-rajdhani font-medium">
                    Ready to send to {getSelectedRecipientsCount()} recipient{getSelectedRecipientsCount() !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-600/50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-300 font-rajdhani font-medium hover:bg-slate-600/50 transition-all duration-200"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isLoading || getSelectedRecipientsCount() === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-neon-blue/20 border border-neon-blue/50 rounded-lg text-neon-blue font-rajdhani font-semibold hover:bg-neon-blue/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isScheduled ? (
                <Clock className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>
                {isLoading ? 'Sending...' : isScheduled ? 'Schedule Email' : 'Send Now'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
