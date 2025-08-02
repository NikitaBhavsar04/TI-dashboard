import { useState } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import dbConnect from '@/lib/db';
import Advisory from '@/models/Advisory';
import { verifyToken } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import HydrationSafe from '@/components/HydrationSafe';
import { 
  Calendar, 
  User, 
  Download, 
  Copy, 
  ExternalLink, 
  Shield, 
  ArrowLeft,
  Hash,
  Globe,
  Mail,
  Server,
  Activity,
  AlertTriangle,
  Eye,
  FileText,
  Zap,
  CheckCircle,
  Info,
  Target,
  Database,
  Lock,
  Clock,
  Star,
  Share2,
  Edit,
  Trash2,
  Tag,
  Bug,
  Link2,
  MapPin,
  Layers,
  Grid,
  Home
} from 'lucide-react';

interface IAdvisory {
  _id: string;
  title: string;
  description: string;
  summary?: string;
  severity: string;
  publishedDate: string;
  createdAt: string;
  updatedAt: string;
  author?: string;
  tags?: string[];
  affectedSystems?: string[];
  iocs?: Array<{ type: string; value: string }>;
  recommendations?: string;
  references?: string[];
  cveIds?: string[];
}

interface AdvisoryDetailProps {
  advisory: IAdvisory;
}

