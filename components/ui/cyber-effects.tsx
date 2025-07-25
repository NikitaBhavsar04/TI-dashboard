import React from 'react';
import { cn } from '@/lib/utils';

interface HolographicOverlayProps {
  className?: string;
  children: React.ReactNode;
}

export function HolographicOverlay({ className, children }: HolographicOverlayProps) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-lg',
      'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-cyber-blue/10 before:to-transparent',
      'before:animate-shimmer before:transform before:skew-x-12',
      className
    )}>
      {children}
    </div>
  );
}

interface NeonTextProps {
  color?: 'green' | 'blue' | 'red' | 'purple' | 'orange';
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
  children: React.ReactNode;
}

export function NeonText({ color = 'blue', intensity = 'medium', className, children }: NeonTextProps) {
  const colors = {
    green: 'text-cyber-green',
    blue: 'text-cyber-blue',
    red: 'text-cyber-red',
    purple: 'text-cyber-purple',
    orange: 'text-warning-orange'
  };

  const shadows = {
    low: `shadow-sm`,
    medium: `shadow-md`,
    high: `shadow-lg`
  };

  const glowClass = `shadow-neon-${color}`;

  return (
    <span className={cn(
      colors[color],
      shadows[intensity],
      glowClass,
      'font-mono',
      className
    )}>
      {children}
    </span>
  );
}

interface GlitchTextProps {
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
  children: React.ReactNode;
}

export function GlitchText({ intensity = 'medium', className, children }: GlitchTextProps) {
  return (
    <span className={cn(
      'relative inline-block',
      'before:content-[attr(data-text)] before:absolute before:top-0 before:left-0 before:w-full before:h-full',
      'before:text-cyber-red before:opacity-80 before:animate-glitch-1',
      'after:content-[attr(data-text)] after:absolute after:top-0 after:left-0 after:w-full after:h-full',
      'after:text-cyber-blue after:opacity-80 after:animate-glitch-2',
      className
    )}
    data-text={children}
    >
      {children}
    </span>
  );
}

interface TerminalWindowProps {
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function TerminalWindow({ title = 'TERMINAL', className, children }: TerminalWindowProps) {
  return (
    <div className={cn(
      'bg-cyber-dark/95 border border-cyber-green/30 rounded-lg shadow-2xl shadow-cyber-green/20',
      className
    )}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-green/30 bg-cyber-green/5">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-cyber-red rounded-full"></div>
            <div className="w-3 h-3 bg-warning-orange rounded-full"></div>
            <div className="w-3 h-3 bg-cyber-green rounded-full"></div>
          </div>
          <span className="text-cyber-green font-mono text-sm font-bold ml-4">
            {title}
          </span>
        </div>
        <div className="text-cyber-green/60 font-mono text-xs">
          {'>'} CLASSIFIED_SYSTEM_v2.1.0
        </div>
      </div>
      
      {/* Terminal Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

interface DataStreamProps {
  speed?: 'slow' | 'medium' | 'fast';
  className?: string;
}

export function DataStream({ speed = 'medium', className }: DataStreamProps) {
  const speeds = {
    slow: 'animate-pulse duration-2000',
    medium: 'animate-pulse duration-1000',
    fast: 'animate-pulse duration-500'
  };

  return (
    <div className={cn('flex space-x-1 overflow-hidden', className)}>
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1 h-8 bg-cyber-green/20 rounded-full',
            speeds[speed]
          )}
          style={{
            animationDelay: `${i * 0.1}s`,
            height: `${Math.random() * 32 + 8}px`
          }}
        />
      ))}
    </div>
  );
}
