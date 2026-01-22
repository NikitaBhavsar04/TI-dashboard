import React, { useState, useEffect } from 'react';
import { X, Send, Clock, Calendar, Plus, Minus, Users, Search, Mail, UserCheck, Eye, FileText, Download, Building, User, Check, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Helper function to mask email addresses for admin users
const maskEmailForAdmin = (email: string, userRole: string): string => {
  if (userRole === 'super_admin') {
    return email; // Super admin can see full email
  }
  
  if (userRole === 'admin') {
    // Admin sees only domain part: user@example.com -> [HIDDEN]@example.com
    const atIndex = email.indexOf('@');
    if (atIndex > 0) {
      return `[HIDDEN]${email.substring(atIndex)}`;
    }
    return '[HIDDEN]';
  }
  
  return '[UNAUTHORIZED]'; // Other roles can't see emails
};

// Helper function to get display emails based on user role
const getDisplayEmails = (emails: string[], userRole: string): string[] => {
  if (!Array.isArray(emails)) return [];
  
  if (userRole === 'super_admin') {
    return emails; // Super admin sees all emails
  }
  
  if (userRole === 'admin') {
    return emails.map(email => maskEmailForAdmin(email, userRole));
  }
  
  return ['[UNAUTHORIZED]']; // Other roles can't see emails
};

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
  // Get user authentication context
  const { user, canViewEmails, hasRole } = useAuth();
  
  // Check if user has permission to send emails (admin or super_admin)
  const canSendEmails = hasRole('admin'); // This includes super_admin due to role hierarchy
  
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
    if (isOpen) {
      fetchClients();
      // Set default subject
      setEmailData(prev => ({
        ...prev,
        subject: `Threat Advisory: ${advisory?.title || 'Untitled Advisory'}`,
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '09:00'
      }));
    } else {
      // Reset form when modal closes
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
      setSearchTerm('');
      setShowClientDropdown(false);
      setShowCustomEmailInput(false);
      setCustomEmailInput('');
      setNewCcEmail('');
      setNewBccEmail('');
      setShowPreview(false);
    }
  }, [isOpen, advisory?.title]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        const clientsArray = Array.isArray(data) ? data : [];
        const filteredClients = clientsArray.filter((client: any) => {
          if (!client || typeof client !== 'object') return false;
          if (!client._id || !client.name) return false;
          return client.isActive === true;
        });
        setClients(filteredClients);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    }
  };

  const filteredClients = clients.filter(client => {
    if (!client) return false;
    const nameMatch = client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const emailMatch = Array.isArray(client?.emails) ? 
      client.emails.some(email => email?.toLowerCase().includes(searchTerm.toLowerCase())) : false;
    return nameMatch || emailMatch;
  });

  // Advanced email preview generation
  const generateEmailPreview = () => {
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
            border: 2px solid rgba(0, 212, 255, 0.3);
        }
        .header { 
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); 
            padding: 30px 25px; 
            text-align: center; 
            border-bottom: 2px solid rgba(0, 212, 255, 0.3);
        }
        .content { 
            padding: 25px; 
        }
        .section { 
            margin: 20px 0; 
            padding: 20px; 
            background: rgba(30, 41, 59, 0.7); 
            border-radius: 12px; 
            border: 1px solid rgba(0, 212, 255, 0.2);
        }
        .section-title { 
            font-weight: bold; 
            color: #00d4ff; 
            margin-bottom: 10px; 
            font-size: 18px;
        }
        .severity { 
            padding: 8px 16px; 
            border-radius: 6px; 
            color: white; 
            font-weight: bold; 
            display: inline-block; 
            margin: 5px 5px 5px 0;
        }
        .critical { background: linear-gradient(135deg, #dc2626, #b91c1c); }
        .high { background: linear-gradient(135deg, #ea580c, #c2410c); }
        .medium { background: linear-gradient(135deg, #d97706, #b45309); }
        .low { background: linear-gradient(135deg, #16a34a, #15803d); }
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
            
            <div class="section">
                <div class="section-title">📋 Advisory Overview</div>
                <p><strong>Title:</strong> ${advisory.title || 'N/A'}</p>
                <p><strong>Author:</strong> ${advisory.author || 'N/A'}</p>
                <p><strong>Published:</strong> ${advisory.publishedDate || 'N/A'}</p>
                ${advisory.description ? `<p><strong>Description:</strong> ${advisory.description}</p>` : ''}
            </div>
            
            ${advisory.cveIds && advisory.cveIds.length > 0 ? `
            <div class="section">
                <div class="section-title">🔍 CVE Information</div>
                <ul>${advisory.cveIds.map(cve => `<li><strong>${cve}</strong></li>`).join('')}</ul>
            </div>
            ` : ''}
            
            ${advisory.recommendations && advisory.recommendations.length > 0 ? `
            <div class="section">
                <div class="section-title">Recommendations</div>
                <ul>${advisory.recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>
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
  };

  // Function to add client group with role-based email masking
  const addClientGroup = (client: Client) => {
    if (!client?._id) return;
    
    const existingGroup = selectedEmailGroups.find(g => g?.clientId === client._id);
    if (existingGroup) return;

    // Get emails based on user role - admins get masked emails, super_admin gets real emails
    const displayEmails = getDisplayEmails(Array.isArray(client?.emails) ? client.emails : [], user?.role || 'user');

    const newGroup: EmailGroup = {
      id: `client-${client._id}`,
      type: 'client',
      name: client?.name || 'Unnamed Client',
      emails: displayEmails,
      clientId: client._id
    };

    setSelectedEmailGroups(prev => [...prev, newGroup]);
    setShowClientDropdown(false);
    setSearchTerm('');
  };

  const addCustomEmailGroup = () => {
    if (!customEmailInput?.trim()) return;
    
    const emails = customEmailInput.split(',').map(e => e?.trim()).filter(e => e);
    const validEmails = emails.filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    
    if (validEmails.length === 0) {
      alert('Please enter valid email addresses');
      return;
    }

    const newGroup: EmailGroup = {
      id: `custom-${Date.now()}`,
      type: 'custom',
      name: `Custom Emails (${validEmails.length})`,
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
    if (!newCcEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCcEmail)) {
      alert('Please enter a valid email address');
      return;
    }
    if (emailData.ccEmails.includes(newCcEmail)) {
      alert('Email already added');
      return;
    }
    setEmailData(prev => ({
      ...prev,
      ccEmails: [...prev.ccEmails, newCcEmail]
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
    if (!newBccEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newBccEmail)) {
      alert('Please enter a valid email address');
      return;
    }
    if (emailData.bccEmails.includes(newBccEmail)) {
      alert('Email already added');
      return;
    }
    setEmailData(prev => ({
      ...prev,
      bccEmails: [...prev.bccEmails, newBccEmail]
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
    return selectedEmailGroups.reduce((total, group) => {
      return total + (Array.isArray(group.emails) ? group.emails.length : 0);
    }, 0);
  };

  const handleSendEmail = async () => {
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

  if (!isOpen) return null;

  if (!canSendEmails) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-red-500/50 rounded-xl p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400 mb-4">Access Denied</h2>
          <p className="text-slate-300 mb-6">You need admin privileges to send emails.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

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
                🚀 Send Advisory Email - Advanced Version
              </h2>
              <p className="text-slate-400 font-rajdhani">
                {advisory?.title || 'Untitled Advisory'}
              </p>
              <div className="mt-2 px-3 py-1 bg-green-500/20 border border-green-400/50 rounded-lg">
                <span className="text-green-400 font-rajdhani text-sm font-bold">
                  ADVANCED VERSION with Role-Based Access
                </span>
              </div>
              {user?.role && (
                <div className="mt-1 px-3 py-1 bg-blue-500/20 border border-blue-400/50 rounded-lg">
                  <span className="text-blue-400 font-rajdhani text-xs">
                    Role: {user.role.toUpperCase()} | 
                    {user.role === 'super_admin' ? ' Full Email Visibility' : ' Limited Email Visibility'}
                  </span>
                </div>
              )}
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
                          onClick={() => addClientGroup(client)}
                          className="flex items-center justify-between p-3 bg-slate-700/30 border border-slate-600/30 rounded-lg hover:bg-slate-600/50 cursor-pointer transition-all duration-200"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/50">
                              <Building className="h-4 w-4 text-blue-400" />
                            </div>
                            <div>
                              <div className="font-rajdhani font-medium text-white">
                                {client.name}
                              </div>
                              <div className="text-slate-400 font-rajdhani text-sm">
                                {client.emails?.length || 0} email{(client.emails?.length || 0) !== 1 ? 's' : ''}
                                {user?.role === 'super_admin' && client.emails?.length > 0 && (
                                  <span className="ml-2">
                                    {client.emails.slice(0, 2).join(', ')}
                                    {client.emails.length > 2 && '...'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-blue-400" />
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

                {/* Selected Recipients */}
                <div className="space-y-2">
                  {selectedEmailGroups.map((group) => (
                    <div key={group.id} className="p-3 bg-slate-800/50 border border-slate-600/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 border border-green-400/50">
                            {group.type === 'client' ? <Building className="h-4 w-4 text-green-400" /> : <User className="h-4 w-4 text-green-400" />}
                          </div>
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

            {/* Right Column - Email Details */}
            <div className="space-y-6">
              {/* Subject */}
              <div>
                <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                  Subject
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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-neon-blue" />
                    <div>
                      <h4 className="font-rajdhani font-medium text-white">Schedule Email</h4>
                      <p className="text-slate-400 font-rajdhani text-sm">Send immediately or schedule for later</p>
                    </div>
                  </div>
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
