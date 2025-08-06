import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Send, Clock, Search, ChevronDown, User, Building, Plus, Check } from 'lucide-react';

interface Advisory {
  _id: string;
  title: string;
  description?: string;
}

interface Client {
  _id: string;
  name: string;
  emails: string[];
  description?: string;
}

interface Recipient {
  id: string;
  type: 'client' | 'individual';
  label: string;
  emails: string[];
  clientId?: string;
}

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisory: Advisory;
}

const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, advisory }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNewEmailInput, setShowNewEmailInput] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [emailData, setEmailData] = useState({
    subject: `THREAT ALERT: ${advisory.title}`,
    customMessage: '',
    scheduledDate: '',
    scheduledTime: ''
  });
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setShowNewEmailInput(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients?active=true');
      if (response.ok) {
        const clientsData = await response.json();
        setClients(clientsData);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.emails.some(email => email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleClientSelect = (client: Client) => {
    const existingRecipient = selectedRecipients.find(r => r.clientId === client._id);
    if (existingRecipient) return;

    const recipient: Recipient = {
      id: `client-${client._id}`,
      type: 'client',
      label: `${client.name} (${client.emails.length} emails)`,
      emails: client.emails,
      clientId: client._id
    };

    setSelectedRecipients(prev => [...prev, recipient]);
    setSearchTerm('');
    setDropdownOpen(false);
  };

  const handleAddNewEmail = () => {
    if (!newEmail.trim()) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    const existingRecipient = selectedRecipients.find(r => 
      r.type === 'individual' && r.emails.includes(newEmail.toLowerCase())
    );
    if (existingRecipient) return;

    const recipient: Recipient = {
      id: `individual-${Date.now()}`,
      type: 'individual',
      label: newEmail,
      emails: [newEmail.toLowerCase()]
    };

    setSelectedRecipients(prev => [...prev, recipient]);
    setNewEmail('');
    setShowNewEmailInput(false);
    setDropdownOpen(false);
  };

  const removeRecipient = (recipientId: string) => {
    setSelectedRecipients(prev => prev.filter(r => r.id !== recipientId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipients.length) {
      alert('Please select at least one recipient');
      return;
    }

    setIsLoading(true);

    try {
      const recipients = selectedRecipients.map(recipient => ({
        type: recipient.type,
        id: recipient.clientId,
        emails: recipient.type === 'individual' ? recipient.emails : undefined
      }));

      const response = await fetch('/api/emails/send-advisory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          advisoryId: advisory._id,
          recipients,
          subject: emailData.subject,
          customMessage: emailData.customMessage,
          scheduledDate: emailData.scheduledDate,
          scheduledTime: emailData.scheduledTime,
          isScheduled
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message);
        onClose();
      } else {
        alert('Failed to send email: ' + result.message);
      }
    } catch (error) {
      console.error('Email sending error:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="glass-panel-hover max-w-4xl w-full max-h-[90vh] overflow-y-auto z-50">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-600/50">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neon-blue/20 border border-neon-blue/50">
                <Mail className="h-5 w-5 text-neon-blue" />
              </div>
              <div>
                <h2 className="font-orbitron font-bold text-xl text-white">Send Advisory Email</h2>
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
            
            {/* Recipients Section */}
            <div>
              <label className="block text-slate-400 font-rajdhani text-sm mb-3">
                Recipients *
              </label>
              
              {/* Selected Recipients */}
              {selectedRecipients.length > 0 && (
                <div className="mb-4 space-y-2">
                  {selectedRecipients.map((recipient) => (
                    <div key={recipient.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-600/50">
                      <div className="flex items-center space-x-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                          recipient.type === 'client' ? 'bg-blue-500/20 border border-blue-400/50' : 'bg-green-500/20 border border-green-400/50'
                        }`}>
                          {recipient.type === 'client' ? 
                            <Building className="h-4 w-4 text-blue-400" /> : 
                            <User className="h-4 w-4 text-green-400" />
                          }
                        </div>
                        <div>
                          <div className="text-white font-rajdhani">{recipient.label}</div>
                          <div className="text-slate-400 font-rajdhani text-xs">
                            {recipient.emails.slice(0, 3).join(', ')}
                            {recipient.emails.length > 3 && ` +${recipient.emails.length - 3} more`}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRecipient(recipient.id)}
                        className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 transition-all duration-200"
                      >
                        <X className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Recipient Selector */}
              <div className="relative" ref={dropdownRef}>
                <div 
                  className="relative w-full p-3 bg-slate-800/50 border border-slate-600/50 rounded-lg cursor-pointer hover:border-neon-blue/50 transition-all duration-200"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-400 font-rajdhani">
                        Select clients or add emails...
                      </span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600/50 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
                    
                    {/* Search Input */}
                    <div className="p-3 border-b border-slate-600/50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search clients..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {/* Add New Email Option */}
                    <div className="p-2 border-b border-slate-600/50">
                      {!showNewEmailInput ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowNewEmailInput(true);
                          }}
                          className="w-full text-left p-2 hover:bg-slate-700/50 rounded-lg transition-all duration-200 flex items-center space-x-2"
                        >
                          <Plus className="h-4 w-4 text-green-400" />
                          <span className="text-green-400 font-rajdhani">Add new email address</span>
                        </button>
                      ) : (
                        <div className="flex space-x-2">
                          <input
                            type="email"
                            placeholder="Enter email address"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddNewEmail();
                              }
                            }}
                            className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddNewEmail();
                            }}
                            className="px-3 py-2 bg-green-500/20 border border-green-400/50 rounded-lg text-green-400 hover:bg-green-500/30 transition-all duration-200"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Client List */}
                    <div className="max-h-40 overflow-y-auto">
                      {filteredClients.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 font-rajdhani">
                          {searchTerm ? 'No clients found' : 'No active clients available'}
                        </div>
                      ) : (
                        filteredClients.map((client) => {
                          const isSelected = selectedRecipients.some(r => r.clientId === client._id);
                          return (
                            <button
                              key={client._id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isSelected) handleClientSelect(client);
                              }}
                              disabled={isSelected}
                              className={`w-full text-left p-3 hover:bg-slate-700/50 transition-all duration-200 flex items-center justify-between ${
                                isSelected ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/50">
                                  <Building className="h-4 w-4 text-blue-400" />
                                </div>
                                <div>
                                  <div className="text-white font-rajdhani">{client.name}</div>
                                  <div className="text-slate-400 font-rajdhani text-xs">
                                    {client.emails.length} email{client.emails.length !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-green-400" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                Subject *
              </label>
              <input
                type="text"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50 transition-all duration-200"
                placeholder="Email subject"
                required
              />
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                Custom Message
              </label>
              <textarea
                value={emailData.customMessage}
                onChange={(e) => setEmailData(prev => ({ ...prev, customMessage: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50 transition-all duration-200 resize-none"
                placeholder="Add a personal message (optional)..."
                rows={4}
              />
            </div>

            {/* Schedule Toggle */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="schedule-email"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="w-4 h-4 text-neon-blue bg-slate-800 border-slate-600 rounded focus:ring-neon-blue focus:ring-2"
              />
              <label htmlFor="schedule-email" className="text-white font-rajdhani flex items-center space-x-2">
                <Clock className="h-4 w-4 text-neon-blue" />
                <span>Schedule for later</span>
              </label>
            </div>

            {/* Schedule DateTime */}
            {isScheduled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-600/50">
                <div>
                  <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={emailData.scheduledDate}
                    onChange={(e) => setEmailData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white font-rajdhani focus:outline-none focus:border-neon-blue/50 transition-all duration-200"
                    required={isScheduled}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={emailData.scheduledTime}
                    onChange={(e) => setEmailData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white font-rajdhani focus:outline-none focus:border-neon-blue/50 transition-all duration-200"
                    required={isScheduled}
                  />
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
              disabled={isLoading || selectedRecipients.length === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-neon-blue/20 border border-neon-blue/50 rounded-lg text-neon-blue font-rajdhani font-semibold hover:bg-neon-blue/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Send className="h-4 w-4" />
              <span>
                {isLoading ? 'Sending...' : isScheduled ? 'Schedule Email' : 'Send Now'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailModal;
