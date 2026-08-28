import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { navigationItems } from './Sidebar';
import logo from '../../assets/logo.png';

export const Header = ({ onMenuClick }) => {
  const location = useLocation();
  const { userProfile } = useAuth();

  // Find active navigation item title
  const currentItem = navigationItems.find((item) =>
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path)
  );

  const pageTitle = currentItem?.name || 'Admin Panel';

  return (
    <header className="h-14 bg-white border-b border-slate-200 shrink-0 flex items-center justify-between px-4 sm:px-6 select-none shadow-xs">
      {/* Left: Mobile Menu Button + Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand Logo */}
        <div className="flex items-center gap-2 lg:hidden">
          <img src={logo} alt="Mono Mathematics" className="w-6 h-6 object-contain" />
        </div>

        {/* Page Title */}
        <div className="min-w-0 flex flex-col">
          <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate tracking-tight">
            {pageTitle}
          </h1>
          <span className="hidden sm:inline-flex text-[10px] text-slate-400 font-medium truncate">
            Mono Mathematics Classes Management
          </span>
        </div>
      </div>

      {/* Right: Admin Profile Info */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
          {userProfile?.name?.charAt(0) || 'A'}
        </div>
        <div className="hidden sm:flex flex-col text-left min-w-0">
          <span className="text-xs font-semibold text-slate-900 leading-tight truncate">
            {userProfile?.name || 'Super Admin'}
          </span>
          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]" title={userProfile?.email}>
            {userProfile?.email}
          </span>
        </div>
      </div>
    </header>
  );
};
