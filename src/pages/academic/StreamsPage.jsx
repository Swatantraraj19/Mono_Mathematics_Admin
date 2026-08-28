import React from 'react';
import { Layers, Plus } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const StreamsPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-primary-600" />
            Stream Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage academic streams (PCM, PCB, Commerce, Arts) mapped strictly to Classes 11 and 12.
          </p>
        </div>
        <Button variant="primary" icon={Plus} size="sm">
          Add New Stream
        </Button>
      </div>

      {/* Content card */}
      <div className="admin-card text-center py-12">
        <div className="p-3 bg-purple-50 border border-purple-100 rounded-full w-12 h-12 flex items-center justify-center text-purple-600 mx-auto mb-3 shadow-xs">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">Stream Management Module</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Manage Class-Stream associations (`classStreams`) with strict dual-hierarchy isolation.
        </p>
      </div>
    </div>
  );
};
