import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Rss, Radio, MessageSquare, ArrowRight, Power, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import LoadingLogo from '../../components/LoadingLogo';

interface FeedStats {
  rss: { total: number; enabled: number };
  telegram: { total: number; enabled: number };
  reddit: { total: number; enabled: number };
}

export default function FeedsPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<FeedStats>({
    rss: { total: 0, enabled: 0 },
    telegram: { total: 0, enabled: 0 },
    reddit: { total: 0, enabled: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      router.push('/');
      return;
    }
    loadStats();
  }, [isAuthenticated, isAdmin, router]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Load RSS feeds stats
      const rssResponse = await fetch('/api/rss-feeds');
      const rssData = await rssResponse.json();
      const rssTotal = rssData.feeds?.length || 0;
      const rssEnabled = rssData.feeds?.filter((f: any) => f.enabled).length || 0;

      // Load Telegram feeds stats
      const telegramResponse = await fetch('/api/telegram-feeds');
      const telegramData = await telegramResponse.json();
      const telegramTotal = telegramData.channels?.length || 0;
      const telegramEnabled = telegramData.channels?.filter((c: any) => c.enabled).length || 0;

      // Load Reddit feeds stats
      const redditResponse = await fetch('/api/reddit-feeds');
      const redditData = await redditResponse.json();
      const redditTotal = redditData.subreddits?.length || 0;
      const redditEnabled = redditData.subreddits?.filter((s: any) => s.enabled).length || 0;

      setStats({
        rss: { total: rssTotal, enabled: rssEnabled },
        telegram: { total: telegramTotal, enabled: telegramEnabled },
        reddit: { total: redditTotal, enabled: redditEnabled }
      });
    } catch (err) {
      console.error('Error loading feed stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <LoadingLogo message="Loading feeds..." />
      </div>
    );
  }

  const feedCards = [
    {
      title: 'RSS Feeds',
      description: 'Manage RSS feed sources for threat intelligence articles',
      icon: Rss,
      path: '/admin/rss-feeds',
      stats: stats.rss,
      gradient: 'from-cyan-500 to-blue-600',
      iconBg: 'bg-cyan-500'
    },
    {
      title: 'Telegram Feeds',
      description: 'Manage Telegram channels for real-time threat updates',
      icon: Radio,
      path: '/admin/feeds/telegram',
      stats: stats.telegram,
      gradient: 'from-blue-500 to-indigo-600',
      iconBg: 'bg-blue-500'
    },
    {
      title: 'Reddit Feeds',
      description: 'Manage Reddit subreddits for community threat intelligence',
      icon: MessageSquare,
      path: '/admin/feeds/reddit',
      stats: stats.reddit,
      gradient: 'from-purple-500 to-pink-600',
      iconBg: 'bg-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/30 rounded-full filter blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/30 rounded-full filter blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl backdrop-blur-sm border border-cyan-500/30">
              <Rss className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="font-orbitron font-bold text-2xl md:text-3xl bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Feeds Management
              </h1>
              <p className="font-rajdhani text-base text-slate-400 mt-1">
                Manage all your threat intelligence data sources from a single interface
              </p>
            </div>
          </div>
        </motion.div>

        {/* Feed Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {feedCards.map((card, index) => {
            const Icon = card.icon;
            const enabledPercentage = card.stats.total > 0 
              ? Math.round((card.stats.enabled / card.stats.total) * 100) 
              : 0;

            return (
              <motion.div
                key={card.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onClick={() => router.push(card.path)}
                className="group relative cursor-pointer"
              >
                {/* Card */}
                <div className="relative h-full bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden transition-all duration-300 hover:border-cyan-400/30 hover:shadow-xl hover:bg-gradient-to-br hover:from-slate-800/70 hover:to-slate-700/70">
                  {/* Content */}
                  <div className="relative p-6">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-800/80 to-slate-700/80 border border-slate-600/50 flex items-center justify-center mb-4 group-hover:border-slate-500/80 transition-colors duration-300">
                      <Icon className="w-6 h-6 text-cyan-400" />
                    </div>

                    {/* Title & Description */}
                    <h3 className="font-inter text-lg font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors duration-300">
                      {card.title}
                    </h3>
                    <p className="font-inter text-sm text-slate-400 mb-4 leading-relaxed">
                      {card.description}
                    </p>

                    {/* Stats */}
                    <div className="space-y-3 mb-4">
                      {/* Total Sources */}
                      <div className="flex items-center justify-between">
                        <span className="font-inter text-xs text-slate-400">Total Sources</span>
                        <span className="font-inter text-sm font-semibold text-white">{card.stats.total}</span>
                      </div>

                      {/* Active Sources */}
                      <div className="flex items-center justify-between">
                        <span className="font-inter text-xs text-slate-400 flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                          Active
                        </span>
                        <span className="font-inter text-sm font-semibold text-green-400">{card.stats.enabled}</span>
                      </div>

                      {/* Inactive Sources */}
                      <div className="flex items-center justify-between">
                        <span className="font-inter text-xs text-slate-400 flex items-center gap-2">
                          <XCircle className="w-3.5 h-3.5 text-slate-500" />
                          Inactive
                        </span>
                        <span className="font-inter text-sm font-semibold text-slate-400">{card.stats.total - card.stats.enabled}</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-inter text-xs text-slate-400">Activation Rate</span>
                          <span className="font-inter text-xs font-semibold text-cyan-400">{enabledPercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 rounded-full"
                            style={{ width: `${enabledPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                      <span className="font-inter text-sm text-cyan-400 font-medium group-hover:text-cyan-300 transition-colors duration-300">
                        Manage Sources
                      </span>
                      <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6"
        >
          <h2 className="font-inter text-xl font-semibold text-white mb-6">Overall Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="font-inter text-3xl font-bold text-cyan-400 mb-2">
                {stats.rss.total + stats.telegram.total + stats.reddit.total}
              </div>
              <div className="font-inter text-sm text-slate-400">Total Data Sources</div>
            </div>
            <div className="text-center">
              <div className="font-inter text-3xl font-bold text-green-400 mb-2">
                {stats.rss.enabled + stats.telegram.enabled + stats.reddit.enabled}
              </div>
              <div className="font-inter text-sm text-slate-400">Active Sources</div>
            </div>
            <div className="text-center">
              <div className="font-inter text-3xl font-bold text-slate-400 mb-2">
                {(stats.rss.total - stats.rss.enabled) + (stats.telegram.total - stats.telegram.enabled) + (stats.reddit.total - stats.reddit.enabled)}
              </div>
              <div className="font-inter text-sm text-slate-400">Inactive Sources</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
