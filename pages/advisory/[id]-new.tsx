import { useState } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  formatDate 
} from '@/lib/utils';
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
  Grid
} from 'lucide-react';
import HydrationSafe from '@/components/HydrationSafe';
import { IAdvisory } from '@/models/Advisory';
import dbConnect from '@/lib/db';
import Advisory from '@/models/Advisory';
import { verifyToken } from '@/lib/auth';

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
      <div className="min-h-screen bg-tech-gradient">
        <Head>
          <title>{advisory.title} - EaglEye IntelDesk Intelligence</title>
          <meta name="description" content={advisory.description} />
        </Head>

        {/* Header with Logos */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-panel-hover mx-4 mt-4 mb-6"
        >
          <div className="flex items-center justify-between p-4">
            {/* Left Logo - Forensic Cyber Tech */}
            <div className="flex items-center space-x-3">
              <img 
                src="/fct-logo.png" 
                alt="Forensic Cyber Tech" 
                className="h-10 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="hidden sm:block">
                <div className="font-orbitron font-bold text-neon-blue text-lg">
                  Forensic Cyber Tech
                </div>
                <div className="font-rajdhani text-xs text-slate-400">
                  Digital Forensics & Cybersecurity
                </div>
              </div>
            </div>

            {/* Right Logo - EagleEye */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right">
                <div className="font-orbitron font-bold text-neon-purple text-lg">
                  EaglEye IntelDesk
                </div>
                <div className="font-rajdhani text-xs text-slate-400">
                  Threat Intelligence Platform
                </div>
              </div>
              <img 
                src="/eagleye-logo.png" 
                alt="EagleEye" 
                className="h-10 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Navigation and Actions */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-lg border-b border-gray-700/50"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              {/* Back Button */}
              <button 
                onClick={() => router.push('/advisories')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600/20 border border-blue-400/50 rounded-lg backdrop-blur-md transition-all duration-300 hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:bg-blue-600/30 group"
              >
                <ArrowLeft className="h-4 w-4 text-blue-400 group-hover:text-blue-300" />
                <span className="text-blue-100 font-rajdhani font-medium">Back to Advisories</span>
              </button>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {isAdmin && (
                  <>
                    <Link href={`/admin/edit/${advisory._id}`}>
                      <button className="flex items-center space-x-2 px-4 py-2 bg-green-600/20 border border-green-400/50 rounded-lg backdrop-blur-md transition-all duration-300 hover:border-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:bg-green-600/30 group">
                        <Edit className="h-4 w-4 text-green-400 group-hover:text-green-300" />
                        <span className="hidden sm:inline text-green-100 font-rajdhani font-medium">Edit</span>
                      </button>
                    </Link>
                    
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600/20 border border-red-400/50 rounded-lg backdrop-blur-md transition-all duration-300 hover:border-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:bg-red-600/30 group"
                    >
                      <Trash2 className="h-4 w-4 text-red-400 group-hover:text-red-300" />
                      <span className="hidden sm:inline text-red-100 font-rajdhani font-medium">Delete</span>
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => copyToClipboard(window.location.href, 'url')}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600/20 border border-purple-400/50 rounded-lg backdrop-blur-md transition-all duration-300 hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:bg-purple-600/30 group"
                >
                  <Share2 className="h-4 w-4 text-purple-400 group-hover:text-purple-300" />
                  <span className="hidden sm:inline text-purple-100 font-rajdhani font-medium">Share</span>
                </button>
                
                <button 
                  onClick={generatePDF}
                  className="flex items-center space-x-2 px-4 py-2 bg-cyan-600/20 border border-cyan-400/50 rounded-lg backdrop-blur-md transition-all duration-300 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:bg-cyan-600/30 group"
                >
                  <Download className="h-4 w-4 text-cyan-400 group-hover:text-cyan-300" />
                  <span className="hidden sm:inline text-cyan-100 font-rajdhani font-medium">Export PDF</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              
              {/* Title and Metadata */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="glass-panel-hover p-8"
              >
                <div className="space-y-6">
                  <div>
                    <h1 className="font-orbitron font-bold text-3xl lg:text-4xl text-white mb-4 leading-tight">
                      {advisory.title}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${
                        advisory.severity?.toLowerCase() === 'critical' ? 'bg-red-500/20 border-red-400/50 text-red-100' :
                        advisory.severity?.toLowerCase() === 'high' ? 'bg-orange-500/20 border-orange-400/50 text-orange-100' :
                        advisory.severity?.toLowerCase() === 'medium' ? 'bg-yellow-500/20 border-yellow-400/50 text-yellow-100' :
                        'bg-blue-500/20 border-blue-400/50 text-blue-100'
                      }`}>
                        {getSeverityIcon(advisory.severity)}
                        <span className="font-rajdhani font-semibold text-sm">
                          {advisory.severity?.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-slate-300 font-rajdhani text-sm">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(advisory.publishedDate)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-slate-300 font-rajdhani text-sm">
                        <User className="h-4 w-4" />
                        <span>{advisory.author}</span>
                      </div>
                      
                      {advisory.cvss && (
                        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-400/50 text-orange-100">
                          <span className="font-rajdhani font-semibold text-sm">
                            CVSS: {advisory.cvss}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <div className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/50 text-blue-100 font-rajdhani text-sm">
                        {advisory.category}
                      </div>
                      
                      {advisory.tags?.map((tag, index) => (
                        <div key={index} className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-100 font-rajdhani text-sm flex items-center space-x-1">
                          <Tag className="h-3 w-3" />
                          <span>{tag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Executive Summary */}
              {advisory.summary && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="glass-panel-hover p-8"
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-red-500/10 border border-red-400/50">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <h2 className="font-orbitron font-bold text-xl text-white">Executive Summary</h2>
                  </div>
                  <p className="text-slate-300 font-rajdhani text-lg leading-relaxed">
                    {advisory.summary}
                  </p>
                </motion.div>
              )}

              {/* Technical Analysis */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="glass-panel-hover p-8"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-400/50">
                    <FileText className="h-5 w-5 text-blue-400" />
                  </div>
                  <h2 className="font-orbitron font-bold text-xl text-white">Technical Analysis</h2>
                </div>

                {/* CVE Information */}
                {advisory.cveIds && advisory.cveIds.length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-orbitron font-semibold text-lg text-white mb-4 flex items-center space-x-2">
                      <Bug className="h-5 w-5 text-orange-400" />
                      <span>CVE Identifiers</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {advisory.cveIds.map((cve: string, index: number) => (
                        <div key={index} className="flex items-center space-x-2 p-3 bg-orange-500/10 border border-orange-400/30 rounded-lg">
                          <Bug className="h-4 w-4 text-orange-400" />
                          <span className="font-mono text-orange-100">{cve}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="mb-8">
                  <h3 className="font-orbitron font-semibold text-lg text-white mb-4">Description</h3>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-slate-300 font-rajdhani text-base leading-relaxed whitespace-pre-wrap">
                      {advisory.description}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h3 className="font-orbitron font-semibold text-lg text-white mb-4">Technical Analysis</h3>
                  <div className="prose prose-invert max-w-none">
                    <div className="text-slate-300 font-rajdhani text-base leading-relaxed whitespace-pre-wrap">
                      {advisory.content}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* IOCs Section */}
              {advisory.iocs && advisory.iocs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="glass-panel-hover p-8"
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-red-500/10 border border-red-400/50">
                      <Target className="h-5 w-5 text-red-400" />
                    </div>
                    <h2 className="font-orbitron font-bold text-xl text-white">Indicators of Compromise</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {advisory.iocs.map((ioc: any, index: number) => (
                      <div key={index} className="group p-4 bg-red-500/5 border border-red-400/20 rounded-lg hover:border-red-400/40 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getIconForIOCType(ioc.type)}
                            <span className="font-rajdhani font-semibold text-red-100 text-sm">
                              {ioc.type}
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(ioc.value, `ioc-${index}`)}
                            className="text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="font-mono text-red-100 text-sm mb-2 break-all bg-red-900/20 p-2 rounded">
                          {ioc.value}
                        </div>
                        {ioc.description && (
                          <p className="text-slate-400 font-rajdhani text-sm">
                            {ioc.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* References */}
              {advisory.references && advisory.references.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="glass-panel-hover p-8"
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/10 border border-purple-400/50">
                      <Link2 className="h-5 w-5 text-purple-400" />
                    </div>
                    <h2 className="font-orbitron font-bold text-xl text-white">References</h2>
                  </div>
                  <div className="space-y-3">
                    {advisory.references.map((ref: string, index: number) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-purple-500/5 border border-purple-400/20 rounded-lg">
                        <ExternalLink className="h-4 w-4 text-purple-400 flex-shrink-0" />
                        <a 
                          href={ref} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-purple-100 font-rajdhani hover:text-purple-300 transition-colors break-all"
                        >
                          {ref}
                        </a>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              
              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="glass-panel-hover p-6"
              >
                <h3 className="font-orbitron font-bold text-lg text-white mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-rajdhani text-sm">Severity</span>
                    <div className={`px-2 py-1 rounded text-xs font-rajdhani font-semibold ${
                      advisory.severity?.toLowerCase() === 'critical' ? 'bg-red-500/20 text-red-100' :
                      advisory.severity?.toLowerCase() === 'high' ? 'bg-orange-500/20 text-orange-100' :
                      advisory.severity?.toLowerCase() === 'medium' ? 'bg-yellow-500/20 text-yellow-100' :
                      'bg-blue-500/20 text-blue-100'
                    }`}>
                      {advisory.severity}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-rajdhani text-sm">Category</span>
                    <span className="text-white font-rajdhani text-sm">{advisory.category}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-rajdhani text-sm">Author</span>
                    <span className="text-white font-rajdhani text-sm">{advisory.author}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-rajdhani text-sm">Published</span>
                    <span className="text-white font-rajdhani text-sm">
                      {formatDate(advisory.publishedDate)}
                    </span>
                  </div>

                  {advisory.cvss && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-rajdhani text-sm">CVSS Score</span>
                      <span className="text-orange-100 font-rajdhani font-semibold text-sm">
                        {advisory.cvss}/10
                      </span>
                    </div>
                  )}

                  {advisory.iocs && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-rajdhani text-sm">IOCs</span>
                      <span className="text-red-100 font-rajdhani font-semibold text-sm">
                        {advisory.iocs.length}
                      </span>
                    </div>
                  )}

                  {advisory.references && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-rajdhani text-sm">References</span>
                      <span className="text-purple-100 font-rajdhani font-semibold text-sm">
                        {advisory.references.length}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Tags */}
              {advisory.tags && advisory.tags.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="glass-panel-hover p-6"
                >
                  <h3 className="font-orbitron font-bold text-lg text-white mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {advisory.tags.map((tag, index) => (
                      <div key={index} className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-100 font-rajdhani text-sm">
                        {tag}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel-hover p-6 max-w-md w-full"
            >
              <h3 className="font-orbitron font-bold text-lg text-white mb-4">Confirm Deletion</h3>
              <p className="text-slate-300 font-rajdhani mb-6">
                Are you sure you want to delete this advisory? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2 px-4 bg-red-600/20 border border-red-400/50 rounded-lg text-red-100 font-rajdhani font-medium transition-all duration-300 hover:border-red-400 hover:bg-red-600/30"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 px-4 bg-gray-600/20 border border-gray-400/50 rounded-lg text-gray-100 font-rajdhani font-medium transition-all duration-300 hover:border-gray-400 hover:bg-gray-600/30"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
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
