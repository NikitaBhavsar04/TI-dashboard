import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radio, Plus, Trash2, ExternalLink, Loader, Search, CheckCircle, XCircle, Power } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/router';
import LoadingLogo from '../../../components/LoadingLogo';
import { useToast } from '../../../contexts/ToastContext';

interface TelegramChannel {
  channel: string;
  enabled: boolean;
}

interface TelegramFeedData {
  channels: TelegramChannel[];
}

export default function TelegramFeedsPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newChannel, setNewChannel] = useState('');
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      router.push('/');
      return;
    }
    loadChannels();
  }, [isAuthenticated, isAdmin, router]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/telegram-feeds');
      const data: TelegramFeedData = await response.json();
      if (data.channels) {
        setChannels(data.channels);
      }
    } catch (err) {
      toast.error('Failed to load Telegram channels');
      console.error('Error loading channels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannel.trim()) {
      toast.warning('Please enter a valid Telegram channel name');
      return;
    }

    // Basic channel name validation (alphanumeric and underscores)
    if (!/^[a-zA-Z0-9_]+$/.test(newChannel.trim())) {
      toast.error('Channel name should only contain letters, numbers, and underscores');
      return;
    }

    // Check for duplicates
    if (channels.some(ch => ch.channel.toLowerCase() === newChannel.trim().toLowerCase())) {
      toast.warning('This Telegram channel already exists');
      return;
    }

    try {
      setAdding(true);
      const response = await fetch('/api/telegram-feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: newChannel.trim() })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Telegram channel added successfully!');
        setNewChannel('');
        await loadChannels();
      } else {
        toast.error(data.error || 'Failed to add Telegram channel');
      }
    } catch (err) {
      toast.error('Failed to add Telegram channel');
      console.error('Error adding channel:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteChannel = async (channel: string) => {
    if (!confirm(`Are you sure you want to remove this Telegram channel?\n\n${channel}`)) {
      return;
    }

    try {
      const response = await fetch('/api/telegram-feeds', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Telegram channel removed successfully!');
        await loadChannels();
      } else {
        toast.error(data.error || 'Failed to remove Telegram channel');
      }
    } catch (err) {
      toast.error('Failed to remove Telegram channel');
      console.error('Error removing channel:', err);
    }
  };

  const handleToggleChannel = async (channel: string, currentEnabled: boolean) => {
    try {
      setToggling(channel);
      const response = await fetch('/api/telegram-feeds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, enabled: !currentEnabled })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Telegram channel ${!currentEnabled ? 'enabled' : 'disabled'} successfully!`);
        await loadChannels();
      } else {
        toast.error(data.error || 'Failed to toggle Telegram channel');
      }
    } catch (err) {
      toast.error('Failed to toggle Telegram channel');
      console.error('Error toggling channel:', err);
    } finally {
      setToggling(null);
    }
  };

  const filteredChannels = channels.filter(ch =>
    ch.channel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeChannels = channels.filter(ch => ch.enabled).length;

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl backdrop-blur-sm border border-blue-500/30">
              <Radio className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="font-orbitron font-bold text-2xl md:text-3xl bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Telegram Feed Sources
              </h1>
              <p className="font-rajdhani text-base text-slate-400 mt-1">
                Manage Telegram channels for real-time threat intelligence updates
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Channels</p>
                  <p className="text-2xl font-bold text-blue-400 mt-1">{channels.length}</p>
                </div>
                <Radio className="h-10 w-10 text-blue-400/30" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Channels</p>
                  <p className="text-2xl font-bold text-green-400 mt-1">{activeChannels}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-400/30" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Add New Channel Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-400" />
              Add New Telegram Channel
            </h2>
            <form onSubmit={handleAddChannel} className="flex gap-3">
              <input
                type="text"
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                placeholder="Enter Telegram channel name (e.g., IsacaRuSec)"
                className="flex-1 px-4 py-2.5 bg-black/50 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                disabled={adding}
              />
              <button
                type="submit"
                disabled={adding || !newChannel.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {adding ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Channel
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Telegram channels..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors backdrop-blur-sm"
            />
          </div>
        </motion.div>

        {/* Telegram Channels List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingLogo message="Loading Telegram channels..." />
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Radio className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg">
                {searchQuery ? 'No Telegram channels found matching your search' : 'No Telegram channels configured yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChannels.map((ch, index) => (
                <motion.div
                  key={ch.channel}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-xl p-4 border transition-all group ${
                    ch.enabled 
                      ? 'border-gray-700/50 hover:border-blue-500/50' 
                      : 'border-gray-800/50 opacity-60 hover:opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Radio className={`h-4 w-4 flex-shrink-0 ${
                        ch.enabled ? 'text-blue-400' : 'text-gray-500'
                      }`} />
                      <a
                        href={`https://t.me/${ch.channel}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`transition-colors truncate flex items-center gap-2 group/link ${
                          ch.enabled 
                            ? 'text-gray-300 hover:text-blue-400' 
                            : 'text-gray-500 hover:text-gray-400'
                        }`}
                      >
                        <span className="truncate">@{ch.channel}</span>
                        <ExternalLink className="h-4 w-4 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        ch.enabled 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {ch.enabled ? 'Active' : 'Disabled'}
                      </span>
                      
                      {/* Toggle Button */}
                      <button
                        onClick={() => handleToggleChannel(ch.channel, ch.enabled)}
                        disabled={toggling === ch.channel}
                        className={`p-2 rounded-lg transition-all ${
                          ch.enabled
                            ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-500/10'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={ch.enabled ? 'Disable channel' : 'Enable channel'}
                      >
                        {toggling === ch.channel ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteChannel(ch.channel)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Remove channel"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
