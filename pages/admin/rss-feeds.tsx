import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Rss, Plus, Trash2, ExternalLink, Loader, Search, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import AnimatedBackground from '../../components/AnimatedBackground';

interface RssFeedData {
  feeds: string[];
}

export default function RSSFeedsPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();
  const [feeds, setFeeds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFeed, setNewFeed] = useState('');
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    if (feeds.includes(newFeed.trim())) {
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

  const filteredFeeds = feeds.filter(feed =>
    feed.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl backdrop-blur-sm border border-orange-500/30">
              <Rss className="h-8 w-8 text-orange-400" />
            </div>
            <div>
              <h1 className="text-4xl font-orbitron font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                RSS Feed Sources
              </h1>
              <p className="text-gray-400 mt-1">
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
                  <p className="text-3xl font-bold text-green-400 mt-1">{feeds.length}</p>
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
              <Loader className="h-8 w-8 animate-spin text-orange-400" />
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
                  key={feed}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-orange-500/50 transition-all group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Rss className="h-5 w-5 text-orange-400 flex-shrink-0" />
                      <a
                        href={feed}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-orange-400 transition-colors truncate flex items-center gap-2 group/link"
                      >
                        <span className="truncate">{feed}</span>
                        <ExternalLink className="h-4 w-4 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
                      </a>
                    </div>
                    <button
                      onClick={() => handleDeleteFeed(feed)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Remove feed"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
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
