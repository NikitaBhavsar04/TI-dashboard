import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Calendar, User, ExternalLink, Eye, Hash, Globe, Mail, Server, Activity } from 'lucide-react';
import { CyberCard, CyberBadge, CyberButton } from '@/components/ui/cyber-components';
import { IAdvisory } from '@/models/Advisory';

interface AdvisoryCardProps {
  advisory: IAdvisory;
}

export default function AdvisoryCard({ advisory }: AdvisoryCardProps) {
  const getIconForIOCType = (type: string) => {
    switch (type) {
      case 'IP': return <Server className="h-3 w-3" />;
      case 'Hash': return <Hash className="h-3 w-3" />;
      case 'URL': return <Globe className="h-3 w-3" />;
      case 'Domain': return <Globe className="h-3 w-3" />;
      case 'Email': return <Mail className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  return (
    <CyberCard variant="holographic" className="p-6 hover:scale-105 transition-all duration-300">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link href={`/advisory/${advisory._id}`}>
              <h3 className="font-mono font-bold text-cyber-green hover:text-cyber-blue transition-colors cursor-pointer line-clamp-2">
                {advisory.title}
              </h3>
            </Link>
            <div className="flex items-center space-x-2 mt-2">
              <CyberBadge 
                variant={
                  advisory.severity === 'Critical' ? 'danger' : 
                  advisory.severity === 'High' ? 'warning' : 
                  advisory.severity === 'Medium' ? 'info' : 'success'
                }
              >
                {advisory.severity}
              </CyberBadge>
              <span className="text-xs text-cyber-blue/70 font-mono">{advisory.category}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link href={`/advisory/${advisory._id}`}>
              <CyberButton variant="ghost" glowColor="blue" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                VIEW
              </CyberButton>
            </Link>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-cyber-blue/80 font-mono line-clamp-3">
          {advisory.description}
        </p>

        {/* IOCs */}
        {advisory.iocs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-mono text-cyber-red">INDICATORS ({advisory.iocs.length}):</h4>
            <div className="flex flex-wrap gap-1">
              {advisory.iocs.slice(0, 3).map((ioc, index) => (
                <div key={index} className="flex items-center space-x-1 bg-cyber-dark/30 px-2 py-1 rounded border border-cyber-red/20">
                  {getIconForIOCType(ioc.type)}
                  <span className="text-xs font-mono text-cyber-red">{ioc.type}</span>
                </div>
              ))}
              {advisory.iocs.length > 3 && (
                <div className="bg-cyber-dark/30 px-2 py-1 rounded border border-cyber-red/20">
                  <span className="text-xs font-mono text-cyber-red">+{advisory.iocs.length - 3}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-cyber-blue/20">
          <div className="flex items-center space-x-3 text-xs text-cyber-green/70 font-mono">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(advisory.publishedDate)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span>{advisory.author}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {advisory.cvss && (
              <CyberBadge variant="warning">
                CVSS: {advisory.cvss}
              </CyberBadge>
            )}
            <Link href={`/advisory/${advisory._id}`} className="flex items-center space-x-1 text-cyber-blue hover:text-cyber-green transition-colors">
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </CyberCard>
  );
}
