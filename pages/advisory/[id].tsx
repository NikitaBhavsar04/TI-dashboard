import { useState } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
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
  Trash2
} from 'lucide-react';
import { CyberCard, CyberButton, CyberBadge } from '@/components/ui/cyber-components';
import { HolographicOverlay, NeonText, TerminalWindow } from '@/components/ui/cyber-effects';
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
      case 'IP': return <Server className="h-4 w-4 text-cyber-red" />;
      case 'Hash': return <Hash className="h-4 w-4 text-cyber-red" />;
      case 'URL': return <Globe className="h-4 w-4 text-cyber-red" />;
      case 'Domain': return <Globe className="h-4 w-4 text-cyber-red" />;
      case 'Email': return <Mail className="h-4 w-4 text-cyber-red" />;
      default: return <Activity className="h-4 w-4 text-cyber-red" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'danger';    // red
      case 'High': return 'warning';       // orange
      case 'Medium': return 'accent';      // yellow
      case 'Low': return 'info';           // blue
      case 'Info': return 'success';       // green
      default: return 'default';
    }
  };

  const formatContent = (content: string) => {
    return content.split('\n\n').map((paragraph, index) => {
      // Handle section headers (standalone lines ending with :)
      if (paragraph.endsWith(':') && !paragraph.includes('\n') && paragraph.length < 50) {
        return (
          <div key={index} className="mb-6 mt-8">
            <h3 className="font-mono font-bold text-cyber-red text-xl border-b border-cyber-red/30 pb-2">
              {paragraph.replace(':', '')}
            </h3>
          </div>
        );
      }

      // Handle table-like content (MITRE ATT&CK tables)
      if (paragraph.includes('TACTIC\t') || paragraph.includes('TECHNIQUE ID\t')) {
        const lines = paragraph.split('\n');
        const headers = lines[0].split('\t');
        const rows = lines.slice(1).map(line => line.split('\t'));
        
        return (
          <div key={index} className="mb-6">
            <div className="bg-cyber-dark/30 border border-cyber-blue/30 rounded-lg overflow-hidden">
              <div className="bg-cyber-blue/10 px-4 py-2 border-b border-cyber-blue/30">
                <div className="grid grid-cols-3 gap-4">
                  {headers.map((header, i) => (
                    <span key={i} className="font-mono font-bold text-cyber-blue text-sm">
                      {header}
                    </span>
                  ))}
                </div>
              </div>
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="px-4 py-3 border-b border-cyber-blue/10 last:border-b-0">
                  <div className="grid grid-cols-3 gap-4">
                    {row.map((cell, cellIndex) => (
                      <span key={cellIndex} className="font-mono text-cyber-green/80 text-sm">
                        {cell}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // Handle key-value pairs and structured content
      if (paragraph.includes(':') && paragraph.split(':')[0].length < 40 && !paragraph.includes('\n')) {
        const [key, ...valueParts] = paragraph.split(':');
        const value = valueParts.join(':').trim();
        
        return (
          <div key={index} className="mb-4 flex flex-wrap items-start">
            <span className="font-mono font-bold text-cyber-blue mr-3 min-w-fit">
              {key.trim()}:
            </span>
            <span className="font-mono text-cyber-green/80 flex-1">
              {value}
            </span>
          </div>
        );
      }

      // Handle sections with titles and content
      if (paragraph.includes(':') && paragraph.split(':')[0].length < 30 && paragraph.includes('\n')) {
        const [title, ...rest] = paragraph.split(':');
        const content = rest.join(':').trim();
        
        return (
          <div key={index} className="mb-6">
            <h4 className="font-mono font-bold text-cyber-blue mb-3 text-lg">
              {title.trim()}:
            </h4>
            <div className="text-cyber-green/80 font-mono leading-relaxed ml-4">
              {content.split('\n').map((line, lineIndex) => (
                <div key={lineIndex} className="mb-2">
                  {line.startsWith('- ') ? (
                    <div className="flex items-start space-x-2">
                      <span className="text-cyber-blue mt-1">▸</span>
                      <span>{line.substring(2)}</span>
                    </div>
                  ) : line.match(/^\d+\./) ? (
                    <div className="flex items-start space-x-2">
                      <span className="text-cyber-blue font-bold">{line.match(/^\d+\./)?.[0]}</span>
                      <span>{line.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                  ) : line.trim() ? (
                    <div className="mb-2">{line}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      }
      
      // Handle regular paragraphs
      return (
        <div key={index} className="text-cyber-green/80 font-mono leading-relaxed mb-4">
          {paragraph.split('\n').map((line, lineIndex) => (
            <div key={lineIndex} className="mb-2">
              {line.trim() ? line : <br />}
            </div>
          ))}
        </div>
      );
    });
  };

  return (
    <HydrationSafe>
      <div className="min-h-screen bg-cyber-dark">
        <Head>
          <title>{advisory.title} - THREATWATCH INTELLIGENCE</title>
          <meta name="description" content={advisory.description} />
        </Head>

        {/* Navigation Header */}
        <div className="border-b border-cyber-blue/30 bg-cyber-dark/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 md:space-x-4">
                <CyberButton 
                  variant="ghost" 
                  glowColor="blue" 
                  onClick={() => router.back()}
                  className="text-xs md:text-sm"
                >
                  <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">RETURN</span>
                  <span className="sm:hidden">BACK</span>
                </CyberButton>
                
                <div className="flex items-center space-x-1 md:space-x-2">
                  <HolographicOverlay>
                    <FileText className="h-4 w-4 md:h-6 md:w-6 text-cyber-blue" />
                  </HolographicOverlay>
                  <span className="font-mono text-cyber-green text-xs md:text-sm">
                    <span className="hidden sm:inline">THREAT ADVISORY ANALYSIS</span>
                    <span className="sm:hidden">ADVISORY</span>
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 md:space-x-3">
                {isAdmin && (
                  <>
                    <Link href={`/admin/edit/${advisory._id}`}>
                      <CyberButton 
                        variant="ghost" 
                        glowColor="green"
                        className="text-xs md:text-sm"
                      >
                        <Edit className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        <span className="hidden sm:inline">EDIT</span>
                      </CyberButton>
                    </Link>
                    
                    <CyberButton 
                      variant="ghost" 
                      glowColor="red"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-xs md:text-sm"
                    >
                      <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">DELETE</span>
                    </CyberButton>
                  </>
                )}
                
                <CyberButton 
                  variant="ghost" 
                  glowColor="green"
                  onClick={() => copyToClipboard(window.location.href, 'url')}
                  className="text-xs md:text-sm"
                >
                  <Share2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">SHARE</span>
                </CyberButton>
                
                <Link href={`/api/pdf/${advisory._id}`} target="_blank">
                  <CyberButton variant="cyber" glowColor="blue" className="text-xs md:text-sm">
                    <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">EXPORT PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </CyberButton>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
            
            {/* Main Content */}
            <div className="xl:col-span-2 space-y-6 md:space-y-8">
              
              {/* Title and Metadata */}
              <CyberCard variant="glitch" className="p-4 md:p-8">
                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h1 className="text-2xl md:text-3xl xl:text-4xl font-mono font-bold mb-4">
                        <NeonText color="red" intensity="high">
                          {advisory.title}
                        </NeonText>
                      </h1>
                      
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4 md:mb-6">
                        <CyberBadge variant={getSeverityColor(advisory.severity) as any}>
                          {advisory.severity.toUpperCase()}
                        </CyberBadge>
                        
                        <div className="flex items-center space-x-2 text-cyber-green/70 font-mono text-xs md:text-sm">
                          <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                          <span>{formatDate(advisory.publishedDate)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-cyber-green/70 font-mono text-xs md:text-sm">
                          <User className="h-3 w-3 md:h-4 md:w-4" />
                          <span className="truncate max-w-32 md:max-w-none">{advisory.author}</span>
                        </div>
                        
                        {advisory.cvss && (
                          <CyberBadge variant="warning">
                            CVSS: {advisory.cvss}
                          </CyberBadge>
                        )}

                        {/* TLP Badge if content contains TLP information */}
                        {(advisory.tlp || advisory.content?.includes('TLP:')) && (
                          <CyberBadge variant="info">
                            {advisory.tlp || advisory.content.match(/TLP:\s*(\w+)/)?.[0] || 'TLP: UNSPECIFIED'}
                          </CyberBadge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <CyberBadge variant="info">
                      {advisory.category}
                    </CyberBadge>
                    
                    {advisory.tags.map((tag, index) => (
                      <CyberBadge key={index} variant="default">
                        {tag}
                      </CyberBadge>
                    ))}
                  </div>
                </div>
              </CyberCard>

              {/* Executive Summary */}
              {advisory.summary && (
                <CyberCard variant="matrix" className="p-4 md:p-8">
                  <TerminalWindow title="EXECUTIVE SUMMARY">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-cyber-red" />
                        <span className="font-mono text-cyber-red font-bold text-sm md:text-base">CRITICAL INTELLIGENCE</span>
                      </div>
                      <p className="text-cyber-green font-mono leading-relaxed text-sm md:text-base lg:text-lg">
                        {advisory.summary}
                      </p>
                    </div>
                  </TerminalWindow>
                </CyberCard>
              )}

              {/* Technical Analysis */}
              <CyberCard variant="holographic" className="p-4 md:p-8">
                <TerminalWindow title="TECHNICAL ANALYSIS">
                  <div className="space-y-6">
                    
                    {/* CVE Information in Technical Analysis */}
                    {advisory.cveIds && advisory.cveIds.length > 0 && (
                      <div>
                        <h3 className="font-mono font-bold text-cyber-blue mb-3 text-base md:text-lg">
                          CVE IDENTIFIERS
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {advisory.cveIds.map((cve: string, index: number) => (
                            <CyberBadge key={index} variant="warning" className="text-xs">
                              {cve}
                            </CyberBadge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* MITRE ATT&CK Tactics */}
                    {advisory.mitreTactics && advisory.mitreTactics.length > 0 && (
                      <div>
                        <h3 className="font-mono font-bold text-cyber-blue mb-4 text-base md:text-lg">
                          MITRE ATT&CK TACTICS
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {advisory.mitreTactics.map((tactic: any, index: number) => (
                            <div key={index} className="bg-cyber-dark/30 border border-cyber-purple/30 rounded-lg p-3 md:p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                                <CyberBadge variant="info" className="text-xs w-fit">
                                  {tactic.id}
                                </CyberBadge>
                                <span className="font-mono text-cyber-purple font-bold text-sm">
                                  {tactic.name}
                                </span>
                              </div>
                              <p className="text-cyber-green/80 font-mono text-xs leading-relaxed">
                                <span className="text-cyber-blue font-bold">TECHNIQUE:</span> {tactic.technique || tactic.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Affected Product */}
                    {advisory.affectedProduct && (
                      <div>
                        <h3 className="font-mono font-bold text-cyber-blue mb-3 text-base md:text-lg">
                          AFFECTED PRODUCT
                        </h3>
                        <p className="text-cyber-green/80 font-mono leading-relaxed text-sm md:text-base">
                          {advisory.affectedProduct}
                        </p>
                      </div>
                    )}

                    {/* Target Sectors */}
                    {advisory.targetSectors && advisory.targetSectors.length > 0 && (
                      <div>
                        <h3 className="font-mono font-bold text-cyber-blue mb-3 text-base md:text-lg">
                          TARGET SECTORS
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {advisory.targetSectors.map((sector: string, index: number) => (
                            <CyberBadge key={index} variant="info" className="text-xs">
                              {sector}
                            </CyberBadge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Regions */}
                    {advisory.regions && advisory.regions.length > 0 && (
                      <div>
                        <h3 className="font-mono font-bold text-cyber-blue mb-3 text-base md:text-lg">
                          REGIONS
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {advisory.regions.map((region: string, index: number) => (
                            <CyberBadge key={index} variant="success" className="text-xs">
                              {region}
                            </CyberBadge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show message if no technical details */}
                    {(!advisory.cveIds || advisory.cveIds.length === 0) && 
                     (!advisory.mitreTactics || advisory.mitreTactics.length === 0) && 
                     !advisory.affectedProduct && 
                     (!advisory.targetSectors || advisory.targetSectors.length === 0) && 
                     (!advisory.regions || advisory.regions.length === 0) && (
                      <div className="text-center py-8">
                        <p className="text-cyber-green/60 font-mono text-sm">
                          No specific technical analysis data available for this advisory.
                        </p>
                      </div>
                    )}
                  </div>
                </TerminalWindow>
              </CyberCard>

              {/* Recommendations */}
              {advisory.recommendations && advisory.recommendations.length > 0 && (
                <CyberCard variant="neon" glowColor="green" className="p-4 md:p-8">
                  <TerminalWindow title="SECURITY RECOMMENDATIONS">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Shield className="h-5 w-5 text-cyber-green" />
                        <span className="font-mono text-cyber-green font-bold text-sm md:text-base">
                          {advisory.recommendations.length} RECOMMENDATIONS
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {advisory.recommendations.map((recommendation: string, index: number) => (
                          <div key={index} className="bg-cyber-dark/30 border border-cyber-green/30 rounded-lg p-3 md:p-4">
                            <div className="flex items-start space-x-3">
                              <span className="text-cyber-green font-bold font-mono text-sm md:text-base mt-1">
                                {index + 1}.
                              </span>
                              <p className="text-cyber-green/80 font-mono text-sm md:text-base leading-relaxed flex-1">
                                {recommendation}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TerminalWindow>
                </CyberCard>
              )}

              {/* Patch Details */}
              {advisory.patchDetails && advisory.patchDetails.length > 0 && (
                <CyberCard variant="matrix" className="p-4 md:p-8">
                  <TerminalWindow title="PATCH DETAILS">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Database className="h-5 w-5 text-cyber-blue" />
                        <span className="font-mono text-cyber-blue font-bold text-sm md:text-base">
                          PATCH INFORMATION
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {advisory.patchDetails.map((patchDetail: string, index: number) => (
                          <div key={index} className="bg-cyber-dark/30 border border-cyber-blue/30 rounded-lg p-3 md:p-4">
                            <div className="flex items-start space-x-3">
                              <span className="text-cyber-blue font-bold font-mono text-sm md:text-base mt-1">
                                •
                              </span>
                              <p className="text-cyber-green/80 font-mono text-sm md:text-base leading-relaxed flex-1">
                                {patchDetail}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TerminalWindow>
                </CyberCard>
              )}

              {/* IOCs Section */}
              {advisory.iocs.length > 0 && (
                <CyberCard variant="neon" glowColor="red" className="p-4 md:p-8">
                  <TerminalWindow title="INDICATORS OF COMPROMISE">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 mb-4 md:mb-6">
                        <Shield className="h-4 w-4 md:h-6 md:w-6 text-cyber-red" />
                        <span className="font-mono text-cyber-red font-bold text-sm md:text-base">
                          {advisory.iocs.length} INDICATORS DETECTED
                        </span>
                      </div>
                      
                      <div className="grid gap-3 md:gap-4">
                        {advisory.iocs.map((ioc, index) => (
                          <div key={index} className="bg-cyber-dark/30 border border-cyber-red/30 rounded-lg p-3 md:p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                                  <div className="flex items-center space-x-2">
                                    {getIconForIOCType(ioc.type)}
                                    <CyberBadge variant="danger" className="text-xs">
                                      {ioc.type}
                                    </CyberBadge>
                                  </div>
                                  <code className="bg-cyber-dark/50 border border-cyber-red/20 px-2 md:px-3 py-1 rounded text-cyber-red font-mono text-xs md:text-sm break-all">
                                    {ioc.value}
                                  </code>
                                </div>
                                {ioc.description && (
                                  <p className="text-xs md:text-sm text-cyber-green/70 font-mono mt-2 sm:ml-7">
                                    {ioc.description}
                                  </p>
                                )}
                              </div>
                              <CyberButton
                                variant="ghost"
                                glowColor="red"
                                onClick={() => copyToClipboard(ioc.value, `ioc-${index}`)}
                                className="text-xs self-start sm:self-center"
                              >
                                {copiedItem === `ioc-${index}` ? (
                                  <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                                ) : (
                                  <Copy className="h-3 w-3 md:h-4 md:w-4" />
                                )}
                              </CyberButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TerminalWindow>
                </CyberCard>
              )}

              {/* References */}
              {advisory.references.length > 0 && (
                <CyberCard variant="matrix" className="p-4 md:p-8">
                  <TerminalWindow title="EXTERNAL REFERENCES">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Database className="h-4 w-4 md:h-5 md:w-5 text-cyber-blue" />
                        <span className="font-mono text-cyber-blue font-bold text-sm md:text-base">
                          INTELLIGENCE SOURCES
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {advisory.references.map((ref, index) => (
                          <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 bg-cyber-dark/30 border border-cyber-blue/20 rounded-lg p-3">
                            <a
                              href={ref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 text-cyber-blue hover:text-cyber-green transition-colors font-mono text-xs md:text-sm flex-1 min-w-0"
                            >
                              <ExternalLink className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                              <span className="truncate">{ref}</span>
                            </a>
                            <CyberButton
                              variant="ghost"
                              glowColor="blue"
                              onClick={() => copyToClipboard(ref, `ref-${index}`)}
                              className="text-xs self-start sm:self-center sm:ml-2"
                            >
                              {copiedItem === `ref-${index}` ? (
                                <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                              ) : (
                                <Copy className="h-3 w-3 md:h-4 md:w-4" />
                              )}
                            </CyberButton>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TerminalWindow>
                </CyberCard>
              )}
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-1 space-y-4 md:space-y-6">
              
              {/* Threat Overview */}
              <CyberCard variant="glitch" className="p-4 md:p-6">
                <TerminalWindow title="THREAT OVERVIEW">
                  <div className="space-y-4">
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono text-cyber-green/70">THREAT LEVEL:</span>
                        <CyberBadge variant={getSeverityColor(advisory.severity) as any} className="text-xs">
                          {advisory.severity}
                        </CyberBadge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono text-cyber-green/70">CATEGORY:</span>
                        <span className="text-xs font-mono text-cyber-blue truncate max-w-24 md:max-w-32">{advisory.category}</span>
                      </div>
                      
                      {advisory.tlp && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-mono text-cyber-green/70">TLP:</span>
                          <CyberBadge variant="info" className="text-xs">{advisory.tlp}</CyberBadge>
                        </div>
                      )}
                      
                      {advisory.affectedProduct && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-mono text-cyber-green/70">PRODUCT:</span>
                          <span className="text-xs font-mono text-cyber-blue truncate max-w-24 md:max-w-32" title={advisory.affectedProduct}>
                            {advisory.affectedProduct}
                          </span>
                        </div>
                      )}
                      
                      {advisory.targetSectors && advisory.targetSectors.length > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-mono text-cyber-green/70">SECTORS:</span>
                          <span className="text-xs font-mono text-cyber-purple">
                            {advisory.targetSectors.length} TARGET{advisory.targetSectors.length > 1 ? 'S' : ''}
                          </span>
                        </div>
                      )}
                      
                      {advisory.regions && advisory.regions.length > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-mono text-cyber-green/70">REGIONS:</span>
                          <span className="text-xs font-mono text-cyber-purple">
                            {advisory.regions.length} REGION{advisory.regions.length > 1 ? 'S' : ''}
                          </span>
                        </div>
                      )}
                      
                      {advisory.cvss && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-mono text-cyber-green/70">CVSS SCORE:</span>
                          <CyberBadge variant="warning" className="text-xs">{advisory.cvss}</CyberBadge>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono text-cyber-green/70">IOCs:</span>
                        <span className="text-xs font-mono text-cyber-red">{advisory.iocs.length}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono text-cyber-green/70">PUBLISHED:</span>
                        <span className="text-xs font-mono text-cyber-green truncate max-w-24 md:max-w-32">{formatDate(advisory.publishedDate)}</span>
                      </div>
                    </div>
                  </div>
                </TerminalWindow>
              </CyberCard>

              {/* CVE Information */}
              {advisory.cveIds.length > 0 && (
                <CyberCard variant="neon" glowColor="orange" className="p-4 md:p-6">
                  <TerminalWindow title="CVE IDENTIFIERS">
                    <div className="space-y-3">
                      {advisory.cveIds.map((cve, index) => (
                        <div key={index} className="flex items-center justify-between bg-cyber-dark/30 border border-warning-orange/20 rounded p-2 md:p-3">
                          <span className="font-mono text-warning-orange text-xs md:text-sm">{cve}</span>
                          <CyberButton
                            variant="ghost"
                            glowColor="orange"
                            onClick={() => copyToClipboard(cve, `cve-${index}`)}
                            className="text-xs"
                          >
                            {copiedItem === `cve-${index}` ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </CyberButton>
                        </div>
                      ))}
                    </div>
                  </TerminalWindow>
                </CyberCard>
              )}

              {/* Quick Actions */}
              <CyberCard variant="matrix" className="p-4 md:p-6">
                <TerminalWindow title="QUICK ACTIONS">
                  <div className="space-y-3">
                    <Link href={`/api/pdf/${advisory._id}`} target="_blank">
                      <CyberButton variant="cyber" glowColor="blue" className="w-full text-xs md:text-sm">
                        <Download className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                        DOWNLOAD PDF
                      </CyberButton>
                    </Link>
                    
                    <CyberButton 
                      variant="ghost" 
                      glowColor="green" 
                      className="w-full text-xs md:text-sm"
                      onClick={() => copyToClipboard(window.location.href, 'url')}
                    >
                      <Share2 className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                      {copiedItem === 'url' ? 'COPIED!' : 'SHARE LINK'}
                    </CyberButton>
                    
                    <Link href="/advisories">
                      <CyberButton variant="ghost" glowColor="blue" className="w-full text-xs md:text-sm">
                        <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                        BACK TO DATABASE
                      </CyberButton>
                    </Link>
                  </div>
                </TerminalWindow>
              </CyberCard>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <CyberCard variant="glitch" className="max-w-md w-full">
              <TerminalWindow title="CONFIRM DELETION">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-8 w-8 text-cyber-red" />
                    <div>
                      <h3 className="font-mono font-bold text-cyber-red text-lg">
                        WARNING: IRREVERSIBLE ACTION
                      </h3>
                      <p className="text-cyber-green/70 font-mono text-sm">
                        This action cannot be undone
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-cyber-dark/30 border border-cyber-red/30 rounded-lg p-4">
                    <p className="font-mono text-cyber-green/80 text-sm leading-relaxed">
                      Are you sure you want to permanently delete this threat advisory?
                    </p>
                    <p className="font-mono text-cyber-blue text-xs mt-2">
                      Advisory: <span className="text-cyber-red">{advisory.title}</span>
                    </p>
                  </div>
                  
                  <div className="flex space-x-3">
                    <CyberButton 
                      variant="ghost" 
                      glowColor="blue" 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1"
                    >
                      CANCEL
                    </CyberButton>
                    <CyberButton 
                      variant="cyber" 
                      glowColor="red" 
                      onClick={handleDelete}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      DELETE
                    </CyberButton>
                  </div>
                </div>
              </TerminalWindow>
            </CyberCard>
          </div>
        )}
      </div>
    </HydrationSafe>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params, req }) => {
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

  await dbConnect();
  
  const advisory = await Advisory.findById(params?.id).lean();
  
  if (!advisory) {
    return {
      notFound: true,
    };
  }
  
  return {
    props: {
      advisory: JSON.parse(JSON.stringify(advisory)),
    },
  };
};
