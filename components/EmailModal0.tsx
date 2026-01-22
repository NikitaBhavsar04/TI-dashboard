import React, { useState, useEffect } from 'react';
import { X, Send, Clock, Calendar, Plus, Minus, Users, Search, Mail, UserCheck, Eye, FileText, Download, Building, User, Check, ChevronDown } from 'lucide-react';

// EmailModal Component for sending advisory emails - ADVANCED VERSION
interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisory: {
    _id: string;
    title: string;
    description?: string;
    severity?: string;
    publishedDate?: string;
    author?: string;
    category?: string;
    tags?: string[];
    references?: string[];
    iocs?: Array<{ type: string; value: string; description?: string }>;
    cveIds?: string[];
    content?: string;
    summary?: string;
    threatDesignation?: string;
    threatCategory?: string;
    threatLevel?: string;
    tlpClassification?: string;
    tlp?: string;
    cves?: string[];
    executiveSummary?: string;
    affectedProducts?: string[];
    targetSectors?: string[];
    regions?: string[];
    mitreTactics?: Array<{
      tacticName: string;
      techniqueId: string;
      technique: string;
    }>;
    recommendations?: string[];
    patchDetails?: string;
    cvss?: string;
    threat_type?: string[];
    affected_systems?: string[];
  };
}

interface Client {
  _id: string;
  name: string;
  emails: string[];
  description?: string;
  isActive: boolean;
}

interface EmailGroup {
  id: string;
  type: 'client' | 'custom';
  name: string;
  emails: string[];
  clientId?: string;
}

interface EmailFormData {
  subject: string;
  ccEmails: string[];
  bccEmails: string[];
  scheduledDate: string;
  scheduledTime: string;
  customMessage: string;
  sendAsPDF: boolean;
  sendAsHTML: boolean;
}

