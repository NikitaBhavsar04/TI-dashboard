import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { SkeletonStatsCard } from '@/components/Skeleton';
import HydrationSafe from '@/components/HydrationSafe';
import LoadingLogo from '@/components/LoadingLogo';
import { 
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Calendar,
  Globe,
  Hash,
  Clock,
  FileText,
  Search,
  Filter
} from 'lucide-react';

















































































































































































interface RawArticle {
  id: string;
  title: string;
  source: string;
  rss_url: string;
  article_url: string;
  published: string;
  published_dt: string;
  fetched_at: string;
  summary: string;
  article_text: string;
  nested_links: Array<{
    url: string;
    type: string;
    text: string;
  }>;
  cves: string[];
  status: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  hasPrev: boolean;
}

export default function RawArticles() {
  const [articles, setArticles] = useState<RawArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
    hasMore: false,
    hasPrev: false
  });
  const [totalArticles, setTotalArticles] = useState(0);

  const { user, hasRole, loading: authLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || !hasRole('admin'))) {
      router.push('/login');
      return;
    }
    
    if (hasRole('admin')) {
      fetchArticles();
    }
  }, [user, hasRole, authLoading, router]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch articles when page, debounced search, or filter changes
  useEffect(() => {
    if (hasRole('admin') && user) {
      fetchArticles();
    }
  }, [pagination.page, debouncedSearchQuery, filterStatus]);

  const fetchArticles = async (resetPage = false) => {
    try {
      const currentPage = resetPage ? 1 : pagination.page;
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      
      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery);
      }
      
      if (filterStatus && filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      
      const response = await fetch(`/api/raw-articles?${params.toString()}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
        
        if (data.pagination) {
          setPagination(data.pagination);
          setTotalArticles(data.pagination.total);
        }
        
        if (data.lastFetched) {
          setLastFetched(new Date(data.lastFetched));
        }
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const runFetcher = async () => {
    try {
      setFetching(true);
      const response = await fetch('/api/raw-articles/fetch', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Articles fetched successfully! Refreshing list...');
        setPagination(prev => ({ ...prev, page: 1 }));
        await fetchArticles(true);
      } else {
        toast.error(`Failed to fetch articles: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Error running fetcher:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setFetching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (value: string) => {
    setFilterStatus(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const goToNextPage = () => {
    if (pagination.hasMore) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const goToPrevPage = () => {
    if (pagination.hasPrev) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'bg-green-500/20 text-green-300 border-green-400/30';
      case 'PROCESSED':
        return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
      case 'REJECTED':
        return 'bg-red-500/20 text-red-300 border-red-400/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
    }
  };

  if (authLoading || loading) {
    return (
      <HydrationSafe>
        <div className="min-h-screen bg-tech-gradient flex items-center justify-center">
          <LoadingLogo message="LOADING RAW ARTICLES..." />
        </div>
      </HydrationSafe>
    );
  }

  return (
    <HydrationSafe>
      <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        
        <div className="relative z-10">
          <Head>
            <title>Raw Articles - EaglEye IntelDesk</title>
          </Head>

          {/* Modern Sticky Header */}
          <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50 shadow-2xl">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                {/* Left: Title & Description */}
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl backdrop-blur-sm border border-cyan-500/30">
                    <FileText className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <h1 className="font-orbitron font-bold text-2xl md:text-3xl bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                      Raw Articles Feed
                    </h1>
                    <p className="font-rajdhani text-base text-slate-400 mt-1">
                      Real-time threat intelligence from security sources
                    </p>
                  </div>
                </div>
                
                {/* Right: Action Button */}
                <button
                  onClick={runFetcher}
                  disabled={fetching}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/40 rounded-lg text-cyan-400 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-cyan-500/20 font-medium text-sm"
                >
                  <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
                  <span>{fetching ? 'Fetching Articles...' : 'Fetch New Articles'}</span>
                </button>
              </div>
            </div>
          </header>

          <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
            
            {/* Enhanced Stats Cards with Stagger Animation */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Articles */}
                <div className="stagger-item backdrop-blur-md bg-gradient-to-br from-slate-800/50 to-cyan-900/20 border-2 border-cyan-500/30 rounded-lg p-4 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 card-hover-enhanced">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-slate-400 text-sm">Total Articles</p>
                    <div className="p-2 bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 border border-cyan-500/20 rounded-lg">
                      <FileText className="h-4 w-4 text-cyan-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white mb-1">
                      {totalArticles}
                    </p>
                    <p className="text-cyan-400 text-xs">
                      in database
                    </p>
                  </div>
                </div>

                {/* Current Page */}
                <div className="stagger-item backdrop-blur-md bg-gradient-to-br from-slate-800/50 to-orange-900/20 border-2 border-orange-500/30 rounded-lg p-4 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 card-hover-enhanced">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-slate-400 text-sm">Current Page</p>
                    <div className="p-2 bg-gradient-to-br from-orange-500/30 to-orange-500/10 border border-orange-500/20 rounded-lg">
                      <FileText className="h-4 w-4 text-orange-400" />
                    </div>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {articles.length}
                  </p>
                  <p className="text-orange-400 text-xs">
                    showing page {pagination.page}
                  </p>
                </div>
              </div>

              {/* CVEs Count */}
              <div className="stagger-item backdrop-blur-md bg-gradient-to-br from-slate-800/50 to-purple-900/20 border-2 border-purple-500/30 rounded-lg p-4 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 card-hover-enhanced">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-slate-400 text-sm">CVEs Detected</p>
                  <div className="p-2 bg-gradient-to-br from-purple-500/30 to-purple-500/10 border border-purple-500/20 rounded-lg">
                    <Hash className="h-4 w-4 text-purple-400" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {articles.reduce((sum, a) => sum + (Array.isArray(a.cves) ? a.cves.length : 0), 0)}
                  </p>
                  <p className="text-purple-400 text-xs">
                    on this page
                  </p>
                </div>
              </div>

              {/* Last Fetched */}
              <div className="stagger-item backdrop-blur-md bg-gradient-to-br from-slate-800/50 to-green-900/20 border-2 border-green-500/30 rounded-lg p-4 shadow-lg shadow-green-500/20 hover:shadow-green-500/40 card-hover-enhanced">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-slate-400 text-sm">Last Fetched</p>
                  <div className="p-2 bg-gradient-to-br from-green-500/30 to-green-500/10 border border-green-500/20 rounded-lg">
                    <Clock className="h-4 w-4 text-green-400" />
                  </div>
                </div>
                <div>
                  <p className="text-white text-lg font-semibold mb-1">
                    {lastFetched ? new Date(lastFetched).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
                  </p>
                  <p className="text-green-400 text-xs">
                    {lastFetched ? new Date(lastFetched).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'No data yet'}
                  </p>
                </div>
              </div>
            </div>
            )}

            {/* Professional Search & Filter Section */}
            <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 mb-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                    <Search className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Search & Filter</h3>
                    <p className="text-slate-400 text-sm">Find specific articles or filter by status</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search articles, sources, CVEs..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-900/70 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all text-sm"
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-900/70 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all appearance-none cursor-pointer text-sm"
                    title="Filter by status"
                  >
                    <option value="all">All Status</option>
                    <option value="NEW">New</option>
                    <option value="PROCESSED">Processed</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Pagination Info */}
            <div className="backdrop-blur-sm bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-400/30 rounded-lg">
                    <span className="text-slate-400 text-sm">Showing</span>
                    <span className="text-white font-bold mx-1">{((pagination.page - 1) * pagination.pageSize) + 1}</span>
                    <span className="text-slate-400 text-sm">to</span>
                    <span className="text-white font-bold mx-1">{Math.min(pagination.page * pagination.pageSize, totalArticles)}</span>
                    <span className="text-slate-400 text-sm">of</span>
                    <span className="text-cyan-400 font-bold ml-1">{totalArticles}</span>
                    <span className="text-slate-400 text-sm ml-1">articles</span>
                  </div>
                </div>
                <div className="px-3 py-1 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                  <span className="text-slate-400 text-sm">Page</span>
                  <span className="text-white font-bold mx-1">{pagination.page}</span>
                  <span className="text-slate-400 text-sm">of</span>
                  <span className="text-blue-400 font-bold ml-1">{pagination.totalPages}</span>
                </div>
              </div>
            </div>

            {/* Articles List */}
            <div className="space-y-3">
              {articles.length === 0 ? (
                <div className="glass-panel-hover p-8 text-center">
                  <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-orbitron font-bold text-slate-400 mb-2">
                    No Articles Found
                  </h3>
                  <p className="text-slate-500 font-rajdhani mb-6">
                    {totalArticles === 0 
                      ? 'Click "Fetch New Articles" to start collecting data'
                      : 'Try adjusting your search or filter criteria'
                    }
                  </p>
                </div>
              ) : (
                articles.map((article) => {
                  // Use id field (not _id which is OpenSearch document ID)
                  const articleId = article.id;
                  return (
                  <Link key={articleId} href={`/admin/raw-articles/${articleId}`}>
                    <div className="glass-panel-hover p-4 cursor-pointer transition-all duration-200 hover:border-neon-blue/30">
                      <div className="space-y-2">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1.5">
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-rajdhani font-medium border ${getStatusColor(article.status)}`}>
                                {article.status}
                              </span>
                              <span className="text-slate-500 font-rajdhani text-xs flex items-center">
                                <Globe className="h-2.5 w-2.5 mr-1" />
                                {article.source}
                              </span>
                              <span className="text-slate-500 font-rajdhani text-xs flex items-center">
                                <Calendar className="h-2.5 w-2.5 mr-1" />
                                {formatDate(article.published_dt)}
                              </span>
                            </div>
                            <h3 className="text-base font-orbitron font-bold text-white mb-1.5">
                              {article.title}
                            </h3>
                          </div>

                          <a
                            href={article.article_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-neon-blue/10 border border-neon-blue/30 rounded-lg text-neon-blue hover:bg-neon-blue/20 transition-all duration-200 font-rajdhani text-xs"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>View</span>
                          </a>
                        </div>

                        {/* Article Text Preview */}
                        <p className="text-slate-400 font-rajdhani text-xs line-clamp-2">
                          {article.article_text}
                        </p>

                        {/* CVEs and Links */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {article.cves.length > 0 && (
                              <div className="flex items-center space-x-1.5">
                                <Hash className="h-3 w-3 text-purple-400" />
                                <div className="flex flex-wrap gap-1">
                                  {article.cves.slice(0, 5).map((cve) => (
                                    <span
                                      key={cve}
                                      className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-400/30 rounded text-purple-300 text-xs font-rajdhani"
                                    >
                                      {cve}
                                    </span>
                                  ))}
                                  {article.cves.length > 5 && (
                                    <span className="text-purple-400 text-xs font-rajdhani">
                                      +{article.cves.length - 5} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {article.nested_links.length > 0 && (
                              <div className="flex items-center space-x-1.5 text-slate-500 font-rajdhani text-xs">
                                <ExternalLink className="h-3 w-3" />
                                <span>{article.nested_links.length} nested links</span>
                              </div>
                            )}
                          </div>

                          <span className="text-neon-blue font-rajdhani text-xs">
                            Click to view full article →
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {articles.length > 0 && (
              <div className="glass-panel-hover p-3 mt-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={goToPrevPage}
                    disabled={!pagination.hasPrev || loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-rajdhani font-medium text-sm"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>

                  <div className="text-center">
                    <div className="text-white font-orbitron font-bold text-base">
                      Page {pagination.page} of {pagination.totalPages}
                    </div>
                    <div className="text-slate-400 font-rajdhani text-xs mt-0.5">
                      {pagination.pageSize} articles per page
                    </div>
                  </div>

                  <button
                    onClick={goToNextPage}
                    disabled={!pagination.hasMore || loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-neon-blue/10 border border-neon-blue/30 rounded-lg text-neon-blue hover:bg-neon-blue/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-rajdhani font-medium text-sm"
                  >
                    <span>Next</span>
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </HydrationSafe>
  );
}
