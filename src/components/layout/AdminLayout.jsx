import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileDrawer } from './MobileDrawer';

/**
 * Master Admin Layout Shell.
 * Provides fixed 100vh Sidebar on desktop, slide drawer on mobile, and independent scrolling viewport.
 */
export const AdminLayout = () => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden antialiased">
      {/* Mobile Slide Navigation Drawer */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* Desktop Fixed 100vh Sidebar */}
      <div className="hidden lg:flex lg:shrink-0 h-screen">
        <Sidebar />
      </div>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <Header onMenuClick={() => setMobileDrawerOpen(true)} />

        {/* Independent Scrolling Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
          <div className="max-w-7xl w-full mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
