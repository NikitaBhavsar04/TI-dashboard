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
  content?: string;
  summary?: string;
  executiveSummary?: string;
  cvss?: string;
  cveIds?: string[];
  cves?: string[];
  iocs?: Array<{
    type: string;
    value: string;
    description?: string;
  }>;
  mitreTactics?: Array<{
    tacticName: string;
    techniqueId: string;
    technique: string;
  }>;
  recommendations?: string[];
  references?: string[];
  patchDetails?: string;
  threatDesignation?: string;
  threatCategory?: string;
  threatLevel?: string;
  tlpClassification?: string;
  affectedProducts?: string[];
  targetSectors?: string[];
  regions?: string[];
}

interface AdvisoryDetailProps {
  advisory: ExtendedAdvisory;
}

// Utility Functions
const getTLPClassificationColor = (classification: string) => {
  switch (classification?.toLowerCase()) {
    case 'red':
      return 'bg-red-500/20 text-red-300 border-red-400/50';
    case 'amber':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50';
    case 'green':
      return 'bg-green-500/20 text-green-300 border-green-400/50';
    case 'white':
      return 'bg-slate-500/20 text-slate-300 border-slate-400/50';
    default:
      return 'bg-slate-500/20 text-slate-300 border-slate-400/50';
  }
};

const getIndustryIcon = (sector: string) => {
  const lowerSector = sector.toLowerCase();
  if (lowerSector.includes('health') || lowerSector.includes('medical')) {
    return <Heart className="h-4 w-4 text-purple-400" />;
  }
  if (lowerSector.includes('financial') || lowerSector.includes('banking')) {
    return <Briefcase className="h-4 w-4 text-purple-400" />;
  }
  if (lowerSector.includes('retail') || lowerSector.includes('commerce')) {
    return <ShoppingCart className="h-4 w-4 text-purple-400" />;
  }
  if (lowerSector.includes('manufacturing') || lowerSector.includes('industrial')) {
    return <Factory className="h-4 w-4 text-purple-400" />;
  }
  if (lowerSector.includes('government') || lowerSector.includes('public')) {
    return <Building className="h-4 w-4 text-purple-400" />;
  }
  if (lowerSector.includes('telecom') || lowerSector.includes('communication')) {
    return <Wifi className="h-4 w-4 text-purple-400" />;
  }
  if (lowerSector.includes('transport') || lowerSector.includes('aviation')) {
    return <Plane className="h-4 w-4 text-purple-400" />;
  }
  return <Building className="h-4 w-4 text-purple-400" />;
};

const getSeverityIcon = (severity?: string) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return <AlertTriangle className="h-4 w-4" />;
    case 'high':
      return <Zap className="h-4 w-4" />;
    case 'medium':
      return <Info className="h-4 w-4" />;
    case 'low':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
};

const getIconForIOCType = (type: string) => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('ip') || lowerType.includes('address')) {
    return <Globe className="h-4 w-4 text-neon-pink" />;
  }
  if (lowerType.includes('domain') || lowerType.includes('url')) {
    return <Link2 className="h-4 w-4 text-neon-pink" />;
  }
  if (lowerType.includes('hash') || lowerType.includes('md5') || lowerType.includes('sha')) {
    return <Hash className="h-4 w-4 text-neon-pink" />;
  }
  if (lowerType.includes('file') || lowerType.includes('path')) {
    return <FileText className="h-4 w-4 text-neon-pink" />;
  }
  if (lowerType.includes('email')) {
    return <Mail className="h-4 w-4 text-neon-pink" />;
  }
  return <Target className="h-4 w-4 text-neon-pink" />;
};

