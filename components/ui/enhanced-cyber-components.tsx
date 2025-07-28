import React, { useEffect, useRef } from 'react';

// Enhanced Particle System Component with Bubbles
export const ParticleSystem: React.FC = () => {
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const createParticle = (type: 'particle' | 'bubble' | 'dot' = 'particle') => {
      if (!particlesRef.current) return;

      const particle = document.createElement('div');
      
      if (type === 'bubble') {
        particle.className = 'cyber-bubble';
        particle.style.cssText = `
          position: absolute;
          width: ${4 + Math.random() * 8}px;
          height: ${4 + Math.random() * 8}px;
          background: radial-gradient(circle, rgba(0, 255, 255, 0.6) 0%, rgba(0, 255, 255, 0.2) 70%, transparent 100%);
          border-radius: 50%;
          left: ${Math.random() * 100}%;
          animation: bubbleFloat ${20 + Math.random() * 15}s linear infinite;
          animation-delay: ${Math.random() * 2}s;
        `;
      } else if (type === 'dot') {
        particle.className = 'cyber-dot';
        particle.style.cssText = `
          position: absolute;
          width: ${2 + Math.random() * 4}px;
          height: ${2 + Math.random() * 4}px;
          background: ${Math.random() > 0.5 ? 'rgba(255, 0, 128, 0.7)' : 'rgba(0, 255, 65, 0.7)'};
          border-radius: 50%;
          left: ${Math.random() * 100}%;
          animation: dotFloat ${15 + Math.random() * 20}s linear infinite;
          animation-delay: ${Math.random() * 3}s;
          box-shadow: 0 0 ${4 + Math.random() * 6}px currentColor;
        `;
      } else {
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 2 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
      }
      
      particlesRef.current.appendChild(particle);

      // Remove particle after animation
      const animationDuration = type === 'bubble' ? 35000 : type === 'dot' ? 35000 : 25000;
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, animationDuration);
    };

    // Create initial mix of particles
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        const rand = Math.random();
        if (rand > 0.7) {
          createParticle('bubble');
        } else if (rand > 0.4) {
          createParticle('dot');
        } else {
          createParticle('particle');
        }
      }, i * 150);
    }

    // Continue creating particles
    const interval = setInterval(() => {
      const rand = Math.random();
      if (rand > 0.6) {
        createParticle('bubble');
      } else if (rand > 0.3) {
        createParticle('dot');
      } else {
        createParticle('particle');
      }
    }, 800);

    // Add CSS for new animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes bubbleFloat {
        0% { 
          transform: translateY(100vh) translateX(0px) scale(0);
          opacity: 0;
        }
        10% { 
          opacity: 1;
          transform: translateY(90vh) translateX(10px) scale(1);
        }
        50% {
          transform: translateY(50vh) translateX(-20px) scale(1.2);
        }
        90% { 
          opacity: 1;
          transform: translateY(10vh) translateX(30px) scale(0.8);
        }
        100% { 
          transform: translateY(-100px) translateX(50px) scale(0);
          opacity: 0;
        }
      }
      
      @keyframes dotFloat {
        0% { 
          transform: translateY(100vh) translateX(0px) rotate(0deg);
          opacity: 0;
        }
        15% { opacity: 1; }
        85% { opacity: 1; }
        100% { 
          transform: translateY(-100px) translateX(80px) rotate(360deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      clearInterval(interval);
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  return <div ref={particlesRef} className="particles" />;
};

// Mouse Fluid Simulation Effect Hook
export const useCursorTrail = () => {
  useEffect(() => {
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let animationId: number;
    let mouse = { x: 0, y: 0, vx: 0, vy: 0 };
    let lastMouse = { x: 0, y: 0 };
    let particles: FluidParticle[] = [];
    let time = 0;

    class FluidParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      color: string;
      alpha: number;

      constructor(x: number, y: number, vx: number, vy: number) {
        this.x = x;
        this.y = y;
        this.vx = vx + (Math.random() - 0.5) * 2;
        this.vy = vy + (Math.random() - 0.5) * 2;
        this.life = 0;
        this.maxLife = 30 + Math.random() * 20;
        this.size = 2 + Math.random() * 4;
        
        // Cyber color palette
        const colors = [
          'rgba(0, 255, 255, ',    // cyan
          'rgba(255, 0, 128, ',    // magenta
          'rgba(0, 255, 65, ',     // green
          'rgba(128, 0, 255, ',    // purple
          'rgba(255, 255, 0, '     // yellow
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.alpha = 1;
      }

      update() {
        this.life++;
        this.alpha = 1 - (this.life / this.maxLife);
        
        // Fluid-like movement
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.x += this.vx;
        this.y += this.vy;
        
        // Add some turbulence
        this.vx += (Math.random() - 0.5) * 0.1;
        this.vy += (Math.random() - 0.5) * 0.1;
      }

      draw(ctx: CanvasRenderingContext2D) {
        if (this.alpha <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        // Create gradient for fluid effect
        const gradient = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, this.size
        );
        gradient.addColorStop(0, this.color + this.alpha + ')');
        gradient.addColorStop(0.5, this.color + (this.alpha * 0.6) + ')');
        gradient.addColorStop(1, this.color + '0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add inner glow
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }

      isDead() {
        return this.life >= this.maxLife;
      }
    }

    const createCanvas = () => {
      canvas = document.createElement('canvas');
      canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
        mix-blend-mode: screen;
      `;
      document.body.appendChild(canvas);
      
      ctx = canvas.getContext('2d');
      resizeCanvas();
    };

    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const updateMouse = (e: MouseEvent) => {
      lastMouse.x = mouse.x;
      lastMouse.y = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      
      // Calculate velocity
      mouse.vx = mouse.x - lastMouse.x;
      mouse.vy = mouse.y - lastMouse.y;
      
      // Update cursor position variables for background effects
      document.documentElement.style.setProperty('--cursor-x', mouse.x + 'px');
      document.documentElement.style.setProperty('--cursor-y', mouse.y + 'px');
      
      // Create fluid particles based on movement speed
      const speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);
      if (speed > 1) {
        const numParticles = Math.min(Math.floor(speed / 3), 8);
        for (let i = 0; i < numParticles; i++) {
          particles.push(new FluidParticle(
            mouse.x + (Math.random() - 0.5) * 20,
            mouse.y + (Math.random() - 0.5) * 20,
            mouse.vx * 0.1 + (Math.random() - 0.5) * 2,
            mouse.vy * 0.1 + (Math.random() - 0.5) * 2
          ));
        }
      }
    };

    const drawFluidCursor = () => {
      if (!ctx) return;
      
      // Draw main cursor
      const gradient = ctx.createRadialGradient(
        mouse.x, mouse.y, 0,
        mouse.x, mouse.y, 15
      );
      gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
      gradient.addColorStop(0.3, 'rgba(0, 255, 255, 0.4)');
      gradient.addColorStop(0.7, 'rgba(255, 0, 128, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 0, 128, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw center dot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Add pulsing effect
      const pulse = 1 + Math.sin(time * 0.1) * 0.2;
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 8 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      
      time++;
      
      // Clear canvas with fade effect for fluid trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      particles = particles.filter(particle => {
        particle.update();
        if (ctx) {
          particle.draw(ctx);
        }
        return !particle.isDead();
      });
      
      // Draw fluid cursor
      drawFluidCursor();
      
      // Create ambient particles occasionally
      if (Math.random() > 0.98) {
        particles.push(new FluidParticle(
          mouse.x + (Math.random() - 0.5) * 50,
          mouse.y + (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ));
      }
      
      animationId = requestAnimationFrame(animate);
    };

    const handleMouseEnter = () => {
      // Add burst effect when entering interactive elements
      for (let i = 0; i < 10; i++) {
        particles.push(new FluidParticle(
          mouse.x + (Math.random() - 0.5) * 30,
          mouse.y + (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5
        ));
      }
    };

    // Initialize
    createCanvas();
    animate();

    // Event listeners
    document.addEventListener('mousemove', updateMouse);
    window.addEventListener('resize', resizeCanvas);
    
    // Add hover effects for interactive elements
    const interactiveElements = document.querySelectorAll('button, a, [role="button"]');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', handleMouseEnter);
    });

    return () => {
      cancelAnimationFrame(animationId);
      document.removeEventListener('mousemove', updateMouse);
      window.removeEventListener('resize', resizeCanvas);
      interactiveElements.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter);
      });
      
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, []);
};

// Scroll Fade Animation Hook
export const useScrollFadeIn = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    const elements = document.querySelectorAll('.fade-in-section');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
};

// Enhanced Cyber Card Component
interface CyberCardEnhancedProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'yellow';
  variant?: 'default' | 'glow' | 'pulse';
}

export const CyberCardEnhanced: React.FC<CyberCardEnhancedProps> = ({
  children,
  className = '',
  glowColor = 'blue',
  variant = 'default'
}) => {
  const getGlowClass = () => {
    const glowColors = {
      blue: 'hover:shadow-cyan-500/20',
      purple: 'hover:shadow-purple-500/20',
      green: 'hover:shadow-green-500/20',
      red: 'hover:shadow-red-500/20',
      yellow: 'hover:shadow-yellow-500/20'
    };
    return glowColors[glowColor];
  };

  const getVariantClass = () => {
    switch (variant) {
      case 'glow':
        return 'neon-glow';
      case 'pulse':
        return 'cyber-background';
      default:
        return '';
    }
  };

  return (
    <div className={`cyber-card-enhanced ${getGlowClass()} ${getVariantClass()} ${className}`}>
      {children}
    </div>
  );
};

// Enhanced Heading Component
interface CyberHeadingProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  glow?: boolean;
}

export const CyberHeading: React.FC<CyberHeadingProps> = ({
  children,
  level = 1,
  className = '',
  glow = true
}) => {
  const Component = `h${level}` as keyof JSX.IntrinsicElements;
  
  return (
    <Component className={`cyber-heading ${glow ? 'neon-glow' : ''} ${className}`}>
      {children}
    </Component>
  );
};

// Fade In Section Wrapper
interface FadeInSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const FadeInSection: React.FC<FadeInSectionProps> = ({
  children,
  className = '',
  delay = 0
}) => {
  return (
    <div 
      className={`fade-in-section ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// Enhanced Button Component
interface CyberButtonEnhancedProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  glowColor?: 'cyan' | 'purple' | 'green' | 'red' | 'yellow';
}

export const CyberButtonEnhanced: React.FC<CyberButtonEnhancedProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  glowColor = 'cyan'
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white';
      case 'secondary':
        return 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white';
      case 'ghost':
        return 'border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300';
      default:
        return 'bg-cyan-500 hover:bg-cyan-400 text-white';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-base';
    }
  };

  const getGlowClasses = () => {
    const glowMap = {
      cyan: 'hover:shadow-lg hover:shadow-cyan-500/30',
      purple: 'hover:shadow-lg hover:shadow-purple-500/30',
      green: 'hover:shadow-lg hover:shadow-green-500/30',
      red: 'hover:shadow-lg hover:shadow-red-500/30',
      yellow: 'hover:shadow-lg hover:shadow-yellow-500/30'
    };
    return glowMap[glowColor];
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        cyber-text font-semibold rounded-lg
        transform transition-all duration-200 ease-in-out
        hover:scale-105 active:scale-95
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${getGlowClasses()}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

// Loading Spinner Component
export const CyberLoader: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`${sizeClasses[size]} relative`}>
      <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-full"></div>
      <div className="absolute inset-0 border-2 border-transparent border-t-cyan-500 rounded-full animate-spin"></div>
    </div>
  );
};

// Enhanced Background Layers Component
export const CyberBackgroundLayers: React.FC = () => {
  return (
    <>
      <div className="cyber-background-layer"></div>
      <div className="cyber-background-layer"></div>
    </>
  );
};
