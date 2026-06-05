import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SessionTimeoutManager from './SessionTimeoutManager';
import { io } from 'socket.io-client';
import {
  LayoutDashboard, Package, ShoppingCart, Store,
  LogOut, Menu, Building2, Undo2, BarChart3, Database, Settings, ArrowLeftRight, MessageSquare, KeyRound,
  Factory, X
} from 'lucide-react';
import logo from '../logo.png';


const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/analytics', label: 'Business Analytics', icon: BarChart3 },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/online-sales', label: 'Online Sales', icon: ShoppingCart },
  { to: '/shops', label: 'Customer Management', icon: Building2 },
  { to: '/offline-sales', label: 'Offline Sales', icon: Store },
  { to: '/purchases-factories', label: 'Purchases & Factory', icon: Factory },
  { to: '/returns', label: 'Returns', icon: Undo2 },
  { to: '/replacements', label: 'Replacement Management', icon: ArrowLeftRight },
  { to: '/communication', label: 'Team Communication', icon: MessageSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMention, setHasMention] = useState(false);
  const [hasAnnouncement, setHasAnnouncement] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (location.state?.message) {
      setToast(location.state.message);
      // Clear location state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!user) return;

    // Connect to WebSockets
    const socketUrl = window.location.port === '5173' ? 'http://localhost:3001' : window.location.origin;
    const socket = io(socketUrl);

    socket.emit('register', user.id);

    // Initial check for unread alerts or updates
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('inv_token');
        if (!token) return;
        const res = await fetch(`${socketUrl}/api/communication/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount ?? 0);
          setHasMention(data.hasMention ?? false);
          setHasAnnouncement(data.hasAnnouncement ?? false);
        }
      } catch (err) {
        console.error('Layout fetchUnread error:', err);
      }
    };
    fetchUnread();

    const handleUnreadUpdate = (e) => {
      if (e.detail) {
        setUnreadCount(e.detail.unreadCount ?? 0);
        setHasMention(e.detail.hasMention ?? false);
        setHasAnnouncement(e.detail.hasAnnouncement ?? false);
      }
    };
    window.addEventListener('unreadCountUpdated', handleUnreadUpdate);

    // Listen to incoming messages in real-time
    socket.on('newMessage', (msg) => {
      if (msg.senderId === user.id) return;

      const activeChannelId = localStorage.getItem('tee_active_channel_id');
      const isDMMatch = (id1, id2) => {
        if (!id1 || !id2) return false;
        const parts1 = id1.split('-').sort().join('-');
        const parts2 = id2.split('-').sort().join('-');
        return parts1 === parts2;
      };
      
      const isViewingCurrentChannel = activeChannelId && (msg.channelId === activeChannelId || isDMMatch(msg.channelId, activeChannelId));
      
      if (!isViewingCurrentChannel) {
        setUnreadCount((c) => c + 1);

        // Check if user is mentioned
        const isMentioned = msg.mentions && msg.mentions.includes(user.username);
        if (isMentioned) {
          setHasMention(true);
        }

        // Check if admin announcement
        const isAnnounce = msg.channelId === 'announcements';
        if (isAnnounce) {
          setHasAnnouncement(true);
        }

        // Sound Notification using Web Audio API
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 Note
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.18);
        } catch (e) {
          // Audio context might be blocked
        }

        // HTML5 Browser Notification for user mentions
        if (isMentioned) {
          if (Notification.permission === 'granted') {
            new Notification(`@${msg.senderName} mentioned you`, {
              body: msg.content,
              icon: '/logo.png'
            });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
          }
        }
      }
    });

    return () => {
      socket.disconnect();
      window.removeEventListener('unreadCountUpdated', handleUnreadUpdate);
    };
  }, [user]);

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!user) return;

    // Apply Theme
    if (user.appearance?.theme && user.appearance.theme !== theme) {
      setTheme(user.appearance.theme);
    }

    // Apply Font Size
    const fSize = user.appearance?.fontSize || 'medium';
    if (fSize === 'small') {
      document.documentElement.style.fontSize = '14px';
    } else if (fSize === 'large') {
      document.documentElement.style.fontSize = '18px';
    } else {
      document.documentElement.style.fontSize = '16px';
    }

    // Apply Accent and Density via dynamic style element
    const accent = user.appearance?.accentColor || 'red';
    const density = user.appearance?.density || 'comfortable';

    let primary = '#ef4444';
    let hover = '#dc2626';
    let glow = 'rgba(239, 68, 68, 0.25)';

    if (accent === 'blue') {
      primary = '#3b82f6';
      hover = '#2563eb';
      glow = 'rgba(59, 130, 246, 0.25)';
    } else if (accent === 'green') {
      primary = '#10b981';
      hover = '#059669';
      glow = 'rgba(16, 185, 129, 0.25)';
    } else if (accent === 'purple') {
      primary = '#8b5cf6';
      hover = '#7c3aed';
      glow = 'rgba(139, 92, 246, 0.25)';
    }

    let styleEl = document.getElementById('tee-appearance-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'tee-appearance-styles';
      document.head.appendChild(styleEl);
    }

    let css = `
      :root {
        --accent-primary: ${primary} !important;
        --accent-hover: ${hover} !important;
        --accent-ring: ${glow} !important;
      }
      .bg-red-650 { background-color: ${primary} !important; }
      .bg-red-600, .bg-\\[\\#EF4444\\] { background-color: ${primary} !important; }
      .hover\\:bg-red-600:hover, .hover\\:bg-red-700:hover, .hover\\:bg-red-655:hover, .hover\\:bg-red-650:hover { background-color: ${hover} !important; }
      .text-red-500, .text-red-650, .text-red-600, .text-\\[\\#EF4444\\] { color: ${primary} !important; }
      .border-red-500, .border-red-600, .border-red-650, .border-\\[\\#EF4444\\] { border-color: ${primary} !important; }
      .focus\\:ring-red-500\\/20:focus, .focus\\:ring-\\[\\#EF4444\\]\\/20:focus { --tw-ring-color: ${glow} !important; }
    `;

    if (density === 'compact') {
      css += `
        .density-compact td, .density-compact th, .density-compact .py-4, .density-compact .py-4\\.5 {
          padding-top: 0.4rem !important;
          padding-bottom: 0.4rem !important;
        }
        .density-compact .space-y-6 > * {
          margin-top: 0.75rem !important;
          margin-bottom: 0.75rem !important;
        }
        .density-compact .gap-6 {
          gap: 1rem !important;
        }
      `;
      document.documentElement.classList.add('density-compact');
    } else {
      document.documentElement.classList.remove('density-compact');
    }

    styleEl.innerHTML = css;

    return () => {
      document.documentElement.style.fontSize = '16px';
      document.documentElement.classList.remove('density-compact');
      const el = document.getElementById('tee-appearance-styles');
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    };
  }, [user?.appearance, theme, setTheme]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin' || user?.username === 'admin';
  const allowedNav = nav.filter(item => {
    if (item.to === '/purchases-factories') {
      return isAdmin;
    }
    return true;
  });
  if (isAdmin) {
    allowedNav.push({ to: '/admin', label: 'Admin Panel', icon: Database });
    allowedNav.push({ to: '/admin/password-requests', label: 'Password Change Requests', icon: KeyRound, isSubItem: true });
  }

  const isCompactSidebar = user?.appearance?.sidebar === 'compact';

  const sidebar = (
    <aside className={`flex flex-col h-full bg-zinc-950 dark:bg-[#020617] text-white border-r border-transparent dark:border-[#1E293B] transition-all duration-300 ${isCompactSidebar ? 'w-20 items-center' : 'w-64'}`}>
      {/* Logo */}
      <div className={`flex items-center justify-center border-b border-zinc-800 dark:border-[#1E293B] w-full transition-all duration-300 ${isCompactSidebar ? 'px-2 py-6' : 'px-6 py-4'}`}>
        <img 
          src={logo}  
          alt="Logo" 
          className={`w-auto object-contain transition-all duration-300 ${isCompactSidebar ? 'h-9' : 'h-20'}`} 
          style={{ filter: 'brightness(0) invert(1)' }} 
        />
      </div>

      {/* Nav */}
      <nav className={`flex-1 space-y-1 overflow-y-auto scrollbar-thin w-full transition-all duration-300 ${isCompactSidebar ? 'px-2 py-4' : 'px-3 py-4'}`}>
        {allowedNav.map(({ to, label, icon: Icon, exact, isSubItem }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setOpen(false)}
            title={isCompactSidebar ? label : ''}
            className={({ isActive }) => {
              let baseClass = `relative flex items-center rounded-lg text-sm font-medium transition-all ${
                isCompactSidebar 
                  ? 'justify-center p-2.5' 
                  : (isSubItem ? 'gap-3 pl-8 pr-3 py-2' : 'gap-3 px-3 py-2.5')
              } ${
                isActive
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-zinc-800 dark:hover:bg-[#1E293B] hover:text-white'
              }`;

              if (label === 'Team Communication') {
                if (hasMention) {
                  baseClass += ' animate-mention-pulse border border-amber-500/40';
                  if (!isActive) baseClass += ' text-amber-400 bg-amber-500/5 hover:text-amber-300';
                } else if (hasAnnouncement) {
                  baseClass += ' animate-announce-pulse border border-red-500/40';
                  if (!isActive) baseClass += ' text-red-400 bg-red-655/5 hover:text-red-300';
                } else if (unreadCount > 0) {
                  baseClass += ' animate-glow-pulse border border-red-600/30';
                  if (!isActive) baseClass += ' text-red-400/90 hover:text-red-300';
                }
              }
              return baseClass;
            }}
          >
            <Icon size={isSubItem ? 15 : 18} className="shrink-0" />
            {!isCompactSidebar && <span className={`flex-1 ${isSubItem ? 'text-xs text-slate-350 font-semibold' : ''}`}>{label}</span>}
            
            {label === 'Team Communication' && (
              <>
                {hasMention && (
                  <span className={`${isCompactSidebar ? 'absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping' : 'bg-amber-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider animate-pulse flex items-center gap-0.5'}`}>
                    {!isCompactSidebar && '⚠️ MENTION'}
                  </span>
                )}
                {hasAnnouncement && !hasMention && (
                  <span className={`${isCompactSidebar ? 'absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-ping' : 'bg-red-650 text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider animate-pulse flex items-center gap-0.5'}`}>
                    {!isCompactSidebar && '📢 ALERT'}
                  </span>
                )}
                {unreadCount > 0 && !hasMention && !hasAnnouncement && (
                  <span className={`${isCompactSidebar ? 'absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full' : 'ml-auto bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[20px] h-[20px] flex items-center justify-center text-center shadow-sm'}`}>
                    {!isCompactSidebar && (unreadCount > 999 ? '999+' : unreadCount)}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className={`border-t border-zinc-800 dark:border-[#1E293B] w-full transition-all duration-300 ${isCompactSidebar ? 'px-2 py-4 flex flex-col items-center gap-2' : 'px-4 py-4'}`}>
        <div className={`flex items-center gap-3 ${isCompactSidebar ? 'flex-col text-center' : 'mb-3'}`}>
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-zinc-800 dark:border-slate-800 shadow-sm" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          )}
          {!isCompactSidebar && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">@{user?.username}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          title={isCompactSidebar ? 'Logout' : ''}
          className={`flex items-center gap-2 rounded-lg text-sm text-slate-400 hover:bg-zinc-800 dark:hover:bg-[#1E293B] hover:text-red-400 transition-colors ${isCompactSidebar ? 'w-10 h-10 justify-center p-0' : 'w-full px-3 py-2'}`}
        >
          <LogOut size={16} className="shrink-0" />
          {!isCompactSidebar && 'Logout'}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#0F172A]">
      <SessionTimeoutManager />
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-red-650 text-white px-4 py-3 rounded-xl shadow-xl shadow-red-950/20 border border-red-500/30 transition-all duration-300 animate-slide-in">
          <span className="font-bold text-sm">{toast}</span>
          <button onClick={() => setToast(null)} className="hover:text-red-200 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
      {/* Desktop sidebar */}
      <div className={`hidden lg:flex ${isCompactSidebar ? 'lg:w-20' : 'lg:w-64'} lg:flex-shrink-0 flex-col transition-all duration-300`}>{sidebar}</div>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 z-50">{sidebar}</div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-[#1E293B] shadow-sm">
          <button onClick={() => setOpen(true)} className="p-1 rounded-lg text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1E293B]">
            <Menu size={22} />
          </button>
          <span className="font-semibold text-slate-800 dark:text-[#F8FAFC]">StockTrack</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#F8FAFC] dark:bg-[#0F172A]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
