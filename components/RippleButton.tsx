import React, { useState, MouseEvent } from 'react';

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
}

export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  onClick,
  ...props
}) => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const addRipple = (event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 600);

    if (onClick) {
      onClick(event);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-400/40 text-blue-400 hover:from-blue-500/30 hover:to-cyan-500/30 hover:shadow-blue-500/20';
      case 'secondary':
        return 'bg-gradient-to-r from-slate-500/20 to-slate-600/20 border-slate-400/40 text-slate-300 hover:from-slate-500/30 hover:to-slate-600/30 hover:shadow-slate-500/20';
      case 'success':
        return 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400/40 text-green-400 hover:from-green-500/30 hover:to-emerald-500/30 hover:shadow-green-500/20';
      case 'danger':
        return 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-400/40 text-red-400 hover:from-red-500/30 hover:to-pink-500/30 hover:shadow-red-500/20';
    }
  };

  return (
    <button
      className={`relative overflow-hidden flex items-center space-x-2 px-4 py-2 border rounded-lg transition-all duration-200 shadow-lg font-medium text-sm ${getVariantStyles()} ${className}`}
      onClick={addRipple}
      {...props}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 10,
            height: 10,
          }}
        />
      ))}
      {children}
    </button>
  );
};
