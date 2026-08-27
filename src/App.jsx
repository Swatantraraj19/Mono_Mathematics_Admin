import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { Button } from './components/common/Button';
import { LogOut } from 'lucide-react';

/**
 * Temporary Protected Dashboard Container for Phase 2 Verification.
 * Will be replaced by full Admin Shell & Sidebar Layout in Phase 3.
 */
function DashboardPlaceholder() {
  const { userProfile, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="admin-card max-w-lg w-full text-center space-y-4">
        <div className="h-12 w-12 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-xl mx-auto shadow-sm">
          M
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admin Authentication Verified</h1>
          <p className="text-sm text-slate-500 mt-1">
            Logged in as <strong className="text-slate-800">{userProfile?.email}</strong>
          </p>
          <p className="text-xs text-primary-600 font-semibold mt-0.5">
            Role: {userProfile?.role} | Institute: {userProfile?.instituteId}
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <Button variant="secondary" icon={LogOut} onClick={logout}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #E2E8F0',
              borderRadius: '0.75rem',
              padding: '12px 16px',
              fontSize: '0.875rem',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
            },
            success: {
              iconTheme: {
                primary: '#16A34A',
                secondary: '#FFFFFF',
              },
            },
            error: {
              iconTheme: {
                primary: '#DC2626',
                secondary: '#FFFFFF',
              },
            },
          }}
        />

        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPlaceholder />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
