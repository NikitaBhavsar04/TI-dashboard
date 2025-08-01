import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
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
  Zap
} from 'lucide-react';
import { CyberCard, CyberButton, CyberBadge } from '@/components/ui/cyber-components';
import { HolographicOverlay, NeonText, TerminalWindow } from '@/components/ui/cyber-effects';
import HydrationSafe from '@/components/HydrationSafe';
import { IAdvisory } from '@/models/Advisory';
import { formatDate, getSeverityColor } from '@/lib/utils';
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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    
    let filtered = [...advisories];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(advisory =>
        advisory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        advisory.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        advisory.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        advisory.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(advisory => advisory.category === selectedCategory);
    }

    // Severity filter
    if (selectedSeverity) {
      filtered = filtered.filter(advisory => advisory.severity === selectedSeverity);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
        case 'oldest':
          return new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime();
        case 'severity':
          const severityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setTimeout(() => {
      setFilteredAdvisories(filtered);
      setIsLoading(false);
    }, 200);
  }, [searchTerm, selectedCategory, selectedSeverity, sortBy, advisories]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedSeverity('');
    setSortBy('newest');
  };

  const getIconForIOCType = (type: string) => {
    switch (type) {
      case 'IP': return <Server className="h-3 w-3" />;
      case 'Hash': return <Hash className="h-3 w-3" />;
      case 'URL': return <Globe className="h-3 w-3" />;
      case 'Domain': return <Globe className="h-3 w-3" />;
      case 'Email': return <Mail className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  const SeverityStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
      <div className="stat-card text-center group animate-fade-in-scale delay-100 hover-lift transition-cyber">
        <div className="text-4xl font-bold text-glow-blue mb-4 font-orbitron group-hover:scale-110 transition-transform duration-300">{stats.total}</div>
        <div className="text-sm font-rajdhani text-slate-300 uppercase tracking-wider font-medium">Total Threats</div>
        <div className="mt-3 text-xs text-slate-500 font-rajdhani">Active Database</div>
      </div>
      
      <div className="stat-card text-center group animate-fade-in-scale delay-200 hover-lift transition-cyber">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600 rounded-t-lg" />
        <div className="text-4xl font-bold text-red-400 mb-4 font-orbitron group-hover:scale-110 transition-transform duration-300">{stats.critical}</div>
        <div className="text-sm font-rajdhani text-slate-300 uppercase tracking-wider font-medium">Critical</div>
        <div className="mt-3 text-xs text-red-400/60 font-rajdhani">High Priority</div>
      </div>
      
      <div className="stat-card text-center group animate-fade-in-scale delay-300 hover-lift transition-cyber">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-t-lg" />
        <div className="text-4xl font-bold text-orange-400 mb-4 font-orbitron group-hover:scale-110 transition-transform duration-300">{stats.high}</div>
        <div className="text-sm font-rajdhani text-slate-300 uppercase tracking-wider font-medium">High</div>
        <div className="mt-3 text-xs text-orange-400/60 font-rajdhani">Elevated Risk</div>
      </div>
      
      <div className="stat-card text-center group animate-fade-in-scale delay-400 hover-lift transition-cyber">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-t-lg" />
        <div className="text-4xl font-bold text-amber-400 mb-4 font-orbitron group-hover:scale-110 transition-transform duration-300">{stats.medium}</div>
        <div className="text-sm font-rajdhani text-slate-300 uppercase tracking-wider font-medium">Medium</div>
        <div className="mt-3 text-xs text-amber-400/60 font-rajdhani">Moderate Risk</div>
      </div>
      
      <div className="stat-card text-center group animate-fade-in-scale delay-500 hover-lift transition-cyber">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-cyan to-green-500 rounded-t-lg" />
        <div className="text-4xl font-bold text-glow-cyan mb-4 font-orbitron group-hover:scale-110 transition-transform duration-300">{stats.low}</div>
        <div className="text-sm font-rajdhani text-slate-300 uppercase tracking-wider font-medium">Low</div>
        <div className="mt-3 text-xs text-neon-cyan/60 font-rajdhani">Informational</div>
      </div>
    </div>
  );

  const AdvisoryGridItem = ({ advisory }: { advisory: IAdvisory }) => (
    <div className="glass-card-hover p-8 group animate-fade-in-scale relative overflow-hidden">
      {/* Threat Level Indicator */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        advisory.severity === 'Critical' ? 'bg-gradient-to-r from-red-500 to-red-600' :
        advisory.severity === 'High' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
        advisory.severity === 'Medium' ? 'bg-gradient-to-r from-amber-500 to-yellow-500' :
        'bg-gradient-to-r from-neon-cyan to-green-500'
      } rounded-t-lg`} />
      
      <div className="space-y-6 relative z-10">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link href={`/advisory/${advisory._id}`}>
              <h3 className="font-bold text-white hover:text-neon-blue transition-colors cursor-pointer line-clamp-2 font-sora text-xl mb-3 group-hover:text-glow">
                {advisory.title}
              </h3>
            </Link>
            <div className="flex items-center space-x-4">
              <span className={`
                ${advisory.severity === 'Critical' ? 'badge-critical' : 
                  advisory.severity === 'High' ? 'badge-high' : 
                  advisory.severity === 'Medium' ? 'badge-medium' : 'badge-low'}
              `}>
                {advisory.severity}
              </span>
              <span className="badge-secondary text-xs">
                {advisory.category}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 ml-6">
            <Link href={`/advisory/${advisory._id}`}>
              <button className="btn-ghost text-sm px-4 py-3 group/btn">
                <Eye className="h-5 w-5 mr-2 group-hover/btn:text-neon-blue transition-colors" />
                ANALYZE
              </button>
            </Link>
          </div>
        </div>

        {/* Threat Description */}
        <p className="text-slate-300 font-inter line-clamp-3 leading-relaxed text-sm">
          {advisory.description}
        </p>

        {/* IOC Section */}
        {advisory.iocs.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <h4 className="text-sm font-semibold text-red-400 font-sora uppercase tracking-wide">
                Indicators of Compromise ({advisory.iocs.length})
              </h4>
            </div>
            <div className="flex flex-wrap gap-3">
              {advisory.iocs.slice(0, 4).map((ioc, index) => (
                <div key={index} className="flex items-center space-x-2 bg-red-500/10 border border-red-400/30 px-3 py-2 rounded-lg backdrop-blur-sm">
                  {getIconForIOCType(ioc.type)}
                  <span className="text-xs font-medium text-red-300 font-inter">{ioc.type}</span>
                </div>
              ))}
              {advisory.iocs.length > 4 && (
                <div className="badge-secondary">
                  <span className="text-xs">+{advisory.iocs.length - 4} more</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Metadata */}
        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          <div className="flex items-center space-x-6 text-sm text-slate-400 font-inter">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(advisory.publishedDate)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>{advisory.author}</span>
            </div>
          </div>
          
          {advisory.cvss && (
            <div className="badge-info">
              CVSS: {advisory.cvss}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const AdvisoryListItem = ({ advisory }: { advisory: IAdvisory }) => (
    <div className="glass-panel hover:glass-panel-hover transition-all duration-300 group cursor-pointer relative overflow-hidden">
      {/* Threat Level Indicator */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
        advisory.severity === 'Critical' ? 'bg-gradient-to-b from-red-500 to-red-600' :
        advisory.severity === 'High' ? 'bg-gradient-to-b from-orange-500 to-orange-600' :
        advisory.severity === 'Medium' ? 'bg-gradient-to-b from-amber-500 to-yellow-500' :
        'bg-gradient-to-b from-neon-cyan to-green-500'
      }`} />
      
      <div className="p-8 pl-12">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Title and Badges */}
            <div className="flex items-start space-x-6 mb-6">
              <div className="flex-1">
                <Link href={`/advisory/${advisory._id}`}>
                  <h3 className="font-bold text-white hover:text-neon-blue transition-colors cursor-pointer font-sora text-xl mb-4 group-hover:text-glow line-clamp-2">
                    {advisory.title}
                  </h3>
                </Link>
                <div className="flex items-center space-x-4">
                  <span className={`
                    ${advisory.severity === 'Critical' ? 'badge-critical' : 
                      advisory.severity === 'High' ? 'badge-high' : 
                      advisory.severity === 'Medium' ? 'badge-medium' : 'badge-low'}
                  `}>
                    {advisory.severity}
                  </span>
                  <span className="badge-secondary">
                    {advisory.category}
                  </span>
                  {advisory.cvss && (
                    <span className="badge-info">
                      CVSS: {advisory.cvss}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-sm text-slate-400 font-inter text-right space-y-1">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(advisory.publishedDate)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{advisory.author}</span>
                  </div>
                </div>
                
                <Link href={`/advisory/${advisory._id}`}>
                  <button className="btn-primary px-6 py-3 group/btn">
                    <Eye className="h-5 w-5 mr-2 group-hover/btn:text-white transition-colors" />
                    ANALYZE
                  </button>
                </Link>
              </div>
            </div>

            {/* Description */}
            <p className="text-slate-300 font-inter line-clamp-2 leading-relaxed mb-6 text-base">
              {advisory.description}
            </p>

            {/* IOCs Grid */}
            {advisory.iocs.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <h4 className="text-sm font-semibold text-red-400 font-sora uppercase tracking-wide">
                    Indicators of Compromise ({advisory.iocs.length})
                  </h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {advisory.iocs.slice(0, 8).map((ioc, index) => (
                    <div key={index} className="flex items-center space-x-2 bg-red-500/10 border border-red-400/30 px-3 py-2 rounded-lg backdrop-blur-sm hover:bg-red-500/20 transition-colors">
                      {getIconForIOCType(ioc.type)}
                      <span className="text-xs font-medium text-red-300 font-inter truncate">{ioc.type}</span>
                    </div>
                  ))}
                  {advisory.iocs.length > 8 && (
                    <div className="badge-secondary flex items-center justify-center">
                      <span className="text-xs font-medium">+{advisory.iocs.length - 8}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <HydrationSafe>
      <div className="min-h-screen bg-cyber-gradient bg-fixed">
        <Head>
          <title>THREAT INTELLIGENCE DATABASE - EaglEye IntelDesk</title>
          <meta name="description" content="Comprehensive cyber threat advisory database with real-time intelligence" />
        </Head>

        {/* Cyberpunk SOC Header */}
        <div className="relative border-b border-neon-blue/20 glass-panel">
          <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/5 via-transparent to-neon-purple/5" />
          <div className="max-w-7xl mx-auto px-6 py-12 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8 animate-slide-in-left">
                <div className="relative">
                  <div className="absolute -inset-3 bg-gradient-to-r from-neon-blue/30 to-neon-purple/30 rounded-full blur-lg animate-glow-pulse" />
                  <div className="relative p-5 glass-panel rounded-2xl animate-float hover-lift transition-cyber">
                    <Activity className="h-10 w-10 text-glow-blue" />
                  </div>
                </div>
                <div>
                  <h1 className="text-5xl font-bold font-orbitron mb-2">
                    <span className="text-gradient text-glow-blue uppercase tracking-wider">
                      THREAT INTELLIGENCE
                    </span>
                  </h1>
                  <p className="text-3xl font-rajdhani text-white/80 mb-3 uppercase tracking-wide">COMMAND CENTER</p>
                  <div className="flex items-center space-x-4 text-sm text-slate-400 font-rajdhani">
                    <span className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 font-medium animate-hologram">
                      [CLASSIFIED]
                    </span>
                    <span>•</span>
                    <span>Real-time SOC Operations</span>
                    <span>•</span>
                    <span className="text-glow-cyan animate-pulse-glow">ACTIVE</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 animate-slide-in-right">
                <button 
                  onClick={() => window.location.reload()}
                  className="btn-ghost group transition-cyber"
                >
                  <RefreshCw className="h-5 w-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                  REFRESH DATABASE
                </button>
                {isAdmin && (
                  <Link href="/admin/upload">
                    <button className="btn-primary hover-lift transition-cyber">
                      <Zap className="h-5 w-5 mr-2" />
                      NEW THREAT INTEL
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Cyberpunk Stats Dashboard */}
          <div className="mb-8 animate-fade-in-up delay-200">
            <h2 className="text-xl font-bold text-white/90 mb-6 font-orbitron text-glow-blue uppercase tracking-wider">
              THREAT STATISTICS
            </h2>
            <SeverityStats />
          </div>

          {/* Enhanced Threat Search & Filter Console */}
          <div className="search-console mb-10 animate-fade-in-up delay-700">
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative">
                  <Search className="h-6 w-6 text-glow-blue animate-glow-pulse" />
                  <div className="absolute inset-0 h-6 w-6 bg-neon-blue/20 rounded-full animate-ping" />
                </div>
                <h3 className="text-2xl font-bold text-white font-orbitron text-glow-blue uppercase tracking-wide">
                  THREAT SEARCH & FILTER CONSOLE
                </h3>
              </div>
              <div className="h-px bg-gradient-to-r from-neon-blue via-neon-purple to-neon-cyan mb-2" />
              <p className="text-sm text-slate-400 font-rajdhani">Advanced filtering and search capabilities for threat intelligence data</p>
            </div>
            
            <div className="space-y-8">
              {/* Enhanced Cyberpunk Search Bar */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 rounded-lg blur-sm opacity-0 group-focus-within:opacity-100 transition-cyber" />
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400 h-6 w-6 group-focus-within:text-glow-blue transition-cyber" />
                  <input
                    type="text"
                    placeholder="Search threat advisories, IOCs, signatures..."
                    className="input-field w-full pl-16 pr-6 py-5 text-lg font-rajdhani"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="absolute right-5 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm font-rajdhani">
                    {searchTerm && `${filteredAdvisories.length} results`}
                  </div>
                </div>
              </div>

              {/* Advanced Cyberpunk Filters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-glow-blue font-orbitron uppercase tracking-wide">Threat Category</label>
                  <select
                    className="input-field w-full font-rajdhani"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-glow-purple font-orbitron uppercase tracking-wide">Risk Level</label>
                  <select
                    className="input-field w-full font-rajdhani"
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value)}
                  >
                    <option value="">All Severities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-glow-cyan font-orbitron uppercase tracking-wide">Sort Order</label>
                  <select
                    className="input-field w-full font-rajdhani"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="severity">By Risk Level</option>
                    <option value="title">Alphabetical</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button 
                    onClick={clearFilters}
                    className="btn-secondary w-full group transition-cyber hover-lift"
                  >
                    <RefreshCw className="h-5 w-5 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Intelligence Overview & Controls */}
          <div className="flex items-center justify-between mb-10 animate-fade-in-up delay-1000">
            <div className="flex items-center space-x-6">
              <div className="glass-panel-sm px-6 py-4 hover-glow transition-cyber">
                <span className="text-sm font-rajdhani text-slate-300">
                  Displaying <span className="text-glow-blue font-bold text-lg">{filteredAdvisories.length}</span> of <span className="text-glow-blue font-bold text-lg">{advisories.length}</span> threat advisories
                </span>
              </div>
              {(searchTerm || selectedCategory || selectedSeverity) && (
                <div className="badge-info animate-glow-pulse">
                  <Filter className="h-3 w-3 mr-1" />
                  Filtered View
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-6">
              <span className="text-sm font-orbitron text-slate-400 uppercase tracking-wide">Display Mode:</span>
              <div className="glass-panel-sm rounded-lg p-2 flex items-center hover-glow transition-cyber">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-3 rounded-md transition-cyber ${
                    viewMode === 'grid' 
                      ? 'bg-neon-blue/20 text-glow-blue border border-neon-blue/40 shadow-lg shadow-neon-blue/25' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-3 rounded-md transition-cyber ${
                    viewMode === 'list' 
                      ? 'bg-neon-blue/20 text-glow-blue border border-neon-blue/40 shadow-lg shadow-neon-blue/25' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Cyberpunk Advisory Display */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-neon-blue border-r-neon-purple mx-auto" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-b-neon-cyan border-l-neon-pink animate-spin-reverse" />
                </div>
                <div className="space-y-2">
                  <p className="text-white font-orbitron text-lg text-glow-blue uppercase tracking-wide">Scanning Threat Database</p>
                  <div className="flex justify-center space-x-1">
                    <div className="h-2 w-2 bg-neon-blue rounded-full animate-bounce delay-0" />
                    <div className="h-2 w-2 bg-neon-purple rounded-full animate-bounce delay-100" />
                    <div className="h-2 w-2 bg-neon-cyan rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            </div>
          ) : filteredAdvisories.length === 0 ? (
            <div className="glass-panel p-12 text-center animate-fade-in-up hover-glow transition-cyber">
              <div className="space-y-6">
                <div className="relative">
                  <AlertTriangle className="h-20 w-20 text-red-400 mx-auto animate-glow-pulse" />
                  <div className="absolute -inset-3 bg-red-400/20 rounded-full blur-lg animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-red-400 font-orbitron uppercase tracking-wide">
                    No Threats Found
                  </h3>
                  <p className="text-slate-400 font-rajdhani max-w-md mx-auto">
                    No advisories match your current search criteria. Try adjusting your filters or search terms.
                  </p>
                </div>
                <button 
                  onClick={clearFilters}
                  className="btn-primary mt-6 hover-lift transition-cyber"
                >
                  Reset Search Parameters
                </button>
              </div>
            </div>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }>
              {filteredAdvisories.map((advisory, index) => 
                viewMode === 'grid' ? (
                  <div key={advisory._id} style={{ animationDelay: `${index * 100}ms` }}>
                    <AdvisoryGridItem advisory={advisory} />
                  </div>
                ) : (
                  <div key={advisory._id} style={{ animationDelay: `${index * 50}ms` }}>
                    <AdvisoryListItem advisory={advisory} />
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </HydrationSafe>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  // Check authentication
  const token = req.cookies.token;
  
  if (!token) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // Verify token
  const decoded = verifyToken(token);
  if (!decoded) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  try {
    await dbConnect();
    
    const [advisories, categories] = await Promise.all([
      Advisory.find({}).sort({ publishedDate: -1 }).lean(),
      Advisory.distinct('category')
    ]);

    // Calculate stats
    const stats = {
      total: advisories.length,
      critical: advisories.filter(a => a.severity === 'Critical').length,
      high: advisories.filter(a => a.severity === 'High').length,
      medium: advisories.filter(a => a.severity === 'Medium').length,
      low: advisories.filter(a => a.severity === 'Low').length,
      recent: advisories.filter(a => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(a.publishedDate) > weekAgo;
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
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
};
