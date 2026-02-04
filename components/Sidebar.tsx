import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { createPortal } from 'react-dom';
import { 
  Shield, 
  User, 
  LogOut, 
  Activity, 
  Home,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Database,
  Rss
} from 'lucide-react';

// Tooltip Portal Component
const TooltipPortal: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node || !mounted) return;

    const show = (e: MouseEvent) => {
      const rect = node.getBoundingClientRect();
      setPos({ x: rect.right + 12, y: rect.top + rect.height / 2 });
      setVisible(true);
    };
    const hide = () => {
      setVisible(false);
    };

    node.addEventListener('mouseenter', show);
    node.addEventListener('mouseleave', hide);
    
    return () => {
      node.removeEventListener('mouseenter', show);
      node.removeEventListener('mouseleave', hide);
    };
  }, [mounted]);

  return (
    <>
      <div ref={ref} className="w-full flex justify-center" style={{ pointerEvents: 'auto' }}>
        {children}
      </div>
      {visible && mounted && typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed px-4 py-2 rounded-lg bg-gray-800 border-2 border-cyan-400/50 text-sm font-medium text-cyan-200 shadow-2xl shadow-cyan-500/30"
            style={{
              top: `${pos.y}px`,
              left: `${pos.x}px`,
              transform: 'translateY(-50%)',
              zIndex: 99999,
            }}
          >
            {content}
          </div>,
          document.body
        )
      }
    </>
  );
};

function Sidebar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

const handleLogout = () => {
  logout();
  setIsMobileOpen(false);
};

const isActive = (path: string) => {
  return router.pathname === path;
};

