import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { IAdvisory } from '@/models/Advisory';
import { useAuth } from '@/contexts/AuthContext';
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
  Server,
  Send
} from 'lucide-react';

interface AdvisoryCardWithEmailProps {
  advisory: IAdvisory;
  onEmailClick?: (advisory: IAdvisory, e: React.MouseEvent) => void;
}

export default function AdvisoryCardWithEmail({ advisory, onEmailClick }: AdvisoryCardWithEmailProps) {
  const { isAdmin } = useAuth();

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

  // Use createdAt for display (when advisory was added to database)
  const displayDate = (advisory as any).createdAt || advisory.publishedDate;

  return (
    <div className="relative">
      <Link href={`/advisory/${advisory._id}`} className="block group">
        <div className="
          glass-card p-6 transition-all duration-500 hover:shadow-2xl 
          hover:shadow-neon-blue/20 hover:border-neon-blue/50 hover:scale-[1.02]
          before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br 
          before:from-neon-blue/5 before:to-neon-cyan/5 before:opacity-0 
          before:transition-opacity before:duration-500 hover:before:opacity-100
          relative overflow-hidden h-full
        ">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-orbitron font-bold text-lg text-white mb-2 line-clamp-2 group-hover:text-neon-blue transition-colors duration-300">
                {advisory.title}
              </h3>
              
              <div className="flex items-center space-x-4 mb-3">
                <div className={`badge ${getSeverityColor(advisory.severity)} flex items-center space-x-1`}>
                  {getSeverityIcon(advisory.severity)}
                  <span>{advisory.severity}</span>
                </div>
                
                <div className="badge badge-category">
                  {advisory.category}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mb-4">
            <p className="font-rajdhani text-slate-300 text-sm line-clamp-3 leading-relaxed">
              {advisory.executiveSummary || advisory.summary || advisory.description}
            </p>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs font-rajdhani text-slate-400 mb-4">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(displayDate)}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <span>By {advisory.author}</span>
            </div>
          </div>

          {/* Affected Products */}
          {advisory.affectedProducts && advisory.affectedProducts.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center space-x-2 mb-2">
                <Server className="w-3 h-3 text-red-400" />
                <span className="text-xs font-rajdhani font-semibold text-slate-400 uppercase tracking-wider">
                  Affected Products
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {advisory.affectedProducts.slice(0, 2).map((product, index) => (
                  <div key={index} className="px-2 py-1 rounded-md bg-red-500/10 border border-red-400/30 text-xs font-rajdhani text-red-300">
                    {product}
                  </div>
                ))}
                {advisory.affectedProducts.length > 2 && (
                  <div className="px-2 py-1 rounded-md bg-red-500/10 border border-red-400/30 text-xs font-rajdhani text-red-400">
                    +{advisory.affectedProducts.length - 2} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Target Sectors & Regions */}
          {(advisory.targetSectors?.length || advisory.regions?.length) && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              {advisory.targetSectors && advisory.targetSectors.length > 0 && (
                <div>
                  <div className="flex items-center space-x-1 mb-1">
                    <Globe className="w-3 h-3 text-blue-400" />
                    <span className="text-xs font-rajdhani font-medium text-slate-400">Sectors</span>
                  </div>
                  <div className="text-xs font-rajdhani text-slate-300 line-clamp-1">
                    {advisory.targetSectors.slice(0, 2).join(', ')}
                    {advisory.targetSectors.length > 2 && ` +${advisory.targetSectors.length - 2}`}
                  </div>
                </div>
              )}
              {advisory.regions && advisory.regions.length > 0 && (
                <div>
                  <div className="flex items-center space-x-1 mb-1">
                    <Globe className="w-3 h-3 text-cyan-400" />
                    <span className="text-xs font-rajdhani font-medium text-slate-400">Regions</span>
                  </div>
                  <div className="text-xs font-rajdhani text-slate-300 line-clamp-1">
                    {advisory.regions.slice(0, 2).join(', ')}
                    {advisory.regions.length > 2 && ` +${advisory.regions.length - 2}`}
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
                  <div key={index} className="flex items-center space-x-1 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-400/30">
                    <Hash className="w-3 h-3 text-orange-400" />
                    <span className="text-xs font-jetbrains text-orange-300">{cve}</span>
                  </div>
                ))}
                {advisory.cveIds.length > 3 && (
                  <div className="flex items-center space-x-1 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-400/30">
                    <span className="text-xs font-jetbrains text-orange-400">+{advisory.cveIds.length - 3}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MITRE ATT&CK Tactics */}
          {advisory.mitreTactics && advisory.mitreTactics.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-3 h-3 text-purple-400" />
                <span className="text-xs font-rajdhani font-semibold text-slate-400 uppercase tracking-wider">
                  MITRE ATT&CK ({advisory.mitreTactics.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {advisory.mitreTactics.slice(0, 2).map((tactic, index) => (
                  <div key={index} className="px-2 py-1 rounded-md bg-purple-500/10 border border-purple-400/30 text-xs font-rajdhani text-purple-300">
                    {tactic.techniqueId || tactic.tacticName}
                  </div>
                ))}
                {advisory.mitreTactics.length > 2 && (
                  <div className="px-2 py-1 rounded-md bg-purple-500/10 border border-purple-400/30 text-xs font-rajdhani text-purple-400">
                    +{advisory.mitreTactics.length - 2} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* IOCs Preview */}
          {advisory.iocs && advisory.iocs.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xs font-rajdhani font-semibold text-slate-400 uppercase tracking-wider">
                  IOCs ({advisory.iocs.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {advisory.iocs.slice(0, 3).map((ioc, index) => (
                  <div key={index} className="flex items-center space-x-1 px-2 py-1 rounded-md bg-tech-navy/50 border border-slate-600/30">
                    {getIconForIOCType(ioc.type)}
                    <span className="text-xs font-rajdhani text-slate-300">{ioc.type}</span>
                  </div>
                ))}
                {advisory.iocs.length > 3 && (
                  <div className="flex items-center space-x-1 px-2 py-1 rounded-md bg-tech-navy/30 border border-slate-600/30">
                    <span className="text-xs font-rajdhani text-slate-400">+{advisory.iocs.length - 3}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {advisory.tags && advisory.tags.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {advisory.tags.slice(0, 4).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-1 rounded-md bg-gradient-to-r from-neon-blue/10 to-neon-cyan/10 border border-neon-blue/20 text-xs font-rajdhani text-neon-blue"
                  >
                    #{tag}
                  </span>
                ))}
                {advisory.tags.length > 4 && (
                  <span className="inline-block px-2 py-1 rounded-md bg-tech-navy/30 border border-slate-600/30 text-xs font-rajdhani text-slate-400">
                    +{advisory.tags.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-between items-center">
            {advisory.tlp && (
              <div className="inline-flex items-center px-2 py-1 rounded-md bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                <span className="text-xs font-rajdhani font-bold text-amber-400">
                  {advisory.tlp}
                </span>
              </div>
            )}
            
            {/* Read More Indicator */}
            <div className="flex items-center space-x-1 text-neon-blue group-hover:text-neon-cyan transition-colors duration-300">
              <span className="text-xs font-rajdhani font-medium">Read More</span>
              <ExternalLink className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </div>

          {/* Hover Effect Border */}
          <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-neon-blue/30 transition-all duration-500 pointer-events-none"></div>
        </div>
      </Link>

      {/* Email Button - Only visible for admins */}
      {isAdmin && onEmailClick && (
        <button
          onClick={(e) => onEmailClick(advisory, e)}
          className="
            absolute top-4 right-4 p-2 rounded-lg
            bg-gradient-to-r from-cyan-600/80 to-blue-600/80 
            border border-cyan-400/50 backdrop-blur-md
            text-white hover:text-cyan-100
            shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30
            transition-all duration-300 hover:scale-110
            z-10 group/email
          "
          title="Send Advisory Email"
        >
          <Send className="w-4 h-4 group-hover/email:rotate-12 transition-transform duration-300" />
        </button>
      )}
    </div>
  );
}
