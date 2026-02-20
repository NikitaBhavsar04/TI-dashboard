import React from 'react';

export const SkeletonCard: React.FC = () => (
  <div className="skeleton skeleton-card"></div>
);

export const SkeletonText: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="skeleton skeleton-text" style={{ width: `${100 - i * 10}%` }}></div>
    ))}
  </div>
);

export const SkeletonTitle: React.FC = () => (
  <div className="skeleton skeleton-title"></div>
);

export const SkeletonStatsCard: React.FC = () => (
  <div className="stagger-item backdrop-blur-md bg-gradient-to-br from-slate-800/50 to-slate-900/20 border-2 border-slate-700/40 rounded-lg p-4 shadow-lg shadow-slate-800/20">
    <div className="flex items-center justify-between mb-4">
      <div className="flex-1">
        <div className="h-4 bg-slate-700/70 rounded w-32 mb-3"></div>
      </div>
      <div className="p-2 bg-slate-700/50 rounded-lg mr-0">
        <div className="h-4 w-4 bg-slate-700/70 rounded"></div>
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-8 bg-slate-700/70 rounded w-16 animate-pulse"></div>
      <div className="h-3 bg-slate-700/50 rounded w-40 animate-pulse"></div>
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-3">
    <div className="skeleton h-12 rounded-lg"></div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="skeleton h-16 rounded-lg"></div>
    ))}
  </div>
);
