import React from 'react';
import { Radio, Plus } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const LiveClassesPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-rose-600" />
            Live Online Classes
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Schedule and manage interactive Zoom live classes for coaching batches.
          </p>
        </div>
        <Button variant="primary" icon={Plus} size="sm">
          Schedule Live Class
        </Button>
      </div>

      {/* Content card */}
      <div className="admin-card text-center py-12">
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-full w-12 h-12 flex items-center justify-center text-rose-600 mx-auto mb-3 shadow-xs">
          <Radio className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">Live Class Management Module</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Zoom meeting integration, schedule calendar, and live session status management.
        </p>
      </div>
    </div>
  );
};