export default function EmailModal({ isOpen, onClose, advisory }: EmailModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedEmailGroups, setSelectedEmailGroups] = useState<EmailGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  // Email form data
  const [emailData, setEmailData] = useState<EmailFormData>({
    subject: '',
    ccEmails: [],
    bccEmails: [],
    scheduledDate: '',
    scheduledTime: '',
    customMessage: '',
    sendAsPDF: false,
    sendAsHTML: true
  });
  
  // Input states for CC/BCC
  const [newCcEmail, setNewCcEmail] = useState('');
  const [newBccEmail, setNewBccEmail] = useState('');

  useEffect(() => {
    console.log('EmailModal useEffect triggered:', { isOpen, advisory: advisory?.title });
    if (isOpen) {
      fetchClients();
      // Set default subject
      setEmailData(prev => ({
        ...prev,
        subject: `Threat Advisory: ${advisory?.title || 'Untitled Advisory'}`,
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '09:00'
      }));
    }
  }, [isOpen, advisory?.title]);

  const fetchClients = async () => {
    console.log('fetchClients called');
    try {
      const response = await fetch('/api/clients');
      console.log('Clients API response:', response.status, response.ok);
      if (response.ok) {
        const data = await response.json();
        console.log('Clients data received:', data);
        setClients(data.filter((client: Client) => client.isActive));
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.emails.some(email => email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const addClientGroup = (client: Client) => {
    const existingGroup = selectedEmailGroups.find(g => g.clientId === client._id);
    if (existingGroup) return;

    const newGroup: EmailGroup = {
      id: `client-${client._id}`,
      type: 'client',
      name: client.name,
      emails: [...client.emails],
      clientId: client._id
    };

    setSelectedEmailGroups(prev => [...prev, newGroup]);
    setShowClientDropdown(false);
    setSearchTerm('');
  };

  const addCustomEmailGroup = () => {
    if (!customEmailInput.trim()) return;
    
    const emails = customEmailInput.split(',').map(e => e.trim()).filter(e => e);
    const validEmails = emails.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    
    if (validEmails.length === 0) {
      alert('Please enter valid email addresses');
      return;
    }

    const newGroup: EmailGroup = {
      id: `custom-${Date.now()}`,
      type: 'custom',
      name: validEmails.length === 1 ? validEmails[0] : `${validEmails.length} Custom Emails`,
      emails: validEmails
    };

    setSelectedEmailGroups(prev => [...prev, newGroup]);
    setCustomEmailInput('');
    setShowCustomEmailInput(false);
  };

  const removeEmailGroup = (groupId: string) => {
    setSelectedEmailGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const addCcEmail = () => {
    if (!newCcEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCcEmail)) return;
    setEmailData(prev => ({
      ...prev,
      ccEmails: [...prev.ccEmails, newCcEmail.trim()]
    }));
    setNewCcEmail('');
  };

  const removeCcEmail = (index: number) => {
    setEmailData(prev => ({
      ...prev,
      ccEmails: prev.ccEmails.filter((_, i) => i !== index)
    }));
  };

  const addBccEmail = () => {
    if (!newBccEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newBccEmail)) return;
    setEmailData(prev => ({
      ...prev,
      bccEmails: [...prev.bccEmails, newBccEmail.trim()]
    }));
    setNewBccEmail('');
  };

  const removeBccEmail = (index: number) => {
    setEmailData(prev => ({
      ...prev,
      bccEmails: prev.bccEmails.filter((_, i) => i !== index)
    }));
  };

  const getTotalRecipients = () => {
    return selectedEmailGroups.reduce((total, group) => total + group.emails.length, 0);
  };

  const generateEmailPreview = () => {
    // Import the production-ready template generator
    const { generateCyberThreatEmailTemplate } = require('../lib/emailTemplateGenerator');
    
    // Generate the full production template with current data
    try {
      return generateCyberThreatEmailTemplate(advisory, emailData.customMessage);
    } catch (error) {
      console.error('Error generating email preview:', error);
      // Fallback to basic template if import fails
      return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${emailData.subject}</title>
    <style>
        body { 
            margin: 0; 
            padding: 20px; 
            font-family: Arial, Helvetica, sans-serif; 
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); 
            color: #ffffff; 
            line-height: 1.6; 
        }
        .email-container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: rgba(15, 23, 42, 0.95); 
            border-radius: 16px; 
            overflow: hidden; 
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5); 
        }
        .header { 
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 25%, #a855f7 50%, #c084fc 75%, #3b82f6 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
        }
        .content { 
            padding: 30px; 
        }
        .severity { 
            display: inline-block; 
            padding: 8px 20px; 
            border-radius: 25px; 
            color: white; 
            font-weight: bold; 
            text-transform: uppercase; 
            margin: 10px 5px; 
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3); 
        }
        .critical { background: linear-gradient(135deg, #ef4444, #dc2626); }
        .high { background: linear-gradient(135deg, #ea580c, #c2410c); }
        .medium { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .low { background: linear-gradient(135deg, #10b981, #059669); }
        .section { 
            background: rgba(51, 65, 85, 0.7); 
            border-radius: 12px; 
            padding: 25px; 
            margin: 20px 0; 
            border: 1px solid rgba(148, 163, 184, 0.2); 
        }
        .section-title { 
            font-weight: bold; 
            color: #60a5fa; 
            margin-bottom: 15px; 
            font-size: 18px; 
        }
        @media only screen and (max-width: 599px) {
            .header { padding: 20px 15px; }
            .content { padding: 20px; }
            .section { padding: 15px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1 style="margin: 0 0 10px 0; font-size: 32px;">🛡️ CYBER THREAT ADVISORY</h1>
            <h2 style="margin: 0 0 10px 0; font-size: 20px;">${advisory.title || 'Untitled Advisory'}</h2>
            <p style="margin: 0; opacity: 0.9;">Critical Security Intelligence Alert</p>
        </div>
        <div style="padding: 25px; text-align: center;">
            ${advisory.severity ? `<span class="severity ${advisory.severity?.toLowerCase()}">${advisory.severity?.toUpperCase()}</span>` : ''}
            ${advisory.tlp ? `<span class="severity" style="background: linear-gradient(135deg, #f59e0b, #d97706);">TLP: ${advisory.tlp.toUpperCase()}</span>` : ''}
        </div>
        <div class="content">
            ${emailData.customMessage ? `
            <div class="section" style="background: rgba(5, 150, 105, 0.8);">
                <div class="section-title" style="color: #ffffff;">📢 Message from Security Team</div>
                <p style="margin: 0; color: #ecfdf5;">${emailData.customMessage.replace(/\n/g, '<br>')}</p>
            </div>
            ` : ''}
            
            ${advisory.executiveSummary || advisory.summary || advisory.description ? `
            <div class="section">
                <div class="section-title">📊 Executive Summary</div>
                <p style="margin: 0; color: rgba(255, 255, 255, 0.9);">${advisory.executiveSummary || advisory.summary || advisory.description}</p>
            </div>
            ` : ''}
            
            ${advisory.recommendations?.length ? `
            <div class="section">
                <div class="section-title" style="color: #10b981;">Security Recommendations</div>
                <ol style="margin: 0; padding-left: 20px;">
                    ${advisory.recommendations.map(rec => `<li style="margin: 10px 0; color: rgba(255, 255, 255, 0.9);">${rec}</li>`).join('')}
                </ol>
            </div>
            ` : ''}
            
            <div class="section" style="background: linear-gradient(135deg, #1e40af, #3b82f6); text-align: center;">
                <div class="section-title" style="color: #ffffff;">📋 Full Advisory Report</div>
                <p style="margin: 0 0 15px 0; color: rgba(255, 255, 255, 0.9);">Access comprehensive threat analysis and detailed information</p>
                <a href="#" style="display: inline-block; background: rgba(255, 255, 255, 0.1); color: #fbbf24; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: 600;"> View Full Report</a>
            </div>
        </div>
    </div>
</body>
</html>
      `.trim();
    }
  };

  const handleSendEmail = async () => {
    console.log('handleSendEmail called');
    console.log('selectedEmailGroups:', selectedEmailGroups);
    console.log('emailData:', emailData);
    
    if (selectedEmailGroups.length === 0) {
      alert('Please select at least one recipient group');
      return;
    }

    // Validate all email addresses
    const allEmails = [
      ...selectedEmailGroups.flatMap(g => g.emails),
      ...emailData.ccEmails,
      ...emailData.bccEmails
    ];
    
    const invalidEmails = allEmails.filter(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (invalidEmails.length > 0) {
      alert(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      return;
    }

    const isScheduled = emailData.scheduledDate && emailData.scheduledTime;
    if (isScheduled && new Date(`${emailData.scheduledDate}T${emailData.scheduledTime}`) <= new Date()) {
      alert('Scheduled time must be in the future');
      return;
    }

    setIsLoading(true);

    try {
      // Format recipients for the API
      const recipients = selectedEmailGroups.map(group => ({
        type: group.type,
        id: group.clientId || group.id,
        emails: group.emails,
        name: group.name
      }));

      const payload = {
        advisoryId: advisory?._id,
        recipients,
        subject: emailData.subject,
        customMessage: emailData.customMessage,
        ccEmails: emailData.ccEmails,
        bccEmails: emailData.bccEmails,
        sendAsPDF: emailData.sendAsPDF,
        sendAsHTML: emailData.sendAsHTML,
        ...(isScheduled && {
          scheduledDate: emailData.scheduledDate,
          scheduledTime: emailData.scheduledTime,
          isScheduled: true
        })
      };

      console.log('Sending payload:', payload);

      const response = await fetch('/api/emails/send-advisory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('API response:', response.status, response.ok);
      const result = await response.json();
      console.log('API result:', result);

      if (response.ok) {
        alert(isScheduled ? 'Email scheduled successfully!' : 'Email sent successfully!');
        onClose();
        // Reset form
        setSelectedEmailGroups([]);
        setEmailData({
          subject: '',
          ccEmails: [],
          bccEmails: [],
          scheduledDate: '',
          scheduledTime: '',
          customMessage: '',
          sendAsPDF: false,
          sendAsHTML: true
        });
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    console.log('EmailModal not rendering - isOpen is false');
    return null;
  }

  console.log('EmailModal rendering - isOpen is true');
  console.log('EmailModal rendering with:', { selectedEmailGroups: selectedEmailGroups.length, clients: clients.length });
  console.log('🚀 ADVANCED EmailModal with Full Email Management - Version 3.0');
  console.log('🎨 ADVANCED EmailModal CSS classes being applied:', {
    outerDiv: 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50',
    innerDiv: 'bg-slate-900/95 border border-neon-blue/30 rounded-xl'
  });

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: 999999 }}
    >
      <div 
        className="bg-slate-900/95 border border-neon-blue/30 rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto backdrop-blur-md"
        style={{ backgroundColor: '#1e293b', border: '2px solid #00d4ff', borderRadius: '12px' }}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSendEmail(); }} className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-600/50 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white font-rajdhani mb-2">
                🚀 Send Advisory Email - Full Featured
              </h2>
              <p className="text-slate-400 font-rajdhani">
                {advisory?.title || 'Untitled Advisory'}
              </p>
              <div className="mt-2 px-3 py-1 bg-green-500/20 border border-green-400/50 rounded-lg">
                <span className="text-green-400 font-rajdhani text-sm font-bold">
                  FULL FEATURED VERSION - Version 3.0
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left Column - Recipients */}
            <div className="space-y-6">
              {/* Recipients Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white font-rajdhani">
                    Recipients ({getTotalRecipients()} total)
                  </h3>
                </div>

                {/* Add Recipients Buttons */}
                <div className="flex space-x-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setShowClientDropdown(!showClientDropdown)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600/20 border border-blue-500/50 rounded-lg text-blue-400 hover:bg-blue-600/30 transition-all duration-200"
                  >
                    <Building className="h-4 w-4" />
                    <span className="font-rajdhani font-medium">Add Client</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showClientDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowCustomEmailInput(!showCustomEmailInput)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600/20 border border-green-500/50 rounded-lg text-green-400 hover:bg-green-600/30 transition-all duration-200"
                  >
                    <User className="h-4 w-4" />
                    <span className="font-rajdhani font-medium">Add Custom Emails</span>
                  </button>
                </div>

                {/* Client Dropdown */}
                {showClientDropdown && (
                  <div className="mb-4 p-4 bg-slate-800/30 border border-slate-600/50 rounded-lg">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {filteredClients.map((client) => (
                        <div
                          key={client._id}
                          className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 cursor-pointer transition-all duration-200"
                          onClick={() => addClientGroup(client)}
                        >
                          <div className="flex items-center space-x-3">
                            <Building className="h-4 w-4 text-blue-400" />
                            <div>
                              <div className="font-rajdhani font-medium text-white">{client.name}</div>
                              <div className="text-slate-400 font-rajdhani text-sm">
                                {client.emails.length} email{client.emails.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-slate-500 font-rajdhani text-xs max-w-xs">
                            {client.emails.slice(0, 2).join(', ')}
                            {client.emails.length > 2 && ` +${client.emails.length - 2} more`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Email Input */}
                {showCustomEmailInput && (
                  <div className="mb-4 p-4 bg-slate-800/30 border border-slate-600/50 rounded-lg">
                    <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                      Enter email addresses (comma-separated)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={customEmailInput}
                        onChange={(e) => setCustomEmailInput(e.target.value)}
                        placeholder="email1@example.com, email2@example.com"
                        className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50"
                      />
                      <button
                        type="button"
                        onClick={addCustomEmailGroup}
                        className="px-4 py-2 bg-green-600/20 border border-green-500/50 rounded-lg text-green-400 hover:bg-green-600/30 transition-all duration-200"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Selected Email Groups */}
                <div className="space-y-2">
                  {selectedEmailGroups.map((group) => (
                    <div key={group.id} className="p-3 bg-slate-800/50 border border-slate-600/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {group.type === 'client' ? (
                            <Building className="h-4 w-4 text-blue-400" />
                          ) : (
                            <User className="h-4 w-4 text-green-400" />
                          )}
                          <div>
                            <div className="font-rajdhani font-medium text-white">{group.name}</div>
                            <div className="text-slate-400 font-rajdhani text-sm">
                              {group.emails.length} email{group.emails.length !== 1 ? 's' : ''}: {group.emails.join(', ')}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeEmailGroup(group.id)}
                          className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-all duration-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CC/BCC Section */}
              <div className="space-y-4">
                {/* CC Emails */}
                <div>
                  <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                    CC (Optional)
                  </label>
                  <div className="space-y-2">
                    {emailData.ccEmails.map((email, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="email"
                          value={email}
                          readOnly
                          className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white font-rajdhani"
                        />
                        <button
                          type="button"
                          onClick={() => removeCcEmail(index)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-all duration-200"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex space-x-2">
                      <input
                        type="email"
                        value={newCcEmail}
                        onChange={(e) => setNewCcEmail(e.target.value)}
                        placeholder="cc@example.com"
                        className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50"
                      />
                      <button
                        type="button"
                        onClick={addCcEmail}
                        className="px-3 py-2 bg-blue-600/20 border border-blue-500/50 rounded-lg text-blue-400 hover:bg-blue-600/30 transition-all duration-200"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* BCC Emails */}
                <div>
                  <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                    BCC (Optional)
                  </label>
                  <div className="space-y-2">
                    {emailData.bccEmails.map((email, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="email"
                          value={email}
                          readOnly
                          className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white font-rajdhani"
                        />
                        <button
                          type="button"
                          onClick={() => removeBccEmail(index)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-all duration-200"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex space-x-2">
                      <input
                        type="email"
                        value={newBccEmail}
                        onChange={(e) => setNewBccEmail(e.target.value)}
                        placeholder="bcc@example.com"
                        className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50"
                      />
                      <button
                        type="button"
                        onClick={addBccEmail}
                        className="px-3 py-2 bg-blue-600/20 border border-blue-500/50 rounded-lg text-blue-400 hover:bg-blue-600/30 transition-all duration-200"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Email Content */}
            <div className="space-y-6">
              {/* Subject */}
              <div>
                <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
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
                  value={emailData.customMessage}
                  onChange={(e) => setEmailData(prev => ({ ...prev, customMessage: e.target.value }))}
                  placeholder="Add a custom message that will appear before the advisory content..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50 resize-none"
                />
              </div>

              {/* Schedule Options */}
              <div className="p-4 bg-slate-800/30 border border-slate-600/50 rounded-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <Clock className="h-5 w-5 text-neon-blue" />
                  <h4 className="font-rajdhani font-medium text-white">Schedule Send Time (Optional)</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-rajdhani text-sm mb-2">Date</label>
                    <input
                      type="date"
                      value={emailData.scheduledDate}
                      onChange={(e) => setEmailData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white font-rajdhani focus:outline-none focus:border-neon-blue/50"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-rajdhani text-sm mb-2">Time</label>
                    <input
                      type="time"
                      value={emailData.scheduledTime}
                      onChange={(e) => setEmailData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white font-rajdhani focus:outline-none focus:border-neon-blue/50"
                    />
                  </div>
                </div>
              </div>

              {/* Email Format Options */}
              <div className="p-4 bg-slate-800/30 border border-slate-600/50 rounded-lg">
                <h4 className="font-rajdhani font-medium text-white mb-4">Email Format Options</h4>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={emailData.sendAsHTML}
                      onChange={(e) => setEmailData(prev => ({ ...prev, sendAsHTML: e.target.checked }))}
                      className="w-4 h-4 text-neon-blue bg-slate-800 border-slate-600 rounded focus:ring-neon-blue focus:ring-2"
                    />
                    <span className="text-white font-rajdhani">Send as HTML (Recommended)</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={emailData.sendAsPDF}
                      onChange={(e) => setEmailData(prev => ({ ...prev, sendAsPDF: e.target.checked }))}
                      className="w-4 h-4 text-neon-blue bg-slate-800 border-slate-600 rounded focus:ring-neon-blue focus:ring-2"
                    />
                    <span className="text-white font-rajdhani">Attach as PDF</span>
                  </label>
                </div>
              </div>

              {/* Email Preview */}
              <div className="p-4 bg-slate-800/30 border border-slate-600/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-rajdhani font-medium text-white">Email Preview</h4>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center space-x-2 px-3 py-1 bg-blue-600/20 border border-blue-500/50 rounded text-blue-400 hover:bg-blue-600/30 transition-all duration-200"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="font-rajdhani text-sm">{showPreview ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                
                {showPreview && (
                  <div className="max-h-64 overflow-y-auto bg-white rounded border">
                    <div 
                      className="p-4 text-sm"
                      dangerouslySetInnerHTML={{ __html: generateEmailPreview() }}
                    />
                  </div>
                )}
              </div>

              {/* Recipients Summary */}
              {getTotalRecipients() > 0 && (
                <div className="p-4 bg-green-600/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center space-x-2 text-green-400">
                    <UserCheck className="h-4 w-4" />
                    <span className="font-rajdhani font-medium">
                      Ready to send to {getTotalRecipients()} recipient{getTotalRecipients() !== 1 ? 's' : ''} 
                      across {selectedEmailGroups.length} group{selectedEmailGroups.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
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
              disabled={isLoading || getTotalRecipients() === 0 || !emailData.subject.trim()}
              className="flex items-center space-x-2 px-6 py-3 bg-neon-blue/20 border border-neon-blue/50 rounded-lg text-neon-blue font-rajdhani font-semibold hover:bg-neon-blue/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (emailData.scheduledDate && emailData.scheduledTime) ? (
                <Clock className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>
                {isLoading ? 'Sending...' : (emailData.scheduledDate && emailData.scheduledTime) ? 'Schedule Email' : 'Send Now'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
