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
  <div className="backdrop-blur-md bg-slate-800/50 border-2 border-slate-700/50 rounded-lg p-4">
    <div className="flex items-center justify-between mb-3">
      <div className="skeleton h-4 w-24"></div>
      <div className="skeleton h-10 w-10 rounded-lg"></div>
    </div>
    <div className="skeleton h-10 w-20 mb-2"></div>
    <div className="skeleton h-3 w-32"></div>
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
