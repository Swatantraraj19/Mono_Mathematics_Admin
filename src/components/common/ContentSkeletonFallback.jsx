import React from 'react';

/**
 * Modern, high-performance Content Area Skeleton.
 * Rendered inside AdminLayout's <Outlet /> during lazy module loading.
 * Preserves the fixed Sidebar, Header, and layout dimensions with zero CLS (Cumulative Layout Shift).
 */
export const ContentSkeletonFallback = () => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn w-full">
      {/* Top Banner Skeleton */}
      <div className="w-full h-36 sm:h-44 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-2xl animate-pulse" />

      {/* Grid Cards Skeleton */}
      <div>
        <div className="h-5 w-48 bg-slate-200 rounded-md mb-4 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-32 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-2xs animate-pulse"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-3.5 w-24 bg-slate-200 rounded" />
                  <div className="h-7 w-12 bg-slate-300 rounded" />
                </div>
                <div className="w-10 h-10 bg-slate-100 rounded-xl border border-slate-200" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="h-3 w-28 bg-slate-100 rounded" />
                <div className="h-3 w-14 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
