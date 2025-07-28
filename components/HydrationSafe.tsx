import { useEffect, useState } from 'react';

interface HydrationSafeProps {
  children: React.ReactNode;
}

export default function HydrationSafe({ children }: HydrationSafeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-tech-gradient flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-neon-blue font-orbitron text-lg tracking-wider animate-pulse">
            INITIALIZING SYSTEM...
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
