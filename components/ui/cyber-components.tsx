import React from 'react';
import { cn } from '@/lib/utils';

interface CyberCardProps {
  variant?: 'default' | 'matrix' | 'holographic' | 'glitch' | 'neon';
  glowColor?: 'green' | 'blue' | 'red' | 'purple' | 'orange';
  className?: string;
  children: React.ReactNode;
}

export function CyberCard({ variant = 'default', glowColor = 'blue', className, children }: CyberCardProps) {
  const variants = {
    default: 'bg-cyber-dark/90 border border-cyber-blue/30',
    matrix: 'bg-gradient-to-br from-cyber-dark/90 to-transparent border border-cyber-green/30 backdrop-blur-sm',
    holographic: 'bg-gradient-to-r from-cyber-dark/80 via-transparent to-cyber-dark/80 border border-cyber-blue/40 backdrop-blur-md',
    glitch: 'bg-cyber-dark/95 border-2 border-cyber-red/40 shadow-cyber-red/20 shadow-2xl',
    neon: `bg-cyber-dark/90 border border-cyber-${glowColor}/50 shadow-lg shadow-cyber-${glowColor}/20`
  };

  return (
    <div className={cn(
      'rounded-lg p-4 transition-all duration-300 hover:shadow-xl',
      variants[variant],
      className
    )}>
      {children}
    </div>
  );
}

interface CyberButtonProps {
  variant?: 'cyber' | 'hologram' | 'ghost' | 'matrix';
  glowColor?: 'green' | 'blue' | 'red' | 'purple' | 'orange';
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function CyberButton({ 
  variant = 'cyber', 
  glowColor = 'blue', 
  disabled = false, 
  className, 
  children, 
  onClick,
  type = 'button'
}: CyberButtonProps) {
  const variants = {
    cyber: `bg-gradient-to-r from-cyber-${glowColor}/20 to-cyber-${glowColor}/10 border border-cyber-${glowColor} text-cyber-${glowColor} hover:bg-cyber-${glowColor}/20 hover:shadow-lg hover:shadow-cyber-${glowColor}/50`,
    hologram: 'bg-gradient-to-r from-transparent via-cyber-blue/10 to-transparent border border-cyber-blue/50 text-cyber-blue hover:border-cyber-blue hover:shadow-neon-blue',
    ghost: 'bg-transparent border border-cyber-green/30 text-cyber-green hover:bg-cyber-green/10 hover:border-cyber-green',
    matrix: 'bg-cyber-dark border border-cyber-green text-cyber-green hover:bg-cyber-green/20 hover:shadow-neon-green'
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'px-6 py-3 rounded-lg font-mono text-sm font-bold transition-all duration-300 transform hover:scale-105 active:scale-95',
        variants[variant],
        disabled && 'opacity-50 cursor-not-allowed hover:scale-100',
        className
      )}
    >
      {children}
    </button>
  );
}

interface CyberBadgeProps {
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info';
  className?: string;
  children: React.ReactNode;
}

export function CyberBadge({ variant = 'default', className, children }: CyberBadgeProps) {
  const variants = {
    default: 'bg-cyber-blue/20 text-cyber-blue border-cyber-blue/50',
    danger: 'bg-cyber-red/20 text-cyber-red border-cyber-red/50 shadow-cyber-red/50',
    warning: 'bg-warning-orange/20 text-warning-orange border-warning-orange/50',
    success: 'bg-cyber-green/20 text-cyber-green border-cyber-green/50',
    info: 'bg-cyber-purple/20 text-cyber-purple border-cyber-purple/50'
  };

  return (
    <span className={cn(
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold border',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}

interface CyberLoadingProps {
  variant?: 'cyber' | 'matrix' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CyberLoading({ variant = 'cyber', size = 'md', className }: CyberLoadingProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  if (variant === 'matrix') {
    return (
      <div className={cn('flex space-x-1', className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'bg-cyber-green rounded-full animate-pulse',
              sizes[size]
            )}
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn(
        'bg-cyber-blue rounded-full animate-ping',
        sizes[size],
        className
      )} />
    );
  }

  return (
    <div className={cn(
      'border-2 border-cyber-blue border-t-transparent rounded-full animate-spin',
      sizes[size],
      className
    )} />
  );
}
