import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function TestNavbar() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white p-4 text-center">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="text-2xl font-bold animate-pulse">
          🚨 NEW TEST NAVBAR - THIS SHOULD BE VISIBLE 🚨
        </div>
        
        {isAdmin && (
          <div className="flex items-center gap-4 bg-green-500 p-4 rounded-lg animate-bounce">
            <Clock className="w-8 h-8" />
            <div className="text-2xl font-bold">
              LIVE TIME: {formatTime(currentTime)}
            </div>
          </div>
        )}
        
        <div className="text-lg">
          {user?.username || 'Not logged in'} | Admin: {isAdmin ? 'YES' : 'NO'}
        </div>
      </div>
    </div>
  );
}
