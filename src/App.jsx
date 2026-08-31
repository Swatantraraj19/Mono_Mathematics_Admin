import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppToaster } from './components/common/AppToaster';
import { Loader2 } from 'lucide-react';

// Route-Level Code Splitting (React.lazy)
const Login = lazy(() => import('./pages/auth/Login').then((m) => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })));
const StudentsPage = lazy(() => import('./pages/students/StudentsPage').then((m) => ({ default: m.StudentsPage })));
const ClassesPage = lazy(() => import('./pages/academic/ClassesPage').then((m) => ({ default: m.ClassesPage })));
const StreamsPage = lazy(() => import('./pages/academic/StreamsPage').then((m) => ({ default: m.StreamsPage })));
const SubjectsPage = lazy(() => import('./pages/academic/SubjectsPage').then((m) => ({ default: m.SubjectsPage })));
const ChaptersPage = lazy(() => import('./pages/academic/ChaptersPage').then((m) => ({ default: m.ChaptersPage })));
const VideosPage = lazy(() => import('./pages/videos/VideosPage').then((m) => ({ default: m.VideosPage })));
const LiveClassesPage = lazy(() => import('./pages/live/LiveClassesPage').then((m) => ({ default: m.LiveClassesPage })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));

// Fallback for public login chunk loading
const AuthFallback = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppToaster />

          <Routes>
            <Route
              path="/login"
              element={
                <Suspense fallback={<AuthFallback />}>
                  <Login />
                </Suspense>
              }
            />

            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/classes" element={<ClassesPage />} />
                <Route path="/streams" element={<StreamsPage />} />
                <Route path="/subjects" element={<SubjectsPage />} />
                <Route path="/chapters" element={<ChaptersPage />} />
                <Route path="/videos" element={<VideosPage />} />
                <Route path="/live-classes" element={<LiveClassesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
