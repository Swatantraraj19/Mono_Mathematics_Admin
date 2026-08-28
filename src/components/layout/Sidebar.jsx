import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Layers,
  BookOpen,
  Bookmark,
  Video,
  Radio,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';
import logo from '../../assets/logo.png';

export const navigationItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Classes', path: '/classes', icon: GraduationCap },
  { name: 'Streams', path: '/streams', icon: Layers, badge: '11-12' },
  { name: 'Subjects', path: '/subjects', icon: BookOpen },
  { name: 'Chapters', path: '/chapters', icon: Bookmark },
  { name: 'Recorded Videos', path: '/videos', icon: Video },
  { name: 'Live Classes', path: '/live-classes', icon: Radio },
];

export const Sidebar = ({ className = '', onItemClick }) => {
  const { userProfile, logout } = useAuth();

  return (
    <aside className={cn('w-64 bg-white border-r border-slate-200 flex flex-col h-full select-none shrink-0 overflow-hidden', className)}>
      {/* Brand Header */}
      <div className="h-14 px-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
        <img
          src={logo}
          alt="Mono Mathematics"
          className="w-8 h-8 object-contain shrink-0 drop-shadow-xs"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-tight">
            Mono Mathematics
          </span>
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-primary-600" />
            Admin Panel
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto min-h-0">
        <div className="px-2.5 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Management
        </div>

        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onItemClick}
              className={({ isActive }) =>
                cn(
                  'group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={cn(
                        'w-4 h-4 shrink-0 transition-colors',
                        isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ml-1.5',
                        isActive
                          ? 'bg-primary-200/60 text-primary-800'
                          : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile & Permanently Visible Logout Footer */}
      <div className="p-2.5 border-t border-slate-100 shrink-0 bg-slate-50/70">
        <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {userProfile?.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-xs font-semibold text-slate-900 truncate">
                {userProfile?.name || 'Super Admin'}
              </span>
              <span className="text-[10px] text-slate-500 truncate max-w-[100px]" title={userProfile?.email}>
                {userProfile?.email}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-status-error hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors shrink-0 cursor-pointer shadow-xs active:bg-red-100"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
