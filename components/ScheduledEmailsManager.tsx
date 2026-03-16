import React, { useState, useEffect } from 'react';
import { Clock, Edit3, Trash2, Send, Calendar, Mail, AlertCircle, CheckCircle, XCircle, Check, CheckCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ScheduledEmail {
  _id: string;
  advisoryId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  from?: string;  // Email account sending this email
  sentByName?: string;  // Admin who sent this email
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
      const response = await fetch(`/api/scheduled-emails/${emailId}/send-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        // Immediately update local state so UI reflects 'sent' without waiting for refresh
        setScheduledEmails(prev =>
          prev.map(email =>
            email._id === emailId
              ? { ...email, status: 'sent', sentAt: new Date().toISOString() }
              : email
          )
        );
        alert('Email sent successfully');
        fetchScheduledEmails(); // Also refresh from server to get accurate data
      } else {
        const result = await response.json();
        alert(`Failed to send: ${result.message || result.error}`);
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
    <div className="bg-slate-900 border border-cyan-500/20 rounded-xl p-3">
      <div className="flex justify-end mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Process Button */}
          <button
            onClick={handleProcessEmails}
            disabled={processing}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 disabled:from-orange-800 disabled:to-orange-700 text-white rounded transition-all duration-200 shadow hover:shadow-orange-500/20"
          >
            {processing ? (
              <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            {processing ? 'Processing...' : 'Process Due'}
          </button>
          
          {/* Filter Buttons */}
          <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0">
            {['all', 'pending', 'sent', 'failed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors whitespace-nowrap uppercase tracking-wider ${
                  filter === status
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-6">
          <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-slate-400 text-xs">Loading scheduled emails...</p>
        </div>
      ) : filteredEmails.length === 0 ? (
        <div className="text-center py-6">
          <Mail className="h-6 w-6 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No scheduled emails found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEmails.map((email) => (
            <div
              key={email._id}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 hover:border-slate-600 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex-1 w-full">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-semibold text-white text-sm">{email.subject}</h3>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${getStatusColor(email.status)}`}>
                      {getStatusIcon(email.status)}
                      {email.status}
                    </span>
                    {/* Read Status Indicator */}
                    {email.status === 'sent' && (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        email.isOpened 
                          ? 'text-blue-400 bg-blue-400/10' 
                          : 'text-gray-400 bg-gray-400/10'
                      }`} title={
                        email.isOpened 
                          ? `Opened ${email.opens?.length || 1} time${(email.opens?.length || 1) > 1 ? 's' : ''} • First: ${email.openedAt ? new Date(email.openedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) : 'N/A'}`
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
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 text-xs text-slate-300">
                    <div className="truncate">
                      <span className="text-slate-500 mr-1">From:</span>
                      {email.from || <span className="text-yellow-500/80">Default</span>}
                    </div>
                    <div className="truncate">
                      <span className="text-slate-500 mr-1">To:</span>
                      <span title={email.to.join(', ')}>{email.to.join(', ')}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-slate-500 mr-1">Sched:</span>
                      {new Date(email.scheduledDate).toLocaleString('en-IN', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                      })}
                    </div>
                    {email.sentByName && (
                      <div className="truncate">
                        <span className="text-slate-500 mr-1">By:</span>
                        {email.sentByName}
                      </div>
                    )}
                    {email.sentAt && (
                      <div className="truncate">
                        <span className="text-slate-500 mr-1">Sent:</span>
                        {new Date(email.sentAt).toLocaleString('en-IN', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                        })}
                      </div>
                    )}
                  </div>

                  {email.errorMessage && (
                    <div className="mt-2 text-red-400 text-xs bg-red-900/20 px-2 py-1 rounded inline-block">
                      <strong>Error:</strong> {email.errorMessage}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 self-end lg:self-center shrink-0">
                  {email.status === 'pending' && (
                    <>
                      <button
                        onClick={() => onEditEmail(email)}
                        className="p-1.5 text-cyan-400 hover:bg-cyan-900/20 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleSendNow(email._id)}
                        className="p-1.5 text-green-400 hover:bg-green-900/20 rounded transition-colors"
                        title="Send Now"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  {/* Delete button — visible for all statuses */}
                  <button
                    onClick={() => handleDelete(email._id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                    title={`Delete this ${email.status} email`}
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
