import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

// Time constants in milliseconds
const INACTIVITY_LIMIT = 60 * 60 * 1000; // 60 minutes
const WARNING_THRESHOLD = 55 * 60 * 1000; // 55 minutes (show warning for last 5 minutes)
const THROTTLE_TIME = 2000; // 2 seconds throttle for writing to localStorage

export default function SessionTimeoutManager() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 300 seconds = 5 minutes
  const lastWriteRef = useRef(0);

  // Helper to record activity
  const recordActivity = () => {
    if (!user) return;
    const now = Date.now();
    // Throttle writes to localStorage to prevent performance degradation
    if (now - lastWriteRef.current > THROTTLE_TIME) {
      localStorage.setItem('tee_last_activity', now.toString());
      lastWriteRef.current = now;
    }
  };

  // Attach event listeners for user activity
  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      return;
    }

    // Initialize activity timestamp on mount if not present
    if (!localStorage.getItem('tee_last_activity')) {
      localStorage.setItem('tee_last_activity', Date.now().toString());
    }

    const events = [
      'mousemove',
      'mousedown',
      'click',
      'keydown',
      'scroll',
      'input',
      'change',
      'touchstart'
    ];

    events.forEach((event) => {
      window.addEventListener(event, recordActivity, { passive: true });
    });

    // Main interval to check for inactivity
    const interval = setInterval(() => {
      // If user logs out elsewhere, stop check
      const currentToken = localStorage.getItem('inv_token');
      if (!currentToken || !user) {
        setShowWarning(false);
        return;
      }

      const lastActivityStr = localStorage.getItem('tee_last_activity');
      const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : Date.now();
      const elapsed = Date.now() - lastActivity;

      if (elapsed >= INACTIVITY_LIMIT) {
        // Log out immediately
        localStorage.setItem(
          'tee_session_expired_msg',
          'Session expired due to inactivity. Please login again.'
        );
        logout();
        navigate('/login', {
          state: { message: 'Session expired due to inactivity. Please login again.' }
        });
      } else if (elapsed >= WARNING_THRESHOLD) {
        // Show warning popup
        const remainingSeconds = Math.max(
          0,
          Math.ceil((INACTIVITY_LIMIT - elapsed) / 1000)
        );
        setTimeLeft(remainingSeconds);
        setShowWarning(true);
      } else {
        // Reset warning if activity occurred (possibly in another tab)
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, recordActivity);
      });
      clearInterval(interval);
    };
  }, [user, logout, navigate]);

  // Handle stay logged in action
  const handleKeepSession = () => {
    const now = Date.now();
    localStorage.setItem('tee_last_activity', now.toString());
    lastWriteRef.current = now;
    setShowWarning(false);
  };

  // Handle manual logout from warning
  const handleLogoutNow = () => {
    logout();
    navigate('/login');
  };

  // Format time (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-[#0B0F19]/95 p-6 text-center shadow-2xl shadow-red-950/30 transition-transform duration-300 scale-100">
        {/* Top glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-red-600 to-red-500" />
        
        {/* Header alert icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/20 bg-red-950/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse">
          <ShieldAlert size={28} />
        </div>

        {/* Title & Message */}
        <h3 className="mb-2 text-xl font-bold tracking-tight text-slate-100">
          Session Expiring Soon
        </h3>
        <p className="mb-6 text-sm leading-relaxed text-slate-400">
          Your session will expire in 5 minutes due to inactivity. Please click below to keep your session active.
        </p>

        {/* Countdown display */}
        <div className="mb-6 rounded-xl border border-slate-800/80 bg-slate-950/50 py-4">
          <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Time Remaining
          </div>
          <div className="mt-1 font-mono text-4xl font-extrabold text-red-500 tracking-wider">
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleKeepSession}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 hover:shadow-red-600/30 active:scale-[0.98]"
          >
            Stay Logged In
          </button>
          <button
            onClick={handleLogoutNow}
            className="w-full rounded-xl border border-slate-800 bg-transparent py-3 text-sm font-bold text-slate-400 transition-all hover:border-slate-700 hover:bg-slate-900 hover:text-slate-200 active:scale-[0.98]"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
}
