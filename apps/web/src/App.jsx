import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import ScrollToTop from '@/components/ScrollToTop';
import Layout from '@/components/Layout';

// Pages publiques
import Onboarding from '@/pages/Onboarding';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Pages protégées
import Feed from '@/pages/Feed';
import SearchPage from '@/pages/SearchPage';
import Profile from '@/pages/Profile';
import Messages from '@/pages/Messages';
import Notifications from '@/pages/Notifications';
import CreatePost from '@/pages/CreatePost';
import Dashboard from '@/pages/Dashboard';
import Settings from '@/pages/Settings';

// 404
import PageNotFound from '@/lib/PageNotFound';

// ── Spinner de chargement ──────────────────────────────────────────────────────
const Loader = () => (
  <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#111111' }}>
    <div className="flex flex-col items-center gap-5">
      <span className="text-sm font-light tracking-widest" style={{ color: '#C9A84C', letterSpacing: '0.25em' }}>VLOGER</span>
      <div className="w-4 h-4 rounded-full border border-t-transparent animate-spin" style={{ borderColor: '#C9A84C', borderTopColor: 'transparent' }} />
    </div>
  </div>
);

// ── Route protégée : redirige vers /login si non connecté ─────────────────────
function PrivateRoute({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// ── Route publique : redirige vers / si déjà connecté ────────────────────────
function PublicRoute({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) return <Loader />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

// ── Arbre des routes ──────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Routes publiques (redirigent vers / si connecté) */}
      <Route path="/welcome" element={<PublicRoute><Onboarding /></PublicRoute>} />
      <Route path="/login"   element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

      {/* Reset password : accessible même connecté (lien email) */}
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Routes protégées avec Layout (nav) */}
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/" element={<Feed />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>

      {/* Create post : protégé, sans Layout */}
      <Route path="/create/:type" element={<PrivateRoute><CreatePost /></PrivateRoute>} />

      {/* Racine : redirige selon l'état auth */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}