export default function AdvisoryDetail({ advisory }: AdvisoryDetailProps) {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const copyToClipboard = async (text: string, identifier: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(identifier);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/advisories/${advisory._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/advisories');
      } else {
        const error = await response.json();
        alert('Failed to delete advisory: ' + error.message);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete advisory. Please try again.');
    }
  };

  const getIconForIOCType = (type: string) => {
    switch (type) {
      case 'IP': return <Server className="h-4 w-4" />;
      case 'Hash': return <Hash className="h-4 w-4" />;
      case 'URL': return <Globe className="h-4 w-4" />;
      case 'Domain': return <Globe className="h-4 w-4" />;
      case 'Email': return <Mail className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'red-500';
      case 'high': return 'orange-500';
      case 'medium': return 'yellow-500';
      case 'low': return 'blue-500';
      default: return 'gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return <Zap className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Activity className="h-4 w-4" />;
      case 'low': return <Shield className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const generatePDF = async () => {
    try {
      const response = await fetch(`/api/pdf/${advisory._id}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `advisory-${advisory._id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <HydrationSafe>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Head>
          <title>{advisory.title} - EaglEye Intelligence Platform</title>
          <meta name="description" content={advisory.description} />
        </Head>

        {/* Top Header Bar with Logos */}
        <div className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Left Logo - ForensicCyberTech */}
              <div className="flex items-center space-x-4">
                <img 
                  src="/forensiccybertech-logo.png" 
                  alt="ForensicCyberTech" 
                  className="h-12 w-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="hidden md:block">
                  <h1 className="text-xl font-bold text-white font-orbitron">ForensicCyberTech</h1>
                  <p className="text-sm text-slate-300 font-rajdhani">Digital Forensics & Cybersecurity</p>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center space-x-6">
                <Link href="/">
                  <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 transition-all duration-200">
                    <Home className="h-4 w-4 text-slate-300" />
                    <span className="text-slate-300 font-rajdhani">Home</span>
                  </button>
                </Link>
                <Link href="/advisories">
                  <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 transition-all duration-200">
                    <ArrowLeft className="h-4 w-4 text-slate-300" />
                    <span className="text-slate-300 font-rajdhani">Back to Advisories</span>
                  </button>
                </Link>
              </div>

              {/* Right Logo - EagleEye */}
              <div className="flex items-center space-x-4">
                <div className="hidden md:block text-right">
                  <h1 className="text-xl font-bold text-white font-orbitron">EaglEye Intelligence</h1>
                  <p className="text-sm text-slate-300 font-rajdhani">Threat Intelligence Platform</p>
                </div>
                <img 
                  src="/Eagleye-S.png" 
                  alt="EagleEye" 
                  className="h-12 w-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Advisory Header Section */}
          <motion.div 
            className="glass-card hover-glow p-8 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              
              {/* Title and Basic Info */}
              <div className="flex-1">
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4 font-orbitron leading-tight">
                  {advisory.title || 'N/A'}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <Calendar className="h-4 w-4" />
                    <span className="font-rajdhani">Published: {advisory.publishedDate ? formatDate(advisory.publishedDate) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-300">
                    <User className="h-4 w-4" />
                    <span className="font-rajdhani">Author: {advisory.author || 'N/A'}</span>
                  </div>
                </div>

                {/* Tags */}
                {advisory.tags && advisory.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {advisory.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-rajdhani border border-blue-400/30"
                      >
                        <Tag className="h-3 w-3 inline mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Severity Badge and Actions */}
              <div className="flex flex-col items-end space-y-4">
                {/* Severity Badge */}
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                  advisory.severity?.toLowerCase() === 'critical' 
                    ? 'bg-red-500/20 text-red-300 border-red-400/50' 
                    : advisory.severity?.toLowerCase() === 'high'
                    ? 'bg-orange-500/20 text-orange-300 border-orange-400/50'
                    : advisory.severity?.toLowerCase() === 'medium'
                    ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50'
                    : 'bg-blue-500/20 text-blue-300 border-blue-400/50'
                }`}>
                  {getSeverityIcon(advisory.severity || 'low')}
                  <span className="font-rajdhani font-semibold">
                    {advisory.severity || 'N/A'}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => copyToClipboard(window.location.href, 'url')}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-400/50 hover:bg-purple-500/30 transition-all duration-200"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="font-rajdhani">Share</span>
                  </button>
                  
                  <button 
                    onClick={generatePDF}
                    className="flex items-center space-x-2 px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg border border-cyan-400/50 hover:bg-cyan-500/30 transition-all duration-200"
                  >
                    <Download className="h-4 w-4" />
                    <span className="font-rajdhani">PDF</span>
                  </button>

                  {isAdmin && (
                    <>
                      <Link href={`/admin/edit/${advisory._id}`}>
                        <button className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg border border-green-400/50 hover:bg-green-500/30 transition-all duration-200">
                          <Edit className="h-4 w-4" />
                          <span className="font-rajdhani">Edit</span>
                        </button>
                      </Link>
                      
                      <button 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg border border-red-400/50 hover:bg-red-500/30 transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="font-rajdhani">Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content Sections */}
          <div className="space-y-8">
            
            {/* Summary Section */}
            {advisory.summary && (
              <motion.div 
                className="glass-card hover-glow p-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 border border-yellow-400/50">
                    <FileText className="h-5 w-5 text-yellow-400" />
                  </div>
                  <h2 className="font-orbitron font-bold text-2xl text-white">Executive Summary</h2>
                </div>
                <p className="text-slate-300 font-rajdhani text-lg leading-relaxed">
                  {advisory.summary}
                </p>
              </motion.div>
            )}

            {/* Description Section */}
            <motion.div 
              className="glass-card hover-glow p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-400/50">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="font-orbitron font-bold text-2xl text-white">Detailed Description</h2>
              </div>
              <div className="prose prose-slate prose-invert max-w-none">
                <div className="text-slate-300 font-rajdhani text-lg leading-relaxed whitespace-pre-wrap">
                  {advisory.description || 'N/A'}
                </div>
              </div>
            </motion.div>

            {/* Affected Systems Section */}
            {advisory.affectedSystems && advisory.affectedSystems.length > 0 && (
              <motion.div 
                className="glass-card hover-glow p-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-red-500/10 border border-red-400/50">
                    <Server className="h-5 w-5 text-red-400" />
                  </div>
                  <h2 className="font-orbitron font-bold text-2xl text-white">Affected Systems</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {advisory.affectedSystems.map((system: string, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-4 bg-red-500/10 border border-red-400/30 rounded-lg">
                      <Server className="h-5 w-5 text-red-400" />
                      <span className="text-red-100 font-rajdhani">{system}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* IOCs Section */}
            {advisory.iocs && advisory.iocs.length > 0 && (
              <motion.div 
                className="glass-card hover-glow p-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/10 border border-purple-400/50">
                    <Target className="h-5 w-5 text-purple-400" />
                  </div>
                  <h2 className="font-orbitron font-bold text-2xl text-white">Indicators of Compromise (IOCs)</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {advisory.iocs.map((ioc: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-600/50 hover:border-purple-400/50 transition-all duration-200">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/50">
                          {getIconForIOCType(ioc.type)}
                        </div>
                        <div>
                          <div className="text-sm text-slate-400 font-rajdhani">{ioc.type}</div>
                          <div className="text-white font-mono text-sm break-all">{ioc.value}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(ioc.value, `ioc-${index}`)}
                        className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 transition-all duration-200"
                      >
                        <Copy className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Recommendations Section */}
            {advisory.recommendations && (
              <motion.div 
                className="glass-card hover-glow p-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-400/50">
                    <Shield className="h-5 w-5 text-green-400" />
                  </div>
                  <h2 className="font-orbitron font-bold text-2xl text-white">Security Recommendations</h2>
                </div>
                <div className="text-slate-300 font-rajdhani text-lg leading-relaxed whitespace-pre-wrap">
                  {advisory.recommendations}
                </div>
              </motion.div>
            )}

            {/* References Section */}
            {advisory.references && advisory.references.length > 0 && (
              <motion.div 
                className="glass-card hover-glow p-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 border border-cyan-400/50">
                    <ExternalLink className="h-5 w-5 text-cyan-400" />
                  </div>
                  <h2 className="font-orbitron font-bold text-2xl text-white">External References</h2>
                </div>
                <div className="space-y-3">
                  {advisory.references.map((ref: string, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-600/50 hover:border-cyan-400/50 transition-all duration-200">
                      <a 
                        href={ref} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-cyan-300 hover:text-cyan-200 font-rajdhani underline underline-offset-2 break-all flex-1"
                      >
                        {ref}
                      </a>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => copyToClipboard(ref, `ref-${index}`)}
                          className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 transition-all duration-200"
                        >
                          <Copy className="h-4 w-4 text-slate-400" />
                        </button>
                        <ExternalLink className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* CVE IDs Section */}
            {advisory.cveIds && advisory.cveIds.length > 0 && (
              <motion.div 
                className="glass-card hover-glow p-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-500/10 border border-orange-400/50">
                    <Bug className="h-5 w-5 text-orange-400" />
                  </div>
                  <h2 className="font-orbitron font-bold text-2xl text-white">CVE Identifiers</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {advisory.cveIds.map((cve: string, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-400/30 rounded-lg hover:border-orange-400/50 transition-all duration-200">
                      <div className="flex items-center space-x-2">
                        <Bug className="h-4 w-4 text-orange-400" />
                        <span className="font-mono text-orange-100">{cve}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(cve, `cve-${index}`)}
                        className="p-1 rounded bg-orange-500/20 hover:bg-orange-500/30 transition-all duration-200"
                      >
                        <Copy className="h-3 w-3 text-orange-300" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              className="glass-card p-6 max-w-md w-full"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="font-orbitron font-bold text-lg text-white mb-4">Confirm Deletion</h3>
              <p className="text-slate-300 font-rajdhani mb-6">
                Are you sure you want to delete this advisory? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2 px-4 bg-red-500/20 border border-red-400/50 rounded-lg text-red-100 font-rajdhani font-medium transition-all duration-200 hover:bg-red-500/30"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 px-4 bg-slate-500/20 border border-slate-400/50 rounded-lg text-slate-100 font-rajdhani font-medium transition-all duration-200 hover:bg-slate-500/30"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Copy Success Notification */}
        {copiedItem && (
          <motion.div 
            className="fixed bottom-4 right-4 glass-card p-3 z-50"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-green-100 font-rajdhani text-sm">Copied to clipboard!</span>
            </div>
          </motion.div>
        )}
      </div>
    </HydrationSafe>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params, req }) => {
  try {
    await dbConnect();
    
    const advisoryResult = await Advisory.findById(params?.id).lean();
    const advisory = Array.isArray(advisoryResult) ? advisoryResult[0] : advisoryResult;
    
    if (!advisory) {
      return {
        notFound: true,
      };
    }

    // Check if user is authenticated for access control
    let isAuthenticated = false;
    let userRole = null;

    const token = req.cookies.token;
    if (token) {
      try {
        const tokenPayload = verifyToken(token);
        if (tokenPayload) {
          isAuthenticated = true;
          userRole = tokenPayload.role;
        }
      } catch (error) {
        // Token is invalid, user is not authenticated
      }
    }

    // Convert ObjectId and Date objects for serialization
    const serializedAdvisory = {
      ...advisory,
      _id: advisory._id?.toString(),
      publishedDate: advisory.publishedDate?.toISOString() || new Date().toISOString(),
      createdAt: advisory.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: advisory.updatedAt?.toISOString() || new Date().toISOString(),
    };

    return {
      props: {
        advisory: serializedAdvisory,
      },
    };
  } catch (error) {
    console.error('Error fetching advisory:', error);
    return {
      notFound: true,
    };
  }
};
