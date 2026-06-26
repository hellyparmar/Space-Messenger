import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import HomePage from './pages/HomePage';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';

import LandingPage from './pages/LandingPage';
import ResetPasswordPage from './pages/ResetPassword';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('cosmimail_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('cosmimail_token');
  if (token) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

function AuthListener() {
  const navigate = useNavigate();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED' && session) {
          localStorage.setItem('cosmimail_token', session.access_token);
        }
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('cosmimail_token');
          localStorage.removeItem('cosmimail_user');
          navigate('/login');
        }
        // Supabase fires this event when the user clicks the password reset email link.
        // We must navigate to the reset page so the session token is available for updateUser().
        if (event === 'PASSWORD_RECOVERY') {
          navigate('/reset-password', { replace: true });
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthListener />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        } />
        <Route path="/home" element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
