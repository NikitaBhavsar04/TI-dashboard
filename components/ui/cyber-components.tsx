import React from 'react';

interface CyberCardProps {
  children: React.ReactNode;
  variant?: string;
  className?: string;
  glowColor?: string;
}

export const CyberCard: React.FC<CyberCardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`cyber-section ${className}`}>
      {children}
    </div>
  );
};

interface CyberButtonProps {
  children: React.ReactNode;
  variant?: string;
  className?: string;
  glowColor?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export const CyberButton: React.FC<CyberButtonProps> = ({ 
  children, 
  className = '', 
  onClick,
  type = 'button',
  disabled = false,
  ...props 
}) => {
  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-primary ${className}`}
    >
      {children}
    </button>
  );
};

interface CyberBadgeProps {
  children: React.ReactNode;
  variant?: string;
  className?: string;
}

export const CyberBadge: React.FC<CyberBadgeProps> = ({ children, className = '', ...props }) => {
  return (
    <span className={`severity-low ${className}`}>
      {children}
    </span>
  );
};

interface CyberLoadingProps {
  className?: string;
  variant?: string;
  size?: string;
}

export const CyberLoading: React.FC<CyberLoadingProps> = ({ 
  className = '', 
  variant = 'default',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  const borderSize = size === 'sm' ? 'border-b-1' : 'border-b-2';

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full ${sizeClasses[size as keyof typeof sizeClasses]} ${borderSize} border-neon-blue`}></div>
    </div>
  );
};
