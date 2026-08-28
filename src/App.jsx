import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { PageFallback } from './components/common/PageFallback';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Route-Level Code Splitting (React.lazy)
const Login = lazy(() => import('./pages/auth/Login').then((m) => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })));
const ClassesPage = lazy(() => import('./pages/academic/ClassesPage').then((m) => ({ default: m.ClassesPage })));
const StreamsPage = lazy(() => import('./pages/academic/StreamsPage').then((m) => ({ default: m.StreamsPage })));
const SubjectsPage = lazy(() => import('./pages/academic/SubjectsPage').then((m) => ({ default: m.SubjectsPage })));
const ChaptersPage = lazy(() => import('./pages/academic/ChaptersPage').then((m) => ({ default: m.ChaptersPage })));
const VideosPage = lazy(() => import('./pages/videos/VideosPage').then((m) => ({ default: m.VideosPage })));
const LiveClassesPage = lazy(() => import('./pages/live/LiveClassesPage').then((m) => ({ default: m.LiveClassesPage })));

export default function App() {
  return (
    <ErrorBoundary>
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

          <Suspense fallback={<PageFallback />}>
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
