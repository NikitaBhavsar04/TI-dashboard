import { useState, useEffect } from 'react';
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
  Grid,
  FileDown,
  Check,
  Settings,
  BarChart3,
  Navigation,
  Printer,
  Factory,
  Building,
  ShoppingCart,
  Briefcase,
  Heart,
  Wifi,
  Plane
} from 'lucide-react';
import HydrationSafe from '@/components/HydrationSafe';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues
const EmailModal = dynamic(() => import('@/components/EmailModal'), {
  ssr: false
});

import { IAdvisory } from '@/models/Advisory';
import dbConnect from '@/lib/db';
import Advisory from '@/models/Advisory';
import { verifyToken } from '@/lib/auth';

// Extended interface for comprehensive advisory data
interface ExtendedAdvisory {
  _id: string;
  title: string;
  description?: string;
  severity?: string;
  publishedDate: string;
  author?: string;
  category?: string;
  tags?: string[];
  references?: string[];
  iocs?: Array<{ type: string; value: string; description?: string }>;
  cveIds?: string[];
  content?: string;
  summary?: string;
  
  // Extended threat intelligence fields
  threatDesignation?: string;
  threatCategory?: string;
  threatLevel?: string;
  tlpClassification?: string;
  tlp?: string;
  cves?: string[];
  executiveSummary?: string;
  affectedProducts?: string[];
  targetSectors?: string[];
  regions?: string[];
  mitreTactics?: Array<{
    tacticName: string;
    techniqueId: string;
    technique: string;
  }>;
  recommendations?: string[];
  patchDetails?: string;
  cvss?: string;
}

interface AdvisoryDetailProps {
  advisory: ExtendedAdvisory;
}

