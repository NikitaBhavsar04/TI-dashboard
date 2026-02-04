import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Rss, Plus, Trash2, ExternalLink, Loader, Search, CheckCircle, XCircle, Power } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import LoadingLogo from '../../components/LoadingLogo';

interface RssFeed {
  url: string;
  enabled: boolean;
}

interface RssFeedData {
  feeds: RssFeed[];
}

export default function RSSFeedsPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFeed, setNewFeed] = useState('');
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      router.push('/');
      return;
    }
    loadFeeds();
  }, [isAuthenticated, isAdmin, router]);

  const loadFeeds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rss-feeds');
      const data: RssFeedData = await response.json();
      if (data.feeds) {
        setFeeds(data.feeds);
      }
    } catch (err) {
      setError('Failed to load RSS feeds');
      console.error('Error loading feeds:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeed.trim()) {
      setError('Please enter a valid RSS feed URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(newFeed);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    // Check for duplicates
    if (feeds.some(feed => feed.url === newFeed.trim())) {
      setError('This RSS feed already exists');
      return;
    }

    try {
      setAdding(true);
      setError('');
      const response = await fetch('/api/rss-feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newFeed.trim() })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('RSS feed added successfully!');
        setNewFeed('');
        await loadFeeds();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to add RSS feed');
      }
    } catch (err) {
      setError('Failed to add RSS feed');
      console.error('Error adding feed:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteFeed = async (url: string) => {
    if (!confirm(`Are you sure you want to remove this RSS feed?\n\n${url}`)) {
      return;
    }

    try {
      const response = await fetch('/api/rss-feeds', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('RSS feed removed successfully!');
        await loadFeeds();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to remove RSS feed');
      }
    } catch (err) {
      setError('Failed to remove RSS feed');
      console.error('Error removing feed:', err);
    }
  };

  const handleToggleFeed = async (url: string, currentEnabled: boolean) => {
    try {
      setToggling(url);
      const response = await fetch('/api/rss-feeds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, enabled: !currentEnabled })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(`RSS feed ${!currentEnabled ? 'enabled' : 'disabled'} successfully!`);
        await loadFeeds();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to toggle RSS feed');
      }
    } catch (err) {
      setError('Failed to toggle RSS feed');
      console.error('Error toggling feed:', err);
    } finally {
      setToggling(null);
    }
  };

  const filteredFeeds = feeds.filter(feed =>
    feed.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeFeeds = feeds.filter(feed => feed.enabled).length;

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl backdrop-blur-sm border border-orange-500/30">
              <Rss className="h-10 w-10 text-orange-400" />
            </div>
            <div>
              <h1 className="font-orbitron font-bold text-4xl md:text-5xl bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                RSS Feed Sources
              </h1>
              <p className="font-rajdhani text-lg text-slate-400 mt-2">
                Manage RSS feed sources for threat intelligence gathering
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total RSS Feeds</p>
                  <p className="text-3xl font-bold text-orange-400 mt-1">{feeds.length}</p>
                </div>
                <Rss className="h-12 w-12 text-orange-400/30" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Sources</p>
                  <p className="text-3xl font-bold text-green-400 mt-1">{activeFeeds}</p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-400/30" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Add New Feed Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-orange-400" />
              Add New RSS Feed
            </h2>
            <form onSubmit={handleAddFeed} className="flex gap-3">
              <input
                type="url"
                value={newFeed}
                onChange={(e) => setNewFeed(e.target.value)}
                placeholder="Enter RSS feed URL (e.g., https://example.com/feed.xml)"
                className="flex-1 px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                disabled={adding}
              />
              <button
                type="submit"
                disabled={adding || !newFeed.trim()}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {adding ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Feed
                  </>
                )}
              </button>
            </form>

            {/* Success/Error Messages */}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2 text-green-400"
              >
                <CheckCircle className="h-4 w-4" />
                {success}
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400"
              >
                <XCircle className="h-4 w-4" />
                {error}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search RSS feeds..."
              className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 transition-colors backdrop-blur-sm"
            />
          </div>
        </motion.div>

        {/* RSS Feeds List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingLogo message="Loading RSS feeds..." />
            </div>
          ) : filteredFeeds.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Rss className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-xl">
                {searchQuery ? 'No RSS feeds found matching your search' : 'No RSS feeds configured yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFeeds.map((feed, index) => (
                <motion.div
                  key={feed.url}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-xl p-4 border transition-all group ${
                    feed.enabled 
                      ? 'border-gray-700/50 hover:border-orange-500/50' 
                      : 'border-gray-800/50 opacity-60 hover:opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Rss className={`h-5 w-5 flex-shrink-0 ${
                        feed.enabled ? 'text-orange-400' : 'text-gray-500'
                      }`} />
                      <a
                        href={feed.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`transition-colors truncate flex items-center gap-2 group/link ${
                          feed.enabled 
                            ? 'text-gray-300 hover:text-orange-400' 
                            : 'text-gray-500 hover:text-gray-400'
                        }`}
                      >
                        <span className="truncate">{feed.url}</span>
                        <ExternalLink className="h-4 w-4 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        feed.enabled 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {feed.enabled ? 'Active' : 'Disabled'}
                      </span>
                      
                      {/* Toggle Button */}
                      <button
                        onClick={() => handleToggleFeed(feed.url, feed.enabled)}
                        disabled={toggling === feed.url}
                        className={`p-2 rounded-lg transition-all ${
                          feed.enabled
                            ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-500/10'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={feed.enabled ? 'Disable feed' : 'Enable feed'}
                      >
                        {toggling === feed.url ? (
                          <Loader className="h-5 w-5 animate-spin" />
                        ) : (
                          <Power className="h-5 w-5" />
                        )}
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteFeed(feed.url)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Remove feed"
                      >
                        <Trash2 className="h-5 w-5" />
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
