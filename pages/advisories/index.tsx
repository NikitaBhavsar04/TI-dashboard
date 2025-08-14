import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import AnimatedBackground from '@/components/AnimatedBackground';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  AlertTriangle, 
  Shield, 
  Activity,
  Eye,
  Download,
  Calendar,
  User,
  Hash,
  Globe,
  Mail,
  Server,
  RefreshCw,
  SortAsc,
  SortDesc,
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
import { IAdvisory } from '@/models/Advisory';
import { formatDate } from '@/lib/utils';
import dbConnect from '@/lib/db';
import Advisory from '@/models/Advisory';
import { verifyToken } from '@/lib/auth';

interface AdvisoriesPageProps {
  advisories: IAdvisory[];
  categories: string[];
  stats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    recent: number;
  };
}

type SortOption = 'newest' | 'oldest' | 'severity' | 'title';
type ViewMode = 'grid' | 'list';

export default function AdvisoriesPage({ advisories, categories, stats }: AdvisoriesPageProps) {
  const { isAdmin, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [filteredAdvisories, setFilteredAdvisories] = useState(advisories);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedAdvisoryForEmail, setSelectedAdvisoryForEmail] = useState<IAdvisory | null>(null);
  const [showScheduledEmails, setShowScheduledEmails] = useState(false);
  const [editEmailModalOpen, setEditEmailModalOpen] = useState(false);
  const [editingEmailData, setEditingEmailData] = useState<any>(null);
  const [selectedScheduledEmail, setSelectedScheduledEmail] = useState<any>(null);

  // Client-side authentication check
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  const severityLevels = ['Critical', 'High', 'Medium', 'Low'];

  const severityStats = [
    { level: 'Total', count: stats.total, color: 'cyan-400', borderColor: 'border-cyan-400', bgColor: 'from-cyan-400/20 to-cyan-400/10', glowColor: 'shadow-cyan-400/20', icon: TrendingUp },
    { level: 'Critical', count: stats.critical, color: 'red-500', borderColor: 'border-red-500', bgColor: 'from-red-500/20 to-red-500/10', glowColor: 'shadow-red-500/20', icon: Zap },
    { level: 'High', count: stats.high, color: 'orange-500', borderColor: 'border-orange-500', bgColor: 'from-orange-500/20 to-orange-500/10', glowColor: 'shadow-orange-500/20', icon: AlertTriangle },
    { level: 'Medium', count: stats.medium, color: 'yellow-500', borderColor: 'border-yellow-500', bgColor: 'from-yellow-500/20 to-yellow-500/10', glowColor: 'shadow-yellow-500/20', icon: Activity },
    { level: 'Low', count: stats.low, color: 'blue-500', borderColor: 'border-blue-500', bgColor: 'from-blue-500/20 to-blue-500/10', glowColor: 'shadow-blue-500/20', icon: Shield },
  ];

  useEffect(() => {
    filterAndSortAdvisories();
  }, [searchTerm, selectedCategory, selectedSeverity, sortBy]);

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

  const handleEmailAdvisory = (advisory: IAdvisory, e: React.MouseEvent) => {
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
        <div className="relative min-h-screen bg-tech-gradient pt-20 pb-12">
        <AnimatedBackground opacity={0.8} />
        <div className="relative z-10">
        <Head>
          <title>Threat Advisories - EaglEye IntelDesk Intelligence Platform</title>
          <meta name="description" content="Browse comprehensive cybersecurity threat advisories and intelligence reports" />
        </Head>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-6 lg:mb-0">
                <h1 className="font-orbitron font-bold text-4xl md:text-5xl text-gradient-blue mb-4">
                  IntelDesk
                </h1>
                <p className="font-rajdhani text-lg text-slate-400 max-w-2xl">
                  Comprehensive cybersecurity advisories with real-time threat analysis and IOC intelligence.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleRefresh}
                  className={`
                    relative overflow-hidden group transition-all duration-300
                    px-6 py-3 rounded-xl font-rajdhani font-semibold
                    bg-gradient-to-r from-purple-600/20 to-purple-500/20
                    border-2 border-purple-500/30 backdrop-blur-md
                    text-purple-300 hover:text-white hover:border-purple-400
                    shadow-lg shadow-purple-500/20 hover:shadow-purple-400/30
                    hover:scale-105 active:scale-95 flex items-center space-x-2
                    before:absolute before:inset-0 before:bg-gradient-to-r 
                    before:from-purple-600/30 before:to-purple-500/30 before:opacity-0 
                    before:transition-opacity before:duration-300 hover:before:opacity-100
                    ${isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl'}
                  `}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 relative z-10 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
                  <span className="relative z-10">
                    {isLoading ? 'Refreshing...' : 'Refresh Data'}
                  </span>
                </button>
                
                {isAdmin && (
                  <Link 
                    href="/admin/upload" 
                    className="
                      relative overflow-hidden group transition-all duration-300
                      px-6 py-3 rounded-xl font-rajdhani font-semibold
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
                    <Plus className="w-4 h-4 relative z-10 group-hover:scale-110 group-hover:rotate-90 transition-all duration-300" />
                    <span className="relative z-10">New Advisory</span>
                  </Link>
                )}

                {isAdmin && (
                  <button
                    onClick={() => setShowScheduledEmails(!showScheduledEmails)}
                    className={`
                      relative overflow-hidden group transition-all duration-300
                      px-6 py-3 rounded-xl font-rajdhani font-semibold
                      border-2 backdrop-blur-md
                      shadow-lg hover:scale-105 active:scale-95 flex items-center space-x-2
                      before:absolute before:inset-0 before:bg-gradient-to-r 
                      before:transition-opacity before:duration-300 hover:before:opacity-100
                      hover:shadow-xl
                      ${showScheduledEmails 
                        ? 'bg-gradient-to-r from-orange-600/20 to-orange-500/20 border-orange-500/30 text-orange-300 hover:text-white hover:border-orange-400 shadow-orange-500/20 hover:shadow-orange-400/30 before:from-orange-600/30 before:to-orange-500/30' 
                        : 'bg-gradient-to-r from-violet-600/20 to-violet-500/20 border-violet-500/30 text-violet-300 hover:text-white hover:border-violet-400 shadow-violet-500/20 hover:shadow-violet-400/30 before:from-violet-600/30 before:to-violet-500/30'
                      }
                    `}
                  >
                    <Calendar className="w-4 h-4 relative z-10 group-hover:scale-110 transition-all duration-300" />
                    <span className="relative z-10">{showScheduledEmails ? 'Hide Scheduled' : 'Scheduled Emails'}</span>
                  </button>
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
                    bg-gradient-to-r from-purple-600/20 to-purple-500/20
                    border-2 border-purple-500/30 backdrop-blur-md
                    text-purple-300 hover:text-white hover:border-purple-400
                    shadow-lg shadow-purple-500/20 hover:shadow-purple-400/30
                    hover:scale-105 active:scale-95 flex items-center space-x-2
                    before:absolute before:inset-0 before:bg-gradient-to-r 
                    before:from-purple-600/30 before:to-purple-500/30 before:opacity-0 
                    before:transition-opacity before:duration-300 hover:before:opacity-100
                    hover:shadow-xl
                  "
                >
                  <Filter className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                  <span className="relative z-10">Advanced Filters</span>
                  <ChevronDown className={`w-4 h-4 relative z-10 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                <div className="flex items-center space-x-4">
                  {/* View Mode Toggle */}
                  <div className="flex items-center space-x-2 bg-slate-800/50 backdrop-blur-md rounded-lg p-1 border border-slate-700/50">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`
                        p-2 rounded-lg transition-all duration-300 relative
                        ${viewMode === 'grid' 
                          ? 'bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/20' 
                          : 'text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10'
                        }
                      `}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`
                        p-2 rounded-lg transition-all duration-300 relative
                        ${viewMode === 'list' 
                          ? 'bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/20' 
                          : 'text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10'
                        }
                      `}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

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
              Showing <span className="text-neon-blue font-semibold">{filteredAdvisories.length}</span> of{' '}
              <span className="text-slate-200 font-semibold">{advisories.length}</span> advisories
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

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
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

  await dbConnect();

  try {
    // Fetch all advisories
    const advisories = await Advisory.find({}).sort({ publishedDate: -1 }).lean();
    
    // Get unique categories
    const categories = Array.from(new Set(advisories.map(a => a.category))).filter(Boolean);
    
    // Calculate stats
    const stats = {
      total: advisories.length,
      critical: advisories.filter(a => a.severity === 'Critical').length,
      high: advisories.filter(a => a.severity === 'High').length,
      medium: advisories.filter(a => a.severity === 'Medium').length,
      low: advisories.filter(a => a.severity === 'Low').length,
      recent: advisories.filter(a => {
        const publishedDate = new Date(a.publishedDate);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return publishedDate >= sevenDaysAgo;
      }).length
    };

    return {
      props: {
        advisories: JSON.parse(JSON.stringify(advisories)),
        categories,
        stats
      }
    };
  } catch (error) {
    console.error('Error fetching advisories:', error);
    return {
      props: {
        advisories: [],
        categories: [],
        stats: { total: 0, critical: 0, high: 0, medium: 0, low: 0, recent: 0 }
      }
    };
  }
};
