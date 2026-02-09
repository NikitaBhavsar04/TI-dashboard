import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Plus, Trash2, ExternalLink, Loader, Search, CheckCircle, XCircle, Power } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/router';
import LoadingLogo from '../../../components/LoadingLogo';
import { useToast } from '../../../contexts/ToastContext';

interface RedditSubreddit {
  subreddit: string;
  enabled: boolean;
}

interface RedditFeedData {
  subreddits: RedditSubreddit[];
}

export default function RedditFeedsPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [subreddits, setSubreddits] = useState<RedditSubreddit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSubreddit, setNewSubreddit] = useState('');
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      router.push('/');
      return;
    }
    loadSubreddits();
  }, [isAuthenticated, isAdmin, router]);

  const loadSubreddits = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reddit-feeds');
      const data: RedditFeedData = await response.json();
      if (data.subreddits) {
        setSubreddits(data.subreddits);
      }
    } catch (err) {
      toast.error('Failed to load Reddit subreddits');
      console.error('Error loading subreddits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubreddit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubreddit.trim()) {
      toast.warning('Please enter a valid subreddit name');
      return;
    }

    // Basic subreddit name validation (alphanumeric and underscores)
    if (!/^[a-zA-Z0-9_]+$/.test(newSubreddit.trim())) {
      toast.error('Subreddit name should only contain letters, numbers, and underscores');
      return;
    }

    // Check for duplicates
    if (subreddits.some(sub => sub.subreddit.toLowerCase() === newSubreddit.trim().toLowerCase())) {
      toast.warning('This subreddit already exists');
      return;
    }

    try {
      setAdding(true);
      const response = await fetch('/api/reddit-feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subreddit: newSubreddit.trim() })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Subreddit added successfully!');
        setNewSubreddit('');
        await loadSubreddits();
      } else {
        toast.error(data.error || 'Failed to add subreddit');
      }
    } catch (err) {
      toast.error('Failed to add subreddit');
      console.error('Error adding subreddit:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSubreddit = async (subreddit: string) => {
    if (!confirm(`Are you sure you want to remove this subreddit?\n\nr/${subreddit}`)) {
      return;
    }

    try {
      const response = await fetch('/api/reddit-feeds', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subreddit })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Subreddit removed successfully!');
        await loadSubreddits();
      } else {
        toast.error(data.error || 'Failed to remove subreddit');
      }
    } catch (err) {
      toast.error('Failed to remove subreddit');
      console.error('Error removing subreddit:', err);
    }
  };

  const handleToggleSubreddit = async (subreddit: string, currentEnabled: boolean) => {
    try {
      setToggling(subreddit);
      const response = await fetch('/api/reddit-feeds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subreddit, enabled: !currentEnabled })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Subreddit ${!currentEnabled ? 'enabled' : 'disabled'} successfully!`);
        await loadSubreddits();
      } else {
        toast.error(data.error || 'Failed to toggle subreddit');
      }
    } catch (err) {
      toast.error('Failed to toggle subreddit');
      console.error('Error toggling subreddit:', err);
    } finally {
      setToggling(null);
    }
  };

  const filteredSubreddits = subreddits.filter(sub =>
    sub.subreddit.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSubreddits = subreddits.filter(sub => sub.enabled).length;

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
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl backdrop-blur-sm border border-purple-500/30">
              <MessageSquare className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h1 className="font-orbitron font-bold text-2xl md:text-3xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Reddit Feed Sources
              </h1>
              <p className="font-rajdhani text-base text-slate-400 mt-1">
                Manage Reddit subreddits for community threat intelligence
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Subreddits</p>
                  <p className="text-2xl font-bold text-purple-400 mt-1">{subreddits.length}</p>
                </div>
                <MessageSquare className="h-10 w-10 text-purple-400/30" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Subreddits</p>
                  <p className="text-2xl font-bold text-green-400 mt-1">{activeSubreddits}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-400/30" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Add New Subreddit Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-purple-400" />
              Add New Subreddit
            </h2>
            <form onSubmit={handleAddSubreddit} className="flex gap-3">
              <input
                type="text"
                value={newSubreddit}
                onChange={(e) => setNewSubreddit(e.target.value)}
                placeholder="Enter subreddit name (e.g., cybersecurity)"
                className="flex-1 px-4 py-2.5 bg-black/50 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                disabled={adding}
              />
              <button
                type="submit"
                disabled={adding || !newSubreddit.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {adding ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Subreddit
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
              placeholder="Search subreddits..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors backdrop-blur-sm"
            />
          </div>
        </motion.div>

        {/* Reddit Subreddits List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingLogo message="Loading subreddits..." />
            </div>
          ) : filteredSubreddits.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg">
                {searchQuery ? 'No subreddits found matching your search' : 'No subreddits configured yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubreddits.map((sub, index) => (
                <motion.div
                  key={sub.subreddit}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-xl p-4 border transition-all group ${
                    sub.enabled 
                      ? 'border-gray-700/50 hover:border-purple-500/50' 
                      : 'border-gray-800/50 opacity-60 hover:opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <MessageSquare className={`h-4 w-4 flex-shrink-0 ${
                        sub.enabled ? 'text-purple-400' : 'text-gray-500'
                      }`} />
                      <a
                        href={`https://reddit.com/r/${sub.subreddit}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`transition-colors truncate flex items-center gap-2 group/link ${
                          sub.enabled 
                            ? 'text-gray-300 hover:text-purple-400' 
                            : 'text-gray-500 hover:text-gray-400'
                        }`}
                      >
                        <span className="truncate">r/{sub.subreddit}</span>
                        <ExternalLink className="h-4 w-4 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        sub.enabled 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {sub.enabled ? 'Active' : 'Disabled'}
                      </span>
                      
                      {/* Toggle Button */}
                      <button
                        onClick={() => handleToggleSubreddit(sub.subreddit, sub.enabled)}
                        disabled={toggling === sub.subreddit}
                        className={`p-2 rounded-lg transition-all ${
                          sub.enabled
                            ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-500/10'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={sub.enabled ? 'Disable subreddit' : 'Enable subreddit'}
                      >
                        {toggling === sub.subreddit ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteSubreddit(sub.subreddit)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Remove subreddit"
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
