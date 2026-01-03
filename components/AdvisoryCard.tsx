import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { IAdvisory } from '@/models/Advisory';
import { 
  Calendar, 
  Shield, 
  AlertTriangle, 
  Zap, 
  Activity,
  ExternalLink,
  Hash,
  Globe,
  Mail,
  Server
} from 'lucide-react';

interface AdvisoryCardProps {
  advisory: IAdvisory;
}

export default function AdvisoryCard({ advisory }: AdvisoryCardProps) {
  const getIconForIOCType = (type: string) => {
    switch (type) {
      case 'IP':
        return <Server className="w-3 h-3" />;
      case 'Hash':
        return <Hash className="w-3 h-3" />;
      case 'URL':
        return <ExternalLink className="w-3 h-3" />;
      case 'Domain':
        return <Globe className="w-3 h-3" />;
      case 'Email':
        return <Mail className="w-3 h-3" />;
      default:
        return <Shield className="w-3 h-3" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'badge-critical';
      case 'high':
        return 'badge-high';
      case 'medium':
        return 'badge-medium';
      case 'low':
        return 'badge-low';
      default:
        return 'badge-low';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return <Zap className="w-4 h-4" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Activity className="w-4 h-4" />;
      case 'low':
        return <Shield className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Use createdAt for display (when advisory was added to database)
  const displayDate = (advisory as any).createdAt || advisory.publishedDate;

  return (
    <Link href={`/advisory/${advisory._id}`} className="block group">
      <div className="glass-card p-6 hover-glow transition-all duration-500 animate-fade-in h-full">
        {/* Header with Advisory ID */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            {advisory.advisoryId && (
              <div className="text-xs font-jetbrains text-slate-500 mb-1">
                {advisory.advisoryId}
              </div>
            )}
            <h3 className="font-orbitron font-semibold text-lg text-slate-100 group-hover:text-neon-blue transition-colors duration-300 mb-2 line-clamp-2">
              {advisory.title}
            </h3>
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <div className={`${getSeverityColor(advisory.severity)} flex items-center space-x-1`}>
                {getSeverityIcon(advisory.severity)}
                <span className="font-rajdhani font-bold text-xs uppercase tracking-wider">
                  {advisory.criticality || advisory.severity}
                </span>
              </div>
              {advisory.threatType && (
                <div className="inline-flex items-center px-2 py-1 rounded-md bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30">
                  <span className="text-xs font-rajdhani font-medium text-purple-300">
                    {advisory.threatType}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <p className="text-slate-300 text-sm font-rajdhani leading-relaxed mb-4 line-clamp-3">
          {truncateText(advisory.executiveSummary || advisory.description, 150)}
        </p>

        {/* TLP Classification */}
        {advisory.tlp && (
          <div className="mb-3">
            <div className="inline-flex items-center px-3 py-1.5 rounded-md bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
              <span className="text-xs font-rajdhani font-bold text-amber-400 uppercase">
                TLP: {advisory.tlp}
              </span>
            </div>
          </div>
        )}

        {/* Affected Product */}
        {(advisory.affectedProduct || advisory.affectedProducts?.length) && (
          <div className="mb-3">
            <div className="flex items-center space-x-2 mb-1.5">
              <Server className="w-3 h-3 text-red-400" />
              <span className="text-xs font-rajdhani font-medium text-slate-400 uppercase tracking-wider">
                Affected Product
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {advisory.affectedProduct && !advisory.affectedProducts?.length && (
                <div className="inline-flex items-center px-2 py-1 rounded-md bg-red-500/10 border border-red-400/30 text-xs font-rajdhani text-red-300">
                  {advisory.affectedProduct}
                </div>
              )}
              {advisory.affectedProducts?.slice(0, 2).map((product, index) => (
                <div
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md bg-red-500/10 border border-red-400/30 text-xs font-rajdhani text-red-300"
                >
                  {product}
                </div>
              ))}
              {advisory.affectedProducts && advisory.affectedProducts.length > 2 && (
                <div className="inline-flex items-center px-2 py-1 rounded-md bg-red-500/10 border border-red-400/30 text-xs font-rajdhani text-red-400">
                  +{advisory.affectedProducts.length - 2} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Target Sectors & Regions - Side by Side */}
        {(advisory.targetSectors?.length || advisory.regions?.length) && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            {advisory.targetSectors && advisory.targetSectors.length > 0 && (
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <Globe className="w-3 h-3 text-blue-400" />
                  <span className="text-xs font-rajdhani font-medium text-slate-400">Sectors</span>
                </div>
                <div className="text-xs font-rajdhani text-slate-300 line-clamp-2">
                  {advisory.targetSectors.join(', ')}
                </div>
              </div>
            )}
            {advisory.regions && advisory.regions.length > 0 && (
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <Globe className="w-3 h-3 text-cyan-400" />
                  <span className="text-xs font-rajdhani font-medium text-slate-400">Regions</span>
                </div>
                <div className="text-xs font-rajdhani text-slate-300 line-clamp-2">
                  {advisory.regions.join(', ')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CVEs */}
        {advisory.cveIds && advisory.cveIds.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {advisory.cveIds.slice(0, 3).map((cve, index) => (
                <div
                  key={index}
                  className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-400/30"
                >
                  <Hash className="w-3 h-3 text-orange-400" />
                  <span className="text-xs font-jetbrains text-orange-300">{cve}</span>
                </div>
              ))}
              {advisory.cveIds.length > 3 && (
                <div className="inline-flex items-center px-2 py-1 rounded-md bg-orange-500/10 border border-orange-400/30">
                  <span className="text-xs font-jetbrains text-orange-400">
                    +{advisory.cveIds.length - 3} more
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MITRE ATT&CK Tactics */}
        {advisory.mitreTactics && advisory.mitreTactics.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center space-x-2 mb-1.5">
              <Shield className="w-3 h-3 text-purple-400" />
              <span className="text-xs font-rajdhani font-medium text-slate-400 uppercase tracking-wider">
                MITRE ATT&CK ({advisory.mitreTactics.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {advisory.mitreTactics.slice(0, 2).map((tactic, index) => (
                <div
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md bg-purple-500/10 border border-purple-400/30 text-xs font-rajdhani text-purple-300"
                >
                  {tactic.techniqueId || tactic.tacticName}
                </div>
              ))}
              {advisory.mitreTactics.length > 2 && (
                <div className="inline-flex items-center px-2 py-1 rounded-md bg-purple-500/10 border border-purple-400/30 text-xs font-rajdhani text-purple-400">
                  +{advisory.mitreTactics.length - 2} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-700/30">
          <div className="flex items-center space-x-2">
            <Calendar className="w-3 h-3 text-neon-cyan" />
            <span className="font-jetbrains">
              {formatDate(displayDate)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-rajdhani font-medium">{advisory.author}</span>
            <ExternalLink className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300 text-neon-blue" />
          </div>
        </div>

        {/* Hover Effect Border */}
        <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-neon-blue/30 transition-all duration-500 pointer-events-none"></div>
      </div>
    </Link>
  );
}
