import React from 'react';
import { Loader2 } from 'lucide-react';

export const PageFallback = () => {
  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3 animate-fadeIn">
      <div className="p-3 bg-primary-50 rounded-2xl text-primary-600 shadow-2xs">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
      <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
        Loading module...
      </p>
    </div>
  );
};
