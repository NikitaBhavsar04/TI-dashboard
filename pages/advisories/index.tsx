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
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <CyberCard variant="matrix" className="p-4 text-center">
        <div className="text-2xl font-mono font-bold text-cyber-blue">{stats.total}</div>
        <div className="text-xs font-mono text-cyber-green/70">TOTAL</div>
      </CyberCard>
      
      <CyberCard variant="glitch" className="p-4 text-center">
        <div className="text-2xl font-mono font-bold text-cyber-red">{stats.critical}</div>
        <div className="text-xs font-mono text-cyber-green/70">CRITICAL</div>
      </CyberCard>
      
      <CyberCard variant="neon" glowColor="orange" className="p-4 text-center">
        <div className="text-2xl font-mono font-bold text-warning-orange">{stats.high}</div>
        <div className="text-xs font-mono text-cyber-green/70">HIGH</div>
      </CyberCard>
      
      <CyberCard variant="holographic" className="p-4 text-center">
        <div className="text-2xl font-mono font-bold text-cyber-blue">{stats.medium}</div>
        <div className="text-xs font-mono text-cyber-green/70">MEDIUM</div>
      </CyberCard>
      
      <CyberCard variant="matrix" className="p-4 text-center">
        <div className="text-2xl font-mono font-bold text-cyber-green">{stats.low}</div>
        <div className="text-xs font-mono text-cyber-green/70">LOW</div>
      </CyberCard>
    </div>
  );

  const AdvisoryGridItem = ({ advisory }: { advisory: IAdvisory }) => (
    <CyberCard variant="holographic" className="p-6 hover:scale-105 transition-all duration-300">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link href={`/advisory/${advisory._id}`}>
              <h3 className="font-mono font-bold text-cyber-green hover:text-cyber-blue transition-colors cursor-pointer line-clamp-2">
                {advisory.title}
              </h3>
            </Link>
            <div className="flex items-center space-x-2 mt-2">
              <CyberBadge 
                variant={
                  advisory.severity === 'Critical' ? 'danger' : 
                  advisory.severity === 'High' ? 'warning' : 
                  advisory.severity === 'Medium' ? 'info' : 'success'
                }
              >
                {advisory.severity}
              </CyberBadge>
              <span className="text-xs text-cyber-blue/70 font-mono">{advisory.category}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link href={`/advisory/${advisory._id}`}>
              <CyberButton variant="ghost" glowColor="blue" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                VIEW
              </CyberButton>
            </Link>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-cyber-blue/80 font-mono line-clamp-3">
          {advisory.description}
        </p>

        {/* IOCs */}
        {advisory.iocs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-mono text-cyber-red">INDICATORS ({advisory.iocs.length}):</h4>
            <div className="flex flex-wrap gap-1">
              {advisory.iocs.slice(0, 3).map((ioc, index) => (
                <div key={index} className="flex items-center space-x-1 bg-cyber-dark/30 px-2 py-1 rounded border border-cyber-red/20">
                  {getIconForIOCType(ioc.type)}
                  <span className="text-xs font-mono text-cyber-red">{ioc.type}</span>
                </div>
              ))}
              {advisory.iocs.length > 3 && (
                <div className="bg-cyber-dark/30 px-2 py-1 rounded border border-cyber-red/20">
                  <span className="text-xs font-mono text-cyber-red">+{advisory.iocs.length - 3}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-cyber-blue/20">
          <div className="flex items-center space-x-3 text-xs text-cyber-green/70 font-mono">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(advisory.publishedDate)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span>{advisory.author}</span>
            </div>
          </div>
          
          {advisory.cvss && (
            <CyberBadge variant="warning">
              CVSS: {advisory.cvss}
            </CyberBadge>
          )}
        </div>
      </div>
    </CyberCard>
  );

  const AdvisoryListItem = ({ advisory }: { advisory: IAdvisory }) => (
    <CyberCard variant="matrix" className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-2">
            <Link href={`/advisory/${advisory._id}`}>
              <h3 className="font-mono font-bold text-cyber-green hover:text-cyber-blue transition-colors cursor-pointer">
                {advisory.title}
              </h3>
            </Link>
            <p className="text-sm text-cyber-blue/70 font-mono mt-1 line-clamp-1">
              {advisory.description}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <CyberBadge 
              variant={
                advisory.severity === 'Critical' ? 'danger' : 
                advisory.severity === 'High' ? 'warning' : 
                advisory.severity === 'Medium' ? 'info' : 'success'
              }
            >
              {advisory.severity}
            </CyberBadge>
            <span className="text-xs text-cyber-blue/70 font-mono">{advisory.category}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-cyber-green/70 font-mono">
              {formatDate(advisory.publishedDate)}
            </div>
            
            <div className="flex items-center space-x-2">
              {advisory.iocs.length > 0 && (
                <span className="text-xs text-cyber-red font-mono">
                  {advisory.iocs.length} IOCs
                </span>
              )}
              <Link href={`/advisory/${advisory._id}`}>
                <CyberButton variant="ghost" glowColor="blue" className="text-xs">
                  <Eye className="h-3 w-3" />
                </CyberButton>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </CyberCard>
  );

  return (
    <HydrationSafe>
      <div className="min-h-screen bg-cyber-dark">
        <Head>
          <title>THREAT INTELLIGENCE DATABASE - THREATWATCH</title>
          <meta name="description" content="Comprehensive cyber threat advisory database with real-time intelligence" />
        </Head>

        {/* Header */}
        <div className="border-b border-cyber-blue/30 bg-cyber-dark/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <HolographicOverlay>
                  <Activity className="h-10 w-10 text-cyber-blue" />
                </HolographicOverlay>
                <div>
                  <h1 className="text-3xl font-mono font-bold">
                    <NeonText color="blue" intensity="high">
                      THREAT INTELLIGENCE DATABASE
                    </NeonText>
                  </h1>
                  <p className="text-cyber-green/70 font-mono text-sm">
                    [CLASSIFICATION: RESTRICTED] - Real-time Threat Analysis
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <CyberButton variant="ghost" glowColor="green" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  REFRESH
                </CyberButton>
                {isAdmin && (
                  <Link href="/admin/upload">
                    <CyberButton variant="cyber" glowColor="blue">
                      <Zap className="h-4 w-4 mr-2" />
                      NEW ADVISORY
                    </CyberButton>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Dashboard */}
          <div className="mb-8">
            <h2 className="text-xl font-mono font-bold text-cyber-green mb-4">
              THREAT STATISTICS
            </h2>
            <SeverityStats />
          </div>

          {/* Search and Filters */}
          <CyberCard variant="glitch" className="p-6 mb-8">
            <TerminalWindow title="THREAT SEARCH & FILTER CONSOLE">
              <div className="space-y-6">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyber-blue h-5 w-5" />
                  <input
                    type="text"
                    placeholder="SEARCH THREAT DATABASE..."
                    className="w-full pl-12 pr-4 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                             text-cyber-green font-mono focus:outline-none focus:border-cyber-blue 
                             focus:ring-2 focus:ring-cyber-blue/20 placeholder-cyber-green/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Filters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-cyber-green mb-2">CATEGORY</label>
                    <select
                      className="w-full px-4 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                               text-cyber-green font-mono focus:outline-none focus:border-cyber-blue 
                               focus:ring-2 focus:ring-cyber-blue/20"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="">ALL CATEGORIES</option>
                      {categories.map(category => (
                        <option key={category} value={category} className="bg-cyber-dark">
                          {category.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-cyber-green mb-2">SEVERITY</label>
                    <select
                      className="w-full px-4 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                               text-cyber-green font-mono focus:outline-none focus:border-cyber-blue 
                               focus:ring-2 focus:ring-cyber-blue/20"
                      value={selectedSeverity}
                      onChange={(e) => setSelectedSeverity(e.target.value)}
                    >
                      <option value="">ALL SEVERITIES</option>
                      <option value="Critical">CRITICAL</option>
                      <option value="High">HIGH</option>
                      <option value="Medium">MEDIUM</option>
                      <option value="Low">LOW</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-cyber-green mb-2">SORT BY</label>
                    <select
                      className="w-full px-4 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                               text-cyber-green font-mono focus:outline-none focus:border-cyber-blue 
                               focus:ring-2 focus:ring-cyber-blue/20"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                    >
                      <option value="newest">NEWEST FIRST</option>
                      <option value="oldest">OLDEST FIRST</option>
                      <option value="severity">BY SEVERITY</option>
                      <option value="title">BY TITLE</option>
                    </select>
                  </div>
                  
                  <div className="flex items-end space-x-2">
                    <CyberButton 
                      variant="ghost" 
                      glowColor="red" 
                      onClick={clearFilters}
                      className="flex-1"
                    >
                      CLEAR FILTERS
                    </CyberButton>
                  </div>
                </div>
              </div>
            </TerminalWindow>
          </CyberCard>

          {/* View Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-mono text-cyber-green">
                DISPLAYING {filteredAdvisories.length} OF {advisories.length} THREATS
              </span>
              {(searchTerm || selectedCategory || selectedSeverity) && (
                <CyberBadge variant="info">
                  FILTERED
                </CyberBadge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-cyber-green/70">VIEW:</span>
              <CyberButton
                variant={viewMode === 'grid' ? 'cyber' : 'ghost'}
                glowColor="blue"
                onClick={() => setViewMode('grid')}
                className="text-xs"
              >
                <Grid className="h-3 w-3" />
              </CyberButton>
              <CyberButton
                variant={viewMode === 'list' ? 'cyber' : 'ghost'}
                glowColor="blue"
                onClick={() => setViewMode('list')}
                className="text-xs"
              >
                <List className="h-3 w-3" />
              </CyberButton>
            </div>
          </div>

          {/* Advisory Display */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyber-blue border-t-transparent mx-auto"></div>
                <p className="text-cyber-green font-mono">SCANNING THREAT DATABASE...</p>
              </div>
            </div>
          ) : filteredAdvisories.length === 0 ? (
            <CyberCard variant="matrix" className="p-12 text-center">
              <div className="space-y-4">
                <AlertTriangle className="h-16 w-16 text-cyber-red mx-auto" />
                <h3 className="text-xl font-mono font-bold text-cyber-red">
                  NO THREATS DETECTED
                </h3>
                <p className="text-cyber-green/70 font-mono">
                  No advisories match your current search criteria.
                </p>
                <CyberButton variant="cyber" glowColor="blue" onClick={clearFilters}>
                  RESET SEARCH PARAMETERS
                </CyberButton>
              </div>
            </CyberCard>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }>
              {filteredAdvisories.map((advisory) => 
                viewMode === 'grid' ? (
                  <AdvisoryGridItem key={advisory._id} advisory={advisory} />
                ) : (
                  <AdvisoryListItem key={advisory._id} advisory={advisory} />
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
