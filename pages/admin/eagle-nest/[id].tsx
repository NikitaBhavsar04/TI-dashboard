import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import EmailModal from '@/components/EmailModal';
import { motion } from 'framer-motion';
import {
  Calendar,
  ArrowLeft,
  Shield,
  AlertTriangle,
  Eye,
  FileText,
  CheckCircle,
  Target,
  Database,
  Clock,
  Edit,
  Trash2,
  Bug,
  Download,
  Copy,
  Hash,
  Globe,
  Mail,
  Server,
  Activity,
  ChevronDown
} from 'lucide-react';
import HydrationSafe from '@/components/HydrationSafe';

export default function EagleNestDetail() {
  const [advisory, setAdvisory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [emailType, setEmailType] = useState<'general' | 'dedicated'>('general');

  const { user, hasRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (!authLoading && (!user || !hasRole('user'))) {
      router.push('/login');
      return;
    }

    if (hasRole('user') && id) {
      loadAdvisory();
    }
  }, [user, hasRole, authLoading, router, id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showEmailDropdown && !target.closest('.email-dropdown')) {
        setShowEmailDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmailDropdown]);

  const loadAdvisory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/eagle-nest/${id}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success && data.advisory) {
        setAdvisory(data.advisory);
      } else {
        console.error('Failed to load advisory:', data.error);
        router.push('/admin/eagle-nest');
      }
    } catch (error) {
      console.error('Error loading advisory:', error);
      router.push('/admin/eagle-nest');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, identifier: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(identifier);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality?.toUpperCase()) {
      case 'CRITICAL': return 'bg-neon-pink/20 border-neon-pink/50 text-neon-pink';
      case 'HIGH': return 'bg-red-500/20 border-red-400/50 text-red-300';
      case 'MEDIUM': return 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300';
      case 'LOW': return 'bg-green-500/20 border-green-400/50 text-green-300';
      default: return 'bg-neon-blue/20 border-neon-blue/50 text-neon-blue';
    }
  };

  const getSeverityIcon = (criticality: string) => {
    switch (criticality?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const handleEmailClick = async (type: 'general' | 'dedicated') => {
    console.log('📧 [EAGLE-NEST] handleEmailClick called with type:', type);

    // For dedicated emails, always reload advisory to ensure we have latest IP sweep data
    if (type === 'dedicated') {
      console.log('📧 [EAGLE-NEST] Reloading advisory to get latest IP sweep data...');
      try {
        const response = await fetch(`/api/eagle-nest/${id}`, {
          method: 'GET',
          credentials: 'include'
        });

        const data = await response.json();

        if (data.success && data.advisory) {
          setAdvisory(data.advisory);
          console.log('📧 [EAGLE-NEST] Advisory reloaded successfully');
          console.log('📧 [EAGLE-NEST] advisory.ip_sweep:', data.advisory.ip_sweep);
          console.log('📧 [EAGLE-NEST] impacted_clients:', data.advisory.ip_sweep?.impacted_clients);

          // Check if IP sweep data exists
          if (!data.advisory.ip_sweep) {
            console.error('❌ [EAGLE-NEST] ERROR: No ip_sweep data in advisory!');
            alert('No IP sweep data available. Please run IP sweep first before sending dedicated advisory.');
            return;
          }

          if (!data.advisory.ip_sweep.impacted_clients || data.advisory.ip_sweep.impacted_clients.length === 0) {
            alert('No impacted clients found. IP sweep shows no clients are affected by this advisory.');
            return;
          }

          // Data is good, open modal
          setEmailType(type);
          setEmailModalOpen(true);
          setShowEmailDropdown(false);
        } else {
          console.error('Failed to reload advisory:', data.error);
          alert('Failed to reload advisory data. Please try again.');
        }
      } catch (error) {
        console.error('Error reloading advisory:', error);
        alert('Failed to reload advisory data. Please try again.');
      }
    } else {
      // General email - no need to reload
      setEmailType(type);
      setEmailModalOpen(true);
      setShowEmailDropdown(false);
    }
  };

  // Convert Eagle Nest advisory to EmailModal format
  const getAdvisoryForEmail = () => {
    if (!advisory) return null;
    
    return {
      _id: advisory.advisory_id || id,
      title: advisory.title || 'Untitled Advisory',
      severity: advisory.criticality || 'MEDIUM',
      description: advisory.exec_summary || '',
      author: 'Eagle Nest (Manual Generation)',
      publishedDate: advisory.published || new Date().toISOString(),
      threat_type: advisory.threat_type ? [advisory.threat_type] : [],
      affected_systems: advisory.affected_product ? [advisory.affected_product] : [],
      recommendations: Array.isArray(advisory.recommendations) ? advisory.recommendations.join('\n') : advisory.recommendations || ''
    };
  };

  if (authLoading || loading) {
    return (
      <HydrationSafe>
        <div className="min-h-screen bg-tech-gradient flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="spinner-neon mx-auto"></div>
            <div className="text-neon-blue font-orbitron text-lg tracking-wider animate-pulse">
              LOADING ADVISORY...
            </div>
          </div>
        </div>
      </HydrationSafe>
    );
  }

  if (!advisory) return null;

  return (
    <HydrationSafe>
      <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="relative z-10">
          <Head>
            <title>{advisory.title} - Eagle Nest - EaglEye IntelDesk</title>
          </Head>

          {/* Header */}
          <div className="glass-panel border-b border-slate-700/50 py-2">
            <div className="max-w-full mx-auto px-3 sm:px-4">
              <div className="flex items-center justify-between">
                {/* Left Logo */}
                <div className="flex items-center space-x-3">
                  <img 
                    src="/forensiccybertech-logo.png" 
                    alt="Forensic Cyber Tech" 
                    className="h-8 w-auto"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div className="hidden md:block">
                    <div className="font-orbitron font-bold text-neon-blue text-base">
                      Forensic Cyber Tech
                    </div>
                    <div className="font-rajdhani text-xs text-slate-400">
                      Digital Forensics & Cybersecurity
                    </div>
                  </div>
                </div>

                {/* Right Logo */}
                <div className="flex items-center space-x-3">
                  <div className="hidden md:block text-right">
                    <div className="font-orbitron font-bold text-neon-purple text-base">
                      EaglEye IntelDesk
                    </div>
                    <div className="font-rajdhani text-xs text-slate-400">
                      Eagle Nest - Manual Advisory
                    </div>
                  </div>
                  <img 
                    src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiCL2GuXkm4vnkAnNz1yA4Kxlg-jjKIOdohivr_s_uCRQ5z1gYjlSJX139c7I-iR-2i3sCVQK3kmP3_ZRvvBezy_m5eB-sX9N3cn42lJbi5PveE90jfqPt4Luc52J6nU1MTIWZGkdBzT76fTVru6Wk8RafSOcgNzPumjNLay5fUxQ_YIihCHQ7Us1_-wVMV/s400/Eagleye-S.png" 
                    alt="EagleEye" 
                    className="h-8 w-auto"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="sticky top-0 z-40 bg-cyber-gradient backdrop-blur-md border-b border-neon-blue/20">
            <div className="max-w-full mx-auto px-3 sm:px-4 py-2">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => router.push('/admin/eagle-nest')}
                  className="flex items-center space-x-2 px-3 py-1.5 glass-panel-hover transition-all duration-300 hover:scale-105"
                >
                  <ArrowLeft className="h-4 w-4 text-neon-blue" />
                  <span className="text-white font-rajdhani font-medium text-sm">Back to Eagle Nest</span>
                </button>

                <div className="flex items-center space-x-2">
                  {/* Send Email dropdown - Admin only */}
                  {hasRole('admin') && (
                    <div className="relative email-dropdown">
                      <button
                        onClick={() => setShowEmailDropdown(!showEmailDropdown)}
                        className="relative flex items-center space-x-2 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 hover:border-emerald-400/50 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/40 backdrop-blur-sm group overflow-hidden text-sm"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-300/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                        <Mail className="h-4 w-4 text-emerald-300 group-hover:text-emerald-200 relative z-10 transition-colors duration-300" />
                        <span className="text-emerald-300 group-hover:text-emerald-200 font-rajdhani font-semibold relative z-10 transition-colors duration-300">Send Email</span>
                        <ChevronDown className={`h-4 w-4 text-emerald-300 group-hover:text-emerald-200 relative z-10 transition-all duration-300 ${showEmailDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showEmailDropdown && (
                        <div className="absolute right-0 mt-2 w-72 glass-panel border border-emerald-400/30 rounded-lg shadow-xl shadow-emerald-500/20 overflow-hidden z-50">
                          <button
                            onClick={() => handleEmailClick('general')}
                            className="w-full flex items-start space-x-3 px-4 py-3 hover:bg-emerald-500/10 transition-colors text-left group"
                          >
                            <Globe className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-white font-rajdhani font-semibold">Send General Advisory</div>
                              <div className="text-slate-400 text-xs mt-0.5">Send to all clients without IOC detection details</div>
                            </div>
                          </button>
                          {advisory.ip_sweep && advisory.ip_sweep.impacted_clients && advisory.ip_sweep.impacted_clients.length > 0 && (
                            <button
                              onClick={() => handleEmailClick('dedicated')}
                              className="w-full flex items-start space-x-3 px-4 py-3 hover:bg-amber-500/10 transition-colors text-left border-t border-slate-700/50 group"
                            >
                              <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="text-white font-rajdhani font-semibold">Send Dedicated Advisory</div>
                                <div className="text-slate-400 text-xs mt-0.5">Send to {advisory.ip_sweep.impacted_clients.length} affected client(s) with IOC detection details</div>
                              </div>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <button 
                    onClick={() => copyToClipboard(JSON.stringify(advisory, null, 2), 'json')}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 glass-panel-hover transition-all duration-300 hover:scale-105"
                  >
                    <Copy className="h-3.5 w-3.5 text-neon-cyan" />
                    <span className="hidden lg:inline text-white font-rajdhani font-medium text-sm">Copy JSON</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      const dataStr = JSON.stringify(advisory, null, 2);
                      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                      const exportFileDefaultName = `${advisory.advisory_id}.json`;
                      const linkElement = document.createElement('a');
                      linkElement.setAttribute('href', dataUri);
                      linkElement.setAttribute('download', exportFileDefaultName);
                      linkElement.click();
                    }}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 glass-panel-hover transition-all duration-300 hover:scale-105"
                  >
                    <Download className="h-3.5 w-3.5 text-neon-cyan" />
                    <span className="hidden lg:inline text-white font-rajdhani font-medium text-sm">Export JSON</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full mx-auto px-2 sm:px-3 lg:px-4 py-2">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
              
              {/* Main Content */}
              <div className="xl:col-span-3 space-y-3">
                
                {/* Title and Metadata */}
                <motion.div 
                  className="glass-panel-hover p-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="space-y-2">
                    <div>
                      <h1 className="font-orbitron font-bold text-xl sm:text-2xl lg:text-3xl text-white mb-2 leading-tight">
                        {advisory.title || 'Untitled Advisory'}
                      </h1>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {advisory.criticality && (
                          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getCriticalityColor(advisory.criticality)}`}>
                            {getSeverityIcon(advisory.criticality)}
                            <span className="font-rajdhani font-semibold text-sm">
                              {advisory.criticality.toUpperCase()}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-700/50 border border-slate-600/50 text-slate-300">
                          <Calendar className="h-4 w-4" />
                          <span className="font-rajdhani text-sm">
                            {advisory.created_at ? formatDate(advisory.created_at) : 'N/A'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300">
                          <Shield className="h-4 w-4" />
                          <span className="font-rajdhani text-sm">Eagle Nest</span>
                        </div>
                      </div>

                      {advisory.advisory_id && (
                        <div className="flex items-center space-x-2 text-slate-400 font-mono text-sm">
                          <Hash className="h-4 w-4" />
                          <span>{advisory.advisory_id}</span>
                          <button
                            onClick={() => copyToClipboard(advisory.advisory_id, 'advisory_id')}
                            className="p-1 rounded hover:bg-slate-700/50 transition-all duration-200"
                          >
                            {copiedItem === 'advisory_id' ? <CheckCircle className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quick Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-700/50">
                      {advisory.threat_type && (
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5" />
                          <div>
                            <div className="text-slate-400 text-sm font-rajdhani">Threat Type</div>
                            <div className="text-white font-rajdhani font-medium">{advisory.threat_type}</div>
                          </div>
                        </div>
                      )}

                      {advisory.vendor && (
                        <div className="flex items-start space-x-3">
                          <Server className="h-5 w-5 text-blue-400 mt-0.5" />
                          <div>
                            <div className="text-slate-400 text-sm font-rajdhani">Vendor</div>
                            <div className="text-white font-rajdhani font-medium">{advisory.vendor}</div>
                          </div>
                        </div>
                      )}

                      {advisory.affected_product && (
                        <div className="flex items-start space-x-3">
                          <Database className="h-5 w-5 text-red-400 mt-0.5" />
                          <div>
                            <div className="text-slate-400 text-sm font-rajdhani">Affected Product</div>
                            <div className="text-white font-rajdhani font-medium">{advisory.affected_product}</div>
                          </div>
                        </div>
                      )}

                      {advisory.tlp && (
                        <div className="flex items-start space-x-3">
                          <Shield className="h-5 w-5 text-green-400 mt-0.5" />
                          <div>
                            <div className="text-slate-400 text-sm font-rajdhani">TLP Classification</div>
                            <div className="text-white font-rajdhani font-medium">{advisory.tlp.toUpperCase()}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CVEs */}
                    {advisory.cves && advisory.cves.length > 0 && (
                      <div className="mt-3">
                        <label className="block text-slate-400 font-rajdhani text-sm mb-2">CVE IDENTIFIERS</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {advisory.cves.map((cve: string, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-400/30 rounded-lg hover:border-orange-400/50 transition-all duration-200">
                              <div className="flex items-center space-x-2">
                                <Bug className="h-4 w-4 text-orange-400" />
                                <span className="font-mono text-orange-300">{cve}</span>
                              </div>
                              <button
                                onClick={() => copyToClipboard(cve, `cve-${index}`)}
                                className="p-1 rounded bg-orange-500/20 hover:bg-orange-500/30 transition-all duration-200"
                              >
                                {copiedItem === `cve-${index}` ? <CheckCircle className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-orange-300" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CVSS Scores */}
                    {advisory.cvss && Object.keys(advisory.cvss).length > 0 && (
                      <div className="mt-3">
                        <label className="block text-slate-400 font-rajdhani text-sm mb-2">CVSS SCORES</label>
                        <div className="space-y-2">
                          {Object.entries(advisory.cvss).map(([cve, data]: [string, any], index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-cyan-500/10 border border-cyan-400/30 rounded-lg hover:border-cyan-400/50 transition-all duration-200">
                              <div className="flex items-center space-x-3">
                                <Shield className="h-4 w-4 text-cyan-400" />
                                <span className="font-mono text-cyan-300 font-semibold text-sm">{cve}</span>
                                <span className="text-slate-400 text-xs font-rajdhani uppercase">{data.criticality || 'N/A'}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-white font-orbitron font-bold text-base">{data.score || 'N/A'}</span>
                                <span className="text-slate-400 text-xs font-rajdhani">CVSS</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Executive Summary */}
                {advisory.exec_summary_parts && advisory.exec_summary_parts.length > 0 && (
                  <motion.div 
                    className="glass-panel-hover p-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    <div className="flex items-center space-x-2 mb-3 p-2 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/50">
                        <FileText className="h-4 w-4 text-blue-400" />
                      </div>
                      <h2 className="font-orbitron font-bold text-lg text-white">EXECUTIVE SUMMARY</h2>
                    </div>

                    <div className="space-y-2">
                      {advisory.exec_summary_parts.map((part: string, index: number) => (
                        <div key={index} className="prose prose-invert max-w-none bg-slate-800/30 border border-slate-600/50 rounded-lg p-3">
                          <p className="text-slate-300 font-rajdhani text-base leading-relaxed text-justify">
                            {part}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Affected Systems & Targets */}
                {(advisory.affected_product || advisory.sectors?.length > 0 || advisory.regions?.length > 0) && (
                  <motion.div 
                    className="glass-panel-hover p-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.25 }}
                  >
                    <div className="flex items-center space-x-2 mb-3 p-2 bg-red-500/10 border border-red-400/30 rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/20 border border-red-400/50">
                        <Target className="h-4 w-4 text-red-400" />
                      </div>
                      <h2 className="font-orbitron font-bold text-lg text-white">AFFECTED SYSTEMS & TARGETS</h2>
                    </div>

                    {/* Affected Products */}
                    {advisory.affected_product && (
                      <div className="mb-3">
                        <h3 className="font-orbitron font-semibold text-base text-white mb-2">Affected Products</h3>
                        <div className="flex flex-wrap gap-2">
                          {advisory.affected_product.split(',').map((product: string, index: number) => (
                            <div key={index} className="px-3 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 font-rajdhani text-sm">
                              {product.trim()}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Target Sectors */}
                    {advisory.sectors && advisory.sectors.length > 0 && (
                      <div className="mb-3">
                        <h3 className="font-orbitron font-semibold text-base text-white mb-2">Target Sectors</h3>
                        <div className="flex flex-wrap gap-2">
                          {advisory.sectors.map((sector: string, index: number) => (
                            <div key={index} className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 font-rajdhani text-sm">
                              {sector}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Regions */}
                    {advisory.regions && advisory.regions.length > 0 && (
                      <div>
                        <h3 className="font-orbitron font-semibold text-base text-white mb-2">Regions</h3>
                        <div className="flex flex-wrap gap-2">
                          {advisory.regions.map((region: string, index: number) => (
                            <div key={index} className="flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-rajdhani text-sm">
                              <Globe className="h-3 w-3" />
                              <span>{region}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* MITRE ATT&CK */}
                {advisory.mitre && advisory.mitre.length > 0 && (
                  <motion.div 
                    className="glass-panel-hover p-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <div className="flex items-center space-x-2 mb-3 p-2 bg-green-500/10 border border-green-400/30 rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/20 border border-green-400/50">
                        <Shield className="h-4 w-4 text-green-400" />
                      </div>
                      <h2 className="font-orbitron font-bold text-lg text-white">MITRE ATT&CK FRAMEWORK</h2>
                    </div>

                    <div className="overflow-x-auto bg-slate-800/30 border border-slate-600/50 rounded-lg">
                      <table className="w-full">
                        <thead className="bg-green-500/10 border-b border-green-400/30">
                          <tr>
                            <th className="text-left text-green-300 font-rajdhani font-semibold text-sm py-2 px-4">TACTIC NAME</th>
                            <th className="text-left text-green-300 font-rajdhani font-semibold text-sm py-2 px-4">TECHNIQUE ID</th>
                            <th className="text-left text-green-300 font-rajdhani font-semibold text-sm py-2 px-4">TECHNIQUE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {advisory.mitre.map((tactic: any, index: number) => (
                            <tr key={index} className="border-b border-slate-700/50 hover:bg-green-500/10 transition-colors">
                              <td className="py-2 px-4 text-white font-orbitron font-semibold text-sm">
                                {tactic.tactic || tactic.tacticName || tactic.name || 'N/A'}
                              </td>
                              <td className="py-2 px-4">
                                <span className="inline-block text-green-400 font-mono bg-green-500/10 border border-green-400/30 rounded px-2 py-1">
                                  {tactic.id || tactic.tid || tactic.techniqueId || 'N/A'}
                                </span>
                              </td>
                              <td className="py-2 px-4 text-slate-300 font-rajdhani text-sm">
                                {tactic.technique || tactic.techniques?.[0] || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {/* MBC */}
                {advisory.mbc && advisory.mbc.length > 0 && (
                  <motion.div 
                    className="glass-panel-hover p-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.35 }}
                  >
                    <div className="flex items-center space-x-2 mb-3 p-2 bg-amber-500/10 border border-amber-400/30 rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/50">
                        <Activity className="h-4 w-4 text-amber-400" />
                      </div>
                      <h2 className="font-orbitron font-bold text-lg text-white">MALWARE BEHAVIOR CATALOG</h2>
                    </div>

                    <div className="overflow-x-auto bg-slate-800/30 border border-slate-600/50 rounded-lg">
                      <table className="w-full">
                        <thead className="bg-amber-500/10 border-b border-amber-400/30">
                          <tr>
                            <th className="text-left text-amber-300 font-rajdhani font-semibold text-sm py-2 px-4">BEHAVIOR</th>
                            <th className="text-left text-amber-300 font-rajdhani font-semibold text-sm py-2 px-4">OBJECTIVE</th>
                            <th className="text-left text-amber-300 font-rajdhani font-semibold text-sm py-2 px-4">CONFIDENCE</th>
                            <th className="text-left text-amber-300 font-rajdhani font-semibold text-sm py-2 px-4">EVIDENCE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {advisory.mbc.map((behavior: any, index: number) => (
                            <tr key={index} className="border-b border-slate-700/50 hover:bg-amber-500/10 transition-colors">
                              <td className="py-2 px-4 text-white font-rajdhani font-semibold text-sm">
                                {behavior.behavior || 'N/A'}
                              </td>
                              <td className="py-2 px-4 text-slate-300 font-rajdhani text-sm">
                                {behavior.objective || 'N/A'}
                              </td>
                              <td className="py-2 px-4">
                                {behavior.confidence && (
                                  <span className={`inline-block px-2 py-1 rounded text-xs font-rajdhani font-semibold ${
                                    behavior.confidence === 'High' ? 'bg-green-500/20 border border-green-400/30 text-green-300' :
                                    behavior.confidence === 'Medium' ? 'bg-yellow-500/20 border border-yellow-400/30 text-yellow-300' :
                                    behavior.confidence === 'Low' ? 'bg-red-500/20 border border-red-400/30 text-red-300' :
                                    'bg-slate-500/20 border border-slate-400/30 text-slate-300'
                                  }`}>
                                    {behavior.confidence}
                                  </span>
                                )}
                                {!behavior.confidence && <span className="text-slate-500">N/A</span>}
                              </td>
                              <td className="py-2 px-4 text-slate-300 font-rajdhani text-xs max-w-md">
                                {behavior.evidence || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {/* IOCs (Indicators ofCompromise) */}
                {advisory.iocs && advisory.iocs.length > 0 && (
                  <motion.div 
                    className="glass-panel-hover p-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.38 }}
                  >
                    <div className="flex items-center space-x-2 mb-3 p-2 bg-red-500/10 border border-red-400/30 rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/20 border border-red-400/50">
                        <Eye className="h-4 w-4 text-red-400" />
                      </div>
                      <h2 className="font-orbitron font-bold text-lg text-white">🔍 INDICATORS OF COMPROMISE (IOCs)</h2>
                    </div>

                    <div className="overflow-x-auto bg-slate-800/30 border border-slate-600/50 rounded-lg">
                      <table className="w-full">
                        <thead className="bg-red-500/10 border-b border-red-400/30">
                          <tr>
                            <th className="text-left text-red-300 font-rajdhani font-semibold text-sm py-2 px-4">TYPE</th>
                            <th className="text-left text-red-300 font-rajdhani font-semibold text-sm py-2 px-4">VALUE</th>
                            <th className="text-center text-red-300 font-rajdhani font-semibold text-sm py-2 px-4">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {advisory.iocs.map((ioc: any, index: number) => (
                            <tr key={index} className="border-b border-slate-700/50 hover:bg-red-500/10 transition-colors">
                              <td className="py-2 px-4">
                                <span className="inline-block text-red-400 font-mono bg-red-500/10 border border-red-400/30 rounded px-2 py-1 uppercase text-xs font-semibold">
                                  {ioc.type || 'N/A'}
                                </span>
                              </td>
                              <td className="py-2 px-4">
                                <div className="flex items-center space-x-2">
                                  <span className="text-slate-300 font-mono text-sm break-all">
                                    {ioc.value || 'N/A'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 px-4 text-center">
                                <button
                                  onClick={() => copyToClipboard(ioc.value, `ioc-${index}`)}
                                  className="p-2 rounded bg-red-500/20 hover:bg-red-500/30 transition-all duration-200 inline-flex items-center space-x-1"
                                >
                                  {copiedItem === `ioc-${index}` ? (
                                    <CheckCircle className="h-4 w-4 text-green-400" />
                                  ) : (
                                    <Copy className="h-4 w-4 text-red-300" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {/* IP Sweep Results - Admin/Super Admin Only */}
                {hasRole('admin') && advisory.ip_sweep && advisory.ip_sweep.impacted_clients && (
                  <motion.div
                    className="glass-panel-hover p-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.39 }}
                  >
                    <div className="flex items-center space-x-2 mb-3 p-2 bg-amber-500/10 border border-amber-400/30 rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/50">
                        <Activity className="h-4 w-4 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <h2 className="font-orbitron font-bold text-lg text-white">🎯 IOC DETECTION RESULTS</h2>
                        <p className="text-xs text-amber-300 font-rajdhani">Last checked: {formatDate(advisory.ip_sweep.checked_at)}</p>
                      </div>
                      {advisory.ip_sweep.impacted_clients.length === 0 ? (
                        <div className="flex items-center space-x-2 px-2.5 py-1 bg-green-500/20 border border-green-400/50 rounded-lg">
                          <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                          <span className="text-green-300 font-rajdhani font-semibold text-xs">All Clear</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 px-2.5 py-1 bg-red-500/20 border border-red-400/50 rounded-lg">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                          <span className="text-red-300 font-rajdhani font-semibold text-xs">{advisory.ip_sweep.impacted_clients.length} Client(s) Affected</span>
                        </div>
                      )}
                    </div>

                    {advisory.ip_sweep.impacted_clients.length === 0 ? (
                      <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4 text-center">
                        <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-2" />
                        <p className="text-green-300 font-rajdhani text-base font-semibold">No IOCs detected in client environments</p>
                        <p className="text-slate-400 text-xs mt-1">All monitored clients are clear of the indicators listed in this advisory</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {advisory.ip_sweep.impacted_clients.map((client: any, clientIndex: number) => (
                          <div key={clientIndex} className="bg-red-500/10 border border-red-400/30 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/20 border border-red-400/50">
                                  <Server className="h-4 w-4 text-red-400" />
                                </div>
                                <div>
                                  <h3 className="font-rajdhani font-bold text-base text-white">{client.client_name}</h3>
                                  <p className="text-xs text-slate-400">Client ID: {client.client_id}</p>
                                </div>
                              </div>
                              <div className="px-2.5 py-1 bg-red-500/20 border border-red-400/50 rounded-lg">
                                <span className="text-red-300 font-rajdhani font-semibold text-xs">{client.matches.length} Match(es)</span>
                              </div>
                            </div>

                            <div className="overflow-x-auto bg-slate-800/30 border border-slate-600/50 rounded-lg">
                              <table className="w-full">
                                <thead className="bg-red-500/10 border-b border-red-400/30">
                                  <tr>
                                    <th className="text-left text-red-300 font-rajdhani font-semibold text-xs py-2 px-3">IOC</th>
                                    <th className="text-left text-red-300 font-rajdhani font-semibold text-xs py-2 px-3">FIELD</th>
                                    <th className="text-left text-red-300 font-rajdhani font-semibold text-xs py-2 px-3">LOG INDEX</th>
                                    <th className="text-left text-red-300 font-rajdhani font-semibold text-xs py-2 px-3">TIMESTAMP</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {client.matches.map((match: any, matchIndex: number) => (
                                    <tr key={matchIndex} className="border-b border-slate-700/50 hover:bg-red-500/5 transition-colors">
                                      <td className="py-2 px-3">
                                        <span className="text-red-400 font-mono text-xs">{match.ioc}</span>
                                      </td>
                                      <td className="py-2 px-3">
                                        <span className="text-slate-300 font-mono text-xs uppercase">{match.matched_field}</span>
                                      </td>
                                      <td className="py-2 px-3">
                                        <span className="text-slate-300 font-mono text-xs">{match.log_index}</span>
                                      </td>
                                      <td className="py-2 px-3">
                                        <span className="text-slate-400 text-xs">{formatDate(match.timestamp)}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Recommendations */}
                {advisory.recommendations && advisory.recommendations.length > 0 && (
                  <motion.div 
                    className="glass-panel-hover p-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    <div className="flex items-center space-x-2 mb-3 p-2 bg-green-500/10 border border-green-400/30 rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/20 border border-green-400/50">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      </div>
                      <h2 className="font-orbitron font-bold text-lg text-white">SECURITY RECOMMENDATIONS</h2>
                    </div>

                    <div className="space-y-2">
                      {advisory.recommendations.map((rec: string, index: number) => (
                        <div key={index} className="flex items-start space-x-2 p-3 bg-green-500/10 border border-green-400/30 rounded-lg hover:border-green-400/50 transition-all duration-200">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 border border-green-400/50 flex items-center justify-center mt-0.5">
                            <span className="text-green-300 text-xs font-bold">{index + 1}</span>
                          </div>
                          <p className="text-slate-300 font-rajdhani text-sm leading-relaxed flex-1">
                            {rec}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Patch Details */}
                {advisory.patch_details && advisory.patch_details.length > 0 && (
                  <motion.div 
                    className="glass-panel-hover p-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.45 }}
                  >
                    <div className="flex items-center space-x-2 mb-3 p-2 bg-orange-500/10 border border-orange-400/30 rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-400/50">
                        <Download className="h-4 w-4 text-orange-400" />
                      </div>
                      <h2 className="font-orbitron font-bold text-lg text-white">PATCH DETAILS</h2>
                    </div>

                    <div className="space-y-2">
                      {advisory.patch_details.map((patch: string, index: number) => (
                        <div key={index} className="p-3 bg-orange-500/10 border border-orange-400/30 rounded-lg">
                          <p className="text-slate-300 font-rajdhani text-sm leading-relaxed">
                            {patch}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* References */}
                {advisory.references && advisory.references.length > 0 && (
                  <motion.div 
                    className="glass-panel-hover p-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    <div className="flex items-center space-x-2 mb-3 p-2 bg-cyan-500/10 border border-cyan-400/30 rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/50">
                        <FileText className="h-4 w-4 text-cyan-400" />
                      </div>
                      <h2 className="font-orbitron font-bold text-lg text-white">REFERENCES</h2>
                    </div>

                    <div className="space-y-2">
                      {advisory.references.map((ref: string, index: number) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-cyan-500/10 border border-cyan-400/30 rounded-lg hover:border-cyan-400/50 transition-all duration-200">
                          <Globe className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
                          <a 
                            href={ref} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-cyan-300 hover:text-cyan-200 font-rajdhani text-sm break-all"
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
              <div className="xl:col-span-1 space-y-3">
                <motion.div 
                  className="glass-panel-hover p-3 sticky top-16"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <h3 className="font-orbitron font-bold text-sm text-white mb-2">Advisory Info</h3>
                  
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="text-slate-400 font-rajdhani mb-1">Status</div>
                      <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 inline-block">
                        Eagle Nest
                      </div>
                    </div>

                    {advisory.status && (
                      <div>
                        <div className="text-slate-400 font-rajdhani mb-1">Processing Status</div>
                        <div className="text-white font-rajdhani">{advisory.status}</div>
                      </div>
                    )}

                    {advisory.created_at && (
                      <div>
                        <div className="text-slate-400 font-rajdhani mb-1">Created</div>
                        <div className="text-white font-rajdhani">{formatDate(advisory.created_at)}</div>
                      </div>
                    )}

                    {advisory.saved_to_eagle_nest_at && (
                      <div>
                        <div className="text-slate-400 font-rajdhani mb-1">Saved to Eagle Nest</div>
                        <div className="text-white font-rajdhani">{formatDate(advisory.saved_to_eagle_nest_at)}</div>
                      </div>
                    )}

                    {advisory.schema_version && (
                      <div>
                        <div className="text-slate-400 font-rajdhani mb-1">Schema Version</div>
                        <div className="text-white font-rajdhani font-mono">{advisory.schema_version}</div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Email Modal */}
        {advisory && emailModalOpen && (() => {
          const ipSweepDataToPass = emailType === 'dedicated' ? advisory.ip_sweep : undefined;
          console.log('📧 [EAGLE-NEST] Rendering EmailModal with:');
          console.log('📧 [EAGLE-NEST] emailType:', emailType);
          console.log('📧 [EAGLE-NEST] ipSweepData to pass:', JSON.stringify(ipSweepDataToPass, null, 2));

          return (
            <EmailModal
              isOpen={emailModalOpen}
              onClose={() => {
                setEmailModalOpen(false);
                // Reload advisory to get fresh data after sending
                loadAdvisory();
              }}
              advisory={getAdvisoryForEmail()!}
              emailType={emailType}
              ipSweepData={ipSweepDataToPass}
            />
          );
        })()}
      </div>
    </HydrationSafe>
  );
}
