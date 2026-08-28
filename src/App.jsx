import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/dashboard/Dashboard';
import { ClassesPage } from './pages/academic/ClassesPage';
import { StreamsPage } from './pages/academic/StreamsPage';
import { SubjectsPage } from './pages/academic/SubjectsPage';
import { ChaptersPage } from './pages/academic/ChaptersPage';
import { VideosPage } from './pages/videos/VideosPage';
import { LiveClassesPage } from './pages/live/LiveClassesPage';

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

          {/* Protected Admin Routes with Master AdminLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/classes" element={<ClassesPage />} />
              <Route path="/streams" element={<StreamsPage />} />
              <Route path="/subjects" element={<SubjectsPage />} />
              <Route path="/chapters" element={<ChaptersPage />} />
              <Route path="/videos" element={<VideosPage />} />
              <Route path="/live-classes" element={<LiveClassesPage />} />
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
