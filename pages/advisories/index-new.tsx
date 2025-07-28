import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
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
  const { isAdmin } = useAuth();
  const [filteredAdvisories, setFilteredAdvisories] = useState(advisories);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const severityLevels = ['Critical', 'High', 'Medium', 'Low'];

  const severityStats = [
    { level: 'Critical', count: stats.critical, color: 'neon-pink', icon: Zap },
    { level: 'High', count: stats.high, color: 'red-500', icon: AlertTriangle },
    { level: 'Medium', count: stats.medium, color: 'amber-500', icon: Activity },
    { level: 'Low', count: stats.low, color: 'neon-green', icon: Shield },
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

  return (
    <HydrationSafe>
      <div className="min-h-screen bg-tech-gradient pt-20 pb-12">
        <Head>
          <title>Threat Advisories - THREATWATCH Intelligence Platform</title>
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
                  Threat Intelligence
                </h1>
                <p className="font-rajdhani text-lg text-slate-400 max-w-2xl">
                  Comprehensive cybersecurity advisories with real-time threat analysis and IOC intelligence.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleRefresh}
                  className={`btn-neon-purple group ${isLoading ? 'opacity-50' : ''}`}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-300`} />
                  <span>Refresh</span>
                </button>
                
                {isAdmin && (
                  <Link href="/admin/upload" className="btn-neon group">
                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                    <span>New Advisory</span>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            {severityStats.map((stat, index) => (
              <motion.div
                key={stat.level}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                onClick={() => setSelectedSeverity(selectedSeverity === stat.level ? '' : stat.level)}
                className={`glass-card p-4 hover-glow cursor-pointer transition-all duration-300 ${
                  selectedSeverity === stat.level ? 'ring-2 ring-neon-blue/50' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br from-${stat.color}/20 to-${stat.color}/10`}>
                    <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                  </div>
                  <div>
                    <div className="font-orbitron font-bold text-xl text-slate-100">
                      {stat.count}
                    </div>
                    <div className="font-rajdhani text-sm text-slate-400">
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
                  className="btn-neon-purple flex items-center space-x-2 w-fit"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                <div className="flex items-center space-x-4">
                  {/* View Mode Toggle */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all duration-300 ${
                        viewMode === 'grid' 
                          ? 'bg-neon-blue/20 text-neon-blue' 
                          : 'text-slate-400 hover:text-neon-blue hover:bg-neon-blue/10'
                      }`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all duration-300 ${
                        viewMode === 'list' 
                          ? 'bg-neon-blue/20 text-neon-blue' 
                          : 'text-slate-400 hover:text-neon-blue hover:bg-neon-blue/10'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sort Dropdown */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="input-glass text-sm w-40"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="severity">By Severity</option>
                    <option value="title">By Title</option>
                  </select>
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
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="input-glass w-full"
                    >
                      <option value="">All Categories</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Severity Filter */}
                  <div>
                    <label className="block font-rajdhani font-medium text-slate-300 mb-2">
                      Severity
                    </label>
                    <select
                      value={selectedSeverity}
                      onChange={(e) => setSelectedSeverity(e.target.value)}
                      className="input-glass w-full"
                    >
                      <option value="">All Severities</option>
                      {severityLevels.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="btn-neon-pink w-full"
                    >
                      Clear Filters
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
                  <AdvisoryCard advisory={advisory} />
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
                    className="btn-neon"
                  >
                    Clear All Filters
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </HydrationSafe>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
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
