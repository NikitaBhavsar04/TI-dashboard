import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import HydrationSafe from '@/components/HydrationSafe';
import AnimatedBackground from '@/components/AnimatedBackground';
import { 
  ArrowLeft,
  RefreshCw,
  Download,
  ExternalLink,
  Calendar,
  Globe,
  Tag,
  Hash,
  AlertTriangle,
  CheckCircle,
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

export default function RawArticles() {
  const [articles, setArticles] = useState<RawArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<RawArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const { user, hasRole, loading: authLoading } = useAuth();
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

  useEffect(() => {
    // Filter articles based on search and status
    let filtered = articles;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.source.toLowerCase().includes(query) ||
        article.article_text.toLowerCase().includes(query) ||
        article.cves.some(cve => cve.toLowerCase().includes(query))
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(article => article.status === filterStatus);
    }

    setFilteredArticles(filtered);
  }, [searchQuery, filterStatus, articles]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/raw-articles', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
        setFilteredArticles(data.articles || []);
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
        alert('Articles fetched successfully! Refreshing list...');
        await fetchArticles();
      } else {
        alert(`Failed to fetch articles: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Error running fetcher:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setFetching(false);
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
          <div className="text-center space-y-4">
            <div className="spinner-neon mx-auto"></div>
            <div className="text-neon-blue font-orbitron text-lg tracking-wider animate-pulse">
              LOADING RAW ARTICLES...
            </div>
          </div>
        </div>
      </HydrationSafe>
    );
  }

  return (
    <HydrationSafe>
      <div className="relative min-h-screen bg-tech-gradient">
        <AnimatedBackground opacity={0.6} />
        
        <div className="relative z-10">
          <Head>
            <title>Raw Articles - EaglEye IntelDesk</title>
          </Head>

          {/* Header */}
          <div className="glass-panel border-b border-slate-700/50">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link href="/admin">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-all duration-200">
                      <ArrowLeft className="h-4 w-4" />
                      <span className="font-rajdhani">Back</span>
                    </button>
                  </Link>
                  <div>
                    <h1 className="text-2xl font-orbitron font-bold text-white">
                      Raw Articles Feed
                    </h1>
                    <p className="text-slate-400 font-rajdhani">
                      Articles from security sources
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={runFetcher}
                  disabled={fetching}
                  className="flex items-center space-x-2 px-6 py-3 bg-neon-blue/10 border border-neon-blue/30 rounded-lg text-neon-blue hover:bg-neon-blue/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-rajdhani font-medium"
                >
                  <RefreshCw className={`h-5 w-5 ${fetching ? 'animate-spin' : ''}`} />
                  <span>{fetching ? 'Fetching...' : 'Fetch New Articles'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-8">
            
            {/* Stats and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="glass-panel-hover p-6">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="h-6 w-6 text-neon-blue" />
                  <span className="text-2xl font-orbitron font-bold text-white">
                    {articles.length}
                  </span>
                </div>
                <div className="text-slate-400 font-rajdhani text-sm">Total Articles</div>
              </div>

              <div className="glass-panel-hover p-6">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                  <span className="text-2xl font-orbitron font-bold text-white">
                    {articles.filter(a => a.status === 'NEW').length}
                  </span>
                </div>
                <div className="text-slate-400 font-rajdhani text-sm">New Articles</div>
              </div>

              <div className="glass-panel-hover p-6">
                <div className="flex items-center justify-between mb-2">
                  <Hash className="h-6 w-6 text-purple-400" />
                  <span className="text-2xl font-orbitron font-bold text-white">
                    {articles.reduce((sum, a) => sum + (Array.isArray(a.cves) ? a.cves.length : 0), 0)}
                  </span>
                </div>
                <div className="text-slate-400 font-rajdhani text-sm">Total CVEs</div>
              </div>

              <div className="glass-panel-hover p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="h-6 w-6 text-orange-400" />
                </div>
                <div className="text-slate-400 font-rajdhani text-xs">Last Fetched</div>
                <div className="text-white font-rajdhani text-xs">
                  {lastFetched ? formatDate(lastFetched.toISOString()) : 'Never'}
                </div>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="glass-panel-hover p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search articles, sources, CVEs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-neon-blue/50 font-rajdhani"
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani appearance-none cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="NEW">New</option>
                    <option value="PROCESSED">Processed</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Articles List */}
            <div className="space-y-6">
              {filteredArticles.length === 0 ? (
                <div className="glass-panel-hover p-12 text-center">
                  <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-orbitron font-bold text-slate-400 mb-2">
                    No Articles Found
                  </h3>
                  <p className="text-slate-500 font-rajdhani mb-6">
                    {articles.length === 0 
                      ? 'Click "Fetch New Articles" to start collecting data'
                      : 'Try adjusting your search or filter criteria'
                    }
                  </p>
                </div>
              ) : (
                filteredArticles.map((article) => (
                  <Link key={article.id} href={`/admin/raw-articles/${article.id}`}>
                    <div className="glass-panel-hover p-6 cursor-pointer transition-all duration-200 hover:border-neon-blue/30">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className={`px-3 py-1 rounded-lg text-xs font-rajdhani font-medium border ${getStatusColor(article.status)}`}>
                                {article.status}
                              </span>
                              <span className="text-slate-500 font-rajdhani text-sm flex items-center">
                                <Globe className="h-3 w-3 mr-1" />
                                {article.source}
                              </span>
                              <span className="text-slate-500 font-rajdhani text-sm flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(article.published_dt)}
                              </span>
                            </div>
                            <h3 className="text-xl font-orbitron font-bold text-white mb-2">
                              {article.title}
                            </h3>
                          </div>

                          <a
                            href={article.article_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center space-x-2 px-4 py-2 bg-neon-blue/10 border border-neon-blue/30 rounded-lg text-neon-blue hover:bg-neon-blue/20 transition-all duration-200 font-rajdhani text-sm"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>View</span>
                          </a>
                        </div>

                        {/* Article Text Preview */}
                        <p className="text-slate-400 font-rajdhani text-sm line-clamp-3">
                          {article.article_text}
                        </p>

                        {/* CVEs and Links */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {article.cves.length > 0 && (
                              <div className="flex items-center space-x-2">
                                <Hash className="h-4 w-4 text-purple-400" />
                                <div className="flex flex-wrap gap-2">
                                  {article.cves.slice(0, 5).map((cve) => (
                                    <span
                                      key={cve}
                                      className="px-2 py-1 bg-purple-500/20 border border-purple-400/30 rounded text-purple-300 text-xs font-rajdhani"
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
                              <div className="flex items-center space-x-2 text-slate-500 font-rajdhani text-sm">
                                <ExternalLink className="h-4 w-4" />
                                <span>{article.nested_links.length} nested links</span>
                              </div>
                            )}
                          </div>

                          <span className="text-neon-blue font-rajdhani text-sm">
                            Click to view full article →
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </HydrationSafe>
  );
}
