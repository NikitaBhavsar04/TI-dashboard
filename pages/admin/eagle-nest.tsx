import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import HydrationSafe from '@/components/HydrationSafe';
import LoadingLogo from '@/components/LoadingLogo';
import { 
  Search,
  Filter,
  Eye,
  Trash2,
  Download,
  RefreshCw,
  AlertCircle,
  Shield,
  TrendingUp,
  AlertTriangle,
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';

type SortOption = 'newest' | 'oldest' | 'severity' | 'title';

export default function EagleNest() {
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [filteredAdvisories, setFilteredAdvisories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { user, hasRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!authLoading && (!user || !hasRole('user'))) {
      router.push('/login');
      return;
    }
    
    if (hasRole('user')) {
      loadAdvisories();
    }
  }, [user, hasRole, authLoading, router]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [advisories, searchTerm, selectedSeverity, sortBy]);

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

  const loadAdvisories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/eagle-nest', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('[EAGLE-NEST] Failed to load advisories:', response.status, response.statusText);
        // Clone the response so we can read it multiple times if needed
        const clonedResponse = response.clone();
        try {
          const errorData = await response.json();
          console.error('[EAGLE-NEST] Error details:', errorData);
        } catch {
          try {
            const text = await clonedResponse.text();
            console.error('[EAGLE-NEST] Response text:', text.substring(0, 200));
          } catch (e) {
            console.error('[EAGLE-NEST] Could not read response body');
          }
        }
        setAdvisories([]);
        return;
      }

      const data = await response.json();

      if (data.advisories) {
        setAdvisories(data.advisories);
      } else {
        setAdvisories([]);
      }
    } catch (error) {
      console.error('[EAGLE-NEST] Error loading advisories:', error);
      setAdvisories([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let result = [...advisories];

    // Search filter
    if (searchTerm) {
      result = result.filter(advisory =>
        advisory.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        advisory.advisory_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        advisory.affected_product?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Severity filter
    if (selectedSeverity) {
      result = result.filter(advisory =>
        advisory.criticality?.toUpperCase() === selectedSeverity.toUpperCase()
      );
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.date_published || b.saved_to_eagle_nest_at).getTime() -
                 new Date(a.date_published || a.saved_to_eagle_nest_at).getTime();
        case 'oldest':
          return new Date(a.date_published || a.saved_to_eagle_nest_at).getTime() -
                 new Date(b.date_published || b.saved_to_eagle_nest_at).getTime();
        case 'severity':
          const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          return (severityOrder[a.criticality?.toUpperCase()] || 4) -
                 (severityOrder[b.criticality?.toUpperCase()] || 4);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

    setFilteredAdvisories(result);
    setCurrentPage(1);
  };

  const handleDelete = async (advisoryId: string) => {
    if (!confirm('Are you sure you want to delete this advisory from Eagle Nest?')) {
      return;
    }

    try {
      const response = await fetch(`/api/eagle-nest?id=${advisoryId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Advisory deleted successfully');        
        loadAdvisories();
      } else {
        toast.error(`Failed to delete: ${data.error}`);     
      }
    } catch (error: any) {
      console.error('Error deleting advisory:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear the cache?')) {
      try {
        await fetch('/api/clear-cache', { method: 'POST' });
        toast.success('Cache cleared successfully');
        loadAdvisories();
      } catch (error) {
        toast.error('Failed to clear cache');
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSeverity('');
    setSortBy('newest');
  };

  const stats = {
    total: advisories.length,
    critical: advisories.filter(a => a.criticality?.toUpperCase() === 'CRITICAL').length,
    high: advisories.filter(a => a.criticality?.toUpperCase() === 'HIGH').length,
    medium: advisories.filter(a => a.criticality?.toUpperCase() === 'MEDIUM').length,
    low: advisories.filter(a => a.criticality?.toUpperCase() === 'LOW').length,
  };

  const severityStats = [
    { level: 'Total', count: stats.total, icon: TrendingUp, color: 'cyan-400', bgColor: 'from-slate-800/50 to-cyan-900/20', borderColor: 'border-cyan-500/30', glowColor: 'shadow-cyan-500/20' },
    { level: 'Critical', count: stats.critical, icon: AlertTriangle, color: 'red-400', bgColor: 'from-slate-800/50 to-red-900/20', borderColor: 'border-red-500/30', glowColor: 'shadow-red-500/20' },
    { level: 'High', count: stats.high, icon: AlertCircle, color: 'orange-400', bgColor: 'from-slate-800/50 to-orange-900/20', borderColor: 'border-orange-500/30', glowColor: 'shadow-orange-500/20' },
    { level: 'Medium', count: stats.medium, icon: Activity, color: 'yellow-400', bgColor: 'from-slate-800/50 to-yellow-900/20', borderColor: 'border-yellow-500/30', glowColor: 'shadow-yellow-500/20' },
    { level: 'Low', count: stats.low, icon: Shield, color: 'green-400', bgColor: 'from-slate-800/50 to-green-900/20', borderColor: 'border-green-500/30', glowColor: 'shadow-green-500/20' },
  ];

  const severityLevels = ['Critical', 'High', 'Medium', 'Low'];

  // Pagination
  const totalPages = Math.ceil(filteredAdvisories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAdvisories = filteredAdvisories.slice(startIndex, endIndex);

  const getCriticalityColor = (criticality: string) => {
    switch (criticality?.toUpperCase()) {
      case 'CRITICAL': return 'text-red-400 bg-red-500/10 border-red-400/30';
      case 'HIGH': return 'text-orange-400 bg-orange-500/10 border-orange-400/30';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/10 border-yellow-400/30';
      case 'LOW': return 'text-green-400 bg-green-500/10 border-green-400/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-400/30';
    }
  };

  if (authLoading) {
    return (
      <HydrationSafe>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="spinner-neon mx-auto"></div>
            <div className="text-cyan-400 font-orbitron text-lg tracking-wider animate-pulse">
              LOADING EAGLE NEST...
            </div>
          </div>
        </div>
      </HydrationSafe>
    );
  }

  return (
    <HydrationSafe>
      <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        
        <div className="relative z-10">
          <Head>
            <title>Eagle Nest - EaglEye IntelDesk</title>
          </Head>

          {/* Main Container */}
          <div className="w-full px-3 sm:px-4 lg:px-6 py-6 space-y-4">
            
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl backdrop-blur-sm border border-cyan-500/30">
                    <Shield className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <h1 className="font-orbitron font-bold text-2xl md:text-3xl bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                      Eagle Nest
                    </h1>
                    <p className="font-rajdhani text-base text-slate-400 mt-1">
                      Manually generated cybersecurity advisories with comprehensive threat intelligence.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Dropdown - Top Right - Admin only */}
              {hasRole('admin') && (
                <div className="relative actions-dropdown">
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="
                      px-4 py-2 rounded-lg font-poppins font-medium text-sm
                      bg-slate-800 backdrop-blur-sm
                      border-2 border-blue-500/60
                      text-blue-400 hover:text-blue-300 hover:border-blue-400 hover:bg-slate-700
                      transition-all duration-200 flex items-center space-x-2 btn-press hover-lift
                    "
                  >
                    <span>Actions</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showActionsMenu ? 'rotate-180' : ''}`} />
                  </button>

                {/* Dropdown Menu */}
                {showActionsMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-2 border-amber-500/50 rounded-lg shadow-2xl shadow-amber-500/20 py-1 z-50">
                    <button
                      onClick={() => {
                        loadAdvisories();
                        setShowActionsMenu(false);
                      }}
                      disabled={loading}
                      className={`
                        w-full px-3 py-2 text-left flex items-center space-x-2
                        text-slate-300 hover:text-amber-300 hover:bg-amber-500/10
                        transition-all duration-150 font-rajdhani text-sm
                        border-b border-slate-800/50 hover:border-amber-500/30
                        ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
                    </button>

                    <button
                      onClick={() => {
                        handleClearCache();
                        setShowActionsMenu(false);
                      }}
                      className="
                        w-full px-3 py-2 text-left flex items-center space-x-2
                        text-slate-300 hover:text-amber-300 hover:bg-amber-500/10
                        transition-all duration-150 font-poppins text-sm
                        border-b border-slate-800/50 hover:border-blue-500/30
                      "
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Clear Cache</span>
                    </button>

                    <Link
                      href="/admin/raw-articles"
                      onClick={() => setShowActionsMenu(false)}
                      className="
                        w-full px-3 py-2 text-left flex items-center space-x-2
                        text-slate-300 hover:text-blue-300 hover:bg-blue-500/10
                        transition-all duration-150 font-poppins text-sm
                        hover:border-blue-500/30
                      "
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Advisory</span>
                    </Link>
                  </div>
                )}
                </div>
              )}
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6"
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
                    rounded-lg p-3 border-2 ${stat.borderColor}
                    shadow-lg ${stat.glowColor} card-hover-glow
                    before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br 
                    before:from-white/10 before:to-transparent before:opacity-0 
                    before:transition-opacity before:duration-300 hover:before:opacity-100
                    cursor-pointer btn-press
                    ${selectedSeverity === stat.level ? `ring-2 ring-${stat.color}/50 shadow-2xl scale-105` : ''}
                  `}
                >
                  <div className="relative z-10 flex items-center space-x-2">
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br from-${stat.color}/30 to-${stat.color}/10 border border-${stat.color}/20`}>
                      <stat.icon className={`w-4 h-4 text-${stat.color} drop-shadow-lg`} />
                    </div>
                    <div>
                      <div className={`font-poppins font-bold text-lg text-${stat.color} drop-shadow-lg`}>
                        {stat.count}
                      </div>
                      <div className="font-inter text-xs text-slate-300 opacity-80">
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
              className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl p-4 mb-6"
            >
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search advisories, products, vendors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 font-rajdhani text-sm"
                  />
                </div>

                {/* Filter Toggle */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="
                      relative overflow-hidden group transition-all duration-300
                      px-4 py-2 rounded-lg font-rajdhani font-semibold w-fit
                      bg-gradient-to-r from-amber-600/15 to-yellow-600/15
                      border-2 border-amber-500/40 backdrop-blur-md
                      text-amber-300 hover:text-white hover:border-amber-400
                      shadow-lg shadow-amber-500/15 hover:shadow-amber-400/25
                      hover:scale-105 active:scale-95 flex items-center space-x-2 text-sm
                      before:absolute before:inset-0 before:bg-gradient-to-r 
                      before:from-amber-600/25 before:to-yellow-600/25 before:opacity-0 
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
                          focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 focus:outline-none
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
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-700/50"
                  >
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
                            focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 focus:outline-none
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
                          px-4 py-2 rounded-lg font-rajdhani font-semibold text-sm
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

            {/* Advisories List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <LoadingLogo message="LOADING ADVISORIES..." />
              </div>
            ) : paginatedAdvisories.length === 0 ? (
              <div className="text-center py-20 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl">
                <Shield className="h-24 w-24 text-slate-600 mx-auto mb-6 opacity-50" />
                <h3 className="text-2xl font-orbitron font-bold text-slate-400 mb-2">No Advisories Found</h3>
                <p className="text-slate-500 font-rajdhani text-lg">
                  {advisories.length === 0 
                    ? "Your Eagle Nest is empty. Generate advisories from raw articles to get started."
                    : "No advisories match your current filters."}
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-3"
              >
                {paginatedAdvisories.map((advisory, index) => (
                  <motion.div
                    key={advisory.advisory_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative"
                  >
                    <Link href={`/admin/eagle-nest/${advisory.advisory_id}`}>
                      <div className="
                        bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-xl
                        rounded-xl border border-slate-700/40 shadow-lg p-3 md:p-4 pr-32
                        hover:border-amber-500/50 hover:bg-slate-800/70
                        transition-all duration-300 cursor-pointer group
                      ">
                        {/* One-Liner Content */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Advisory Title */}
                          <h3 className="font-orbitron font-semibold text-sm text-white truncate max-w-[40%] group-hover:text-amber-300 transition-colors">
                            {advisory.title || 'Untitled Advisory'}
                          </h3>
                          
                          {/* Advisory ID */}
                          <span className="text-slate-500 font-mono text-xs whitespace-nowrap flex-shrink-0">
                            {advisory.advisory_id}
                          </span>
                          
                          {/* Product/Vendor */}
                          {(advisory.affected_product || advisory.vendor) && (
                            <span className="text-slate-400 text-xs truncate flex-shrink-0 max-w-[25%] hidden md:block">
                              {advisory.affected_product || advisory.vendor}
                            </span>
                          )}
                          
                          {/* Criticality Badge */}
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold font-orbitron border ${getCriticalityColor(advisory.criticality)} whitespace-nowrap flex-shrink-0 shadow-lg`}>
                            {advisory.criticality || 'MEDIUM'}
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* Action Buttons - Absolutely Positioned on Right */}
                    <div className="absolute top-3 md:top-4 right-3 flex gap-2 z-10">
                      <Link href={`/admin/eagle-nest/${advisory.advisory_id}`}>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="
                            p-1.5 md:p-2 rounded-lg
                            bg-gradient-to-r from-amber-600/80 to-yellow-600/80
                            border border-amber-400/50 backdrop-blur-md
                            text-white hover:text-amber-100
                            shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30
                            transition-all duration-300 hover:scale-110
                            group/view
                          " 
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover/view:scale-110 transition-transform" />
                        </button>
                      </Link>
                      
                      {/* Delete button - Admin only */}
                      {hasRole('admin') && (
                        <button 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(advisory.advisory_id); }}
                          className="
                            p-1.5 md:p-2 rounded-lg
                            bg-gradient-to-r from-red-600/80 to-red-500/80
                            border border-red-400/50 backdrop-blur-md
                            text-white hover:text-red-100
                            shadow-lg shadow-red-500/20 hover:shadow-red-400/30
                            transition-all duration-300 hover:scale-110
                            group/delete
                          "
                          title="Delete Advisory"
                        >
                          <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover/delete:scale-110 transition-transform" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center space-x-2 mt-8"
              >
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="
                    p-2 rounded-lg bg-slate-800/50 border border-slate-700/50
                    text-slate-300 hover:bg-slate-700/50 hover:border-amber-500/50
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                  "
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`
                        px-4 py-2 rounded-lg font-rajdhani font-semibold
                        transition-all duration-200
                        ${currentPage === page
                          ? 'bg-amber-500/20 border-2 border-amber-500/50 text-amber-400'
                          : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50 hover:border-amber-500/30'
                        }
                      `}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="
                    p-2 rounded-lg bg-slate-800/50 border border-slate-700/50
                    text-slate-300 hover:bg-slate-700/50 hover:border-amber-500/50
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                  "
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </HydrationSafe>
  );
}
