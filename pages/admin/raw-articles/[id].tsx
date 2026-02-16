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
  Loader,
  AlignLeft
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

interface SimilarArticle {
  id: string;
  title: string;
}

export default function RawArticleDetail() {
  const [article, setArticle] = useState<RawArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [similarArticles, setSimilarArticles] = useState<SimilarArticle[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  const { user, hasRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  const fetchArticle = async () => {
    try {
      setLoading(true);
      console.log('[RAW-ARTICLE] Fetching article with ID:', id);
      
      const response = await fetch(`/api/raw-articles/${id}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.article) {
          console.log('[RAW-ARTICLE] Article loaded:', data.article.title);
          setArticle(data.article);
          // Fetch similar articles after loading the main article
          fetchSimilarArticles(data.article.id);
        } else {
          console.error('[RAW-ARTICLE] Article not found in response');
          setError('Article not found');
        }
      } else {
        console.error('[RAW-ARTICLE] Failed to fetch article:', response.status);
        setError('Failed to load article');
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      setError('Error loading article');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || !hasRole('admin'))) {
      router.push('/login');
      return;
    }
    
    if (hasRole('admin') && id) {
      fetchArticle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hasRole, authLoading, router, id]);

  const fetchSimilarArticles = async (articleId: string) => {
    try {
      setLoadingSimilar(true);
      console.log('[RAW-ARTICLE] Fetching similar articles for:', articleId);
      
      const response = await fetch(`/api/similar-articles?articleId=${articleId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`[RAW-ARTICLE] Found ${data.count} similar articles`);
          setSimilarArticles(data.similarArticles);
        } else {
          console.error('[RAW-ARTICLE] Failed to fetch similar articles:', data.error);
        }
      } else {
        console.error('[RAW-ARTICLE] Similar articles API error:', response.status);
      }
    } catch (error) {
      console.error('[RAW-ARTICLE] Error fetching similar articles:', error);
    } finally {
      setLoadingSimilar(false);
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
          // Validate that we have a proper advisory_id format
          if (advisoryId.includes('SOC-') || advisoryId.includes('-')) {
            console.log('[RAW-ARTICLE] ✅ Redirecting with advisory_id:', advisoryId);
            router.push(`/admin/advisory-editor?advisory_id=${advisoryId}`);
          } else {
            console.error('[RAW-ARTICLE] ⚠️ Invalid advisory_id format:', advisoryId);
            console.error('[RAW-ARTICLE] Expected format: SOC-TA-YYYYMMDD-HHMMSS');
            console.error('[RAW-ARTICLE] Received:', advisoryId);
            alert(`Invalid advisory ID format: ${advisoryId}\n\nExpected format: SOC-TA-YYYYMMDD-HHMMSS\n\nThis might be an article ID instead of an advisory ID. Check console for details.`);
          }
        } else {
          console.error('[RAW-ARTICLE] ❌ advisory_id is missing from response');
          console.error('[RAW-ARTICLE] Full advisory object:', JSON.stringify(data.advisory, null, 2));
          alert('Advisory generated but advisory_id is missing. Check console for details.');
        }
      } else {
        alert(`Failed to generate advisory: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      const err = error as Error;
      console.error('Error generating advisory:', err);
      alert(`Error: ${err.message}`);
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
                  <h1 className="text-3xl font-orbitron font-bold text-white mb-4 break-words">
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
                            className="px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded text-purple-300 text-sm font-rajdhani font-medium break-all"
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
              <div className="text-slate-300 font-rajdhani text-base leading-relaxed whitespace-pre-wrap break-words">
                {article.article_text}
              </div>
            </div>

            {/* Nested Links */}
            {article.nested_links.length > 0 && (
              <div className="glass-panel-hover p-8 mb-6">
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
                      className="flex items-center space-x-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-neon-blue/30 transition-all duration-200 group max-w-full"
                    >
                      <ExternalLink className="h-4 w-4 text-neon-blue flex-shrink-0" />
                      <span className="text-slate-300 font-rajdhani text-sm group-hover:text-neon-blue transition-colors truncate break-all">
                        {link.url}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Similar Articles */}
            {article.cves.length > 0 && (
              <div className="glass-panel-hover p-8">
                <h2 className="text-xl font-orbitron font-bold text-white mb-4 flex items-center">
                  <AlignLeft className="h-5 w-5 mr-2 text-purple-400" />
                  Similar Articles
                  {loadingSimilar && (
                    <Loader className="h-4 w-4 ml-2 animate-spin text-purple-400" />
                  )}
                </h2>
                
                {loadingSimilar ? (
                  <div className="text-center py-8">
                    <div className="text-slate-400 font-rajdhani">
                      Finding similar articles based on CVEs...
                    </div>
                  </div>
                ) : similarArticles.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-slate-400 font-rajdhani text-sm mb-4">
                      Found {similarArticles.length} article{similarArticles.length !== 1 ? 's' : ''} with matching CVEs from different sources
                    </p>
                    {similarArticles.map((similar) => (
                      <Link key={similar.id} href={`/admin/raw-articles/${similar.id}`}>
                        <div className="flex items-center space-x-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-purple-400/40 transition-all duration-200 cursor-pointer group">
                          <FileText className="h-4 w-4 text-purple-400 flex-shrink-0 group-hover:text-purple-300" />
                          <p className="text-slate-200 font-rajdhani text-sm group-hover:text-white transition-colors flex-1">
                            {similar.title}
                          </p>
                          <ArrowLeft className="h-4 w-4 text-slate-600 group-hover:text-purple-400 transition-colors flex-shrink-0 rotate-180" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-900/30 rounded-lg border border-slate-700/30">
                    <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3 opacity-50" />
                    <p className="text-slate-400 font-rajdhani">
                      No similar articles found with matching CVEs
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </HydrationSafe>
  );
}
