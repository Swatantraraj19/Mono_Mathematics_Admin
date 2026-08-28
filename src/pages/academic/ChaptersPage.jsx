import React from 'react';
import { Bookmark, Plus } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const ChaptersPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bookmark className="w-6 h-6 text-primary-600" />
            Chapter Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create and order sequential syllabus chapters under each class-subject curriculum context.
          </p>
        </div>
        <Button variant="primary" icon={Plus} size="sm">
          Add New Chapter
        </Button>
      </div>

      {/* Content card */}
      <div className="admin-card text-center py-12">
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-full w-12 h-12 flex items-center justify-center text-amber-600 mx-auto mb-3 shadow-xs">
          <Bookmark className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">Chapter Management Module</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Contextual chapter numbering, sequential ordering index, and content grouping.
        </p>
      </div>
    </div>
  );
};