export default function AdvisoryDetail({ advisory }: AdvisoryDetailProps) {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'info'}>>([]);

  // Debug log for showEmailModal state changes
  useEffect(() => {
    console.log('showEmailModal state changed:', showEmailModal);
  }, [showEmailModal]);

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

  const getTLPClassificationColor = (tlp: string) => {
    switch (tlp?.toLowerCase()) {
      case 'tlp:red': return 'bg-red-500/20 text-red-300 border-red-400/50';
      case 'tlp:amber': return 'bg-orange-500/20 text-orange-300 border-orange-400/50';
      case 'tlp:green': return 'bg-green-500/20 text-green-300 border-green-400/50';
      case 'tlp:white': return 'bg-slate-500/20 text-slate-300 border-slate-400/50';
      default: return 'bg-blue-500/20 text-blue-300 border-blue-400/50';
    }
  };

  const getIndustryIcon = (sector: string) => {
    switch (sector?.toLowerCase()) {
      case 'finance': 
      case 'banking': return <Database className="h-4 w-4" />;
      case 'healthcare': return <Activity className="h-4 w-4" />;
      case 'government': return <Shield className="h-4 w-4" />;
      case 'technology': return <Server className="h-4 w-4" />;
      case 'education': return <FileText className="h-4 w-4" />;
      default: return <Grid className="h-4 w-4" />;
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
        <div className="glass-panel-hover mx-4 mt-4 mb-6 border border-neon-blue/30 bg-slate-900/80">
          <div className="flex items-center justify-between p-4">
            {/* Left Logo - Forensic Cyber Tech */}
            <div className="flex items-center space-x-3">
              <img 
                src="/forensiccybertech-logo.png" 
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
                src="/Eagleye-S.png" 
                alt="EagleEye" 
                className="h-10 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>

        {/* Navigation and Actions */}
        <div className="sticky top-0 z-40 bg-cyber-gradient backdrop-blur-md border-b border-neon-blue/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              {/* Back Button */}
              <button 
                onClick={() => router.push('/advisories')}
                className="flex items-center space-x-2 px-4 py-2 glass-panel-hover transition-all duration-300 hover:scale-105"
              >
                <ArrowLeft className="h-4 w-4 text-neon-blue" />
                <span className="text-white font-rajdhani font-medium">Back to Advisories</span>
              </button>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {isAdmin && (
                  <>
                    <button 
                      onClick={() => {
                        console.log('Send Email button clicked');
                        console.log('isAdmin:', isAdmin);
                        console.log('Current showEmailModal:', showEmailModal);
                        setShowEmailModal(true);
                        console.log('setShowEmailModal(true) called');
                      }}
                      className="flex items-center space-x-2 px-4 py-2 glass-panel-hover transition-all duration-300 hover:scale-105"
                    >
                      <Mail className="h-4 w-4 text-neon-blue" />
                      <span className="hidden sm:inline text-white font-rajdhani font-medium">Send Email</span>
                    </button>
                    
                    <Link href={`/admin/edit/${advisory._id}`}>
                      <button className="flex items-center space-x-2 px-4 py-2 glass-panel-hover transition-all duration-300 hover:scale-105">
                        <Edit className="h-4 w-4 text-neon-green" />
                        <span className="hidden sm:inline text-white font-rajdhani font-medium">Edit</span>
                      </button>
                    </Link>
                    
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center space-x-2 px-4 py-2 glass-panel-hover transition-all duration-300 hover:scale-105"
                    >
                      <Trash2 className="h-4 w-4 text-neon-pink" />
                      <span className="hidden sm:inline text-white font-rajdhani font-medium">Delete</span>
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => copyToClipboard(window.location.href, 'url')}
                  className="flex items-center space-x-2 px-4 py-2 glass-panel-hover transition-all duration-300 hover:scale-105"
                >
                  <Share2 className="h-4 w-4 text-neon-purple" />
                  <span className="hidden sm:inline text-white font-rajdhani font-medium">Share</span>
                </button>
                
                <button 
                  onClick={generatePDF}
                  className="flex items-center space-x-2 px-4 py-2 glass-panel-hover transition-all duration-300 hover:scale-105"
                >
                  <Download className="h-4 w-4 text-neon-cyan" />
                  <span className="hidden sm:inline text-white font-rajdhani font-medium">Export PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              
              {/* Title and Metadata */}
              <motion.div 
                className="glass-panel-hover p-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="space-y-6">
                  <div>
                    <h1 className="font-orbitron font-bold text-3xl lg:text-4xl text-white mb-4 leading-tight">
                      {advisory.title}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                      {advisory.severity && (
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${
                          advisory.severity?.toLowerCase() === 'critical' ? 'bg-neon-pink/20 border-neon-pink/50 text-neon-pink' :
                          advisory.severity?.toLowerCase() === 'high' ? 'bg-red-500/20 border-red-400/50 text-red-300' :
                          advisory.severity?.toLowerCase() === 'medium' ? 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300' :
                          'bg-neon-blue/20 border-neon-blue/50 text-neon-blue'
                        }`}>
                          {getSeverityIcon(advisory.severity)}
                          <span className="font-rajdhani font-semibold text-sm">
                            {advisory.severity?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2 text-slate-300 font-rajdhani text-sm">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(advisory.publishedDate)}</span>
                      </div>
                      
                      {advisory.author && (
                        <div className="flex items-center space-x-2 text-slate-300 font-rajdhani text-sm">
                          <User className="h-4 w-4" />
                          <span>{advisory.author}</span>
                        </div>
                      )}
                      
                      {advisory.cvss && (
                        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-400/50 text-orange-300">
                          <span className="font-rajdhani font-semibold text-sm">
                            CVSS: {advisory.cvss}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {advisory.category && (
                        <div className="px-3 py-1 rounded-full bg-neon-blue/20 border border-neon-blue/50 text-neon-blue font-rajdhani text-sm">
                          {advisory.category}
                        </div>
                      )}
                      
                      {advisory.tags?.map((tag, index) => (
                        <div key={index} className="px-3 py-1 rounded-full bg-neon-purple/20 border border-neon-purple/50 text-neon-purple font-rajdhani text-sm flex items-center space-x-1">
                          <Tag className="h-3 w-3" />
                          <span>{tag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 🚨 BASIC THREAT PARAMETERS */}
              {(advisory.threatDesignation || advisory.threatCategory || advisory.threatLevel || advisory.tlpClassification || advisory.tlp || advisory.cveIds?.length || advisory.cves?.length) && (
                <motion.div 
                  className="glass-panel-hover p-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <div className="flex items-center space-x-3 mb-6 p-4 bg-red-500/10 border border-red-400/30 rounded-lg">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-500/20 border border-red-400/50">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <h2 className="font-orbitron font-bold text-xl text-white">🚨 BASIC THREAT PARAMETERS</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {advisory.threatDesignation && (
                      <div>
                        <label className="block text-slate-400 font-rajdhani text-sm mb-2">THREAT DESIGNATION</label>
                        <div className="text-white font-orbitron font-semibold">{advisory.threatDesignation}</div>
                      </div>
                    )}
                    
                    {advisory.threatCategory && (
                      <div>
                        <label className="block text-slate-400 font-rajdhani text-sm mb-2">THREAT CATEGORY</label>
                        <div className="text-white font-orbitron font-semibold">{advisory.threatCategory}</div>
                      </div>
                    )}
                    
                    {advisory.threatLevel && (
                      <div>
                        <label className="block text-slate-400 font-rajdhani text-sm mb-2">THREAT LEVEL</label>
                        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${
                          advisory.threatLevel?.toLowerCase() === 'critical' ? 'bg-red-500/20 text-red-300 border-red-400/50' :
                          advisory.threatLevel?.toLowerCase() === 'high' ? 'bg-orange-500/20 text-orange-300 border-orange-400/50' :
                          advisory.threatLevel?.toLowerCase() === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50' :
                          'bg-green-500/20 text-green-300 border-green-400/50'
                        }`}>
                          {getSeverityIcon(advisory.threatLevel)}
                          <span className="font-rajdhani font-semibold text-sm">{advisory.threatLevel.toUpperCase()}</span>
                        </div>
                      </div>
                    )}
                    
                    {(advisory.tlpClassification || advisory.tlp) && (
                      <div>
                        <label className="block text-slate-400 font-rajdhani text-sm mb-2">TLP CLASSIFICATION</label>
                        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${getTLPClassificationColor(advisory.tlpClassification || advisory.tlp)}`}>
                          <Lock className="h-4 w-4" />
                          <span className="font-rajdhani font-semibold text-sm">{(advisory.tlpClassification || advisory.tlp)?.toUpperCase()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* CVE Identifiers */}
                  {(advisory.cveIds?.length || advisory.cves?.length) && (
                    <div className="mt-6">
                      <label className="block text-slate-400 font-rajdhani text-sm mb-4">CVE IDENTIFIERS</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(advisory.cveIds || advisory.cves || []).map((cve: string, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-400/30 rounded-lg hover:border-orange-400/50 transition-all duration-200">
                            <div className="flex items-center space-x-2">
                              <Bug className="h-4 w-4 text-orange-400" />
                              <span className="font-mono text-orange-300">{cve}</span>
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
                    </div>
                  )}
                  
                  {!(advisory.cveIds?.length || advisory.cves?.length) && (
                    <div className="mt-6">
                      <label className="block text-slate-400 font-rajdhani text-sm mb-4">CVE IDENTIFIERS</label>
                      <div className="text-slate-500 font-rajdhani italic">No CVE assigned</div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* 📄 THREAT DETAILS */}
              {(advisory.description || advisory.executiveSummary || advisory.summary || advisory.affectedProducts?.length || advisory.targetSectors?.length || advisory.regions?.length) && (
                <motion.div 
                  className="glass-panel-hover p-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <div className="flex items-center space-x-3 mb-6 p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-400/50">
                      <FileText className="h-5 w-5 text-blue-400" />
                    </div>
                    <h2 className="font-orbitron font-bold text-xl text-white">📄 THREAT DETAILS</h2>
                  </div>

                  {/* Executive Summary / Description */}
                  {(advisory.executiveSummary || advisory.summary || advisory.description) && (
                    <div className="mb-6">
                      <h3 className="font-orbitron font-semibold text-lg text-white mb-4">Executive Summary</h3>
                      <div className="prose prose-invert max-w-none bg-slate-800/30 border border-slate-600/50 rounded-lg p-6">
                        <p className="text-slate-300 font-rajdhani text-base leading-relaxed whitespace-pre-wrap text-justify">
                          {advisory.executiveSummary || advisory.summary || advisory.description}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Affected Products */}
                  {advisory.affectedProducts?.length && (
                    <div className="mb-6">
                      <h3 className="font-orbitron font-semibold text-lg text-white mb-4">Affected Products</h3>
                      <div className="flex flex-wrap gap-2">
                        {advisory.affectedProducts.map((product, index) => (
                          <div key={index} className="px-3 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 font-rajdhani text-sm">
                            {product}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Target Sectors */}
                  {advisory.targetSectors?.length && (
                    <div className="mb-6">
                      <h3 className="font-orbitron font-semibold text-lg text-white mb-4">Target Sectors</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {advisory.targetSectors.map((sector, index) => (
                          <div key={index} className="flex items-center space-x-2 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                            {getIndustryIcon(sector)}
                            <span className="text-purple-300 font-rajdhani">{sector}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regions */}
                  {advisory.regions?.length && (
                    <div className="mb-6">
                      <h3 className="font-orbitron font-semibold text-lg text-white mb-4">Regions</h3>
                      <div className="flex flex-wrap gap-2">
                        {advisory.regions.map((region, index) => (
                          <div key={index} className="flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-rajdhani text-sm">
                            <Globe className="h-3 w-3" />
                            <span>{region}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technical Analysis */}
                  {advisory.content && (
                    <div>
                      <h3 className="font-orbitron font-semibold text-lg text-white mb-4">Detailed Analysis</h3>
                      <div className="prose prose-invert max-w-none bg-slate-800/30 border border-slate-600/50 rounded-lg p-6">
                        <div className="text-slate-300 font-rajdhani text-base leading-relaxed whitespace-pre-wrap text-justify">
                          {advisory.content}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* 🧠 INDICATORS OF COMPROMISE */}
              {advisory.iocs && advisory.iocs.length > 0 && (
                <motion.div 
                  className="glass-panel-hover p-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <div className="flex items-center space-x-3 mb-6 p-4 bg-neon-pink/10 border border-neon-pink/30 rounded-lg">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neon-pink/20 border border-neon-pink/50">
                      <Target className="h-5 w-5 text-neon-pink" />
                    </div>
                    <h2 className="font-orbitron font-bold text-xl text-white">🧠 INDICATORS OF COMPROMISE</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {advisory.iocs.map((ioc: any, index: number) => (
                      <div key={index} className="group p-4 bg-neon-pink/5 border border-neon-pink/20 rounded-lg hover:border-neon-pink/40 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getIconForIOCType(ioc.type)}
                            <span className="font-rajdhani font-semibold text-neon-pink text-sm">
                              {ioc.type}
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(ioc.value, `ioc-${index}`)}
                            className="text-slate-400 hover:text-neon-pink transition-colors"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="font-mono text-neon-pink text-sm mb-2 break-all bg-neon-pink/10 p-2 rounded">
                          {ioc.value}
                        </div>
                        {ioc.description && (
                          <p className="text-slate-400 font-rajdhani text-sm text-justify">
                            {ioc.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* 🕸️ MITRE ATT&CK FRAMEWORK */}
              {advisory.mitreTactics && advisory.mitreTactics.length > 0 && (
                <motion.div 
                  className="glass-panel-hover p-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <div className="flex items-center space-x-3 mb-6 p-4 bg-green-500/10 border border-green-400/30 rounded-lg">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/20 border border-green-400/50">
                      <Grid className="h-5 w-5 text-green-400" />
                    </div>
                    <h2 className="font-orbitron font-bold text-xl text-white">🕸️ MITRE ATT&CK FRAMEWORK</h2>
                  </div>
                  <div className="overflow-x-auto bg-slate-800/30 border border-slate-600/50 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-green-500/10 border-b border-green-400/30">
                        <tr>
                          <th className="text-left text-green-300 font-rajdhani font-semibold text-sm py-4 px-6">TACTIC NAME</th>
                          <th className="text-left text-green-300 font-rajdhani font-semibold text-sm py-4 px-6">TECHNIQUE ID</th>
                          <th className="text-left text-green-300 font-rajdhani font-semibold text-sm py-4 px-6">TECHNIQUE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advisory.mitreTactics.map((tactic: any, index: number) => (
                          <tr key={index} className="border-b border-slate-700/50 hover:bg-green-500/10 transition-colors">
                            <td className="py-4 px-6 text-white font-orbitron font-semibold">
                              {tactic.tacticName || tactic.name || 'N/A'}
                            </td>
                            <td className="py-4 px-6">
                              <span className="inline-block text-green-400 font-mono bg-green-500/10 border border-green-400/30 rounded px-2 py-1">
                                {tactic.techniqueId || tactic.id || 'N/A'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-slate-300 font-rajdhani">
                              {tactic.technique || tactic.techniques?.[0] || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* 🛡️ RECOMMENDATIONS */}
              {advisory.recommendations && advisory.recommendations.length > 0 && (
                <motion.div 
                  className="glass-panel-hover p-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <div className="flex items-center space-x-3 mb-6 p-4 bg-green-500/10 border border-green-400/30 rounded-lg">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/20 border border-green-400/50">
                      <Shield className="h-5 w-5 text-green-400" />
                    </div>
                    <h2 className="font-orbitron font-bold text-xl text-white">🛡️ SECURITY RECOMMENDATIONS</h2>
                  </div>
                  <div className="space-y-3">
                    {advisory.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-green-500/5 border border-green-400/20 rounded-lg">
                        <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                        <p className="text-slate-300 font-rajdhani text-base leading-relaxed text-justify">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* 🧩 PATCH DETAILS */}
              {advisory.patchDetails && (
                <motion.div 
                  className="glass-panel-hover p-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <div className="flex items-center space-x-3 mb-6 p-4 bg-orange-500/10 border border-orange-400/30 rounded-lg">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-400/50">
                      <Download className="h-5 w-5 text-orange-400" />
                    </div>
                    <h2 className="font-orbitron font-bold text-xl text-white">🧩 PATCH DETAILS</h2>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <div className="text-slate-300 font-rajdhani text-base leading-relaxed whitespace-pre-wrap text-justify">
                      {advisory.patchDetails}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 📦 METADATA & REFERENCES */}
              {(advisory.tags?.length || advisory.references?.length) && (
                <motion.div 
                  className="glass-panel-hover p-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                >
                  <div className="flex items-center space-x-3 mb-6 p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-400/50">
                      <Link2 className="h-5 w-5 text-purple-400" />
                    </div>
                    <h2 className="font-orbitron font-bold text-xl text-white">📦 METADATA & REFERENCES</h2>
                  </div>
                  
                  {/* Classification Tags */}
                  {advisory.tags?.length && (
                    <div className="mb-6">
                      <h3 className="font-orbitron font-semibold text-lg text-white mb-4">Classification Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {advisory.tags.map((tag, index) => (
                          <div key={index} className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 font-rajdhani text-sm flex items-center space-x-1">
                            <Tag className="h-3 w-3" />
                            <span>{tag}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* External References */}
                  {advisory.references?.length && (
                    <div>
                      <h3 className="font-orbitron font-semibold text-lg text-white mb-4">External References</h3>
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
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Quick Stats */}
              <motion.div 
                className="glass-panel-hover p-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <h3 className="font-orbitron font-bold text-lg text-white mb-4 flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Quick Stats</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-rajdhani text-sm">Published</span>
                    <span className="text-white font-orbitron text-sm text-right">{formatDate(advisory.publishedDate)}</span>
                  </div>
                  
                  {advisory.severity && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-rajdhani text-sm">Severity</span>
                      <span className={`font-orbitron text-sm text-right ${
                        advisory.severity?.toLowerCase() === 'critical' ? 'text-neon-pink' :
                        advisory.severity?.toLowerCase() === 'high' ? 'text-red-300' :
                        advisory.severity?.toLowerCase() === 'medium' ? 'text-yellow-300' :
                        'text-neon-blue'
                      }`}>
                        {advisory.severity}
                      </span>
                    </div>
                  )}
                  
                  {advisory.category && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-rajdhani text-sm">Category</span>
                      <span className="text-white font-orbitron text-sm text-right">{advisory.category}</span>
                    </div>
                  )}
                  
                  {(advisory.tlpClassification || advisory.tlp) && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-rajdhani text-sm">TLP</span>
                      <span className={`font-orbitron text-sm text-right ${
                        (advisory.tlpClassification || advisory.tlp)?.toLowerCase() === 'tlp:red' ? 'text-red-300' :
                        (advisory.tlpClassification || advisory.tlp)?.toLowerCase() === 'tlp:amber' ? 'text-orange-300' :
                        (advisory.tlpClassification || advisory.tlp)?.toLowerCase() === 'tlp:green' ? 'text-green-300' :
                        'text-slate-300'
                      }`}>
                        {(advisory.tlpClassification || advisory.tlp)?.toUpperCase().replace('TLP:', '')}
                      </span>
                    </div>
                  )}
                  
                  {(advisory.cveIds?.length || advisory.cves?.length) ? (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-rajdhani text-sm">CVEs</span>
                      <span className="text-orange-300 font-orbitron text-sm text-right">
                        {(advisory.cveIds || advisory.cves || []).length}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-rajdhani text-sm">CVEs</span>
                      <span className="text-slate-500 font-orbitron text-sm text-right italic">None</span>
                    </div>
                  )}
                  
                  {advisory.iocs?.length && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-rajdhani text-sm">IOCs</span>
                      <span className="text-neon-pink font-orbitron text-sm text-right">{advisory.iocs.length}</span>
                    </div>
                  )}
                  
                  {advisory.references?.length && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-rajdhani text-sm">References</span>
                      <span className="text-neon-purple font-orbitron text-sm text-right">{advisory.references.length}</span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Risk Assessment */}
              {(advisory.severity || advisory.cvss || advisory.threatLevel) && (
                <motion.div 
                  className="glass-panel-hover p-6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <h3 className="font-orbitron font-bold text-lg text-white mb-4 flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Risk Assessment</span>
                  </h3>
                  <div className="space-y-4">
                    {advisory.severity && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-400 font-rajdhani text-sm">Severity Level</span>
                          <span className={`font-orbitron text-sm ${
                            advisory.severity?.toLowerCase() === 'critical' ? 'text-neon-pink' :
                            advisory.severity?.toLowerCase() === 'high' ? 'text-red-300' :
                            advisory.severity?.toLowerCase() === 'medium' ? 'text-yellow-300' :
                            'text-neon-blue'
                          }`}>
                            {advisory.severity.toUpperCase()}
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              advisory.severity?.toLowerCase() === 'critical' ? 'bg-neon-pink w-full' :
                              advisory.severity?.toLowerCase() === 'high' ? 'bg-red-400 w-4/5' :
                              advisory.severity?.toLowerCase() === 'medium' ? 'bg-yellow-400 w-3/5' :
                              'bg-neon-blue w-2/5'
                            }`}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {advisory.cvss && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-400 font-rajdhani text-sm">CVSS Score</span>
                          <span className="text-orange-300 font-orbitron text-sm">{advisory.cvss}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-orange-400"
                            style={{ width: `${(parseFloat(advisory.cvss) / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {advisory.threatLevel && advisory.threatLevel !== advisory.severity && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-400 font-rajdhani text-sm">Threat Level</span>
                          <span className={`font-orbitron text-sm ${
                            advisory.threatLevel?.toLowerCase() === 'critical' ? 'text-red-300' :
                            advisory.threatLevel?.toLowerCase() === 'high' ? 'text-orange-300' :
                            advisory.threatLevel?.toLowerCase() === 'medium' ? 'text-yellow-300' :
                            'text-green-300'
                          }`}>
                            {advisory.threatLevel.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Related Advisories */}
              <motion.div 
                className="glass-panel-hover p-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <h3 className="font-orbitron font-semibold text-lg text-white mb-4">Related</h3>
                <div className="text-center">
                  <button 
                    onClick={() => router.push('/advisories')}
                    className="text-neon-blue font-rajdhani text-sm hover:text-neon-cyan transition-colors"
                  >
                    View All Advisories →
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Email Modal */}
        {(() => {
          console.log('EmailModal render condition:', { showEmailModal, advisory: advisory?.title });
          return showEmailModal;
        })() && (
          <EmailModal
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            advisory={advisory}
          />
        )}

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

        {/* Toast Notifications */}
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="fixed top-4 right-4 z-50 glass-panel-hover p-4 min-w-[300px]"
          >
            <div className="flex items-center space-x-3">
              {notification.type === 'success' && <Check className="h-5 w-5 text-neon-green" />}
              {notification.type === 'error' && <AlertTriangle className="h-5 w-5 text-neon-pink" />}
              {notification.type === 'info' && <Info className="h-5 w-5 text-neon-blue" />}
              <span className="text-white font-rajdhani">{notification.message}</span>
            </div>
          </div>
        ))}
      </div>
    </HydrationSafe>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params, req }) => {
  try {
    await dbConnect();
    
    const advisory = await Advisory.findById(params?.id).lean();
    
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

    // Convert ObjectId and Date objects for serialization - using JSON.parse/stringify to handle MongoDB objects
    const serializedAdvisory = JSON.parse(JSON.stringify(advisory));

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
