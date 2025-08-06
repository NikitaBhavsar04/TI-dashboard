import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Calendar, User, ExternalLink, Eye, Hash, Globe, Mail, Server, Activity, Shield, AlertTriangle } from 'lucide-react';
import { IAdvisory } from '@/models/Advisory';

interface AdvisoryCardProps {
  advisory: IAdvisory;
}

export default function AdvisoryCard({ advisory }: AdvisoryCardProps) {
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
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'low':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div className="group p-6 rounded-xl bg-glass-gradient backdrop-blur-glass border border-white/10 shadow-glass hover:border-white/20 hover:shadow-glass-hover transition-all duration-500 animate-fade-in">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-neon-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <Link href={`/advisory/${advisory._id}`} className="block">
              <h3 className="font-orbitron font-semibold text-lg text-white group-hover:text-neon-blue transition-colors duration-300 line-clamp-2 cursor-pointer">
                {advisory.title}
              </h3>
            </Link>
            
            <div className="flex items-center flex-wrap gap-2">
              {/* Severity Badge */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-rajdhani font-semibold text-xs tracking-wider ${getSeverityColor(advisory.severity)}`}>
                {getSeverityIcon(advisory.severity)}
                {advisory.severity.toUpperCase()}
              </div>
              
              {/* Category */}
              <div className="px-3 py-1.5 rounded-lg bg-glass-200 border border-white/20 font-rajdhani text-xs text-white/80 tracking-wider">
                {advisory.category.toUpperCase()}
              </div>
            </div>
          </div>
          
          {/* View Button */}
          <Link href={`/advisory/${advisory._id}`}>
            <button className="group/btn flex items-center gap-2 px-4 py-2 rounded-lg bg-glass-200 border border-white/20 hover:border-neon-blue/30 hover:bg-neon-blue/10 transition-all duration-300 font-rajdhani font-medium text-white/90 hover:text-neon-blue">
              <Eye className="h-4 w-4 group-hover/btn:scale-110 transition-transform duration-300" />
              VIEW
            </button>
          </Link>
        </div>

        {/* Description */}
        <p className="font-rajdhani text-white/70 leading-relaxed line-clamp-3">
          {advisory.description}
        </p>

        {/* IOCs Section */}
        {advisory.iocs && advisory.iocs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-neon-cyan" />
              <h4 className="font-orbitron font-semibold text-sm text-neon-cyan tracking-wider">
                INDICATORS ({advisory.iocs.length})
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {advisory.iocs.slice(0, 3).map((ioc, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-glass-200 border border-white/20 hover:border-neon-cyan/30 hover:bg-neon-cyan/10 transition-all duration-300">
                  <div className="text-neon-cyan">
                    {getIconForIOCType(ioc.type)}
                  </div>
                  <span className="font-rajdhani text-xs text-white/80 font-medium">
                    {ioc.type}
                  </span>
                </div>
              ))}
              {advisory.iocs.length > 3 && (
                <div className="flex items-center px-3 py-1.5 rounded-lg bg-glass-200 border border-white/20">
                  <span className="font-rajdhani text-xs text-white/60 font-medium">
                    +{advisory.iocs.length - 3} more
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-4 text-sm font-rajdhani text-white/60">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(advisory.publishedDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{advisory.author}</span>
            </div>
          </div>
          
          {/* CVSS Score */}
          {advisory.cvss && (
            <div className="px-3 py-1 rounded-lg bg-glass-200 border border-white/20 font-orbitron text-xs text-white/80 font-semibold">
              CVSS: {advisory.cvss}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
