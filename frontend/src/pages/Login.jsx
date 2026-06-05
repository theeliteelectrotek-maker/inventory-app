import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Eye, EyeOff, Loader2, ShieldCheck, ShieldAlert, AlertTriangle,
  ChevronLeft, ChevronRight, Package, BarChart3, Users, Undo2, ArrowLeftRight, Lock
} from 'lucide-react';
import logo from '../logo.png';

// Premium products of TEE
const PRODUCTS = [
  {
    id: 1,
    name: 'TEE Stereo Musical Ding-Dong Bell',
    category: 'Bells & Buzzers',
    description: 'Elegant door bell designed with high-quality copper windings and dust-proof modular casing.',
    specs: ['Stereo Ding-Dong Tone', 'Modular Fit', 'AC 240V Rated', 'Pure Copper Coil']
  },
  {
    id: 2,
    name: 'TEE High-Decibel Modular Buzzer',
    category: 'Bells & Buzzers',
    description: 'Premium modular warning buzzer with loud acoustic resonance and heavy-duty flame-retardant housing.',
    specs: ['95dB Loud Sound', 'Sleek Design', 'Continuous Rating', 'Shock Safe']
  },
  {
    id: 3,
    name: 'TEE Red Round LED Indicator Light',
    category: 'LED Indicators',
    description: 'Super-bright neon modular indicators with low power draw and ultra-long operational lifespan.',
    specs: ['High-Intensity LED', 'Wide 240V Range', 'Touch Proof IP20', '50,000 Hrs Life']
  },
  {
    id: 4,
    name: 'TEE SafeLine MCB Changeover Switch',
    category: 'MCB Changeover Switches',
    description: 'Heavy duty changeover switch engineered for smooth load transfer between grid power and backup generators.',
    specs: ['63A Rating', 'Arc-Chute Chamber', 'Flame-Retardant Cover', 'Dual Source Fit']
  },
  {
    id: 5,
    name: 'TEE Power-Pro Spike Guard Extension Board',
    category: 'Power Strips',
    description: 'Heavy duty power strips featuring multi-plug sockets, thermal overload protection, and child safety shutters.',
    specs: ['Child Safety Shutters', 'Thermal Reset Switch', 'High-Conductivity Brass', '6A Multi-Sockets']
  }
];

// Features strip items
const FEATURES = [
  { label: 'Inventory Tracking', desc: 'Real-time stock reconciliation', icon: Package },
  { label: 'Sales Analytics', desc: 'Deep business insights', icon: BarChart3 },
  { label: 'Customer Management', desc: 'CRM & ledger logging', icon: Users },
  { label: 'Returns Management', desc: 'Multi-product return inspections', icon: Undo2 },
  { label: 'Replacement Claims', desc: 'Warranty dispatch tracker', icon: ArrowLeftRight }
];

