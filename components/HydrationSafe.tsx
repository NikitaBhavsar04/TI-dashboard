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
    return <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
      <div className="text-cyber-green font-mono">INITIALIZING SYSTEM...</div>
    </div>;
  }

  return <>{children}</>;
}
