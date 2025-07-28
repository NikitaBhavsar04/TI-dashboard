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

  return (
    <Link href={`/advisory/${advisory._id}`} className="block group">
      <div className="glass-card p-6 hover-glow transition-all duration-500 animate-fade-in h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-orbitron font-semibold text-lg text-slate-100 group-hover:text-neon-blue transition-colors duration-300 mb-2 line-clamp-2">
              {advisory.title}
            </h3>
            <div className="flex items-center space-x-2">
              <div className={`${getSeverityColor(advisory.severity)} flex items-center space-x-1`}>
                {getSeverityIcon(advisory.severity)}
                <span className="font-rajdhani font-bold text-xs uppercase tracking-wider">
                  {advisory.severity}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-300 text-sm font-rajdhani leading-relaxed mb-4 line-clamp-3">
          {truncateText(advisory.description, 150)}
        </p>

        {/* Metadata */}
        <div className="space-y-3 mb-4">
          {/* Date and Author */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <Calendar className="w-3 h-3 text-neon-cyan" />
              <span className="font-jetbrains">
                {formatDate(advisory.publishedDate)}
              </span>
            </div>
            <div className="font-rajdhani font-medium">
              {advisory.author}
            </div>
          </div>

          {/* Category */}
          {advisory.category && (
            <div className="inline-flex items-center px-2 py-1 rounded-md bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border border-neon-purple/30">
              <span className="text-xs font-rajdhani font-medium text-neon-purple">
                {advisory.category}
              </span>
            </div>
          )}
        </div>

        {/* IOCs Preview */}
        {advisory.iocs && advisory.iocs.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-3 h-3 text-neon-cyan" />
              <span className="text-xs font-rajdhani font-medium text-slate-400 uppercase tracking-wider">
                IOCs ({advisory.iocs.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {advisory.iocs.slice(0, 3).map((ioc, index) => (
                <div
                  key={index}
                  className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-tech-navy/50 border border-slate-700/50"
                >
                  {getIconForIOCType(ioc.type)}
                  <span className="text-xs font-jetbrains text-slate-300">
                    {ioc.type}
                  </span>
                </div>
              ))}
              {advisory.iocs.length > 3 && (
                <div className="inline-flex items-center px-2 py-1 rounded-md bg-tech-navy/50 border border-slate-700/50">
                  <span className="text-xs font-jetbrains text-slate-400">
                    +{advisory.iocs.length - 3} more
                  </span>
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

        {/* TLP Level */}
        {advisory.tlp && (
          <div className="flex justify-between items-center">
            <div className="inline-flex items-center px-2 py-1 rounded-md bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
              <span className="text-xs font-rajdhani font-bold text-amber-400">
                {advisory.tlp}
              </span>
            </div>
            
            {/* Read More Indicator */}
            <div className="flex items-center space-x-1 text-neon-blue group-hover:text-neon-cyan transition-colors duration-300">
              <span className="text-xs font-rajdhani font-medium">Read More</span>
              <ExternalLink className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </div>
        )}

        {/* Hover Effect Border */}
        <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-neon-blue/30 transition-all duration-500 pointer-events-none"></div>
      </div>
    </Link>
  );
}
