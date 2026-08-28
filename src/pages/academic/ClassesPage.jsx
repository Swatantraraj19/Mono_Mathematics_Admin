import React from 'react';
import { GraduationCap, Plus } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const ClassesPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-primary-600" />
            Class Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure academic classes (Class 6 to 12) and their stream-applicability structure.
          </p>
        </div>
        <Button variant="primary" icon={Plus} size="sm">
          Add New Class
        </Button>
      </div>

      {/* Placeholder container for Phase 4 CRUD integration */}
      <div className="admin-card text-center py-12">
        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-full w-12 h-12 flex items-center justify-center text-primary-600 mx-auto mb-3 shadow-xs">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">Class Management Module</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Ready for Phase 4: Full Firestore CRUD operations, stream-applicability toggle, and academic validation.
        </p>
      </div>
    </div>
  );
};