// Particle canvas background for premium motion effect
function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles = [];
    const particleCount = 45;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.8 + 0.8,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.4 + 0.1
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce borders
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 68, 68, ${p.alpha})`; // TEE Red color glow
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgb(239, 68, 68)';
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow for efficiency
      });

      // Draw light connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.12 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-50 z-0" />;
}

// Circuit Traces background overlay SVG
function CircuitTraces() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.12] pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="circuit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#ef4444" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0.1" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* Static circuit line guides */}
      <path d="M 0,150 H 200 L 280,230 H 500 L 560,170 V 0" fill="none" stroke="rgba(239, 68, 68, 0.15)" strokeWidth="1.5" />
      {/* Glowing energy flow path overlay */}
      <path d="M 0,150 H 200 L 280,230 H 500 L 560,170 V 0" fill="none" stroke="url(#circuit-grad)" strokeWidth="1.5" className="animate-energy-flow" />

      <path d="M 120,600 H 320 L 400,520 H 700" fill="none" stroke="rgba(239, 68, 68, 0.1)" strokeWidth="1.2" />
      <path d="M 120,600 H 320 L 400,520 H 700" fill="none" stroke="url(#circuit-grad)" strokeWidth="1.2" className="animate-energy-flow" style={{ animationDuration: '4.5s' }} />

      <path d="M 1400,250 H 1150 L 1080,320 H 850 L 780,390 V 900" fill="none" stroke="rgba(239, 68, 68, 0.15)" strokeWidth="1.5" />
      <path d="M 1400,250 H 1150 L 1080,320 H 850 L 780,390 V 900" fill="none" stroke="url(#circuit-grad)" strokeWidth="1.5" className="animate-energy-flow" style={{ animationDuration: '5.5s' }} />

      <path d="M 1600,700 H 1350 L 1280,630 H 1000" fill="none" stroke="rgba(239, 68, 68, 0.1)" strokeWidth="1.2" />
      <path d="M 1600,700 H 1350 L 1280,630 H 1000" fill="none" stroke="url(#circuit-grad)" strokeWidth="1.2" className="animate-energy-flow" style={{ animationDuration: '3.8s' }} />
      
      {/* Circle Junction nodes */}
      <circle cx="280" cy="230" r="3.5" fill="#ef4444" filter="url(#glow)" />
      <circle cx="500" cy="230" r="3.5" fill="#ef4444" filter="url(#glow)" />
      <circle cx="400" cy="520" r="3" fill="#ef4444" />
      <circle cx="1080" cy="320" r="3.5" fill="#ef4444" filter="url(#glow)" />
      <circle cx="780" cy="390" r="3.5" fill="#ef4444" filter="url(#glow)" />
    </svg>
  );
}

// Telemetry Stats Component with mount animation
function TelemetryStats() {
  const [shops, setShops] = useState(0);
  const [products, setProducts] = useState(0);
  const [orders, setOrders] = useState(0);
  const [liveRate, setLiveRate] = useState(0);

  useEffect(() => {
    const duration = 1500; // 1.5s
    const steps = 65;
    const intervalTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const t = progress * (2 - progress); // Ease-out quadratic

      setShops(Math.floor(t * 1500));
      setProducts(Math.floor(t * 25000));
      setOrders(Math.floor(t * 150000));
      setLiveRate((t * 99.9).toFixed(1));

      if (step >= steps) {
        clearInterval(timer);
        setShops(1500);
        setProducts(25000);
        setOrders(150000);
        setLiveRate(99.9);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 bg-slate-950/20 border border-slate-900/60 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden group/stats">
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
      
      <div className="text-center md:text-left border-r border-slate-900 last:border-0 pr-2">
        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">
          Registered Shops
        </span>
        <span className="text-2xl font-black text-slate-100 block mt-1 tracking-tight">
          {formatNumber(shops)}+
        </span>
      </div>
      
      <div className="text-center md:text-left border-r border-slate-900 last:border-0 pr-2 pl-2">
        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">
          Products Managed
        </span>
        <span className="text-2xl font-black text-slate-100 block mt-1 tracking-tight">
          {formatNumber(products)}+
        </span>
      </div>
      
      <div className="text-center md:text-left border-r border-slate-900 last:border-0 pr-2 pl-2">
        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">
          Orders Processed
        </span>
        <span className="text-2xl font-black text-slate-100 block mt-1 tracking-tight">
          {formatNumber(orders)}+
        </span>
      </div>
      
      <div className="text-center md:text-left pl-2">
        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">
          Inventory Monitored
        </span>
        <span className="text-2xl font-black text-red-500 block mt-1 tracking-tight flex items-center justify-center md:justify-start gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
          {liveRate}%
        </span>
      </div>
    </div>
  );
}

// Showcase Carousel Component
function ProductCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % PRODUCTS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handlePrev = (e) => {
    e.stopPropagation();
    setIndex((prev) => (prev === 0 ? PRODUCTS.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setIndex((prev) => (prev + 1) % PRODUCTS.length);
  };

  return (
    <div className="relative rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-md p-6 overflow-hidden shadow-2xl group/carousel">
      {/* Top micro line */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

      {/* Slide Content */}
      <div key={index} className="animate-fadeIn min-h-[140px] flex flex-col justify-between relative z-10">
        <div>
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest bg-red-950/30 border border-red-500/20 px-2 py-0.5 rounded">
            {PRODUCTS[index].category}
          </span>
          <h3 className="text-lg font-bold text-slate-100 mt-2.5 mb-1.5 transition-all duration-300">
            {PRODUCTS[index].name}
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed mb-4 transition-all duration-300">
            {PRODUCTS[index].description}
          </p>
        </div>

        {/* Specs Badge List */}
        <div className="flex flex-wrap gap-1.5">
          {PRODUCTS[index].specs.map((spec) => (
            <span key={spec} className="text-[10px] bg-slate-900/60 border border-slate-800/80 text-slate-300 px-2.5 py-0.5 rounded-full font-medium">
              {spec}
            </span>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-5 border-t border-slate-900/80 pt-3 relative z-10">
        {/* Pagination Dots */}
        <div className="flex gap-1.5">
          {PRODUCTS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === index ? 'w-5 bg-red-500' : 'w-1.5 bg-slate-800 hover:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={handlePrev}
            className="p-1 rounded-lg border border-slate-850 bg-slate-950/80 hover:bg-slate-900 hover:border-slate-750 text-slate-400 hover:text-slate-100 transition-all active:scale-95"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={handleNext}
            className="p-1 rounded-lg border border-slate-850 bg-slate-950/80 hover:bg-slate-900 hover:border-slate-750 text-slate-400 hover:text-slate-100 transition-all active:scale-95"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Features Strip Component
function FeatureStrip() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5">
      {FEATURES.map((feat) => {
        const Icon = feat.icon;
        return (
          <div key={feat.label} className="flex flex-col p-3 rounded-xl border border-slate-900 bg-slate-950/20 hover:border-red-500/20 hover:bg-red-950/5 transition-all duration-300 group">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-red-500 group-hover:border-red-500/30 flex items-center justify-center mb-2.5 transition-all">
              <Icon size={15} />
            </div>
            <h4 className="text-xs font-semibold text-slate-300 group-hover:text-slate-100 transition-colors">
              {feat.label}
            </h4>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              {feat.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('tee_remember_me') === 'true';
  });

  const [form, setForm] = useState(() => {
    const savedUser = localStorage.getItem('tee_remembered_username') || '';
    return { username: savedUser, password: '' };
  });

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expiredMessage, setExpiredMessage] = useState('');

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('tee_remembered_username');
    if (savedUser) {
      passwordRef.current?.focus();
    } else {
      usernameRef.current?.focus();
    }
  }, []);

  // Check for expired session messages
  useEffect(() => {
    const localMsg = localStorage.getItem('tee_session_expired_msg');
    if (localMsg) {
      setExpiredMessage(localMsg);
      localStorage.removeItem('tee_session_expired_msg');
    } else if (location.state?.message) {
      setExpiredMessage(location.state.message);
    }
  }, [location]);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
    setExpiredMessage('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setExpiredMessage('');
    try {
      await login(form.username, form.password);
      // Reset activity timestamp on login success
      localStorage.setItem('tee_last_activity', Date.now().toString());
      if (rememberMe) {
        localStorage.setItem('tee_remember_me', 'true');
        localStorage.setItem('tee_remembered_username', form.username);
      } else {
        localStorage.removeItem('tee_remember_me');
        localStorage.removeItem('tee_remembered_username');
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-12 bg-[#020617] text-slate-100 relative overflow-hidden font-sans">
      
      {/* Left Panel: Desktop Showcase */}
      <div className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col justify-between p-12 relative border-r border-slate-900 bg-slate-950/30">
        {/* Background visual components */}
        <ParticleCanvas />
        <CircuitTraces />

        {/* Brand Header */}
        <div className="flex items-center gap-3.5 relative z-10">
          <img src={logo} alt="TEE Logo" style={{ filter: 'brightness(0) invert(1)' }} className="h-12 w-auto object-contain" />
          <span className="font-extrabold text-sm tracking-widest text-slate-200 uppercase">
            The Elite Electrotek ERP
          </span>
        </div>

        {/* Carousel & Telemetry Stats Showcase Area */}
        <div className="my-auto py-6 relative z-10 max-w-2xl w-full animate-fadeIn">
          <span className="text-[11px] font-black text-red-500 uppercase tracking-widest bg-red-950/30 border border-red-500/20 px-3 py-1 rounded mb-4 inline-block">
            India's Smart Electrical Distribution Platform
          </span>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-100 mb-4 leading-tight">
            Powering Modern <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-400">Electrical Businesses</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-lg">
            Manage your manufacturing, warehouse inventory, dealers networks, replacement claims, and operations securely in a unified enterprise environment.
          </p>

          <ProductCarousel />

          <TelemetryStats />
        </div>

        {/* Feature strip at bottom */}
        <div className="relative z-10 border-t border-slate-900/60 pt-6 w-full">
          <FeatureStrip />
        </div>
      </div>

      {/* Right Panel: Login Credentials card */}
      <div className="flex-1 lg:col-span-5 xl:col-span-4 flex flex-col items-center justify-center p-6 relative bg-slate-950/60">
        
        {/* Canvas & Traces overlay for Mobile view */}
        <div className="lg:hidden absolute inset-0">
          <ParticleCanvas />
          <CircuitTraces />
        </div>

        <div className="w-full max-w-md relative z-10 animate-fadeIn">
          {/* Card glow behind */}
          <div className="absolute -inset-2 bg-gradient-to-r from-red-600 to-red-900 rounded-2xl blur-3xl opacity-[0.08] pointer-events-none" />

          {/* Premium Glassmorphism Card */}
          <div className="bg-[#0B0F19]/65 border border-white/[0.08] rounded-3xl p-8 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all duration-500 hover:border-red-500/25 hover:shadow-[0_0_50px_rgba(239,68,68,0.12)] relative overflow-hidden group">
            
            {/* Logo Watermark grid inside the card */}
            <div 
              className="absolute inset-0 opacity-[0.012] pointer-events-none z-0 bg-repeat bg-center" 
              style={{ backgroundImage: `url(${logo})`, backgroundSize: '70px 70px' }} 
            />
            
            {/* Version Badge */}
            <div className="flex justify-center mb-6 relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-red-950/30 text-red-400 border border-red-500/20 tracking-wider uppercase shadow-[0_0_12px_rgba(239,68,68,0.15)]">
                <span className="w-1 h-1 rounded-full bg-red-500 animate-ping" />
                TEE ERP Enterprise Edition
              </span>
            </div>

            {/* Header / Prominent Original TEE Logo */}
            <div className="text-center mb-8 relative z-10">
              {/* Restored Original Logo with brand red glow and White Contrast */}
              <div className="relative flex items-center justify-center w-28 h-28 mx-auto mb-4 group">
                <div className="absolute inset-0 rounded-full bg-red-650/15 blur-xl group-hover:bg-red-500/25 transition-all duration-500 shadow-[0_0_35px_rgba(239,68,68,0.25)]" />
                <div className="absolute inset-2 rounded-full border border-dashed border-red-500/10 animate-[spin_25s_linear_infinite]" />
                
                <img 
                  src={logo} 
                  alt="TEE Logo" 
                  style={{ filter: 'brightness(0) invert(1) drop-shadow(0 0 10px rgba(239, 68, 68, 0.45))' }}
                  className="h-20 w-auto object-contain relative z-10 transition-transform duration-300 group-hover:scale-105" 
                />
              </div>

              <h2 className="text-2xl font-black text-slate-100 tracking-tight">The Elite Electrotek</h2>
              <p className="text-slate-400 text-xs mt-1">Powering Smart Electrical Distribution</p>
            </div>

            {/* Alerts & Messages */}
            {expiredMessage && (
              <div className="mb-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-4 py-3 rounded-xl flex items-start gap-2 shadow-[0_0_15px_rgba(245,158,11,0.05)] animate-pulse relative z-10">
                <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
                <div>{expiredMessage}</div>
              </div>
            )}

            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl flex items-start gap-2 shadow-[0_0_15px_rgba(239,68,68,0.05)] relative z-10">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4.5 relative z-10">
              
              {/* Floating label Username */}
              <div className="relative">
                <input
                  ref={usernameRef}
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder=" "
                  autoComplete="username"
                  required
                  className="peer w-full px-4 pt-6 pb-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/30 focus:shadow-[0_0_12px_rgba(239,68,68,0.12)] transition-all duration-200 placeholder-transparent"
                />
                <label className="absolute left-4 top-2 text-[10px] font-bold text-slate-500 transition-all duration-200 pointer-events-none transform -translate-y-0 scale-100 origin-[0] peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-500 peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-red-400">
                  Username
                </label>
              </div>

              {/* Floating label Password */}
              <div className="relative">
                <input
                  ref={passwordRef}
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder=" "
                  autoComplete="current-password"
                  required
                  className="peer w-full px-4 pt-6 pb-2 pr-11 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/30 focus:shadow-[0_0_12px_rgba(239,68,68,0.12)] transition-all duration-200 placeholder-transparent"
                />
                <label className="absolute left-4 top-2 text-[10px] font-bold text-slate-500 transition-all duration-200 pointer-events-none transform -translate-y-0 scale-100 origin-[0] peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-500 peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-red-400">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-[22px] text-slate-500 hover:text-slate-350 transition-colors p-1"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Remember Me Option */}
              <div className="flex items-center justify-between mt-2 mb-4">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none group/checkbox">
                  <input 
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ${
                    rememberMe 
                      ? 'bg-red-600 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.35)]' 
                      : 'border-slate-800 bg-slate-950/40 group-hover/checkbox:border-slate-600'
                  }`}>
                    {rememberMe && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-400 group-hover/checkbox:text-slate-200 transition-colors">
                    Remember Me
                  </span>
                </label>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  30-Day Session
                </span>
              </div>

              {/* Sign In Button with loading text/spinner */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-650/15 hover:shadow-red-650/25 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* Security Badges Section */}
            <div className="mt-6 pt-6 border-t border-slate-900/60 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Lock size={14} className="text-red-500" />
                <span>🔒 Secure Enterprise Authentication</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5 bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-900/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Role-Based Access Control
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-900/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Protected Business Data
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Mobile Showcase & Features view (visible only below lg screens) */}
        <div className="mt-12 w-full max-w-md lg:hidden space-y-8 z-10 border-t border-slate-900 pt-8">
          <div>
            <h3 className="text-lg font-bold text-slate-200 mb-1">Brand Showcase</h3>
            <p className="text-slate-500 text-xs mb-4 text-slate-400">Swipe to view current product lines and system features.</p>
            <ProductCarousel />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Operational Modules</h3>
            <FeatureStrip />
          </div>
        </div>

      </div>
    </div>
  );
}
