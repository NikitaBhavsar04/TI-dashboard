import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import HydrationSafe from '@/components/HydrationSafe';
import LoadingLogo from '@/components/LoadingLogo';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Mail, 
  Search, 
  Check, 
  X,
  Building,
  UserPlus,
  Eye,
  EyeOff,
  Upload,
  FileText
} from 'lucide-react';

interface Client {
  _id: string;
  client_id: string;
  client_name: string;
  name: string;
  emails?: string[];
  emailCount?: number;
  fw_index: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientFormData {
  client_id: string;
  client_name: string;
  name: string;
  emails: string[];
  fw_index: string;
  description: string;
  isActive: boolean;
}

export default function ClientsManagement() {
  const { user, hasRole, canViewEmails, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    client_id: '',
    client_name: '',
    name: '',
    emails: [''],
    fw_index: '',
    description: '',
    isActive: true
  });
  const [showInactive, setShowInactive] = useState(false);
  
  // CSV Import state
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<Array<{name: string, emails: string[]}>>([]);
  const [csvImporting, setCsvImporting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !hasRole('admin'))) {
      router.push('/');
      return;
    }
    
    if (hasRole('admin')) {
      fetchClients();
    }
  }, [user, hasRole, authLoading, router]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      } else {
        console.error('Failed to fetch clients');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (canViewEmails() && client.emails?.some(email => email.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesActiveFilter = showInactive ? true : client.isActive;
    return matchesSearch && matchesActiveFilter;
  });

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        client_id: client.client_id,
        client_name: client.client_name,
        name: client.name,
        emails: Array.isArray(client.emails) ? [...client.emails] : [''],
        fw_index: client.fw_index,
        description: client.description || '',
        isActive: client.isActive
      });
    } else {
      setEditingClient(null);
      setFormData({
        client_id: '',
        client_name: '',
        name: '',
        emails: [''],
        fw_index: '',
        description: '',
        isActive: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
    setFormData({
      client_id: '',
      client_name: '',
      name: '',
      emails: [''],
      fw_index: '',
      description: '',
      isActive: true
    });
  };

  const addEmailField = () => {
    setFormData(prev => ({
      ...prev,
      emails: [...prev.emails, '']
    }));
  };

  const removeEmailField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== index)
    }));
  };

  const updateEmailField = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.map((email, i) => i === index ? value : email)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validEmails = formData.emails.filter(email => email.trim());
    if (!formData.client_id.trim() || !formData.client_name.trim() || !formData.name.trim() || !formData.fw_index.trim() || validEmails.length === 0) {
      toast.error('Please provide client_id, client_name, name, fw_index, and at least one email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = validEmails.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      return;
    }

    try {
      const payload = {
        ...formData,
        emails: validEmails
      };

      const url = editingClient ? `/api/clients/${editingClient._id}` : '/api/clients';
      const method = editingClient ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
        handleCloseModal();
        fetchClients();
      } else {
        toast.error(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Failed to save client. Please try again.');
    }
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Are you sure you want to delete "${client.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/clients/${client._id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
        fetchClients();
      } else {
        toast.error(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Failed to delete client. Please try again.');
    }
  };

  // CSV Import Functions
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setCsvFile(file);
    processCsvContent(file);
  };

  const processCsvContent = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      const clients: Array<{name: string, emails: string[]}> = [];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      lines.forEach((line, index) => {
        // Skip potential header row
        if (index === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('email'))) {
          return;
        }

        const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
        const emails: string[] = [];
        let clientName = '';

        // Extract emails and client name from columns
        columns.forEach(col => {
          if (emailRegex.test(col)) {
            emails.push(col);
          } else if (col && !clientName && col.length > 2) {
            clientName = col;
          }
        });

        if (emails.length > 0) {
          // If no name found, use first part of first email as name
          if (!clientName) {
            clientName = emails[0].split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim();
          }

          // Check if client already exists in preview
          const existingClient = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
          if (existingClient) {
            // Merge emails and remove duplicates
            const existingEmails = Array.isArray(existingClient.emails) ? existingClient.emails : [];
            existingClient.emails = [...new Set([...existingEmails, ...emails])];
          } else {
            clients.push({ name: clientName, emails: [...new Set(emails)] });
          }
        }
      });

      setCsvPreview(clients);
    };

    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (csvPreview.length === 0) return;

    setCsvImporting(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      for (const client of csvPreview) {
        try {
          const response = await fetch('/api/clients', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              client_id: client.name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 4),
              client_name: client.name,
              name: client.name,
              emails: client.emails,
              fw_index: client.name.toLowerCase().replace(/\s+/g, '-') + '-fw-logs',
              description: `Imported from CSV on ${new Date().toLocaleDateString()}`,
              isActive: true
            })
          });

          if (response.ok) {
            successCount++;
          } else {
            const result = await response.json();
            errors.push(`Failed to import ${client.name}: ${result.message}`);
          }
        } catch (error) {
          errors.push(`Failed to import ${client.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} clients`);
      }
      if (errors.length > 0) {
        toast.error(`Import completed with errors. Check console for details.`);
        console.error('Import errors:', errors);
      }

      // Refresh clients list and close modal
      fetchClients();
      handleCloseCsvModal();

    } catch (error) {
      console.error('CSV import error:', error);
      toast.error('Failed to import CSV. Please try again.');
    } finally {
      setCsvImporting(false);
    }
  };

  const handleCloseCsvModal = () => {
    setShowCsvModal(false);
    setCsvFile(null);
    setCsvPreview([]);
  };

  if (authLoading) {
    return (
      <HydrationSafe>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <LoadingLogo message="Loading..." />
        </div>
      </HydrationSafe>
    );
  }

  if (!hasRole('admin')) {
    return null;
  }

  return (
    <HydrationSafe>
      <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
        <div className="relative z-10">
          <Head>
            <title>Client Management - EaglEye IntelDesk</title>
          </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-orbitron font-bold text-3xl text-white mb-2">
                Client Management
              </h1>
              <p className="text-slate-400 font-rajdhani">
                Manage email distribution lists for threat advisories
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center space-x-2 px-6 py-3 bg-neon-blue/20 border border-neon-blue/50 rounded-lg text-neon-blue font-rajdhani font-semibold hover:bg-neon-blue/30 transition-all duration-200"
              >
                <Plus className="h-5 w-5" />
                <span>Add Client</span>
              </button>
              
              {/* CSV Import - Only for Super Admin */}
              {user?.role === 'super_admin' && (
                <button
                  onClick={() => setShowCsvModal(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-500/20 border border-green-400/50 rounded-lg text-green-400 font-rajdhani font-semibold hover:bg-green-500/30 transition-all duration-200"
                >
                  <Upload className="h-5 w-5" />
                  <span>Import CSV</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="glass-panel-hover p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder={canViewEmails() ? "Search clients by name or email..." : "Search clients by name..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="show-inactive"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 text-neon-blue bg-slate-800 border-slate-600 rounded focus:ring-neon-blue focus:ring-2"
              />
              <label htmlFor="show-inactive" className="text-white font-rajdhani flex items-center space-x-2">
                {showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>Show inactive clients</span>
              </label>
            </div>
          </div>
        </div>

        {/* Clients List */}
        <div className="glass-panel-hover">
          {loading ? (
            <div className="p-8 text-center">
              <LoadingLogo message="Loading clients..." />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center">
              <Building className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <div className="text-slate-400 font-rajdhani">
                {searchTerm ? 'No clients found matching your search' : 'No clients added yet'}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-600/50">
              {filteredClients.map((client) => (
                <div key={client._id} className="p-6 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                          client.isActive ? 'bg-blue-500/20 border border-blue-400/50' : 'bg-gray-500/20 border border-gray-400/50'
                        }`}>
                          <Building className={`h-5 w-5 ${client.isActive ? 'text-blue-400' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <h3 className="font-orbitron font-bold text-lg text-white">
                            {client.client_name || client.name}
                          </h3>
                          <div className="flex items-center space-x-4 text-slate-400 font-rajdhani text-sm">
                            <span className="text-slate-500">ID: {client.client_id}</span>
                            <span className="flex items-center space-x-1">
                              <Mail className="h-4 w-4" />
                              <span>
                                {canViewEmails()
                                  ? `${client.emails?.length || 0} email${(client.emails?.length || 0) !== 1 ? 's' : ''}`
                                  : `${client.emailCount || 0} email${(client.emailCount || 0) !== 1 ? 's' : ''}`
                                }
                              </span>
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              client.isActive
                                ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                                : 'bg-gray-500/20 text-gray-300 border border-gray-400/30'
                            }`}>
                              {client.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="mt-1 text-slate-500 font-rajdhani text-xs">
                            Index: {client.fw_index}
                          </div>
                        </div>
                      </div>
                      
                      {client.description && (
                        <p className="text-slate-300 font-rajdhani mb-3 ml-13">
                          {client.description}
                        </p>
                      )}
                      
                      <div className="ml-13">
                        {canViewEmails() ? (
                          <>
                            <div className="text-slate-400 font-rajdhani text-sm mb-2">Email Addresses:</div>
                            <div className="flex flex-wrap gap-2">
                              {client.emails?.map((email, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-300 font-mono text-sm"
                                >
                                  {email}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="text-slate-400 font-rajdhani text-sm">
                            <div className="flex items-center space-x-2">
                              <EyeOff className="h-4 w-4" />
                              <span>Email addresses hidden (Admin access level)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleOpenModal(client)}
                        className="p-2 bg-neon-blue/20 border border-neon-blue/50 rounded-lg text-neon-blue hover:bg-neon-blue/30 transition-all duration-200"
                        title="Edit client"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {user?.role === 'super_admin' && (
                        <button
                          onClick={() => handleDelete(client)}
                          className="p-2 bg-red-500/20 border border-red-400/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-all duration-200"
                          title="Delete client (Super Admin only)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel-hover max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-600/50">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neon-blue/20 border border-neon-blue/50">
                    <UserPlus className="h-5 w-5 text-neon-blue" />
                  </div>
                  <div>
                    <h2 className="font-orbitron font-bold text-xl text-white">
                      {editingClient ? 'Edit Client' : 'Add New Client'}
                    </h2>
                    <p className="text-slate-400 font-rajdhani text-sm">
                      {editingClient ? 'Update client information' : 'Create a new email distribution group'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 transition-all duration-200"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <div className="px-6 space-y-6">

                {/* Client ID */}
                <div>
                  <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                    Client ID *
                  </label>
                  <input
                    type="text"
                    value={formData.client_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50 transition-all duration-200"
                    placeholder="e.g., google_001"
                    required
                  />
                </div>

                {/* Client Name */}
                <div>
                  <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={formData.client_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50 transition-all duration-200"
                    placeholder="e.g., Google"
                    required
                  />
                </div>

                {/* Display Name (old name field) */}
                <div>
                  <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50 transition-all duration-200"
                    placeholder="Enter display name"
                    required
                  />
                </div>

                {/* Firewall Index */}
                <div>
                  <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                    Firewall Index (OpenSearch) *
                  </label>
                  <input
                    type="text"
                    value={formData.fw_index}
                    onChange={(e) => setFormData(prev => ({ ...prev, fw_index: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50 transition-all duration-200"
                    placeholder="e.g., google-fw-logs"
                    required
                  />
                </div>

                {/* Email Addresses */}
                <div>
                  <label className="block text-slate-400 font-rajdhani text-sm mb-3">
                    Email Addresses *
                  </label>
                  <div className="space-y-3">
                    {formData.emails.map((email, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => updateEmailField(index, e.target.value)}
                          className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50 transition-all duration-200"
                          placeholder="email@example.com"
                          required={index === 0}
                        />
                        {formData.emails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEmailField(index)}
                            className="p-3 bg-red-500/20 border border-red-400/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-all duration-200"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addEmailField}
                      className="flex items-center space-x-2 px-4 py-2 bg-neon-green/20 border border-neon-green/50 rounded-lg text-neon-green hover:bg-neon-green/30 transition-all duration-200"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="font-rajdhani font-medium">Add Email</span>
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-slate-400 font-rajdhani text-sm mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-rajdhani placeholder-slate-400 focus:outline-none focus:border-neon-blue/50 transition-all duration-200 resize-none"
                    placeholder="Optional description for this client group"
                    rows={3}
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="client-active"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 text-neon-blue bg-slate-800 border-slate-600 rounded focus:ring-neon-blue focus:ring-2"
                  />
                  <label htmlFor="client-active" className="text-white font-rajdhani flex items-center space-x-2">
                    <span>Active client</span>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-slate-600/50">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-300 font-rajdhani font-medium hover:bg-slate-600/50 transition-all duration-200"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-3 bg-neon-blue/20 border border-neon-blue/50 rounded-lg text-neon-blue font-rajdhani font-semibold hover:bg-neon-blue/30 transition-all duration-200"
                >
                  <Check className="h-4 w-4" />
                  <span>
                    {editingClient ? 'Update Client' : 'Create Client'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-md border border-slate-600/50 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-orbitron font-bold text-xl text-white">Import Clients from CSV</h2>
              <button
                onClick={handleCloseCsvModal}
                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {!csvFile ? (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-slate-600/50 rounded-lg p-8 text-center hover:border-green-400/50 transition-all duration-200">
                  <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-white font-rajdhani font-medium mb-2">Upload CSV File</h3>
                  <p className="text-slate-400 font-rajdhani text-sm mb-4">
                    Upload a CSV file containing client information with names and email addresses.
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                    id="csv-client-upload"
                  />
                  <label
                    htmlFor="csv-client-upload"
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-green-500/20 border border-green-400/50 rounded-lg text-green-400 hover:bg-green-500/30 cursor-pointer transition-all duration-200"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="font-rajdhani font-medium">Choose CSV File</span>
                  </label>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-white font-rajdhani font-medium mb-2">CSV Format Example:</h4>
                  <pre className="text-slate-300 font-mono text-xs overflow-x-auto">
{`Name,Email,Email2
Acme Corp,admin@acme.com,security@acme.com
Tech Solutions,contact@tech.com
John Doe,john@personal.com`}
                  </pre>
                  <div className="mt-3 text-slate-400 font-rajdhani text-xs space-y-1">
                    <p>✓ First column should be client/company name</p>
                    <p>✓ Following columns can contain email addresses</p>
                    <p>✓ Multiple emails per client are supported</p>
                    <p>✓ Headers are automatically detected and skipped</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-700/50 border border-slate-600/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-green-400" />
                    <div>
                      <div className="text-white font-rajdhani font-medium">{csvFile.name}</div>
                      <div className="text-slate-400 font-rajdhani text-sm">
                        {csvPreview.length} clients found
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseCsvModal}
                    className="p-2 bg-red-500/20 border border-red-400/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-all duration-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {csvPreview.length > 0 && (
                  <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4">
                    <h4 className="text-white font-rajdhani font-medium mb-3">Preview (First 10 clients)</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {csvPreview.slice(0, 10).map((client, index) => (
                        <div key={index} className="bg-slate-800/50 rounded p-3">
                          <div className="text-white font-rajdhani font-medium">{client.name}</div>
                          <div className="text-slate-300 font-rajdhani text-sm">
                            {Array.isArray(client.emails) ? client.emails.join(', ') : 'No emails'}
                          </div>
                        </div>
                      ))}
                      {csvPreview.length > 10 && (
                        <div className="text-slate-400 font-rajdhani text-sm p-2 text-center">
                          ... and {csvPreview.length - 10} more clients
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={handleCloseCsvModal}
                    className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-400 font-rajdhani font-medium hover:bg-slate-700/70 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCsvImport}
                    disabled={csvImporting || csvPreview.length === 0}
                    className="flex-1 px-4 py-2 bg-green-500/20 border border-green-400/50 rounded-lg text-green-400 font-rajdhani font-medium hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {csvImporting ? 'Importing...' : `Import ${csvPreview.length} Clients`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
      </div>
    </HydrationSafe>
  );
}