const menuItems = [
    ...(isAdmin ? [
      { icon: Rss, label: 'RSS Feeds', path: '/admin/rss-feeds' },
      { icon: Database, label: 'Raw Articles', path: '/admin/raw-articles' },
      { icon: Shield, label: 'Eagle Nest', path: '/admin/eagle-nest' },
      { icon: Calendar, label: 'Scheduled Emails', path: '/scheduled-emails' },
    ] : []),
  ];

  const SidebarContent = () => (
    <>
      {/* Logo/Header */}
      <div className="p-4 border-b border-gray-800/50 relative">
        <Link 
          href="/" 
          className={`flex items-center gap-3 group ${isCollapsed ? 'justify-center' : ''}`}
          onClick={() => setIsMobileOpen(false)}
        >
          <div className="relative">
            <img 
              src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiCL2GuXkm4vnkAnNz1yA4Kxlg-jjKIOdohivr_s_uCRQ5z1gYjlSJX139c7I-iR-2i3sCVQK3kmP3_ZRvvBezy_m5eB-sX9N3cn42lJbi5PveE90jfqPt4Luc52J6nU1MTIWZGkdBzT76fTVru6Wk8RafSOcgNzPumjNLay5fUxQ_YIihCHQ7Us1_-wVMV/s400/Eagleye-S.png"
              alt="EaglEye Logo"
              className="h-10 w-10 object-contain group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-cyan-400/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          {!isCollapsed && (
            <span className="font-orbitron font-bold text-lg text-white group-hover:text-cyan-300 transition-colors duration-300 whitespace-nowrap">
              EaglEye IntelDesk
            </span>
          )}
        </Link>
        
        {/* Collapse/Expand Button - Top Right */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:block absolute top-4 -right-4 p-1.5 bg-slate-900 text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all duration-300 group shadow-lg z-50"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
          ) : (
            <ChevronLeft className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
          )}
        </button>
      </div>



      {/* Navigation Menu - Icon with optional text */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 pb-6" style={{ minHeight: 0 }}>
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const linkContent = (
              <Link
                href={item.path}
                passHref
                legacyBehavior
              >
                <a
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    group relative flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-lg
                    transition-all duration-300 cursor-pointer
                    ${active 
                      ? 'bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/20' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                    }
                  `}
                  style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1 }}
                >
                  <Icon className={`h-7 w-7 transition-all duration-300 ${active ? '' : 'group-hover:scale-110'} ${isCollapsed ? '' : 'flex-shrink-0'}`} />
                  {!isCollapsed && (
                    <span className="font-medium text-sm tracking-wide whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </a>
              </Link>
            );
            
            return isCollapsed ? (
              <TooltipPortal key={item.path} content={item.label}>
                {linkContent}
              </TooltipPortal>
            ) : (
              <div key={item.path}>{linkContent}</div>
            );
          })}
        </div>
      </nav>

      {/* User & Logout */}
      {isAuthenticated && (
        <div className="border-t border-gray-800/50 p-4 space-y-3" style={{ flexShrink: 0 }}>
          {/* Admin Panel (User icon) */}
          {isAdmin && (
            isCollapsed ? (
              <TooltipPortal content="Admin Panel">
                <Link href="/admin" onClick={() => setIsMobileOpen(false)} className="w-full flex items-center justify-center p-3 rounded-lg bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 text-blue-400 hover:text-white transition-all duration-300">
                  <User className="h-6 w-6" />
                </Link>
              </TooltipPortal>
            ) : (
              <Link href="/admin" onClick={() => setIsMobileOpen(false)} className="w-full flex items-center gap-2 justify-center p-3 rounded-lg bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 text-blue-400 hover:text-white transition-all duration-300">
                <User className="h-5 w-5" />
                <span className="font-medium text-sm">Admin Panel</span>
              </Link>
            )
          )}
          {/* Logout Button */}
          {isCollapsed ? (
            <TooltipPortal content="Logout">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-3 rounded-lg bg-gradient-to-r from-red-600/20 to-red-700/20 hover:from-red-500/30 hover:to-red-600/30 border border-red-500/30 hover:border-red-400/50 text-white transition-all duration-300 group hover:shadow-lg hover:shadow-red-500/20"
              >
                <LogOut className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
              </button>
            </TooltipPortal>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-red-600/20 to-red-700/20 hover:from-red-500/30 hover:to-red-600/30 border border-red-500/30 hover:border-red-400/50 text-white transition-all duration-300 group hover:shadow-lg hover:shadow-red-500/20"
            >
              <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
              <span className="font-medium text-sm">Logout</span>
            </button>
          )}
        </div>
      )}

      {/* Removed duplicate non-clickable admin logo at the bottom */}
    </>
  );

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`
          md:hidden fixed top-0 left-0 h-full w-72 z-40
          bg-gradient-to-b from-slate-900/95 via-gray-950/95 to-slate-950/95
          backdrop-blur-xl border-r border-gray-700/50
          transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col shadow-2xl
        `}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar - Dynamic Width */}
      <aside
        className={`
          hidden md:flex fixed top-0 left-0 h-full z-40 transition-all duration-300
          bg-gradient-to-b from-slate-900/95 via-gray-950/95 to-slate-950/95
          backdrop-blur-xl border-r border-gray-700/50
          flex-col shadow-2xl overflow-visible
          ${isCollapsed ? 'w-24' : 'w-64'}
        `}
        style={{ isolation: 'unset' }}
      >
        {/* Enhanced Background Pattern */}
        <div className="absolute inset-0 opacity-10 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5"></div>
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl animate-pulse"></div>
        </div>
        
        {/* Enhanced Modern Divider - Right Edge */}
        <div className="absolute top-0 right-0 h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent" style={{ zIndex: 20 }} />
        <div className="absolute top-0 right-[-1px] h-full w-[1px] bg-gradient-to-b from-transparent via-blue-400/20 to-transparent" style={{ zIndex: 21 }} />
        
        <div className="relative z-10 h-full flex flex-col">
          <SidebarContent />
        </div>
      </aside>

      {/* Spacer for content - Dynamic width */}
      <div className={`${isCollapsed ? 'w-24' : 'w-64'} transition-all duration-300 flex-shrink-0 hidden md:block`} />
    </>
  );
}

export default Sidebar;
