import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Layers,
  GraduationCap,
  BookOpen,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchChaptersBySubject,
  searchGlobalChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  toggleChapterStatus,
} from '../../services/chapterService';
import { fetchClassSubjects } from '../../services/subjectService';
import { fetchClasses } from '../../services/classService';
import { fetchStreams } from '../../services/streamService';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Table } from '../../components/common/Table';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';

export const ChaptersPage = () => {
  // Master Academic Hierarchy
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);

  // Context-Based Drilldown Selectors
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedBoardFilter, setSelectedBoardFilter] = useState('all'); // 'all' | 'CBSE' | 'BSEB'

  // Subject-Scoped Chapters Data
  const [subjectChapters, setSubjectChapters] = useState([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Add / Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);

  // Form states
  const [formClassId, setFormClassId] = useState('');
  const [formStreamId, setFormStreamId] = useState('');
  const [formClassSubjectId, setFormClassSubjectId] = useState('');
  const [formChapterName, setFormChapterName] = useState('');
  const [formChapterNumber, setFormChapterNumber] = useState('1');
  const [formStatus, setFormStatus] = useState('active');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Initial Load: Fetch Academic Hierarchy Metadata
  const loadMetadata = async () => {
    try {
      setMetaLoading(true);
      const [classesData, streamsData, subjectsData] = await Promise.all([
        fetchClasses('mono_math_01'),
        fetchStreams('mono_math_01'),
        fetchClassSubjects('mono_math_01'),
      ]);

      setClasses(classesData);
      setStreams(streamsData);
      setClassSubjects(subjectsData);

      // Auto-initialize Drilldown to first available Class -> Stream -> Subject
      if (classesData.length > 0 && !selectedClassId) {
        const firstClass = classesData[0];
        setSelectedClassId(firstClass.id);

        const isSenior = firstClass.hasStreams || firstClass.name.includes('11') || firstClass.name.includes('12');
        const firstStream = isSenior && streamsData.length > 0 ? streamsData[0].id : '';
        setSelectedStreamId(firstStream);

        const initialSubjects = subjectsData.filter(
          (s) => s.classId === firstClass.id && (isSenior ? s.streamId === firstStream : true)
        );
        const firstSubId = initialSubjects.length > 0 ? initialSubjects[0].id : '';
        setSelectedSubjectId(firstSubId);
      }
    } catch (err) {
      toast.error('Failed to load academic hierarchy');
    } finally {
      setMetaLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  // 2. Active Context Helpers
  const activeClassObj = classes.find((c) => c.id === selectedClassId);
  const activeClassHasStreams =
    activeClassObj?.hasStreams ||
    activeClassObj?.name?.includes('11') ||
    activeClassObj?.name?.includes('12');

  const availableSubjects = useMemo(() => {
    return classSubjects.filter((cs) => {
      if (cs.classId !== selectedClassId) return false;
      if (activeClassHasStreams && selectedStreamId && cs.streamId !== selectedStreamId) return false;
      if (selectedBoardFilter !== 'all') {
        const board = cs.board || 'ALL';
        if (board !== 'ALL' && board !== selectedBoardFilter) return false;
      }
      return true;
    });
  }, [classSubjects, selectedClassId, selectedStreamId, activeClassHasStreams, selectedBoardFilter]);

  // Keep selectedSubjectId in sync with availableSubjects
  useEffect(() => {
    if (availableSubjects.length > 0) {
      if (!availableSubjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(availableSubjects[0].id);
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [availableSubjects, selectedSubjectId]);

  const activeSubjectObj = classSubjects.find((s) => s.id === selectedSubjectId);

  // Helper for board badge styling
  const renderBoardBadge = (board) => {
    const b = board || 'ALL';
    if (b === 'CBSE') {
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.2 sm:py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
          CBSE
        </span>
      );
    }
    if (b === 'BSEB') {
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.2 sm:py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
          BSEB
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.2 sm:py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
        All Boards
      </span>
    );
  };

  const formatSubjectOptionLabel = (s) => {
    const b = s.board || 'ALL';
    const bLabel = b === 'CBSE' ? 'CBSE' : b === 'BSEB' ? 'BSEB' : 'All Boards';
    return `${s.subjectName} (${bLabel})`;
  };

  // 3. Scoped Chapter Loading: Triggered only when selectedSubjectId changes
  const loadSubjectChapters = async (classSubjectId) => {
    if (!classSubjectId) {
      setSubjectChapters([]);
      return;
    }
    try {
      setChaptersLoading(true);
      const data = await fetchChaptersBySubject('mono_math_01', classSubjectId);
      setSubjectChapters(data);
    } catch (err) {
      toast.error('Failed to load chapters for this subject');
    } finally {
      setChaptersLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSubjectId && !searchQuery.trim()) {
      loadSubjectChapters(selectedSubjectId);
    }
  }, [selectedSubjectId, searchQuery]);

  // Handle Class change in drilldown
  const handleClassChange = (newClassId) => {
    setSelectedClassId(newClassId);
    const cls = classes.find((c) => c.id === newClassId);
    const isSenior = cls?.hasStreams || cls?.name?.includes('11') || cls?.name?.includes('12');
    const newStreamId = isSenior && streams.length > 0 ? streams[0].id : '';
    setSelectedStreamId(newStreamId);

    const nextSubjects = classSubjects.filter(
      (s) => s.classId === newClassId && (isSenior ? s.streamId === newStreamId : true)
    );
    const nextSubId = nextSubjects.length > 0 ? nextSubjects[0].id : '';
    setSelectedSubjectId(nextSubId);
  };

  // Handle Stream change in drilldown
  const handleStreamChange = (newStreamId) => {
    setSelectedStreamId(newStreamId);
    const nextSubjects = classSubjects.filter(
      (s) => s.classId === selectedClassId && s.streamId === newStreamId
    );
    const nextSubId = nextSubjects.length > 0 ? nextSubjects[0].id : '';
    setSelectedSubjectId(nextSubId);
  };

  // Handle Subject change in drilldown
  const handleSubjectChange = (newSubId) => {
    setSelectedSubjectId(newSubId);
  };

  // 4. Global Search Handler (Debounced)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await searchGlobalChapters('mono_math_01', trimmed);
        setSearchResults(results);
      } catch (err) {
        toast.error('Search failed');
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Form Cascading Helpers
  const formClassObj = classes.find((c) => c.id === formClassId);
  const formClassHasStreams =
    formClassObj?.hasStreams ||
    formClassObj?.name?.includes('11') ||
    formClassObj?.name?.includes('12');

  const availableFormSubjects = useMemo(() => {
    return classSubjects.filter((cs) => {
      if (cs.classId !== formClassId) return false;
      if (formClassHasStreams && cs.streamId !== formStreamId) return false;
      return true;
    });
  }, [classSubjects, formClassId, formStreamId, formClassHasStreams]);

  useEffect(() => {
    if (availableFormSubjects.length > 0) {
      if (!availableFormSubjects.some((s) => s.id === formClassSubjectId)) {
        setFormClassSubjectId(availableFormSubjects[0].id);
      }
    } else {
      setFormClassSubjectId('');
    }
  }, [availableFormSubjects, formClassSubjectId]);

  // Auto-calculate next sequential chapter number in form
  useEffect(() => {
    if (!editingChapter && formClassSubjectId) {
      const chs = subjectChapters.filter((c) => c.classSubjectId === formClassSubjectId);
      setFormChapterNumber((chs.length + 1).toString());
    }
  }, [formClassSubjectId, subjectChapters, editingChapter]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingChapter(null);
    setFormClassId(selectedClassId || classes[0]?.id || '');
    setFormStreamId(selectedStreamId || streams[0]?.id || '');
    setFormClassSubjectId(selectedSubjectId || '');
    setFormChapterName('');
    setFormStatus('active');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (ch) => {
    setEditingChapter(ch);
    setFormClassId(ch.classId);
    setFormStreamId(ch.streamId || '');
    setFormClassSubjectId(ch.classSubjectId);
    setFormChapterName(ch.name);
    setFormChapterNumber((ch.chapterNumber || ch.orderIndex || 1).toString());
    setFormStatus(ch.status || 'active');
    setIsModalOpen(true);
  };

  const handleSaveChapter = async (e) => {
    e.preventDefault();

    if (!formChapterName.trim()) {
      toast.error('Please enter chapter title (e.g. Real Numbers).');
      return;
    }

    if (!formClassSubjectId) {
      toast.error('Please select a subject to add this chapter to.');
      return;
    }

    const matchedSubject = classSubjects.find((cs) => cs.id === formClassSubjectId);
    if (!matchedSubject) {
      toast.error('Selected subject not found.');
      return;
    }

    const payload = {
      name: formChapterName.trim(),
      chapterNumber: Number(formChapterNumber) || 1,
      classId: matchedSubject.classId,
      className: matchedSubject.className,
      streamId: matchedSubject.streamId || null,
      streamName: matchedSubject.streamName || null,
      subjectId: matchedSubject.subjectId,
      subjectName: matchedSubject.subjectName,
      classSubjectId: matchedSubject.id,
      board: matchedSubject.board || 'ALL',
      status: formStatus,
    };

    setIsSaving(true);
    try {
      if (editingChapter) {
        await updateChapter(editingChapter.id, payload, 'mono_math_01');
        toast.success(`Updated "${payload.name}" successfully!`);
      } else {
        await createChapter(payload, 'mono_math_01');
        toast.success(`Created Chapter ${payload.chapterNumber}: "${payload.name}"!`);
      }
      setIsModalOpen(false);

      if (payload.classSubjectId === selectedSubjectId) {
        loadSubjectChapters(selectedSubjectId);
      } else {
        setSelectedClassId(payload.classId);
        if (payload.streamId) setSelectedStreamId(payload.streamId);
        setSelectedSubjectId(payload.classSubjectId);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save chapter');
    } finally {
      setIsSaving(false);
    }
  };

  // Status Toggle
  const handleToggleStatus = async (ch) => {
    try {
      await toggleChapterStatus(ch.id, ch.status);
      toast.success(`"${ch.name}" marked as ${ch.status === 'active' ? 'inactive' : 'active'}`);
      const updatedStatus = ch.status === 'active' ? 'inactive' : 'active';

      setSubjectChapters((prev) =>
        prev.map((item) => (item.id === ch.id ? { ...item, status: updatedStatus } : item))
      );
      setSearchResults((prev) =>
        prev.map((item) => (item.id === ch.id ? { ...item, status: updatedStatus } : item))
      );
    } catch (err) {
      toast.error('Failed to change status');
    }
  };

  // Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteChapter(deleteTarget.id);
      toast.success(`Deleted Chapter ${deleteTarget.chapterNumber}: "${deleteTarget.name}".`);
      setDeleteTarget(null);

      if (deleteTarget.classSubjectId === selectedSubjectId) {
        loadSubjectChapters(selectedSubjectId);
      }
      setSearchResults((prev) => prev.filter((item) => item.id !== deleteTarget.id));
    } catch (err) {
      toast.error(err.message || 'Failed to delete chapter');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bookmark className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            Chapter Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize sequential chapters grouped by class, stream, and subject.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={handleOpenCreateModal}
          disabled={classSubjects.length === 0}
          className="w-full sm:w-auto shadow-xs"
        >
          Add Chapter
        </Button>
      </div>

      {/* Context-Based Academic Drilldown & Global Search Bar */}
      <div className="admin-card !p-2 sm:!p-4 space-y-1.5 sm:space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-1.5 sm:gap-2.5">
          <div className="w-full md:w-80">
            <Input
              type="text"
              placeholder="Global Search chapters (e.g. Real Numbers)..."
              icon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs py-1 sm:py-1.5"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-between md:justify-end">
            {/* Board Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-lg">
              {[
                { id: 'all', label: 'All Boards' },
                { id: 'CBSE', label: 'CBSE' },
                { id: 'BSEB', label: 'BSEB' },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBoardFilter(b.id)}
                  className={`px-2 py-1 text-[11px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    selectedBoardFilter === b.id
                      ? 'bg-white text-primary-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                loadMetadata();
                if (selectedSubjectId) loadSubjectChapters(selectedSubjectId);
              }}
              className="p-1 sm:p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-primary-600 hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Cascade Dropdown Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 border-t border-slate-100">
          {/* Class Selector */}
          <div>
            <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 sm:text-slate-500 uppercase tracking-wider block mb-0.5 sm:mb-1">
              Class
            </label>
            <Select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
              className="text-xs py-1 sm:py-1.5 bg-slate-50/50"
            />
          </div>

          {/* Stream Selector (Only for Senior Classes) */}
          {activeClassHasStreams && (
            <div>
              <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 sm:text-slate-500 uppercase tracking-wider block mb-0.5 sm:mb-1">
                Stream
              </label>
              <Select
                value={selectedStreamId}
                onChange={(e) => handleStreamChange(e.target.value)}
                options={streams.map((s) => ({ value: s.id, label: s.name }))}
                className="text-xs py-1 sm:py-1.5 bg-purple-50/30 text-purple-900 border-purple-200"
              />
            </div>
          )}

          {/* Subject Selector */}
          <div className={activeClassHasStreams ? '' : 'col-span-1 sm:col-span-2'}>
            <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 sm:text-slate-500 uppercase tracking-wider block mb-0.5 sm:mb-1">
              Subject
            </label>
            <Select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              options={availableSubjects.map((s) => ({
                value: s.id,
                label: formatSubjectOptionLabel(s),
              }))}
              className="text-xs py-1 sm:py-1.5 bg-blue-50/30 text-blue-900 border-blue-200 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Main Content View */}
      {metaLoading ? (
        <SkeletonLoader rows={4} />
      ) : searchQuery.trim() ? (
        /* GLOBAL SEARCH RESULTS VIEW */
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between px-1 text-[11px] sm:text-xs text-slate-500">
            <span>
              Global Search Results for "<strong>{searchQuery.trim()}</strong>":
            </span>
            <span className="font-semibold text-primary-600 bg-primary-50 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md text-[10px] sm:text-xs">
              {searchResults.length} matching chapter{searchResults.length !== 1 ? 's' : ''}
            </span>
          </div>

          {isSearching ? (
            <SkeletonLoader rows={3} />
          ) : searchResults.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No Matching Chapters"
              description={`No chapters found matching "${searchQuery}". Try a different name.`}
            />
          ) : (
            <div className="grid grid-cols-1 gap-1.5 sm:gap-2.5">
              {searchResults.map((ch) => (
                <div
                  key={ch.id}
                  className="admin-card !p-2 sm:!p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 hover:border-primary-200 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span className="font-mono text-[11px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md shrink-0">
                      #{ch.chapterNumber}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-primary-700">
                          {ch.className}
                        </span>
                        {ch.streamName && (
                          <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700">
                            {ch.streamName}
                          </span>
                        )}
                        <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 truncate max-w-[150px]">
                          • {ch.subjectName}
                        </span>
                        {renderBoardBadge(ch.board)}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {ch.name}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    <Badge variant={ch.status === 'active' ? 'active' : 'inactive'} dot size="sm">
                      {ch.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>

                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(ch)}
                        className={`p-1 sm:p-1.5 rounded-md transition-colors cursor-pointer ${
                          ch.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                        title={ch.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {ch.status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(ch)}
                        className="p-1 sm:p-1.5 rounded-md text-slate-500 hover:text-primary-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(ch)}
                        className="p-1 sm:p-1.5 rounded-md text-slate-400 hover:text-status-error hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* SUBJECT DRILLDOWN CHAPTER LIST VIEW */
        <div className="space-y-1.5 sm:space-y-3">
          {/* Active Context Breadcrumb Banner */}
          <div className="bg-white rounded-xl border border-slate-200 !p-2 sm:!p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 shadow-2xs">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-bold bg-indigo-50 text-primary-700">
                <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {activeClassObj?.name || 'Class'}
              </span>

              {activeClassHasStreams && selectedStreamId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-bold bg-purple-50 text-purple-700">
                  <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {streams.find((s) => s.id === selectedStreamId)?.name || 'Stream'}
                </span>
              )}

              <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-300" />

              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {activeSubjectObj?.subjectName || 'Subject'}
                {renderBoardBadge(activeSubjectObj?.board)}
              </span>
            </div>

            <div className="shrink-0 text-[10px] sm:text-xs font-semibold text-slate-500">
              {subjectChapters.length} Chapter{subjectChapters.length !== 1 ? 's' : ''} in this subject
            </div>
          </div>

          {/* Chapters List Container */}
          {chaptersLoading ? (
            <SkeletonLoader rows={4} />
          ) : !selectedSubjectId ? (
            <EmptyState
              icon={BookOpen}
              title="No Subject Selected"
              description="Please select a class and subject above to manage chapters."
            />
          ) : subjectChapters.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="No Chapters in this Subject"
              description={`No chapters created under "${activeSubjectObj?.subjectName || 'this subject'}" yet.`}
              actionLabel="Add Chapter"
              onAction={handleOpenCreateModal}
            />
          ) : (
            <>
              {/* 1. Mobile Compact Rows (< 640px) */}
              <div className="grid grid-cols-1 gap-1 sm:hidden">
                {subjectChapters.map((ch) => (
                  <div
                    key={ch.id}
                    className="admin-card !p-2 flex items-center justify-between gap-2 shadow-2xs hover:border-primary-200 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded-md shrink-0">
                        #{ch.chapterNumber}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 truncate" title={ch.name}>
                            {ch.name}
                          </h4>
                          {renderBoardBadge(ch.board || activeSubjectObj?.board)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant={ch.status === 'active' ? 'active' : 'inactive'} dot size="sm">
                        {ch.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>

                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(ch)}
                          className={`p-1 rounded-md cursor-pointer ${
                            ch.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={ch.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {ch.status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(ch)}
                          className="p-1 rounded-md text-slate-500 hover:text-primary-600 hover:bg-indigo-50 cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(ch)}
                          className="p-1 rounded-md text-slate-400 hover:text-status-error hover:bg-red-50 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 2. Desktop High-Density Table (>= 640px) */}
              <div className="hidden sm:block">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head className="w-20">Chapter #</Table.Head>
                      <Table.Head>Chapter Title</Table.Head>
                      <Table.Head className="w-28">Board</Table.Head>
                      <Table.Head className="w-32">Status</Table.Head>
                      <Table.Head className="text-right w-28 pr-6">Actions</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {subjectChapters.map((ch) => (
                      <Table.Row key={ch.id}>
                        <Table.Cell>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
                            #{ch.chapterNumber}
                          </span>
                        </Table.Cell>

                        <Table.Cell>
                          <span className="text-sm font-bold text-slate-900 block">{ch.name}</span>
                        </Table.Cell>

                        <Table.Cell>
                          {renderBoardBadge(ch.board || activeSubjectObj?.board)}
                        </Table.Cell>

                        <Table.Cell>
                          <Badge variant={ch.status === 'active' ? 'active' : 'inactive'}>
                            {ch.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </Table.Cell>

                        <Table.Cell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(ch)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                ch.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={ch.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                              {ch.status === 'active' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(ch)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(ch)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-status-error hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add / Edit Chapter Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingChapter ? `Edit Chapter: ${editingChapter.name}` : 'Add New Chapter'}
        subtitle="Specify sequential chapter number and title under the subject."
      >
        <form onSubmit={handleSaveChapter} className="space-y-3 sm:space-y-4">
          {/* Class Selector */}
          <Select
            label="Academic Class"
            value={formClassId}
            onChange={(e) => setFormClassId(e.target.value)}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
            required
          />

          {/* Stream Selector (Only for Senior Classes) */}
          {formClassHasStreams && (
            <Select
              label="Academic Stream"
              value={formStreamId}
              onChange={(e) => setFormStreamId(e.target.value)}
              options={streams.map((s) => ({ value: s.id, label: s.name }))}
              required
            />
          )}

          {/* Subject Selector */}
          <Select
            label="Subject"
            value={formClassSubjectId}
            onChange={(e) => setFormClassSubjectId(e.target.value)}
            options={availableFormSubjects.map((s) => ({
              value: s.id,
              label: formatSubjectOptionLabel(s),
            }))}
            helperText={availableFormSubjects.length === 0 ? 'No subjects mapped to this context.' : undefined}
            required
          />

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <div className="col-span-1">
              <Input
                label="Chapter #"
                type="number"
                placeholder="1"
                value={formChapterNumber}
                onChange={(e) => setFormChapterNumber(e.target.value)}
                required
              />
            </div>

            <div className="col-span-2">
              <Input
                label="Chapter Title / Name"
                placeholder="e.g. Real Numbers"
                value={formChapterName}
                onChange={(e) => setFormChapterName(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <Select
            label="Chapter Status"
            value={formStatus}
            onChange={(e) => setFormStatus(e.target.value)}
            options={[
              { value: 'active', label: 'Active (Visible to Students)' },
              { value: 'inactive', label: 'Hidden from Students' },
            ]}
          />

          <div className="flex items-center justify-end gap-2 pt-2.5 sm:pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              disabled={isSaving || availableFormSubjects.length === 0}
            >
              {editingChapter ? 'Save Changes' : 'Create Chapter'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Chapter Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Chapter"
        message={`Are you sure you want to delete Chapter ${deleteTarget?.chapterNumber}: "${deleteTarget?.name}"?`}
        confirmText="Delete Chapter"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
