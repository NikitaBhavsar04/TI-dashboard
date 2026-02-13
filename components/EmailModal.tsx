import React, { useState, useEffect } from 'react';
import { X, Send, Clock, Calendar, Plus, Minus, Users, Search, Mail, UserCheck, Upload, FileText, Eye, TrendingUp, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisory: {
    _id: string;
    title: string;
    severity?: string;
    description?: string;
    author?: string;
    publishedDate: string;
    threat_type?: string[];
    affected_systems?: string[];
    recommendations?: string | string[];
  };
  emailType?: 'general' | 'dedicated';
  ipSweepData?: {
    impacted_clients: Array<{
      client_id: string;
      client_name: string;
      matches: Array<{
        ioc: string;
        matched_field: string;
        log_index: string;
        timestamp: string;
      }>;
    }>;
    checked_at: string;
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

export default function EmailModal({ isOpen, onClose, advisory, emailType = 'general', ipSweepData }: EmailModalProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [individualEmails, setIndividualEmails] = useState<string[]>(['']);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [sendMethod, setSendMethod] = useState<'clients' | 'individual' | 'csv_bulk'>('clients');

  // Email content
  const [subject, setSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  
  // CC and BCC fields
  const [ccEmails, setCcEmails] = useState<string[]>(['']);
  const [bccEmails, setBccEmails] = useState<string[]>(['']);
  const [showCC, setShowCC] = useState(false);
  const [showBCC, setShowBCC] = useState(false);
  
  // CSV Upload states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvEmails, setCsvEmails] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<string[]>([]);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  
  // Email tracking options
  const [enableTracking, setEnableTracking] = useState(true);
  const [trackingOptions, setTrackingOptions] = useState({
    trackOpens: true,
    trackClicks: true,
    trackLocation: false,
    trackDevice: false
  });

  // Fetch clients and set base defaults when modal opens
  useEffect(() => {
    if (!isOpen) return;

    fetchClients();

    if (emailType === 'dedicated') {
      setSubject(`🚨 URGENT: ${advisory.title} - IOC Detected in Your Environment`);
    } else {
      setSubject(`Threat Advisory: ${advisory.title}`);
    }

    // Set default scheduled date/time
    const today = new Date();
    setScheduledDate(today.toISOString().split('T')[0]);
    setScheduledTime('09:00');
  }, [isOpen, advisory.title, emailType]);

  // Pre-select affected clients once data is available for dedicated advisories
  useEffect(() => {
    if (!isOpen) return;
    if (emailType !== 'dedicated') return;
    if (!ipSweepData?.impacted_clients || clients.length === 0) return;

    const affectedClientIds = ipSweepData.impacted_clients.map(c => {
      const matchingClient = clients.find(client =>
        client.name === c.client_name || (client as any).client_id === c.client_id
      );
      return matchingClient?._id;
    }).filter(Boolean) as string[];

    setSelectedClients(affectedClientIds);
  }, [isOpen, emailType, ipSweepData, clients]);

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

  // CC email management
  const addCcEmail = () => {
    setCcEmails(prev => [...prev, '']);
  };

  const removeCcEmail = (index: number) => {
    setCcEmails(prev => prev.filter((_, i) => i !== index));
  };

  const updateCcEmail = (index: number, email: string) => {
    setCcEmails(prev => prev.map((e, i) => i === index ? email : e));
  };

  // BCC email management
  const addBccEmail = () => {
    setBccEmails(prev => [...prev, '']);
  };

  const removeBccEmail = (index: number) => {
    setBccEmails(prev => prev.filter((_, i) => i !== index));
  };

  const updateBccEmail = (index: number, email: string) => {
    setBccEmails(prev => prev.map((e, i) => i === index ? email : e));
  };

  // CSV Upload Functions
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const emails = processCsvContent(text);
      setCsvEmails(emails);
      setCsvPreview(emails.slice(0, 10)); // Show first 10 for preview
      setShowCsvPreview(true);
    };
    reader.readAsText(file);
  };

  const processCsvContent = (csvText: string): string[] => {
    const lines = csvText.split('\n');
    const emails: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    lines.forEach((line, index) => {
      if (index === 0 && line.toLowerCase().includes('email')) {
        return; // Skip header row
      }

      const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
      
      // Check each column for email addresses
      columns.forEach(col => {
        if (emailRegex.test(col)) {
          emails.push(col);
        }
      });
    });

    // Remove duplicates
    return [...new Set(emails)];
  };

  const clearCsvUpload = () => {
    setCsvFile(null);
    setCsvEmails([]);
    setCsvPreview([]);
    setShowCsvPreview(false);
  };

  const getSelectedRecipientsCount = () => {
    if (sendMethod === 'clients') {
      const selectedClientObjects = clients.filter(c => selectedClients.includes(c._id));
      return selectedClientObjects.reduce((total, client) => {
        // Use emailCount if emails array is not available (admin users)
        const emailCount = Array.isArray(client.emails) ? client.emails.length : (client.emailCount || 0);
        return total + emailCount;
      }, 0);
    } else if (sendMethod === 'individual') {
      return individualEmails.filter(email => email.trim()).length;
    } else if (sendMethod === 'csv_bulk') {
      return csvEmails.length;
    }
    return 0;
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

    if (sendMethod === 'csv_bulk' && csvEmails.length === 0) {
      alert('Please upload a CSV file with email addresses');
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
      } else if (sendMethod === 'individual') {
        // Individual emails
        const validEmails = individualEmails.filter(e => e.trim());
        if (validEmails.length > 0) {
          recipients = [{
            type: 'individual',
            emails: validEmails
          }];
        }
      } else if (sendMethod === 'csv_bulk') {
        // CSV bulk emails with privacy protection (BCC mode)
        recipients = [{
          type: 'bulk_private',
          emails: csvEmails,
          bulkMode: 'bcc' // Send as BCC to protect privacy
        }];
      }

      // Filter and add CC/BCC emails
      const validCcEmails = ccEmails.filter(e => e.trim());
      const validBccEmails = bccEmails.filter(e => e.trim());

      const payload = {
        advisoryId: advisory._id,
        recipients,
        subject,
        customMessage,
        cc: validCcEmails.length > 0 ? validCcEmails : undefined,
        bcc: validBccEmails.length > 0 ? validBccEmails : undefined,
        emailType,
        ipSweepData: emailType === 'dedicated' ? ipSweepData : undefined,
        trackingOptions: {
          enableTracking,
          ...trackingOptions
        },
        ...(isScheduled && {
          scheduledDate,
          scheduledTime,
          isScheduled: true
        })
      };

      console.log('📧 [FRONTEND] Sending payload with:');
      console.log('📧 [FRONTEND] emailType:', emailType);
      console.log('📧 [FRONTEND] ipSweepData prop received:', ipSweepData);
      console.log('📧 [FRONTEND] ipSweepData in payload:', payload.ipSweepData);
      if (emailType === 'dedicated' && !ipSweepData) {
        console.error('❌ [FRONTEND] ERROR: Dedicated email but ipSweepData is missing!');
      }
      console.log('📧 [FRONTEND] Full payload:', JSON.stringify(payload, null, 2));

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  <span className="font-rajdhani font-medium">Individual Emails</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSendMethod('csv_bulk')}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                    sendMethod === 'csv_bulk'
                      ? 'bg-neon-green/20 border-neon-green/50 text-neon-green'
                      : 'bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  <span className="font-rajdhani font-medium">CSV Bulk Upload</span>
                </button>
              </div>
              
              {/* Super Admin Only Notice for CSV */}
              {sendMethod === 'csv_bulk' && (
                <div className="mt-3 p-3 bg-green-500/10 border border-green-400/30 rounded-lg">
                  <p className="text-green-300 font-rajdhani text-xs">
                    🔒 Super Admin Feature: Bulk email with privacy protection. Recipients won't see each other's email addresses.
                  </p>
                </div>
              )}
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
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-slate-400 font-rajdhani text-sm">
                    To: Email Addresses
                  </label>
                  <div className="flex items-center space-x-2">
                    {!showCC && (
                      <button
                        type="button"
                        onClick={() => setShowCC(true)}
                        className="text-neon-blue hover:text-neon-blue/80 font-rajdhani text-sm"
                      >
                        + CC
                      </button>
                    )}
                    {!showBCC && (
                      <button
                        type="button"
                        onClick={() => setShowBCC(true)}
                        className="text-neon-blue hover:text-neon-blue/80 font-rajdhani text-sm"
                      >
                        + BCC
                      </button>
                    )}
                  </div>
                </div>
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

                {/* CC Field */}
                {showCC && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-slate-400 font-rajdhani text-sm">
                        CC (Carbon Copy)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCC(false);
                          setCcEmails(['']);
                        }}
                        className="text-red-400 hover:text-red-300 font-rajdhani text-xs"
                      >
                        Remove CC
                      </button>
                    </div>
                    <div className="space-y-2">
                      {ccEmails.map((email, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => updateCcEmail(index, e.target.value)}
                            placeholder="cc@example.com"
                            className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50"
                          />
                          {ccEmails.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCcEmail(index)}
                              className="p-2 bg-red-500/20 border border-red-400/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-all duration-200"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addCcEmail}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-neon-blue/20 border border-neon-blue/50 rounded-lg text-neon-blue hover:bg-neon-blue/30 transition-all duration-200 text-sm"
                      >
                        <Plus className="h-3 w-3" />
                        <span className="font-rajdhani font-medium">Add CC</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* BCC Field */}
                {showBCC && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-slate-400 font-rajdhani text-sm">
                        BCC (Blind Carbon Copy)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowBCC(false);
                          setBccEmails(['']);
                        }}
                        className="text-red-400 hover:text-red-300 font-rajdhani text-xs"
                      >
                        Remove BCC
                      </button>
                    </div>
                    <div className="space-y-2">
                      {bccEmails.map((email, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => updateBccEmail(index, e.target.value)}
                            placeholder="bcc@example.com"
                            className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50"
                          />
                          {bccEmails.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeBccEmail(index)}
                              className="p-2 bg-red-500/20 border border-red-400/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-all duration-200"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addBccEmail}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-neon-blue/20 border border-neon-blue/50 rounded-lg text-neon-blue hover:bg-neon-blue/30 transition-all duration-200 text-sm"
                      >
                        <Plus className="h-3 w-3" />
                        <span className="font-rajdhani font-medium">Add BCC</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CSV Bulk Upload */}
            {sendMethod === 'csv_bulk' && (
              <div>
                <label className="block text-slate-400 font-rajdhani text-sm mb-3">
                  CSV Bulk Email Upload
                </label>
                
                {!csvFile ? (
                  <div className="border-2 border-dashed border-slate-600/50 rounded-lg p-8 text-center hover:border-neon-green/50 transition-all duration-200">
                    <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-white font-rajdhani font-medium mb-2">Upload CSV File</h3>
                    <p className="text-slate-400 font-rajdhani text-sm mb-4">
                      Upload a CSV file containing email addresses. The file can have headers and multiple columns.
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-neon-green/20 border border-neon-green/50 rounded-lg text-neon-green hover:bg-neon-green/30 cursor-pointer transition-all duration-200"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="font-rajdhani font-medium">Choose CSV File</span>
                    </label>
                    
                    <div className="mt-6 text-left bg-slate-800/30 rounded-lg p-4">
                      <h4 className="text-white font-rajdhani font-medium mb-2">CSV Format Example:</h4>
                      <pre className="text-slate-300 font-mono text-xs">
{`Name,Email,Company
John Doe,john@company.com,Company A
Jane Smith,jane@business.org,Business B
bob@email.com
alice@domain.net`}
                      </pre>
                      <p className="text-slate-400 font-rajdhani text-xs mt-2">
                        ✓ Supports headers and multiple columns<br/>
                        ✓ Automatically detects email addresses<br/>
                        ✓ Removes duplicates automatically
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-600/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-neon-green" />
                        <div>
                          <div className="text-white font-rajdhani font-medium">{csvFile.name}</div>
                          <div className="text-slate-400 font-rajdhani text-sm">
                            {csvEmails.length} email addresses found
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearCsvUpload}
                        className="p-2 bg-red-500/20 border border-red-400/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-all duration-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {showCsvPreview && (
                      <div className="bg-slate-800/30 border border-slate-600/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-rajdhani font-medium">Email Preview</h4>
                          <button
                            type="button"
                            onClick={() => setShowCsvPreview(!showCsvPreview)}
                            className="text-neon-blue hover:text-neon-blue/80 font-rajdhani text-sm"
                          >
                            {showCsvPreview ? 'Hide' : 'Show'} Preview
                          </button>
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {csvPreview.map((email, index) => (
                            <div key={index} className="text-slate-300 font-rajdhani text-sm py-1 px-2 bg-slate-700/30 rounded">
                              {email}
                            </div>
                          ))}
                          {csvEmails.length > csvPreview.length && (
                            <div className="text-slate-400 font-rajdhani text-sm py-1 px-2">
                              ... and {csvEmails.length - csvPreview.length} more emails
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Email Tracking Options - Only for Super Admin */}
            {user?.role === 'super_admin' && (
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/30 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Eye className="h-5 w-5 text-purple-400" />
                  <h3 className="text-white font-rajdhani font-medium">Email Tracking Options</h3>
                </div>
                
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableTracking}
                      onChange={(e) => setEnableTracking(e.target.checked)}
                      className="w-4 h-4 text-purple-400 bg-slate-800 border-slate-600 rounded focus:ring-purple-400"
                    />
                    <span className="text-slate-300 font-rajdhani">Enable Email Tracking</span>
                  </label>

                  {enableTracking && (
                    <div className="ml-7 space-y-2">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={trackingOptions.trackOpens}
                          onChange={(e) => setTrackingOptions(prev => ({
                            ...prev,
                            trackOpens: e.target.checked
                          }))}
                          className="w-4 h-4 text-purple-400 bg-slate-800 border-slate-600 rounded focus:ring-purple-400"
                        />
                        <span className="text-slate-300 font-rajdhani text-sm">Track email opens</span>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={trackingOptions.trackClicks}
                          onChange={(e) => setTrackingOptions(prev => ({
                            ...prev,
                            trackClicks: e.target.checked
                          }))}
                          className="w-4 h-4 text-purple-400 bg-slate-800 border-slate-600 rounded focus:ring-purple-400"
                        />
                        <span className="text-slate-300 font-rajdhani text-sm">Track link clicks</span>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={trackingOptions.trackLocation}
                          onChange={(e) => setTrackingOptions(prev => ({
                            ...prev,
                            trackLocation: e.target.checked
                          }))}
                          className="w-4 h-4 text-purple-400 bg-slate-800 border-slate-600 rounded focus:ring-purple-400"
                        />
                        <span className="text-slate-300 font-rajdhani text-sm">Track location data</span>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={trackingOptions.trackDevice}
                          onChange={(e) => setTrackingOptions(prev => ({
                            ...prev,
                            trackDevice: e.target.checked
                          }))}
                          className="w-4 h-4 text-purple-400 bg-slate-800 border-slate-600 rounded focus:ring-purple-400"
                        />
                        <span className="text-slate-300 font-rajdhani text-sm">Track device information</span>
                      </label>
                    </div>
                  )}
                </div>

                {enableTracking && (
                  <div className="mt-3 text-xs text-slate-400 font-rajdhani">
                    <TrendingUp className="h-4 w-4 inline mr-1" />
                    Analytics will be available in the admin dashboard after sending.
                  </div>
                )}
              </div>
            )}

            {/* Privacy Notice for CSV Bulk */}
            {sendMethod === 'csv_bulk' && user?.role === 'super_admin' && (
              <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Shield className="h-5 w-5 text-green-400 mt-0.5" />
                  <div>
                    <h4 className="text-green-400 font-rajdhani font-medium mb-1">Privacy Protection Enabled</h4>
                    <p className="text-slate-300 font-rajdhani text-sm">
                      Each email will be sent individually using BCC mode. Recipients will not see each other's email addresses, 
                      ensuring complete privacy protection.
                    </p>
                  </div>
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