export default function AdvisoryDetailPage({ advisory }: AdvisoryDetailProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
  }>>([]);

  // Helper Functions
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('success', `${type} copied to clipboard!`);
    } catch (err) {
      showNotification('error', 'Failed to copy to clipboard');
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const generatePDF = () => {
    window.print();
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/advisories/${advisory._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showNotification('success', 'Advisory deleted successfully');
        router.push('/advisories');
      } else {
        showNotification('error', 'Failed to delete advisory');
      }
    } catch (error) {
      showNotification('error', 'An error occurred while deleting');
    }
    setShowDeleteConfirm(false);
  };

  return (
    <HydrationSafe>
      <div className="min-h-screen bg-tech-gradient">
        <Head>
          <title>{advisory.title} - ForensicCyberTech Threat Advisory</title>
          <meta name="description" content={advisory.description || advisory.summary || 'Comprehensive threat intelligence advisory'} />
          <meta name="keywords" content={`cybersecurity, threat advisory, ${advisory.category}, ${advisory.tags?.join(', ')}`} />
        </Head>

        {/* Header with Logos */}
        <div className="relative bg-slate-900/90 backdrop-blur-sm border-b border-slate-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              {/* Left Logo */}
              <Link href="/" className="flex items-center space-x-3">
                <img 
                  src="/forensiccybertech-logo.png" 
                  alt="ForensicCyberTech" 
                  className="h-12 w-auto"
                />
                <div className="hidden sm:block">
                  <div className="font-orbitron font-bold text-lg text-white">
                    ForensicCyberTech
                  </div>
                  <div className="font-rajdhani text-sm text-slate-400">
                    Threat Advisory System
                  </div>
                </div>
              </Link>

              {/* Center Navigation */}
              <div className="hidden md:flex items-center space-x-6">
                <Link href="/advisories" 
                  className="text-slate-300 hover:text-white font-rajdhani font-medium transition-colors">
                  All Advisories
                </Link>
                <Link href="/dashboard" 
                  className="text-slate-300 hover:text-white font-rajdhani font-medium transition-colors">
                  Dashboard
                </Link>
              </div>

              {/* Right Logo */}
              <div className="flex items-center space-x-4">
                <img 
                  src="/Eagleye-S.png" 
                  alt="EagleEye Security" 
                  className="h-12 w-auto"
                />
                <button
                  onClick={() => router.back()}
                  className="flex items-center space-x-2 px-4 py-2 glass-panel-hover transition-all duration-300 hover:scale-105"
                >
                  <ArrowLeft className="h-4 w-4 text-neon-blue" />
                  <span className="text-neon-blue font-rajdhani font-medium">Back</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
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
              {(advisory.threatDesignation || advisory.threatCategory || advisory.threatLevel || advisory.tlpClassification || advisory.cveIds?.length || advisory.cves?.length) && (
                <motion.div 
                  className="glass-panel-hover p-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <div className="flex items-center space-x-3 mb-6">
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
                    
                    {advisory.tlpClassification && (
                      <div>
                        <label className="block text-slate-400 font-rajdhani text-sm mb-2">TLP CLASSIFICATION</label>
                        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${getTLPClassificationColor(advisory.tlpClassification)}`}>
                          <Lock className="h-4 w-4" />
                          <span className="font-rajdhani font-semibold text-sm">{advisory.tlpClassification.toUpperCase()}</span>
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

              {/*  THREAT DETAILS */}
              {(advisory.description || advisory.executiveSummary || advisory.summary || advisory.affectedProducts?.length || advisory.targetSectors?.length || advisory.regions?.length) && (
                <motion.div 
                  className="glass-panel-hover p-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-400/50">
                      <FileText className="h-5 w-5 text-blue-400" />
                    </div>
                    <h2 className="font-orbitron font-bold text-xl text-white"> THREAT DETAILS</h2>
                  </div>

                  {/* Executive Summary / Description */}
                  {(advisory.executiveSummary || advisory.summary || advisory.description) && (
                    <div className="mb-6">
                      <h3 className="font-orbitron font-semibold text-lg text-white mb-4">Executive Summary</h3>
                      <div className="prose prose-invert max-w-none">
                        <p className="text-slate-300 font-rajdhani text-base leading-relaxed whitespace-pre-wrap">
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
                      <div className="prose prose-invert max-w-none">
                        <div className="text-slate-300 font-rajdhani text-base leading-relaxed whitespace-pre-wrap">
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
                  <div className="flex items-center space-x-3 mb-6">
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
                          <p className="text-slate-400 font-rajdhani text-sm">
                            {ioc.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/*  MITRE ATT&CK FRAMEWORK */}
              {advisory.mitreTactics && advisory.mitreTactics.length > 0 && (
                <motion.div 
                  className="glass-panel-hover p-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/20 border border-green-400/50">
                      <Grid className="h-5 w-5 text-green-400" />
                    </div>
                    <h2 className="font-orbitron font-bold text-xl text-white"> MITRE ATT&CK FRAMEWORK</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-600">
                          <th className="text-left text-slate-400 font-rajdhani font-semibold text-sm py-3">TACTIC NAME</th>
                          <th className="text-left text-slate-400 font-rajdhani font-semibold text-sm py-3">TECHNIQUE ID</th>
                          <th className="text-left text-slate-400 font-rajdhani font-semibold text-sm py-3">TECHNIQUE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advisory.mitreTactics.map((tactic, index) => (
                          <tr key={index} className="border-b border-slate-700/50 hover:bg-green-500/5 transition-colors">
                            <td className="py-3 text-white font-orbitron font-semibold">{tactic.tacticName}</td>
                            <td className="py-3 text-green-400 font-mono">{tactic.techniqueId}</td>
                            <td className="py-3 text-slate-300 font-rajdhani">{tactic.technique}</td>
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
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/20 border border-green-400/50">
                      <Shield className="h-5 w-5 text-green-400" />
                    </div>
                    <h2 className="font-orbitron font-bold text-xl text-white">🛡️ SECURITY RECOMMENDATIONS</h2>
                  </div>
                  <div className="space-y-3">
                    {advisory.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-green-500/5 border border-green-400/20 rounded-lg">
                        <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                        <p className="text-slate-300 font-rajdhani text-base leading-relaxed">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/*  PATCH DETAILS */}
              {advisory.patchDetails && (
                <motion.div 
                  className="glass-panel-hover p-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-400/50">
                      <Download className="h-5 w-5 text-orange-400" />
                    </div>
                    <h2 className="font-orbitron font-bold text-xl text-white"> PATCH DETAILS</h2>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <div className="text-slate-300 font-rajdhani text-base leading-relaxed whitespace-pre-wrap">
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
                  <div className="flex items-center space-x-3 mb-6">
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
              
              {/* Actions Panel */}
              <motion.div 
                className="glass-panel-hover p-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h3 className="font-orbitron font-bold text-lg text-white mb-4 flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Actions</span>
                </h3>
                <div className="space-y-3">
                  <button 
                    onClick={generatePDF}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-neon-blue/20 border border-neon-blue/50 text-neon-blue hover:bg-neon-blue/30 transition-all duration-200 rounded-lg font-rajdhani font-semibold"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export PDF</span>
                  </button>
                  
                  <button 
                    onClick={() => copyToClipboard(advisory.title, 'title')}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-neon-purple/20 border border-neon-purple/50 text-neon-purple hover:bg-neon-purple/30 transition-all duration-200 rounded-lg font-rajdhani font-semibold"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy Title</span>
                  </button>
                  
                  <button 
                    onClick={() => window.print()}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-neon-pink/20 border border-neon-pink/50 text-neon-pink hover:bg-neon-pink/30 transition-all duration-200 rounded-lg font-rajdhani font-semibold"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print</span>
                  </button>
                </div>
              </motion.div>

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
                    <span className="text-white font-orbitron text-sm">{formatDate(advisory.publishedDate)}</span>
                  </div>
                  
                  {advisory.severity && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-rajdhani text-sm">Severity</span>
                      <span className={`font-orbitron text-sm ${
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
                      <span className="text-white font-orbitron text-sm">{advisory.category}</span>
                    </div>
                  )}
                  
                  {(advisory.cveIds?.length || advisory.cves?.length) && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-rajdhani text-sm">CVEs</span>
                      <span className="text-orange-300 font-orbitron text-sm">
                        {(advisory.cveIds || advisory.cves || []).length}
                      </span>
                    </div>
                  )}
                  
                  {advisory.iocs?.length && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-rajdhani text-sm">IOCs</span>
                      <span className="text-neon-pink font-orbitron text-sm">{advisory.iocs.length}</span>
                    </div>
                  )}
                  
                  {advisory.references?.length && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-rajdhani text-sm">References</span>
                      <span className="text-neon-purple font-orbitron text-sm">{advisory.references.length}</span>
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

              {/* Navigation */}
              <motion.div 
                className="glass-panel-hover p-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <h3 className="font-orbitron font-bold text-lg text-white mb-4 flex items-center space-x-2">
                  <Navigation className="h-5 w-5" />
                  <span>Quick Navigation</span>
                </h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => document.getElementById('basic-threat')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 font-rajdhani text-sm"
                  >
                    🚨 Basic Parameters
                  </button>
                  <button 
                    onClick={() => document.getElementById('threat-details')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 font-rajdhani text-sm"
                  >
                     Threat Details
                  </button>
                  <button 
                    onClick={() => document.getElementById('iocs')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 font-rajdhani text-sm"
                  >
                    🧠 IOCs
                  </button>
                  <button 
                    onClick={() => document.getElementById('mitre')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 font-rajdhani text-sm"
                  >
                     MITRE ATT&CK
                  </button>
                  <button 
                    onClick={() => document.getElementById('recommendations')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 font-rajdhani text-sm"
                  >
                    🛡️ Recommendations
                  </button>
                </div>
              </motion.div>

              {/* Related Advisories */}
              <motion.div 
                className="glass-panel-hover p-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <h3 className="font-orbitron font-semibold text-lg text-white mb-4">Actions</h3>
                <div className="text-center">
                  <button 
                    onClick={() => router.push('/advisories')}
                    className="text-neon-blue font-rajdhani text-sm hover:text-neon-cyan transition-colors"
                  >
                    View Related Advisories →
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEmailModal(false)}>
            <div className="glass-panel-hover p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-neon-blue/20 border border-neon-blue/50">
                  <Mail className="h-8 w-8 text-neon-blue" />
                </div>
                <h3 className="font-orbitron font-bold text-xl text-white mb-2">Email Advisory</h3>
                <p className="text-slate-300 font-rajdhani mb-6">
                  Email functionality will be available soon.
                </p>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-6 py-2 glass-panel-hover text-white font-rajdhani font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
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
