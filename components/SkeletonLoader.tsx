import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'card' | 'text' | 'circle' | 'rectangle';
  width?: string;
  height?: string;
  count?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'rectangle',
  width = '100%',
  height = '20px',
  count = 1,
  className = '',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return 'rounded-lg h-48';
      case 'text':
        return 'rounded h-4';
      case 'circle':
        return 'rounded-full';
      case 'rectangle':
        return 'rounded';
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`skeleton-loader ${getVariantStyles()} ${className}`}
          style={{ width, height: variant === 'card' ? undefined : height }}
        />
      ))}
    </>
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`backdrop-blur-md bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <SkeletonLoader variant="circle" width="48px" height="48px" />
        <SkeletonLoader variant="circle" width="32px" height="32px" />
      </div>
      <SkeletonLoader variant="text" width="60%" className="mb-2" />
      <SkeletonLoader variant="text" width="40%" height="32px" className="mb-2" />
      <SkeletonLoader variant="text" width="50%" height="16px" />
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 4 
}) => {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLoader key={i} variant="text" height="24px" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, colIndex) => (
            <SkeletonLoader key={colIndex} variant="text" height="20px" />
          ))}
        </div>
      ))}
    </div>
  );
};
