import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SessionTimeoutManager from './SessionTimeoutManager';
import ErrorBoundary from './ErrorBoundary';
import { io } from 'socket.io-client';
import {
  LayoutDashboard, Package, ShoppingCart, Store,
  LogOut, Menu, Building2, Undo2, BarChart3, Database, Settings, ArrowLeftRight, MessageSquare, KeyRound,
  Factory, X, Box, Bell, AlertTriangle
} from 'lucide-react';
import logo from '../logo.png';
import { api } from '../api';
import { initFCM } from '../firebase-messaging';


const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/analytics', label: 'Business Analytics', icon: BarChart3 },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/products', label: 'Products Performance', icon: Package, isSubItem: true, exact: true },
  { to: '/products/details', label: 'Products Management', icon: Box, isSubItem: true },
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

  // Unified PWA & Notification system states
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [chatNotifications, setChatNotifications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const notifTimersRef = React.useRef({});
  const myChannelIdsRef = React.useRef(new Set());

  // Listen to service worker navigate events
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const handleSWMessage = (event) => {
        if (event.data && event.data.type === 'NAVIGATE') {
          navigate(event.data.url);
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      };
    }
  }, [navigate]);

  // Request notification permissions after login
  useEffect(() => {
    if (user) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().then(perm => {
            if (perm === 'denied') {
              setShowPermissionBanner(true);
            } else {
              initFCM(user.id);
            }
          });
        } else if (Notification.permission === 'denied') {
          setShowPermissionBanner(true);
        } else {
          initFCM(user.id);
        }
      }
    }
  }, [user]);

  // Connection state listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Capture install prompts
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('tee_install_banner_dismissed') === 'true';
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA Install Choice: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    localStorage.setItem('tee_install_banner_dismissed', 'true');
  };

  // Toast Notification utilities
  const startNotifTimer = (msgId) => {
    if (notifTimersRef.current[msgId]) {
      clearTimeout(notifTimersRef.current[msgId]);
    }
    notifTimersRef.current[msgId] = setTimeout(() => {
      dismissNotification(msgId);
    }, 6000);
  };

  const dismissNotification = (msgId) => {
    if (notifTimersRef.current[msgId]) {
      clearTimeout(notifTimersRef.current[msgId]);
      delete notifTimersRef.current[msgId];
    }
    setChatNotifications((prev) => prev.filter(n => n.id !== msgId));
  };

  const addNotification = (msg) => {
    setChatNotifications((prev) => {
      if (prev.some(n => n.id === msg.id)) return prev;
      startNotifTimer(msg.id);
      return [msg, ...prev].slice(0, 5);
    });
  };

  const handleMouseEnterNotif = (msgId) => {
    if (notifTimersRef.current[msgId]) {
      clearTimeout(notifTimersRef.current[msgId]);
      notifTimersRef.current[msgId] = null;
    }
  };

  const handleMouseLeaveNotif = (msgId) => {
    startNotifTimer(msgId);
  };

  const formatNotifTime = (createdAt) => {
    if (!createdAt) return 'Just now';
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return new Date(createdAt).toLocaleDateString();
  };

  const handleNotifClick = async (msg) => {
    try {
      const token = localStorage.getItem('inv_token');
      if (token) {
        const socketUrl = import.meta.env.VITE_API_URL || (window.location.port === '5173' ? 'http://localhost:3001' : window.location.origin);
        await fetch(`${socketUrl}/api/communication/read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ channelId: msg.channelId })
        });
      }
    } catch (e) {
      console.error('Error marking as read on click:', e);
    }

    localStorage.setItem('tee_goto_channel_id', msg.channelId);
    window.dispatchEvent(new CustomEvent('tee_goto_channel', { detail: { channelId: msg.channelId } }));

    // Re-fetch count
    try {
      const token = localStorage.getItem('inv_token');
      if (token) {
        const socketUrl = import.meta.env.VITE_API_URL || (window.location.port === '5173' ? 'http://localhost:3001' : window.location.origin);
        const res = await fetch(`${socketUrl}/api/communication/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount ?? 0);
          setHasMention(data.hasMention ?? false);
          setHasAnnouncement(data.hasAnnouncement ?? false);
        }
      }
    } catch (err) {
      console.error('Error updating unread count:', err);
    }

    dismissNotification(msg.id);
    navigate('/communication');
  };

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
    const socketUrl = import.meta.env.VITE_API_URL || (window.location.port === '5173' ? 'http://localhost:3001' : window.location.origin);
    const socket = io(socketUrl);
    socket.on('connect', () => {
      socket.emit('register', user.id);
    });
    if (socket.connected) {
      socket.emit('register', user.id);
    }

    // Fetch channels for member check cache
    const fetchMyChannels = async () => {
      try {
        const token = localStorage.getItem('inv_token');
        if (!token) return;
        const res = await fetch(`${socketUrl}/api/communication/channels`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const chans = await res.json();
          chans.forEach(c => {
            if (!c.members || c.members.length === 0 || c.members.includes(user.id)) {
              myChannelIdsRef.current.add(c.id);
            }
          });
        }
      } catch (err) {
        console.error('Layout fetchMyChannels error:', err);
      }
    };
    fetchMyChannels();

    // Fetch stored unread messages for sequential staggering on login
    const fetchUnreadMsgs = async () => {
      try {
        const token = localStorage.getItem('inv_token');
        if (!token) return;
        const res = await fetch(`${socketUrl}/api/communication/unread-messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const msgs = await res.json();
          // Stagger displaying notifications sequentially
          msgs.forEach((msg, idx) => {
            setTimeout(() => {
              addNotification(msg);
            }, idx * 400); // 400ms stagger delay
          });
        }
      } catch (err) {
        console.error('Layout fetchUnreadMsgs error:', err);
      }
    };
    fetchUnreadMsgs();

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

      // Filter relevance based on user membership
      const isDM = msg.channelId.includes('-');
      const isMyDM = isDM && msg.channelId.includes(user.id);
      const isMyGroupChannel = !isDM && myChannelIdsRef.current.has(msg.channelId);

      if (!isMyDM && !isMyGroupChannel) {
        // Ignore messages not addressed to current user
        return;
      }

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

        // Trigger vertical notification popup toast!
        addNotification(msg);

        // Sound Notification using Web Audio API (if not disabled by settings)
        if (user.appearance?.soundNotification !== false) {
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

    // Fetch notifications list
    const fetchNotificationsList = async () => {
      try {
        const data = await api.getNotifications();
        setNotifications(data);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
    fetchNotificationsList();

    // Listen to new_notification socket event
    socket.on('new_notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);

      // Sound double-chime trigger
      if (user.appearance?.soundNotification !== false) {
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const playTone = (freq, start, duration) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.15, start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
            osc.start(start);
            osc.stop(start + duration);
          };
          playTone(660, audioCtx.currentTime, 0.15);
          playTone(660, audioCtx.currentTime + 0.12, 0.15);
        } catch (e) {
          console.warn('Double chime audio play failed:', e);
        }
      }

      // Show native system notification via service worker
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(notif.title, {
            body: notif.body,
            icon: '/icon-192.png',
            badge: '/favicon.png',
            data: { clickAction: notif.data?.clickAction || '/' }
          });
        });
      }
    });

    // Also listen to channelCreated to update myChannelIdsRef cache dynamically
    socket.on('channelCreated', (newChan) => {
      if (!newChan.members || newChan.members.length === 0 || newChan.members.includes(user.id)) {
        myChannelIdsRef.current.add(newChan.id);
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
        {allowedNav.map(({ to, label, icon: Icon, exact, isSubItem }) => {
          const displayLabel = (label === 'Team Communication' && unreadCount > 0)
            ? `${label} (${unreadCount})`
            : label;

          return (
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
                    ? 'bg-red-650 text-white shadow-md'
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
              {!isCompactSidebar && <span className={`flex-1 ${isSubItem ? 'text-xs text-slate-350 font-semibold' : ''}`}>{displayLabel}</span>}
            
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
        ); })}
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
      
      {/* PWA Offline Overlay */}
      {!isOnline && (
        <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[#0B1220] p-6 text-center">
          <div className="relative mb-6">
            <img 
              src={logo} 
              alt="TEE Logo" 
              className="h-24 w-auto object-contain animate-pulse" 
              style={{ filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.4)) brightness(0) invert(1)' }}
            />
          </div>
          <h2 className="text-2xl font-black text-slate-100 mb-2 tracking-tight">TEE Inventory is Offline</h2>
          <p className="text-slate-400 text-sm max-w-sm mb-6 leading-relaxed">
            TEE Inventory is currently offline. Please reconnect to continue.
          </p>
          <div className="flex items-center gap-2 text-xs text-red-500 font-bold uppercase tracking-wider bg-red-950/20 border border-red-500/20 rounded-full px-4 py-1.5 animate-pulse">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            Waiting for Connection
          </div>
        </div>
      )}

      {/* PWA Custom Install Banner */}
      {showInstallBanner && deferredPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 z-[99999] w-[calc(100%-2rem)] max-w-sm bg-[#0B0F19]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 transition-all duration-300 animate-slide-up">
          <div className="flex items-start gap-3">
            <img 
              src={logo} 
              alt="TEE Logo" 
              className="h-10 w-10 object-contain rounded-xl bg-slate-900 border border-slate-800 p-1.5 shrink-0" 
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-100">Install TEE Inventory App</h4>
              <p className="text-xs text-slate-400 mt-0.5 leading-normal">Access TEE ERP directly from your desktop or home screen with native full-screen offline mode.</p>
            </div>
            <button onClick={handleDismissInstall} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-2.5">
            <button 
              onClick={handleInstallClick}
              className="flex-1 rounded-xl bg-red-650 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 active:scale-[0.98]"
            >
              Install Now
            </button>
            <button 
              onClick={handleDismissInstall}
              className="flex-1 rounded-xl border border-slate-850 bg-transparent py-2.5 text-xs font-bold text-slate-400 transition-all hover:border-slate-700 hover:bg-slate-900 hover:text-slate-200 active:scale-[0.98]"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Custom Team Communication Toast Notifications Stack */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full md:w-80 pointer-events-none">
        {chatNotifications.map((notif) => (
          <div 
            key={notif.id}
            onMouseEnter={() => handleMouseEnterNotif(notif.id)}
            onMouseLeave={() => handleMouseLeaveNotif(notif.id)}
            onClick={() => handleNotifClick(notif)}
            className="pointer-events-auto cursor-pointer relative w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0F172A]/85 backdrop-blur-md p-4 text-left shadow-2xl shadow-slate-950/60 hover:scale-[1.02] hover:border-slate-700 hover:shadow-red-500/5 transition-all duration-300 flex gap-3 animate-slide-up"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-600" />
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-sm font-black text-white shadow-md shrink-0 border border-red-500/20 select-none">
              {notif.senderName?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-xs font-bold tracking-wide text-slate-100">{notif.senderName}</span>
                <span className="text-[9px] font-medium text-slate-500">{formatNotifTime(notif.createdAt)}</span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate pr-4">
                {notif.content || "Sent an attachment"}
              </p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                dismissNotification(notif.id);
              }}
              className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 p-0.5 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

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
        {/* Unified Header */}
        <header className="flex h-16 items-center justify-between px-4 lg:px-6 bg-white dark:bg-[#0B1220] border-b border-slate-200 dark:border-[#1E293B] shadow-sm z-30 select-none">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="lg:hidden p-1 rounded-lg text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1E293B]">
              <Menu size={22} />
            </button>
            <span className="font-black text-slate-805 dark:text-[#F8FAFC] text-base tracking-tight uppercase">TEE ERP</span>
          </div>

          {/* Right Header Panel - Notification Bell */}
          <div className="relative flex items-center gap-2">
            <button 
              id="notification-bell-btn"
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1E293B] hover:text-slate-805 dark:hover:text-[#F8FAFC] transition-all"
            >
              <Bell size={19} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-650 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white dark:border-[#0B1220] animate-pulse">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            {/* Glassmorphic Dropdown Panel */}
            {showNotificationsDropdown && (
              <div 
                id="notifications-dropdown-menu"
                className="absolute right-0 top-12 w-80 sm:w-96 bg-slate-900/95 dark:bg-[#0B1220]/95 backdrop-blur-md border border-slate-850 rounded-2xl shadow-2xl p-4 z-40 max-h-[480px] flex flex-col animate-fadeIn"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
                  <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                    <Bell size={14} className="text-red-500" /> Notifications
                  </h3>
                  <div className="flex gap-2">
                    {notifications.some(n => !n.read) && (
                      <button 
                        onClick={async () => {
                          try {
                            await api.markAllNotificationsRead();
                            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                          } catch (err) { console.error(err); }
                        }}
                        className="text-[10px] font-black text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider bg-transparent border-none outline-none cursor-pointer"
                      >
                        Mark All Read
                      </button>
                    )}
                  </div>
                </div>

                {/* Notifications list */}
                <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                      <Bell size={28} className="opacity-25 mb-1.5" />
                      <span className="text-xs font-semibold text-slate-400">No notifications found</span>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const handleClick = async () => {
                        try {
                          await api.markNotificationRead(notif.id);
                          setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                        } catch (err) { console.error(err); }

                        setShowNotificationsDropdown(false);
                        const redirectUrl = notif.data?.clickAction || '/';
                        
                        if (notif.type === 'teamMessage' && notif.data?.channelId) {
                          localStorage.setItem('tee_goto_channel_id', notif.data.channelId);
                          window.dispatchEvent(new CustomEvent('tee_goto_channel', { detail: { channelId: notif.data.channelId } }));
                        }
                        
                        navigate(redirectUrl);
                      };

                      const handleDeleteNotif = async (e) => {
                        e.stopPropagation();
                        try {
                          await api.deleteNotification(notif.id);
                          setNotifications(prev => prev.filter(n => n.id !== notif.id));
                        } catch (err) { console.error(err); }
                      };

                      return (
                        <div 
                          key={notif.id}
                          onClick={handleClick}
                          className={`group relative flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer hover:bg-slate-800/40 hover:border-slate-800 transition-all ${
                            notif.read ? 'bg-transparent border-transparent text-slate-400' : 'bg-slate-955/20 border-slate-900 text-slate-100 font-bold'
                          }`}
                        >
                          {!notif.read && (
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-red-500 rounded-full" />
                          )}
                          <div className="flex-1 pl-1.5 min-w-0 text-left">
                            <p className="text-xs font-bold leading-normal truncate">{notif.title}</p>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-0.5 whitespace-pre-wrap">{notif.body}</p>
                            <span className="text-[9px] text-slate-500 block mt-1.5">{formatNotifTime(notif.createdAt)}</span>
                          </div>
                          <button 
                            onClick={handleDeleteNotif}
                            className="opacity-0 group-hover:opacity-100 absolute right-2 top-2 p-1 text-slate-550 hover:text-red-400 rounded transition-all bg-transparent border-none cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Permission Denied Warning Banner */}
        {showPermissionBanner && (
          <div className="bg-amber-600/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-200 select-none">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500 shrink-0" />
              <span>Enable notifications to receive sales and payment alerts.</span>
            </div>
            <button 
              onClick={() => {
                alert("To enable notifications, please click the lock/settings icon in your browser address bar and allow Notification permissions for this site.");
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer border-none"
            >
              Enable Now
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#F8FAFC] dark:bg-[#0F172A]">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
