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
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchChapters,
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
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';

export const ChaptersPage = () => {
  const [chapters, setChapters] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [selectedStreamFilter, setSelectedStreamFilter] = useState('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Accordion Expand/Collapse States
  const [expandedClasses, setExpandedClasses] = useState({});
  const [expandedStreams, setExpandedStreams] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});

  // Modal states
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [chaptersData, subjectsData, classesData, streamsData] = await Promise.all([
        fetchChapters('mono_math_01'),
        fetchClassSubjects('mono_math_01'),
        fetchClasses('mono_math_01'),
        fetchStreams('mono_math_01'),
      ]);
      setChapters(chaptersData);
      setClassSubjects(subjectsData);
      setClasses(classesData);
      setStreams(streamsData);

      if (classesData.length > 0 && !formClassId) {
        setFormClassId(classesData[0].id);
      }
      if (streamsData.length > 0 && !formStreamId) {
        setFormStreamId(streamsData[0].id);
      }
    } catch (err) {
      toast.error('Failed to load chapters data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter helpers
  const activeFilterClass = classes.find((c) => c.id === selectedClassFilter);
  const filterClassHasStreams =
    activeFilterClass?.hasStreams ||
    activeFilterClass?.name?.includes('11') ||
    activeFilterClass?.name?.includes('12');

  const availableFilterSubjects = useMemo(() => {
    return classSubjects.filter((cs) => {
      if (selectedClassFilter !== 'all' && cs.classId !== selectedClassFilter) return false;
      if (filterClassHasStreams && selectedStreamFilter !== 'all' && cs.streamId !== selectedStreamFilter) return false;
      return true;
    });
  }, [classSubjects, selectedClassFilter, selectedStreamFilter, filterClassHasStreams]);

  // Form helpers
  const activeFormClass = classes.find((c) => c.id === formClassId);
  const formClassHasStreams =
    activeFormClass?.hasStreams ||
    activeFormClass?.name?.includes('11') ||
    activeFormClass?.name?.includes('12');

  const availableFormSubjects = useMemo(() => {
    return classSubjects.filter((cs) => {
      if (cs.classId !== formClassId) return false;
      if (formClassHasStreams && cs.streamId !== formStreamId) return false;
      return true;
    });
  }, [classSubjects, formClassId, formStreamId, formClassHasStreams]);

  // Auto-set the first available subject in form
  useEffect(() => {
    if (availableFormSubjects.length > 0) {
      if (!availableFormSubjects.some((s) => s.id === formClassSubjectId)) {
        setFormClassSubjectId(availableFormSubjects[0].id);
      }
    } else {
      setFormClassSubjectId('');
    }
  }, [availableFormSubjects, formClassSubjectId]);

  // Auto-calculate next sequential chapter number when subject changes
  useEffect(() => {
    if (!editingChapter && formClassSubjectId) {
      const subjectChapters = chapters.filter((c) => c.classSubjectId === formClassSubjectId);
      setFormChapterNumber((subjectChapters.length + 1).toString());
    }
  }, [formClassSubjectId, chapters, editingChapter]);

  // Accordion Toggle Handlers
  const toggleClass = (classId) => {
    setExpandedClasses((prev) => ({ ...prev, [classId]: !prev[classId] }));
  };

  const toggleStream = (streamKey) => {
    setExpandedStreams((prev) => ({ ...prev, [streamKey]: !prev[streamKey] }));
  };

  const toggleSubject = (subjectKey) => {
    setExpandedSubjects((prev) => ({ ...prev, [subjectKey]: !prev[subjectKey] }));
  };

  // Build Structured Hierarchical Tree:
  // Classes 6-10: Class -> Subject -> Chapters
  // Classes 11-12: Class -> Stream -> Subject -> Chapters
  const structuredHierarchy = useMemo(() => {
    const trimmedSearch = searchTerm.trim().toLowerCase();

    // 1. Filter Classes
    let targetClasses = classes.filter((cls) => {
      if (selectedClassFilter !== 'all' && cls.id !== selectedClassFilter) return false;
      return true;
    });

    targetClasses.sort((a, b) => (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0));

    const result = [];

    targetClasses.forEach((cls) => {
      const isSenior = cls.hasStreams || cls.name.includes('11') || cls.name.includes('12');
      const allClassSubjects = classSubjects.filter((cs) => cs.classId === cls.id);

      if (!isSenior) {
        // Classes 6-10: Direct Subjects
        const subjectGroups = [];
        let classTotalChapters = 0;

        allClassSubjects.forEach((sub) => {
          if (selectedSubjectFilter !== 'all' && sub.id !== selectedSubjectFilter) return;

          const subChapters = chapters.filter((ch) => {
            if (ch.classSubjectId !== sub.id) return false;
            if (trimmedSearch && !(ch.name || '').toLowerCase().includes(trimmedSearch)) return false;
            return true;
          });

          subChapters.sort((a, b) => (Number(a.chapterNumber) || 0) - (Number(b.chapterNumber) || 0));
          classTotalChapters += subChapters.length;

          if (!trimmedSearch || subChapters.length > 0) {
            subjectGroups.push({
              subjectId: sub.id,
              subjectName: sub.subjectName,
              subjectKey: `${cls.id}_${sub.id}`,
              totalChapters: subChapters.length,
              chapters: subChapters,
              hasMatches: trimmedSearch.length > 0 && subChapters.length > 0,
            });
          }
        });

        if (!trimmedSearch || classTotalChapters > 0) {
          result.push({
            classId: cls.id,
            className: cls.name,
            isSenior: false,
            totalChapters: classTotalChapters,
            subjectGroups,
            hasMatches: trimmedSearch.length > 0 && classTotalChapters > 0,
          });
        }
      } else {
        // Classes 11-12: Stream -> Subject -> Chapters
        const streamGroups = [];
        let seniorClassTotalChapters = 0;

        const targetStreams = streams.filter((stm) => {
          if (filterClassHasStreams && selectedStreamFilter !== 'all' && stm.id !== selectedStreamFilter) {
            return false;
          }
          return true;
        });

        targetStreams.sort((a, b) => (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0));

        targetStreams.forEach((stm) => {
          const streamSubjects = allClassSubjects.filter(
            (s) => s.streamId === stm.id || (s.streamName && s.streamName.toLowerCase() === stm.name.toLowerCase())
          );

          const subjectGroups = [];
          let streamTotalChapters = 0;

          streamSubjects.forEach((sub) => {
            if (selectedSubjectFilter !== 'all' && sub.id !== selectedSubjectFilter) return;

            const subChapters = chapters.filter((ch) => {
              if (ch.classSubjectId !== sub.id) return false;
              if (trimmedSearch && !(ch.name || '').toLowerCase().includes(trimmedSearch)) return false;
              return true;
            });

            subChapters.sort((a, b) => (Number(a.chapterNumber) || 0) - (Number(b.chapterNumber) || 0));
            streamTotalChapters += subChapters.length;

            if (!trimmedSearch || subChapters.length > 0) {
              subjectGroups.push({
                subjectId: sub.id,
                subjectName: sub.subjectName,
                subjectKey: `${cls.id}_${stm.id}_${sub.id}`,
                totalChapters: subChapters.length,
                chapters: subChapters,
                hasMatches: trimmedSearch.length > 0 && subChapters.length > 0,
              });
            }
          });

          seniorClassTotalChapters += streamTotalChapters;

          if (!trimmedSearch || streamTotalChapters > 0) {
            streamGroups.push({
              streamId: stm.id,
              streamName: stm.name,
              streamKey: `${cls.id}_${stm.id}`,
              totalChapters: streamTotalChapters,
              subjectGroups,
              hasMatches: trimmedSearch.length > 0 && streamTotalChapters > 0,
            });
          }
        });

        if (!trimmedSearch || seniorClassTotalChapters > 0) {
          result.push({
            classId: cls.id,
            className: cls.name,
            isSenior: true,
            totalChapters: seniorClassTotalChapters,
            streamGroups,
            hasMatches: trimmedSearch.length > 0 && seniorClassTotalChapters > 0,
          });
        }
      }
    });

    return result;
  }, [classes, streams, classSubjects, chapters, selectedClassFilter, selectedStreamFilter, selectedSubjectFilter, searchTerm, filterClassHasStreams]);

  // When search is active, automatically expand matching accordions
  useEffect(() => {
    if (searchTerm.trim()) {
      const autoClasses = {};
      const autoStreams = {};
      const autoSubjects = {};

      structuredHierarchy.forEach((classNode) => {
        if (classNode.hasMatches) {
          autoClasses[classNode.classId] = true;

          if (!classNode.isSenior && classNode.subjectGroups) {
            classNode.subjectGroups.forEach((sg) => {
              if (sg.hasMatches) autoSubjects[sg.subjectKey] = true;
            });
          } else if (classNode.isSenior && classNode.streamGroups) {
            classNode.streamGroups.forEach((stmNode) => {
              if (stmNode.hasMatches) {
                autoStreams[stmNode.streamKey] = true;
                if (stmNode.subjectGroups) {
                  stmNode.subjectGroups.forEach((sg) => {
                    if (sg.hasMatches) autoSubjects[sg.subjectKey] = true;
                  });
                }
              }
            });
          }
        }
      });

      setExpandedClasses((prev) => ({ ...prev, ...autoClasses }));
      setExpandedStreams((prev) => ({ ...prev, ...autoStreams }));
      setExpandedSubjects((prev) => ({ ...prev, ...autoSubjects }));
    }
  }, [searchTerm, structuredHierarchy]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingChapter(null);
    const initialClassId = classes[0]?.id || '';
    setFormClassId(initialClassId);
    setFormStreamId(streams[0]?.id || '');
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
      status: formStatus,
    };

    setIsSaving(true);
    try {
      if (editingChapter) {
        await updateChapter(editingChapter.id, payload, 'mono_math_01');
        toast.success(`Updated ${payload.name} successfully!`);
      } else {
        await createChapter(payload, 'mono_math_01');
        toast.success(`Created Chapter ${payload.chapterNumber}: ${payload.name}!`);

        // Automatically expand the added chapter path
        setExpandedClasses((prev) => ({ ...prev, [matchedSubject.classId]: true }));
        if (matchedSubject.streamId) {
          setExpandedStreams((prev) => ({ ...prev, [`${matchedSubject.classId}_${matchedSubject.streamId}`]: true }));
        }
      }
      setIsModalOpen(false);
      loadData();
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
      toast.success(`${ch.name} marked as ${ch.status === 'active' ? 'inactive' : 'active'}`);
      setChapters((prev) =>
        prev.map((c) =>
          c.id === ch.id
            ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' }
            : c
        )
      );
    } catch (err) {
      toast.error('Failed to change status');
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteChapter(deleteTarget.id);
      toast.success(`Deleted ${deleteTarget.name} successfully.`);
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete chapter');
    } finally {
      setIsDeleting(false);
    }
  };

  // Count total chapters visible
  const totalVisibleChapters = useMemo(() => {
    return structuredHierarchy.reduce((acc, node) => acc + (node.totalChapters || 0), 0);
  }, [structuredHierarchy]);

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
            Organize sequential chapters grouped by class, stream, and subject hierarchy.
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

      {/* Filter and Search Bar */}
      <div className="admin-card p-3 flex flex-col lg:flex-row items-center justify-between gap-2.5">
        <div className="w-full lg:w-64">
          <Input
            type="text"
            placeholder="Search chapter name (e.g. Real Numbers)..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs py-1.5"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Class Filter */}
          <div className="flex-1 sm:w-36">
            <Select
              value={selectedClassFilter}
              onChange={(e) => {
                setSelectedClassFilter(e.target.value);
                setSelectedStreamFilter('all');
                setSelectedSubjectFilter('all');
              }}
              options={[
                { value: 'all', label: 'All Classes' },
                ...classes.map((c) => ({ value: c.id, label: c.name })),
              ]}
              className="text-xs py-1.5"
            />
          </div>

          {/* Stream Filter */}
          {filterClassHasStreams && (
            <div className="w-full sm:w-36">
              <Select
                value={selectedStreamFilter}
                onChange={(e) => {
                  setSelectedStreamFilter(e.target.value);
                  setSelectedSubjectFilter('all');
                }}
                options={[
                  { value: 'all', label: 'All Streams' },
                  ...streams.map((s) => ({ value: s.id, label: s.name })),
                ]}
                className="text-xs py-1.5"
              />
            </div>
          )}

          {/* Subject Filter */}
          <div className="w-full sm:w-44">
            <Select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Subjects' },
                ...availableFilterSubjects.map((s) => ({
                  value: s.id,
                  label: s.streamName ? `${s.subjectName} (${s.streamName})` : s.subjectName,
                })),
              ]}
              className="text-xs py-1.5"
            />
          </div>

          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-primary-600 hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
            title="Refresh Chapters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Accordion Hierarchy List View */}
      {loading ? (
        <SkeletonLoader rows={5} />
      ) : structuredHierarchy.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No Chapters Found"
          description={
            searchTerm
              ? `No chapters matching "${searchTerm}". Try a different search.`
              : classSubjects.length === 0
              ? 'Please add subjects first from the Subjects page before adding chapters.'
              : 'Click Add Chapter button above to organize sequential chapters under a subject.'
          }
          actionLabel={classSubjects.length > 0 ? 'Add Chapter' : undefined}
          onAction={classSubjects.length > 0 ? handleOpenCreateModal : undefined}
        />
      ) : (
        <div className="space-y-3">
          {/* Result summary indicator */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong className="text-slate-700 font-semibold">{totalVisibleChapters}</strong> chapter{totalVisibleChapters !== 1 ? 's' : ''} across <strong className="text-slate-700 font-semibold">{structuredHierarchy.length}</strong> class{structuredHierarchy.length !== 1 ? 'es' : ''}
            </span>
            {searchTerm.trim() && (
              <span className="text-primary-600 font-medium bg-primary-50 px-2 py-0.5 rounded-md text-[11px]">
                Search filter active: matching chapters auto-expanded
              </span>
            )}
          </div>

          {/* Render Each Class Accordion */}
          {structuredHierarchy.map((classGroup) => {
            const isClassExpanded = expandedClasses[classGroup.classId] || Boolean(searchTerm.trim());

            return (
              <div
                key={classGroup.classId}
                className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden shadow-xs ${
                  isClassExpanded ? 'border-primary-200 ring-1 ring-primary-500/10' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* 1. Class Accordion Header Bar */}
                <button
                  type="button"
                  onClick={() => toggleClass(classGroup.classId)}
                  className={`w-full px-4 py-3 sm:py-3.5 flex items-center justify-between text-left transition-colors cursor-pointer select-none ${
                    isClassExpanded ? 'bg-slate-50/80 border-b border-slate-100' : 'bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      isClassExpanded ? 'bg-primary-50 text-primary-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isClassExpanded ? (
                        <FolderOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                      ) : (
                        <Folder className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-bold text-slate-900 shrink-0">
                          {classGroup.className}
                        </span>

                        {classGroup.isSenior ? (
                          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                            <Layers className="w-3 h-3" />
                            Stream-Based (11–12)
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {classGroup.totalChapters} Chapter{classGroup.totalChapters !== 1 ? 's' : ''}
                    </span>

                    <div className="text-slate-400">
                      {isClassExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </button>

                {/* 2. Class Accordion Body */}
                {isClassExpanded && (
                  <div className="divide-y divide-slate-100">
                    {/* A. For Direct Classes (Classes 6 to 10): List Subjects -> Chapters */}
                    {!classGroup.isSenior && (
                      <div className="p-2 sm:p-3 space-y-2 bg-slate-50/40">
                        {classGroup.subjectGroups.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400">
                            No chapters found under {classGroup.className}.
                          </div>
                        ) : (
                          classGroup.subjectGroups.map((subGroup) => {
                            const isSubExpanded =
                              expandedSubjects[subGroup.subjectKey] ?? (searchTerm.trim() ? true : false);

                            return (
                              <div
                                key={subGroup.subjectKey}
                                className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs"
                              >
                                {/* Subject Header Bar */}
                                <button
                                  type="button"
                                  onClick={() => toggleSubject(subGroup.subjectKey)}
                                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer select-none bg-slate-50/30"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                                    <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                                      {subGroup.subjectName}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                      {subGroup.totalChapters} Chapter{subGroup.totalChapters !== 1 ? 's' : ''}
                                    </span>
                                    <div className="text-slate-400">
                                      {isSubExpanded ? (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      )}
                                    </div>
                                  </div>
                                </button>

                                {/* Chapters List under Subject */}
                                {isSubExpanded && (
                                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                                    {subGroup.chapters.length === 0 ? (
                                      <div className="py-4 text-center text-xs text-slate-400">
                                        No chapters added yet under {subGroup.subjectName}.
                                      </div>
                                    ) : (
                                      subGroup.chapters.map((ch) => (
                                        <div
                                          key={ch.id}
                                          className="px-3.5 py-2 sm:py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-mono text-xs font-bold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md shrink-0">
                                              #{ch.chapterNumber}
                                            </span>
                                            <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                                              {ch.name}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                            <Badge variant={ch.status === 'active' ? 'active' : 'inactive'} className="text-[10px] py-0 px-2">
                                              {ch.status === 'active' ? 'Active' : 'Inactive'}
                                            </Badge>

                                            <div className="flex items-center gap-0.5">
                                              <button
                                                type="button"
                                                onClick={() => handleToggleStatus(ch)}
                                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                                  ch.status === 'active'
                                                    ? 'text-emerald-600 hover:bg-emerald-50'
                                                    : 'text-slate-400 hover:bg-slate-100'
                                                }`}
                                                title={ch.status === 'active' ? 'Deactivate' : 'Activate'}
                                              >
                                                {ch.status === 'active' ? (
                                                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                ) : (
                                                  <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                )}
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => handleOpenEditModal(ch)}
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                                title="Edit"
                                              >
                                                <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => setDeleteTarget(ch)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-status-error hover:bg-red-50 transition-colors cursor-pointer"
                                                title="Delete"
                                              >
                                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* B. For Senior Classes (Classes 11 & 12): Class -> Stream -> Subject -> Chapters */}
                    {classGroup.isSenior && (
                      <div className="p-2 sm:p-3 space-y-2 bg-slate-50/40">
                        {classGroup.streamGroups.map((streamGroup) => {
                          const isStreamExpanded =
                            expandedStreams[streamGroup.streamKey] ?? (searchTerm.trim() ? true : false);

                          return (
                            <div
                              key={streamGroup.streamKey}
                              className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs"
                            >
                              {/* Stream Header */}
                              <button
                                type="button"
                                onClick={() => toggleStream(streamGroup.streamKey)}
                                className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer select-none bg-purple-50/30"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Layers className="w-4 h-4 text-purple-600 shrink-0" />
                                  <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                                    {streamGroup.streamName}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                                    {streamGroup.totalChapters} Chapter{streamGroup.totalChapters !== 1 ? 's' : ''}
                                  </span>
                                  <div className="text-slate-400">
                                    {isStreamExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                  </div>
                                </div>
                              </button>

                              {/* Stream Subjects List */}
                              {isStreamExpanded && (
                                <div className="p-2 space-y-2 border-t border-slate-100 bg-slate-50/30">
                                  {streamGroup.subjectGroups.length === 0 ? (
                                    <div className="py-4 text-center text-xs text-slate-400">
                                      No chapters under {streamGroup.streamName} yet.
                                    </div>
                                  ) : (
                                    streamGroup.subjectGroups.map((subGroup) => {
                                      const isSubExpanded =
                                        expandedSubjects[subGroup.subjectKey] ?? (searchTerm.trim() ? true : false);

                                      return (
                                        <div
                                          key={subGroup.subjectKey}
                                          className="bg-white rounded-md border border-slate-200 overflow-hidden"
                                        >
                                          {/* Subject Header */}
                                          <button
                                            type="button"
                                            onClick={() => toggleSubject(subGroup.subjectKey)}
                                            className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer select-none"
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                              <span className="text-xs font-bold text-slate-800 truncate">
                                                {subGroup.subjectName}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                                {subGroup.totalChapters} Ch
                                              </span>
                                              <div className="text-slate-400">
                                                {isSubExpanded ? (
                                                  <ChevronDown className="w-3 h-3" />
                                                ) : (
                                                  <ChevronRight className="w-3 h-3" />
                                                )}
                                              </div>
                                            </div>
                                          </button>

                                          {/* Chapters List */}
                                          {isSubExpanded && (
                                            <div className="divide-y divide-slate-100 border-t border-slate-100">
                                              {subGroup.chapters.map((ch) => (
                                                <div
                                                  key={ch.id}
                                                  className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-slate-50/70 transition-colors"
                                                >
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded shrink-0">
                                                      #{ch.chapterNumber}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-900 truncate">
                                                      {ch.name}
                                                    </span>
                                                  </div>

                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                    <Badge variant={ch.status === 'active' ? 'active' : 'inactive'} className="text-[10px] py-0 px-1.5">
                                                      {ch.status === 'active' ? 'Active' : 'Inactive'}
                                                    </Badge>

                                                    <div className="flex items-center">
                                                      <button
                                                        type="button"
                                                        onClick={() => handleToggleStatus(ch)}
                                                        className={`p-1 rounded transition-colors cursor-pointer ${
                                                          ch.status === 'active'
                                                            ? 'text-emerald-600 hover:bg-emerald-50'
                                                            : 'text-slate-400 hover:bg-slate-100'
                                                        }`}
                                                        title={ch.status === 'active' ? 'Deactivate' : 'Activate'}
                                                      >
                                                        {ch.status === 'active' ? (
                                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                                        ) : (
                                                          <XCircle className="w-3.5 h-3.5" />
                                                        )}
                                                      </button>

                                                      <button
                                                        type="button"
                                                        onClick={() => handleOpenEditModal(ch)}
                                                        className="p-1 rounded text-slate-500 hover:text-primary-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                                        title="Edit"
                                                      >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                      </button>

                                                      <button
                                                        type="button"
                                                        onClick={() => setDeleteTarget(ch)}
                                                        className="p-1 rounded text-slate-400 hover:text-status-error hover:bg-red-50 transition-colors cursor-pointer"
                                                        title="Delete"
                                                      >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Chapter Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingChapter ? `Edit ${editingChapter.name}` : 'Add New Chapter'}
        subtitle="Specify sequential chapter number and chapter title under the subject."
      >
        <form onSubmit={handleSaveChapter} className="space-y-4">
          {/* Class Selector */}
          <Select
            label="Academic Class"
            value={formClassId}
            onChange={(e) => {
              setFormClassId(e.target.value);
            }}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
            required
          />

          {/* Stream Selector (If Senior Class 11 & 12) */}
          {formClassHasStreams && (
            <Select
              label="Academic Stream"
              value={formStreamId}
              onChange={(e) => setFormStreamId(e.target.value)}
              options={streams.map((s) => ({ value: s.id, label: s.name }))}
              required
            />
          )}

          {/* Subject Selector under the selected context */}
          <Select
            label="Subject"
            value={formClassSubjectId}
            onChange={(e) => setFormClassSubjectId(e.target.value)}
            options={availableFormSubjects.map((s) => ({
              value: s.id,
              label: s.subjectName,
            }))}
            helperText={availableFormSubjects.length === 0 ? 'No subjects mapped to this class/stream yet.' : undefined}
            required
          />

          <div className="grid grid-cols-3 gap-3">
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

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
