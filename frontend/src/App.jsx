import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import OnlineSales from './pages/OnlineSales';
import OfflineSales from './pages/OfflineSales';
import Shops from './pages/Shops';
import Returns from './pages/Returns';
import Replacements from './pages/Replacements';
import Analytics from './pages/Analytics';
import AdminPanel from './pages/AdminPanel';
import AdminPasswordRequests from './pages/AdminPasswordRequests';
import Settings from './pages/Settings';
import CommunicationHub from './pages/CommunicationHub';
import PurchasesFactories from './pages/PurchasesFactories';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const [redirect, setRedirect] = React.useState(false);
  const [seconds, setSeconds] = React.useState(3);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin' || user?.username === 'admin';

  React.useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      const interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
      const timeout = setTimeout(() => {
        setRedirect(true);
      }, 3000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [user, loading, isAdmin]);

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500">Loading…</div>;

  if (!user || !isAdmin) {
    if (redirect) {
      return <Navigate to="/" replace />;
    }
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-700 px-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-200/80 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl">
            ⚠️
          </div>
          <h2 className="text-xl font-black text-slate-800">Access Denied</h2>
          <p className="text-sm font-semibold text-slate-500">
            Access Denied. Administrator privileges required.
          </p>
          <div className="text-xs font-medium text-slate-400">
            Redirecting to Dashboard in {seconds} seconds...
          </div>
        </div>
      </div>
    );
  }

  return children;
}

function PurchasesRoute({ children }) {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin' || user?.username === 'admin';

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500">Loading…</div>;
  if (!user || !isAdmin) {
    return <Navigate to="/" replace state={{ message: "Access Denied - Admin Only Module" }} />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="products" element={<Products />} />
              <Route path="online-sales" element={<OnlineSales />} />
              <Route path="offline-sales" element={<OfflineSales />} />
              <Route path="shops" element={<Shops />} />
              <Route path="returns" element={<Returns />} />
              <Route path="replacements" element={<Replacements />} />
              <Route path="communication" element={<CommunicationHub />} />
              <Route path="admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
              <Route path="admin/password-requests" element={<AdminRoute><AdminPasswordRequests /></AdminRoute>} />
              <Route path="purchases-factories" element={<PurchasesRoute><PurchasesFactories /></PurchasesRoute>} />
              <Route path="purchases-factory" element={<PurchasesRoute><PurchasesFactories /></PurchasesRoute>} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
