import Link from 'next/link';
import { useState } from 'react';
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
  Send,
  ChevronDown,
  Link as LinkIcon,
  User
} from 'lucide-react';

interface AdvisoryCardWithEmailProps {
  advisory: IAdvisory;
  onEmailClick?: (advisory: IAdvisory, e: React.MouseEvent) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export default function AdvisoryCardWithEmail({ advisory, onEmailClick, expanded = false, onToggleExpand }: AdvisoryCardWithEmailProps) {
  const { isAdmin } = useAuth();
  
  // Check if advisory has duplicate tag and extract count
  const duplicateTag = advisory.tags?.find(tag => tag.toLowerCase().startsWith('duplicate'));
  const duplicateCount = duplicateTag ? parseInt(duplicateTag.split('-')[1]) || 0 : 0;
  const isDuplicate = duplicateCount > 0;

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
    <div className="relative w-full">
      <Link 
        href={`/advisory/${advisory._id}`}
        className="block"
      >
        <div className={`glass-card p-3 md:p-4 mb-3 pr-16 md:pr-24 transition-all duration-300 rounded-xl border border-slate-700/40 shadow-lg hover:border-cyan-500/50 hover:bg-slate-800/70 cursor-pointer ${expanded ? 'bg-slate-800/80' : 'bg-slate-900/60'}`}>
          {/* Compact One-Liner Content */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Advisory Title */}
            <h3 className="font-orbitron font-semibold text-sm text-white truncate max-w-[50%]">
              {advisory.title}
            </h3>
            
            {/* Threat Type (Category) */}
            <span className="badge badge-category text-xs whitespace-nowrap flex-shrink-0">
              {advisory.category}
            </span>
            
            {/* Criticality (Severity) */}
            <span className={`badge ${getSeverityColor(advisory.severity)} text-xs font-bold shadow-lg whitespace-nowrap flex-shrink-0`}>
              {advisory.severity}
            </span>
          </div>
        </div>
      </Link>

      {/* Email Button - Only visible for admins - RIGHT SIDE */}
      {isAdmin && onEmailClick && (
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEmailClick(advisory, e); }}
          className="
            absolute top-3 md:top-4 right-12 md:right-16 p-1.5 md:p-2 rounded-lg
            bg-gradient-to-r from-cyan-600/80 to-blue-600/80 
            border border-cyan-400/50 backdrop-blur-md
            text-white hover:text-cyan-100
            shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30
            transition-all duration-300 hover:scale-110
            z-10 group/email
          "
          title="Send Advisory Email"
        >
          <Send className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover/email:rotate-12 transition-transform duration-300" />
        </button>
      )}

      {/* Expand/View Details Button - RIGHT SIDE */}
      <button
        onClick={(e) => { 
          e.stopPropagation(); 
          e.preventDefault();
          window.location.href = `/advisory/${advisory._id}`;
        }}
        className={`
          absolute top-3 md:top-4 p-1.5 md:p-2 rounded-lg
          bg-gradient-to-r from-purple-600/80 to-purple-500/80 
          border border-purple-400/50 backdrop-blur-md
          text-white hover:text-purple-100
          shadow-lg shadow-purple-500/20 hover:shadow-purple-400/30
          transition-all duration-300 hover:scale-110
          z-10
          ${isAdmin && onEmailClick ? 'right-3 md:right-4' : 'right-3 md:right-4'}
        `}
        title="View Full Advisory"
      >
        <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4" />
      </button>
    </div>
  );
}