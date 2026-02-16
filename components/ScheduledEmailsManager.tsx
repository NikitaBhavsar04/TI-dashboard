import React, { useState, useEffect } from 'react';
import { Clock, Edit3, Trash2, Send, Calendar, Mail, AlertCircle, CheckCircle, XCircle, Check, CheckCheck, RefreshCw } from 'lucide-react';
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
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  createdAt: string;
  sentAt?: string;
  errorMessage?: string;
  trackingId?: string;
  isOpened?: boolean;
  openedAt?: string;
  opens?: Array<{
    timestamp: string;
    ipAddress?: string;
    userAgent?: string;
  }>;
  advisory?: {
    title: string;
    severity: string;
  };
}

interface ScheduledEmailsManagerProps {
  onEditEmail: (email: ScheduledEmail) => void;
  onClose?: () => void;
  onRefresh?: () => void;
}

const ScheduledEmailsManager: React.FC<ScheduledEmailsManagerProps> = ({ onEditEmail, onClose, onRefresh }) => {
  const { user } = useAuth();
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'failed' | 'cancelled'>('all');

  useEffect(() => {
    fetchScheduledEmails();
  }, []);

  const fetchScheduledEmails = async (showLoadingState = true) => {
    try {
      if (showLoadingState) {
        setLoading(true);
      }
      
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/scheduled-emails', {
        headers,
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setScheduledEmails(data.scheduledEmails || []);
      }
    } catch (error) {
      // Silently handle fetch errors (like server not running) on auto-refresh
    } finally {
      if (showLoadingState) {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (emailId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled email?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/scheduled-emails/${emailId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });

      if (response.ok) {
        setScheduledEmails(prev => prev.filter(email => email._id !== emailId));
        alert('Scheduled email deleted successfully');
      } else {
        const result = await response.json();
        alert(`Failed to delete: ${result.message}`);
      }
    } catch (error) {
      alert('Failed to delete scheduled email');
    }
  };

  const handleProcessEmails = async () => {
    if (!confirm('Process all due emails now? This will send emails that are scheduled to be sent.')) {
      return;
    }

    try {
      setProcessing(true);
      
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/scheduled-emails/process', {
        method: 'POST',
        headers,
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Email processing completed! Processed ${result.processed} emails.`);
        fetchScheduledEmails(); // Refresh the list
      } else {
        const result = await response.json();
        alert(`Failed to process emails: ${result.message}`);
      }
    } catch (error) {
      alert('Failed to process emails');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendNow = async (emailId: string) => {
    if (!confirm('Are you sure you want to send this email immediately?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/scheduled-emails/${emailId}/send-now`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });

      if (response.ok) {
        fetchScheduledEmails(); // Refresh the list
        alert('Email sent successfully');
      } else {
        const result = await response.json();
        alert(`Failed to send: ${result.message}`);
      }
    } catch (error) {
      alert('Failed to send email');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'sent':
        return 'text-green-400 bg-green-400/10';
      case 'failed':
        return 'text-red-400 bg-red-400/10';
      case 'cancelled':
        return 'text-gray-400 bg-gray-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const filteredEmails = scheduledEmails.filter(email => 
    filter === 'all' || email.status === filter
  );

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return null;
  }

  return (
    <div className="bg-slate-900 border border-cyan-500/20 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-orbitron font-bold text-white">Scheduled Emails</h2>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Process Button */}
          <button
            onClick={handleProcessEmails}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 disabled:from-orange-800 disabled:to-orange-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-orange-500/20"
          >
            {processing ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {processing ? 'Processing...' : 'Process Due Emails'}
          </button>
          
          {/* Filter Buttons */}
          <div className="flex gap-2">
            {['all', 'pending', 'sent', 'failed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Loading scheduled emails...</p>
        </div>
      ) : filteredEmails.length === 0 ? (
        <div className="text-center py-8">
          <Mail className="h-8 w-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No scheduled emails found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEmails.map((email) => (
            <div
              key={email._id}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-white text-sm">{email.subject}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(email.status)}`}>
                      {getStatusIcon(email.status)}
                      {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                    </span>
                    {/* Read Status Indicator */}
                    {email.status === 'sent' && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        email.isOpened 
                          ? 'text-blue-400 bg-blue-400/10' 
                          : 'text-gray-400 bg-gray-400/10'
                      }`} title={
                        email.isOpened 
                          ? `Opened ${email.opens?.length || 1} time${(email.opens?.length || 1) > 1 ? 's' : ''} • First: ${email.openedAt ? new Date(email.openedAt).toLocaleString() : 'N/A'}`
                          : 'Not opened yet'
                      }>
                        {email.isOpened ? (
                          <>
                            <CheckCheck className="h-3 w-3" />
                            Read
                          </>
                        ) : (
                          <>
                            <Check className="h-3 w-3" />
                            Delivered
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-slate-300 mb-3">
                    <div>
                      <span className="text-slate-500">To:</span> {email.to.join(', ')}
                    </div>
                    <div>
                      <span className="text-slate-500">Scheduled:</span> {new Date(email.scheduledDate).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                    {email.cc.length > 0 && (
                      <div>
                        <span className="text-slate-500">CC:</span> {email.cc.join(', ')}
                      </div>
                    )}
                    {email.sentAt && (
                      <div>
                        <span className="text-slate-500">Sent:</span> {new Date(email.sentAt).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    )}
                    {email.isOpened && email.openedAt && (
                      <div>
                        <span className="text-slate-500">First Opened:</span> {new Date(email.openedAt).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    )}
                    {email.opens && email.opens.length > 0 && (
                      <div>
                        <span className="text-slate-500">Total Opens:</span> {email.opens.length}
                      </div>
                    )}
                  </div>

                  {email.errorMessage && (
                    <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded mb-3">
                      <strong>Error:</strong> {email.errorMessage}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 ml-4">
                  {email.status === 'pending' && (
                    <>
                      <button
                        onClick={() => onEditEmail(email)}
                        className="p-2 text-cyan-400 hover:bg-cyan-900/20 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleSendNow(email._id)}
                        className="p-2 text-green-400 hover:bg-green-900/20 rounded-lg transition-colors"
                        title="Send Now"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(email._id)}
                    className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduledEmailsManager;
