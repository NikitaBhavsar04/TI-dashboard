import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  AlertTriangle, 
  Shield, 
  Activity,
  RefreshCw,
  Grid,
  List,
  Zap,
  Plus,
  ChevronDown
} from 'lucide-react';
import HydrationSafe from '@/components/HydrationSafe';
import AdvisoryCard from '@/components/AdvisoryCard';
import AdvisoryCardWithEmail from '@/components/AdvisoryCardWithEmail';
import EmailModal from '@/components/EmailModal';
import ScheduledEmailsManager from '@/components/ScheduledEmailsManager';
import EditScheduledEmailModal from '@/components/EditScheduledEmailModal';
import { formatDate } from '@/lib/utils';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';

interface AdvisoriesPageProps {
  advisories: any[];
  categories: string[];
  stats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    recent: number;
  };
  currentPage: number;
  totalPages: number;
  totalAdvisories: number;
}

type SortOption = 'newest' | 'oldest' | 'severity' | 'title';
type ViewMode = 'grid' | 'list';

export default function AdvisoriesPage({ advisories, categories, stats, currentPage, totalPages, totalAdvisories }: AdvisoriesPageProps) {
  const { isAdmin, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [filteredAdvisories, setFilteredAdvisories] = useState<any[]>(advisories);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedAdvisoryForEmail, setSelectedAdvisoryForEmail] = useState<any | null>(null);
  const [showScheduledEmails, setShowScheduledEmails] = useState(false);
  const [editEmailModalOpen, setEditEmailModalOpen] = useState(false);
  const [editingEmailData, setEditingEmailData] = useState<any>(null);
  const [selectedScheduledEmail, setSelectedScheduledEmail] = useState<any>(null);
  const [expandedAdvisoryId, setExpandedAdvisoryId] = useState<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Client-side authentication check
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  // Listen for scheduled emails toggle event from sidebar
  useEffect(() => {
    const handleToggle = () => {
      setShowScheduledEmails(prev => !prev);
    };
    
    window.addEventListener('toggleScheduledEmails', handleToggle);
    return () => window.removeEventListener('toggleScheduledEmails', handleToggle);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showActionsMenu && !target.closest('.actions-dropdown')) {
        setShowActionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionsMenu]);

  const severityLevels = ['Critical', 'High', 'Medium', 'Low'];

  const severityStats = [
    { level: 'Total', count: stats.total, color: 'cyan-800', borderColor: 'border-cyan-400', bgColor: 'from-cyan-400/20 to-cyan-400/10', glowColor: 'shadow-cyan-400/20', icon: TrendingUp },
    { level: 'Critical', count: stats.critical, color: 'red-500', borderColor: 'border-red-500', bgColor: 'from-red-500/20 to-red-500/10', glowColor: 'shadow-red-500/20', icon: Zap },
    { level: 'High', count: stats.high, color: 'orange-500', borderColor: 'border-orange-500', bgColor: 'from-orange-500/20 to-orange-500/10', glowColor: 'shadow-orange-500/20', icon: AlertTriangle },
    { level: 'Medium', count: stats.medium, color: 'yellow-500', borderColor: 'border-yellow-500', bgColor: 'from-yellow-500/20 to-yellow-500/10', glowColor: 'shadow-yellow-500/20', icon: Activity },
    { level: 'Low', count: stats.low, color: 'blue-500', borderColor: 'border-blue-500', bgColor: 'from-blue-500/20 to-blue-500/10', glowColor: 'shadow-blue-500/20', icon: Shield },
  ];

  // Apply filters and sorting whenever advisories or filter settings change
  useEffect(() => {
    filterAndSortAdvisories();
  }, [advisories, searchTerm, selectedCategory, selectedSeverity, sortBy]);

  const filterAndSortAdvisories = () => {
    let filtered = [...advisories];

    // Apply filters
    if (searchTerm) {
      filtered = filtered.filter(
        (advisory) =>
          advisory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          advisory.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          advisory.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          advisory.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((advisory) => advisory.category === selectedCategory);
    }

    if (selectedSeverity) {
      filtered = filtered.filter((advisory) => advisory.severity === selectedSeverity);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
        case 'oldest':
          return new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime();
        case 'severity':
          const severityOrder = ['Critical', 'High', 'Medium', 'Low'];
          return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredAdvisories(filtered);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedSeverity('');
    setSortBy('newest');
  };

  const handlePageChange = (page: number) => {
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
    router.push({
      pathname: '/advisories',
      query: { page }
    });
  };

  const handleEmailAdvisory = (advisory: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedAdvisoryForEmail(advisory);
    setEmailModalOpen(true);
  };

  const handleEditScheduledEmail = (scheduledEmail: any) => {
    setSelectedScheduledEmail(scheduledEmail);
    setEditEmailModalOpen(true);
  };

  const handleScheduledEmailsRefresh = () => {
    // This will be handled by the ScheduledEmailsManager component
  };

  const handleEditEmailSave = async (emailData: any) => {
    try {
      const response = await fetch(`/api/scheduled-emails/${emailData._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (response.ok) {
        setEditEmailModalOpen(false);
        setEditingEmailData(null);
        // Trigger refresh of scheduled emails
        handleScheduledEmailsRefresh();
      }
    } catch (error) {
      console.error('Error updating scheduled email:', error);
    }
  };

  const handleAutoFeed = async () => {
    setIsAutoRunning(true);
    try {
      const resp = await fetch('/api/auto-feed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maxItems: 1 }) });
      const data = await resp.json();
      if (resp.ok) {
        // Show success message with links
        if (data.inserted && data.inserted.length > 0) {
          const links = data.inserted.map((item: any) => 
            `\n${item.advisoryId}:\n  HTML: ${window.location.origin}${item.viewUrl}\n  Database: ${window.location.origin}${item.databaseUrl}`
          ).join('\n');
          alert(`✓ Generated ${data.inserted.length} advisories:\n${links}`);
        } else {
          alert('⚠️ No new advisories generated. This usually means:\n\n1. All RSS items have been processed before (cached)\n2. No new RSS items match the criteria\n\nTry clicking "Clear Cache" button to reprocess items.');
        }
        // Refresh server-side props by reloading
        router.reload();
      } else {
        console.error('Auto Feed failed', data);
        alert('Auto Feed failed: ' + (data?.error || 'unknown'))
      }
    } catch (e) {
      console.error('Auto Feed error', e);
      alert('Auto Feed error. See console for details.');
    }
    setIsAutoRunning(false);
  };

  const handleClearCache = async () => {
    if (!confirm('Clear advisory cache? This will allow the system to reprocess previously seen RSS items.\n\nNote: This does NOT delete existing advisories, it only clears the cache so new ones can be generated from the same sources.')) {
      return;
    }
    
    try {
      const resp = await fetch('/api/clear-advisory-cache', { method: 'POST' });
      const data = await resp.json();
      if (resp.ok) {
        alert(`✓ Cache cleared successfully!\n\nCleared ${data.clearedItems} cached items.\n\nYou can now click "Auto Advisory" to generate new advisories.`);
      } else {
        alert('Failed to clear cache: ' + (data?.error || 'unknown'));
      }
    } catch (e) {
      console.error('Clear cache error', e);
      alert('Failed to clear cache. See console for details.');
    }
  };

  return (
    <HydrationSafe>
      {/* Show loading state while checking authentication */}
      {loading && (
        <div className="min-h-screen bg-tech-gradient flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-blue mx-auto mb-4"></div>
            <div className="text-slate-400 font-rajdhani">Loading...</div>
          </div>
        </div>
      )}

      {/* Show content only if authenticated */}
      {!loading && isAuthenticated && (
        <>
        <div className="relative min-h-screen bg-tech-gradient pt-8 pb-12 w-full overflow-x-hidden">
        <div className="relative z-10 w-full">
        <Head>
          <title>Threat Advisories - EaglEye IntelDesk Intelligence Platform</title>
          <meta name="description" content="Browse comprehensive cybersecurity threat advisories and intelligence reports" />
        </Head>

        <div className="w-full px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-6 lg:mb-0 flex-1 text-center lg:text-left">
                <h1 className="font-orbitron font-bold text-5xl md:text-6xl mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(6,182,212,0.5)]">
                  IntelDesk
                </h1>
                <p className="font-rajdhani text-lg text-slate-300 max-w-3xl mx-auto lg:mx-0">
                  Comprehensive cybersecurity advisories with real-time threat analysis and IOC intelligence.
                </p>
              </div>

              {/* Action Buttons - Dropdown - Top Right */}
              <div className="relative actions-dropdown">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="
                    px-5 py-2.5 rounded-lg font-rajdhani font-medium text-sm
                    bg-slate-800 backdrop-blur-sm
                    border-2 border-cyan-500/60
                    text-cyan-400 hover:text-cyan-300 hover:border-cyan-400 hover:bg-slate-700
                    transition-all duration-200 flex items-center space-x-2
                  "
                >
                  <span>Actions</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showActionsMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showActionsMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-2 border-cyan-500/50 rounded-lg shadow-2xl shadow-cyan-500/20 py-1 z-50">
                    <button
                      onClick={() => {
                        handleRefresh();
                        setShowActionsMenu(false);
                      }}
                      disabled={isLoading}
                      className={`
                        w-full px-4 py-2.5 text-left flex items-center space-x-3
                        text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10
                        transition-all duration-150 font-rajdhani text-sm
                        border-b border-slate-800/50 hover:border-cyan-500/30
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>{isLoading ? 'Refreshing...' : 'Refresh Data'}</span>
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          onClick={() => {
                            handleAutoFeed();
                            setShowActionsMenu(false);
                          }}
                          disabled={isAutoRunning}
                          className={`
                            w-full px-4 py-2.5 text-left flex items-center space-x-3
                            text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10
                            transition-all duration-150 font-rajdhani text-sm
                            border-b border-slate-800/50 hover:border-cyan-500/30
                            ${isAutoRunning ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          <Zap className={`w-4 h-4 ${isAutoRunning ? 'animate-spin' : ''}`} />
                          <span>{isAutoRunning ? 'Generating...' : 'Auto Advisory'}</span>
                        </button>

                        <button
                          onClick={() => {
                            handleClearCache();
                            setShowActionsMenu(false);
                          }}
                          className="
                            w-full px-4 py-2.5 text-left flex items-center space-x-3
                            text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10
                            transition-all duration-150 font-rajdhani text-sm
                            border-b border-slate-800/50 hover:border-cyan-500/30
                          "
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Clear Cache</span>
                        </button>

                        <Link
                          href="/admin/upload"
                          onClick={() => setShowActionsMenu(false)}
                          className="
                            w-full px-4 py-2.5 text-left flex items-center space-x-3
                            text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10
                            transition-all duration-150 font-rajdhani text-sm
                            hover:border-cyan-500/30
                          "
                        >
                          <Plus className="w-4 h-4" />
                          <span>New Advisory</span>
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
          >
            {severityStats.map((stat, index) => (
              <motion.div
                key={stat.level}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                onClick={() => stat.level === 'Total' ? clearFilters() : setSelectedSeverity(selectedSeverity === stat.level ? '' : stat.level)}
                className={`
                  relative group transition-all duration-300
                  backdrop-blur-md bg-gradient-to-br ${stat.bgColor}
                  rounded-xl p-4 border-2 ${stat.borderColor}
                  shadow-lg ${stat.glowColor} hover:shadow-xl hover:scale-105
                  before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br 
                  before:from-white/10 before:to-transparent before:opacity-0 
                  before:transition-opacity before:duration-300 hover:before:opacity-100
                  cursor-pointer
                  ${selectedSeverity === stat.level ? `ring-2 ring-${stat.color}/50 shadow-2xl scale-105` : ''}
                `}
              >
                <div className="relative z-10 flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br from-${stat.color}/30 to-${stat.color}/10 border border-${stat.color}/20`}>
                    <stat.icon className={`w-5 h-5 text-${stat.color} drop-shadow-lg`} />
                  </div>
                  <div>
                    <div className={`font-orbitron font-bold text-xl text-${stat.color} drop-shadow-lg`}>
                      {stat.count}
                    </div>
                    <div className="font-rajdhani text-sm text-slate-300 opacity-80">
                      {stat.level}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="glass-card p-6 mb-8"
          >
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search advisories, categories, authors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-glass pl-11 w-full"
                />
              </div>

              {/* Filter Toggle */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="
                    relative overflow-hidden group transition-all duration-300
                    px-6 py-3 rounded-xl font-rajdhani font-semibold w-fit
                    bg-gradient-to-r from-cyan-600/15 to-blue-600/15
                    border-2 border-cyan-500/40 backdrop-blur-md
                    text-cyan-300 hover:text-white hover:border-cyan-400
                    shadow-lg shadow-cyan-500/15 hover:shadow-cyan-400/25
                    hover:scale-105 active:scale-95 flex items-center space-x-2
                    before:absolute before:inset-0 before:bg-gradient-to-r 
                    before:from-cyan-600/25 before:to-blue-600/25 before:opacity-0 
                    before:transition-opacity before:duration-300 hover:before:opacity-100
                    hover:shadow-xl
                  "
                >
                  <Filter className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                  <span className="relative z-10">Advanced Filters</span>
                  <ChevronDown className={`w-4 h-4 relative z-10 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                <div className="flex items-center space-x-4">
                  {/* Sort Dropdown */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="
                        appearance-none bg-slate-800/50 backdrop-blur-md border-2 border-slate-700/50
                        rounded-xl px-4 py-2 text-sm font-rajdhani text-slate-300
                        focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none
                        hover:border-slate-600/50 transition-all duration-300 cursor-pointer
                        pr-10 min-w-[160px]
                      "
                    >
                      <option value="newest" className="bg-slate-800 text-slate-300">Newest First</option>
                      <option value="oldest" className="bg-slate-800 text-slate-300">Oldest First</option>
                      <option value="severity" className="bg-slate-800 text-slate-300">By Severity</option>
                      <option value="title" className="bg-slate-800 text-slate-300">By Title</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-700/50"
                >
                  {/* Category Filter */}
                  <div>
                    <label className="block font-rajdhani font-medium text-slate-300 mb-2">
                      Category
                    </label>
                    <div className="relative">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="
                          appearance-none bg-slate-800/50 backdrop-blur-md border-2 border-slate-700/50
                          rounded-xl px-4 py-3 font-rajdhani text-slate-300 w-full
                          focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none
                          hover:border-slate-600/50 transition-all duration-300 cursor-pointer pr-10
                        "
                      >
                        <option value="" className="bg-slate-800 text-slate-300">All Categories</option>
                        {categories.map((category) => (
                          <option key={category} value={category} className="bg-slate-800 text-slate-300">
                            {category}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Severity Filter */}
                  <div>
                    <label className="block font-rajdhani font-medium text-slate-300 mb-2">
                      Severity Level
                    </label>
                    <div className="relative">
                      <select
                        value={selectedSeverity}
                        onChange={(e) => setSelectedSeverity(e.target.value)}
                        className="
                          appearance-none bg-slate-800/50 backdrop-blur-md border-2 border-slate-700/50
                          rounded-xl px-4 py-3 font-rajdhani text-slate-300 w-full
                          focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none
                          hover:border-slate-600/50 transition-all duration-300 cursor-pointer pr-10
                        "
                      >
                        <option value="" className="bg-slate-800 text-slate-300">All Severities</option>
                        {severityLevels.map((level) => (
                          <option key={level} value={level} className="bg-slate-800 text-slate-300">
                            {level}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="
                        relative overflow-hidden group transition-all duration-300 w-full
                        px-6 py-3 rounded-xl font-rajdhani font-semibold
                        bg-gradient-to-r from-pink-600/20 to-pink-500/20
                        border-2 border-pink-500/30 backdrop-blur-md
                        text-pink-300 hover:text-white hover:border-pink-400
                        shadow-lg shadow-pink-500/20 hover:shadow-pink-400/30
                        hover:scale-105 active:scale-95 flex items-center justify-center space-x-2
                        before:absolute before:inset-0 before:bg-gradient-to-r 
                        before:from-pink-600/30 before:to-pink-500/30 before:opacity-0 
                        before:transition-opacity before:duration-300 hover:before:opacity-100
                        hover:shadow-xl
                      "
                    >
                      <RefreshCw className="w-4 h-4 relative z-10 group-hover:rotate-180 transition-transform duration-500" />
                      <span className="relative z-10">Clear All</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Results Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex items-center justify-between mb-6"
          >
            <div className="font-rajdhani text-slate-400">
              Showing <span className="text-neon-blue font-semibold">{filteredAdvisories.length}</span> advisories on page {currentPage} of {totalPages}{' '}
              <span className="text-slate-400">({totalAdvisories} total)</span>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2 bg-slate-800/50 backdrop-blur-md rounded-lg p-1 border border-slate-700/50">
              <button
                onClick={() => setViewMode('list')}
                className={`
                  p-2 rounded-lg transition-all duration-300 relative
                  ${viewMode === 'list' 
                    ? 'bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/20' 
                    : 'text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10'
                  }
                `}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`
                  p-2 rounded-lg transition-all duration-300 relative
                  ${viewMode === 'grid' 
                    ? 'bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/20' 
                    : 'text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10'
                  }
                `}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Advisories Grid/List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className={viewMode === 'grid' ? 'card-grid' : 'space-y-4'}
          >
            {filteredAdvisories.length > 0 ? (
              filteredAdvisories.map((advisory, index) => (
                <motion.div
                  key={advisory._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={viewMode === 'list' ? 'w-full' : ''}
                >
                  <AdvisoryCardWithEmail 
                    advisory={advisory} 
                    onEmailClick={isAdmin ? handleEmailAdvisory : undefined}
                    expanded={expandedAdvisoryId === advisory._id}
                    onToggleExpand={() => setExpandedAdvisoryId(
                      expandedAdvisoryId === advisory._id ? null : advisory._id
                    )}
                  />
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="col-span-full"
              >
                <div className="glass-card p-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center">
                    <Search className="w-10 h-10 text-slate-500" />
                  </div>
                  <h3 className="font-orbitron font-semibold text-xl text-slate-300 mb-2">
                    No Advisories Found
                  </h3>
                  <p className="font-rajdhani text-slate-500 mb-6">
                    Try adjusting your search criteria or filters to find relevant threat intelligence.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="
                      relative overflow-hidden group transition-all duration-300
                      px-8 py-3 rounded-xl font-rajdhani font-semibold
                      bg-gradient-to-r from-cyan-600/20 to-cyan-500/20
                      border-2 border-cyan-500/30 backdrop-blur-md
                      text-cyan-300 hover:text-white hover:border-cyan-400
                      shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30
                      hover:scale-105 active:scale-95 flex items-center space-x-2
                      before:absolute before:inset-0 before:bg-gradient-to-r 
                      before:from-cyan-600/30 before:to-cyan-500/30 before:opacity-0 
                      before:transition-opacity before:duration-300 hover:before:opacity-100
                      hover:shadow-xl
                    "
                  >
                    <RefreshCw className="w-4 h-4 relative z-10 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="relative z-10">Clear All Filters</span>
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="flex items-center justify-center space-x-2 mt-8"
            >
              {/* Previous Button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`
                  relative overflow-hidden group transition-all duration-300
                  px-4 py-2 rounded-lg font-rajdhani font-semibold
                  ${currentPage === 1
                    ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed border-2 border-slate-700/30'
                    : 'bg-gradient-to-r from-cyan-600/20 to-cyan-500/20 border-2 border-cyan-500/30 text-cyan-300 hover:text-white hover:border-cyan-400 hover:scale-105'
                  }
                  backdrop-blur-md shadow-lg
                `}
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and 2 pages around current
                  const showPage = page === 1 || 
                                   page === totalPages || 
                                   (page >= currentPage - 2 && page <= currentPage + 2);
                  
                  // Show ellipsis
                  const showEllipsisBefore = page === currentPage - 3 && currentPage > 4;
                  const showEllipsisAfter = page === currentPage + 3 && currentPage < totalPages - 3;

                  if (showEllipsisBefore || showEllipsisAfter) {
                    return (
                      <span key={page} className="text-slate-500 font-rajdhani px-2">
                        ...
                      </span>
                    );
                  }

                  if (!showPage) return null;

                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`
                        relative overflow-hidden group transition-all duration-300
                        w-10 h-10 rounded-lg font-rajdhani font-semibold flex items-center justify-center
                        ${page === currentPage
                          ? 'bg-gradient-to-r from-neon-blue/30 to-neon-cyan/30 border-2 border-neon-blue/50 text-white shadow-lg shadow-neon-blue/30 scale-110'
                          : 'bg-slate-800/50 border-2 border-slate-700/30 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 hover:scale-105'
                        }
                        backdrop-blur-md
                      `}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`
                  relative overflow-hidden group transition-all duration-300
                  px-4 py-2 rounded-lg font-rajdhani font-semibold
                  ${currentPage === totalPages
                    ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed border-2 border-slate-700/30'
                    : 'bg-gradient-to-r from-cyan-600/20 to-cyan-500/20 border-2 border-cyan-500/30 text-cyan-300 hover:text-white hover:border-cyan-400 hover:scale-105'
                  }
                  backdrop-blur-md shadow-lg
                `}
              >
                <ChevronDown className="w-4 h-4 -rotate-90" />
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Email Modal */}
      {emailModalOpen && selectedAdvisoryForEmail && (
        <EmailModal
          isOpen={emailModalOpen}
          onClose={() => {
            setEmailModalOpen(false);
            setSelectedAdvisoryForEmail(null);
          }}
          advisory={selectedAdvisoryForEmail as any}
        />
      )}

      {/* Scheduled Emails Manager */}
      {showScheduledEmails && (
        <ScheduledEmailsManager
          onEditEmail={(email) => {
            setEditingEmailData(email);
            setEditEmailModalOpen(true);
          }}
          onClose={() => setShowScheduledEmails(false)}
          onRefresh={handleScheduledEmailsRefresh}
        />
      )}

      {/* Edit Scheduled Email Modal */}
      {editEmailModalOpen && editingEmailData && (
        <EditScheduledEmailModal
          isOpen={editEmailModalOpen}
          onClose={() => {
            setEditEmailModalOpen(false);
            setEditingEmailData(null);
          }}
          scheduledEmail={editingEmailData}
          onUpdate={() => {
            setEditEmailModalOpen(false);
            setEditingEmailData(null);
            handleScheduledEmailsRefresh();
          }}
        />
      )}

      </div>
      </>
      )}
    </HydrationSafe>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, query }) => {
  // Check authentication first
  const token = req.cookies.token;
  
  if (!token) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  try {
    // Verify the token
    const decoded = await verifyToken(token);
    if (!decoded) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // TODO: Replace with OpenSearch fetch logic
  return {
    props: {
      advisories: [],
      categories: [],
      stats: { total: 0, critical: 0, high: 0, medium: 0, low: 0, recent: 0 },
      currentPage: 1,
      totalPages: 0,
      totalAdvisories: 0
    }
  };
};
