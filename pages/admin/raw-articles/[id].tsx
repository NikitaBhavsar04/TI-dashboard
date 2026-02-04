import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import HydrationSafe from '@/components/HydrationSafe';
import { 
  ArrowLeft,
  ExternalLink,
  Calendar,
  Globe,
  Hash,
  FileText,
  Link as LinkIcon,
  Clock,
  Zap,
  Loader
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

export default function RawArticleDetail() {
  const [article, setArticle] = useState<RawArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const { user, hasRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (!authLoading && (!user || !hasRole('admin'))) {
      router.push('/login');
      return;
    }
    
    if (hasRole('admin') && id) {
      fetchArticle();
    }
  }, [user, hasRole, authLoading, router, id]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/raw-articles', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const foundArticle = data.articles.find((a: RawArticle) => a.id === id);
        
        if (foundArticle) {
          setArticle(foundArticle);
        } else {
          setError('Article not found');
        }
      } else {
        setError('Failed to load article');
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      setError('Error loading article');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const handleGenerateAdvisory = async () => {
    if (!article) return;

    try {
      setGenerating(true);
      
      const response = await fetch('/api/manual-advisory/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ articleId: article.id })
      });

      const data = await response.json();

      console.log('[RAW-ARTICLE] Full API response:', JSON.stringify(data, null, 2));
      
      if (data.success && data.advisory) {
        console.log('[RAW-ARTICLE] Advisory object keys:', Object.keys(data.advisory));
        
        // Extract advisory_id (not article_id!)
        const advisoryId = data.advisory.advisory_id || data.advisory.advisoryId;
        const articleId = data.advisory.article_id;
        
        console.log('[RAW-ARTICLE] Extracted IDs:', {
          advisory_id: advisoryId,
          article_id: articleId,
          looking_for: 'advisory_id (SOC-TA-YYYYMMDD-HHMMSS format)'
        });
        
        if (advisoryId) {
          console.log('[RAW-ARTICLE] ✅ Redirecting with advisory_id:', advisoryId);
          router.push(`/admin/advisory-editor?advisory_id=${advisoryId}`);
        } else {
          console.error('[RAW-ARTICLE] ❌ advisory_id is missing from response');
          console.error('[RAW-ARTICLE] Full advisory object:', JSON.stringify(data.advisory, null, 2));
          alert('Advisory generated but advisory_id is missing. Check console for details.');
        }
      } else {
        alert(`Failed to generate advisory: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error generating advisory:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setGenerating(false);
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
              LOADING ARTICLE...
            </div>
          </div>
        </div>
      </HydrationSafe>
    );
  }

  if (error || !article) {
    return (
      <HydrationSafe>
        <div className="min-h-screen bg-tech-gradient flex items-center justify-center">
          <div className="text-center space-y-4">
            <FileText className="h-16 w-16 text-slate-600 mx-auto" />
            <h3 className="text-xl font-orbitron font-bold text-slate-400">
              {error || 'Article Not Found'}
            </h3>
            <Link href="/admin/raw-articles">
              <button className="px-6 py-3 bg-neon-blue/10 border border-neon-blue/30 rounded-lg text-neon-blue hover:bg-neon-blue/20 transition-all duration-200 font-rajdhani">
                Back to Articles
              </button>
            </Link>
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
            <title>{article.title} - Raw Articles - EaglEye IntelDesk</title>
          </Head>

          {/* Header */}
          <div className="glass-panel border-b border-slate-700/50">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link href="/admin/raw-articles">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-all duration-200">
                      <ArrowLeft className="h-4 w-4" />
                      <span className="font-rajdhani">Back to Articles</span>
                    </button>
                  </Link>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleGenerateAdvisory}
                    disabled={generating}
                    className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-neon-blue/20 to-purple-500/20 border border-neon-blue/30 rounded-lg text-white hover:from-neon-blue/30 hover:to-purple-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-orbitron font-bold shadow-lg shadow-neon-blue/20"
                  >
                    {generating ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        <span>Generate Advisory</span>
                      </>
                    )}
                  </button>
                  <a
                    href={article.article_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-6 py-3 bg-neon-blue/10 border border-neon-blue/30 rounded-lg text-neon-blue hover:bg-neon-blue/20 transition-all duration-200 font-rajdhani font-medium"
                  >
                    <ExternalLink className="h-5 w-5" />
                    <span>View Original</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Article Header */}
            <div className="glass-panel-hover p-8 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
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
                  <h1 className="text-3xl font-orbitron font-bold text-white mb-4">
                    {article.title}
                  </h1>

                  {/* CVEs */}
                  {article.cves.length > 0 && (
                    <div className="flex items-center space-x-2 mb-4">
                      <Hash className="h-5 w-5 text-purple-400" />
                      <div className="flex flex-wrap gap-2">
                        {article.cves.map((cve) => (
                          <span
                            key={cve}
                            className="px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded text-purple-300 text-sm font-rajdhani font-medium"
                          >
                            {cve}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-700/50">
                <div className="flex items-center space-x-2 text-slate-400 font-rajdhani text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Fetched: {formatDate(article.fetched_at)}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-400 font-rajdhani text-sm">
                  <Globe className="h-4 w-4" />
                  <a href={article.rss_url} target="_blank" rel="noopener noreferrer" className="hover:text-neon-blue">
                    RSS Feed
                  </a>
                </div>
                {article.nested_links.length > 0 && (
                  <div className="flex items-center space-x-2 text-slate-400 font-rajdhani text-sm">
                    <LinkIcon className="h-4 w-4" />
                    <span>{article.nested_links.length} Nested Links</span>
                  </div>
                )}
              </div>
            </div>

            {/* Article Content */}
            <div className="glass-panel-hover p-8 mb-6">
              <h2 className="text-xl font-orbitron font-bold text-white mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-neon-blue" />
                Article Content
              </h2>
              <div className="text-slate-300 font-rajdhani text-base leading-relaxed whitespace-pre-wrap">
                {article.article_text}
              </div>
            </div>

            {/* Nested Links */}
            {article.nested_links.length > 0 && (
              <div className="glass-panel-hover p-8">
                <h2 className="text-xl font-orbitron font-bold text-white mb-4 flex items-center">
                  <LinkIcon className="h-5 w-5 mr-2 text-neon-blue" />
                  Nested Links ({article.nested_links.length})
                </h2>
                <div className="space-y-3">
                  {article.nested_links.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-neon-blue/30 transition-all duration-200 group"
                    >
                      <ExternalLink className="h-4 w-4 text-neon-blue flex-shrink-0" />
                      <span className="text-slate-300 font-rajdhani text-sm group-hover:text-neon-blue transition-colors truncate">
                        {link.url}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </HydrationSafe>
  );
}
