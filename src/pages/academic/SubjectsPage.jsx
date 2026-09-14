import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Layers,
  GraduationCap,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchClassSubjects,
  mapSubjectToClass,
  updateClassSubject,
  unmapSubjectFromClass,
  toggleClassSubjectStatus,
  STANDARD_SUBJECTS,
  STANDARD_BOARDS,
} from '../../services/subjectService';
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

export const SubjectsPage = () => {
  const [classSubjects, setClassSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [selectedStreamFilter, setSelectedStreamFilter] = useState('all');
  const [selectedBoardFilter, setSelectedBoardFilter] = useState('all'); // 'all' | 'CBSE' | 'BSEB'
  const [searchTerm, setSearchTerm] = useState('');

  // Accordion Expand/Collapse State (keyed by classId or classId_streamId)
  const [expandedClasses, setExpandedClasses] = useState({});
  const [expandedStreams, setExpandedStreams] = useState({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);

  // Form states
  const [formClassId, setFormClassId] = useState('');
  const [formStreamId, setFormStreamId] = useState('');
  const [formBoard, setFormBoard] = useState('ALL'); // 'ALL' | 'CBSE' | 'BSEB'
  const [formSubjectName, setFormSubjectName] = useState('Mathematics');
  const [formCustomSubject, setFormCustomSubject] = useState('');
  const [formStatus, setFormStatus] = useState('active');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subjectsData, classesData, streamsData] = await Promise.all([
        fetchClassSubjects('mono_math_01'),
        fetchClasses('mono_math_01'),
        fetchStreams('mono_math_01'),
      ]);
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
      toast.error('Failed to load academic subjects data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Class info helpers
  const activeClassFilterObj = classes.find((c) => c.id === selectedClassFilter);
  const filterClassHasStreams =
    activeClassFilterObj?.hasStreams ||
    activeClassFilterObj?.name?.includes('11') ||
    activeClassFilterObj?.name?.includes('12');

  const formClassObj = classes.find((c) => c.id === formClassId);
  const formClassHasStreams =
    formClassObj?.hasStreams ||
    formClassObj?.name?.includes('11') ||
    formClassObj?.name?.includes('12');

  // Toggle Class Accordion
  const toggleClassAccordion = (classId) => {
    setExpandedClasses((prev) => ({
      ...prev,
      [classId]: !prev[classId],
    }));
  };

  // Toggle Stream Accordion
  const toggleStreamAccordion = (streamKey) => {
    setExpandedStreams((prev) => ({
      ...prev,
      [streamKey]: !prev[streamKey],
    }));
  };

  // Group and structure subjects hierarchically:
  // Classes 6-10: Class -> Direct Subjects
  // Classes 11-12: Class -> Streams -> Subjects
  const structuredHierarchy = useMemo(() => {
    const trimmedSearch = searchTerm.trim().toLowerCase();

    // 1. Filter classes list based on selectedClassFilter
    let targetClasses = classes.filter((cls) => {
      if (selectedClassFilter !== 'all' && cls.id !== selectedClassFilter) {
        return false;
      }
      return true;
    });

    // Sort classes by orderIndex ascending
    targetClasses.sort((a, b) => (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0));

    // 2. Build structured tree
    const result = [];

    targetClasses.forEach((cls) => {
      const isSenior = cls.hasStreams || cls.name.includes('11') || cls.name.includes('12');
      let allClassSubjects = classSubjects.filter((s) => s.classId === cls.id);

      // Filter by Board if selected
      if (selectedBoardFilter !== 'all') {
        allClassSubjects = allClassSubjects.filter((s) => {
          const sBoard = (s.board || 'ALL').toUpperCase();
          return sBoard === selectedBoardFilter || sBoard === 'ALL';
        });
      }

      if (!isSenior) {
        // Classes 6-10: Direct Subjects
        let subjects = allClassSubjects.filter((s) => {
          if (trimmedSearch && !(s.subjectName || '').toLowerCase().includes(trimmedSearch)) {
            return false;
          }
          return true;
        });

        subjects.sort((a, b) => (a.subjectName || '').localeCompare(b.subjectName || ''));

        // Include this class if it has subjects or if no search is active
        if (!trimmedSearch || subjects.length > 0) {
          result.push({
            classId: cls.id,
            className: cls.name,
            isSenior: false,
            totalSubjects: subjects.length,
            subjects,
            hasMatches: trimmedSearch.length > 0 && subjects.length > 0,
          });
        }
      } else {
        // Classes 11-12: Stream -> Subjects Grouping
        const streamGroups = [];
        let seniorTotalMatchingSubjects = 0;

        // Streams to evaluate
        const targetStreams = streams.filter((stm) => {
          if (filterClassHasStreams && selectedStreamFilter !== 'all' && stm.id !== selectedStreamFilter) {
            return false;
          }
          return true;
        });

        targetStreams.sort((a, b) => (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0));

        targetStreams.forEach((stm) => {
          let streamSubjects = allClassSubjects.filter((s) => {
            // Match stream either by streamId or by streamName
            const matchStream =
              s.streamId === stm.id ||
              (s.streamName && s.streamName.toLowerCase() === stm.name.toLowerCase());
            if (!matchStream) return false;

            if (trimmedSearch && !(s.subjectName || '').toLowerCase().includes(trimmedSearch)) {
              return false;
            }
            return true;
          });

          streamSubjects.sort((a, b) => (a.subjectName || '').localeCompare(b.subjectName || ''));
          seniorTotalMatchingSubjects += streamSubjects.length;

          if (!trimmedSearch || streamSubjects.length > 0) {
            streamGroups.push({
              streamId: stm.id,
              streamName: stm.name,
              streamKey: `${cls.id}_${stm.id}`,
              totalSubjects: streamSubjects.length,
              subjects: streamSubjects,
              hasMatches: trimmedSearch.length > 0 && streamSubjects.length > 0,
            });
          }
        });

        // Also check if any direct subjects exist under this class without a stream
        const unassignedSubjects = allClassSubjects.filter((s) => !s.streamId && !s.streamName);
        if (unassignedSubjects.length > 0) {
          let matchingUnassigned = unassignedSubjects.filter((s) => {
            if (trimmedSearch && !(s.subjectName || '').toLowerCase().includes(trimmedSearch)) {
              return false;
            }
            return true;
          });
          if (!trimmedSearch || matchingUnassigned.length > 0) {
            streamGroups.push({
              streamId: 'direct',
              streamName: 'General / Common Subjects',
              streamKey: `${cls.id}_direct`,
              totalSubjects: matchingUnassigned.length,
              subjects: matchingUnassigned,
              hasMatches: trimmedSearch.length > 0 && matchingUnassigned.length > 0,
            });
          }
        }

        if (!trimmedSearch || seniorTotalMatchingSubjects > 0) {
          result.push({
            classId: cls.id,
            className: cls.name,
            isSenior: true,
            totalSubjects: seniorTotalMatchingSubjects,
            streamGroups,
            hasMatches: trimmedSearch.length > 0 && seniorTotalMatchingSubjects > 0,
          });
        }
      }
    });

    return result;
  }, [classes, streams, classSubjects, selectedClassFilter, selectedStreamFilter, selectedBoardFilter, searchTerm, filterClassHasStreams]);

  // When search is active, automatically expand matching accordions
  useEffect(() => {
    if (searchTerm.trim()) {
      const autoExpandedClasses = {};
      const autoExpandedStreams = {};

      structuredHierarchy.forEach((node) => {
        if (node.hasMatches) {
          autoExpandedClasses[node.classId] = true;
          if (node.isSenior && node.streamGroups) {
            node.streamGroups.forEach((sg) => {
              if (sg.hasMatches) {
                autoExpandedStreams[sg.streamKey] = true;
              }
            });
          }
        }
      });

      setExpandedClasses((prev) => ({ ...prev, ...autoExpandedClasses }));
      setExpandedStreams((prev) => ({ ...prev, ...autoExpandedStreams }));
    }
  }, [searchTerm, structuredHierarchy]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingMapping(null);
    const initialClassId = classes[0]?.id || '';
    setFormClassId(initialClassId);
    setFormStreamId(streams[0]?.id || '');
    setFormBoard(selectedBoardFilter !== 'all' ? selectedBoardFilter : 'ALL');
    setFormSubjectName(STANDARD_SUBJECTS[0]);
    setFormCustomSubject('');
    setFormStatus('active');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item) => {
    setEditingMapping(item);
    setFormClassId(item.classId);
    setFormStreamId(item.streamId || '');
    setFormBoard(item.board || 'ALL');
    if (STANDARD_SUBJECTS.includes(item.subjectName)) {
      setFormSubjectName(item.subjectName);
      setFormCustomSubject('');
    } else {
      setFormSubjectName('Other');
      setFormCustomSubject(item.subjectName);
    }
    setFormStatus(item.status || 'active');
    setIsModalOpen(true);
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();

    const finalSubjectName =
      formSubjectName === 'Other' ? formCustomSubject.trim() : formSubjectName.trim();

    if (!finalSubjectName) {
      toast.error('Please specify a valid subject name.');
      return;
    }

    const cls = classes.find((c) => c.id === formClassId);
    if (!cls) {
      toast.error('Please select a valid academic class.');
      return;
    }

    const isSeniorClass = cls.hasStreams || cls.name.includes('11') || cls.name.includes('12');
    const stm = isSeniorClass ? streams.find((s) => s.id === formStreamId) : null;

    if (isSeniorClass && !stm && streams.length > 0) {
      toast.error('Please select a stream for Class 11 / 12.');
      return;
    }

    // Strict Uniqueness Check on Edit and Create
    const isDuplicate = classSubjects.some(
      (m) =>
        m.classId === cls.id &&
        (isSeniorClass ? m.streamId === (stm ? stm.id : null) : true) &&
        (m.board || 'ALL') === formBoard &&
        (m.subjectName || '').toLowerCase() === finalSubjectName.toLowerCase() &&
        (!editingMapping || m.id !== editingMapping.id)
    );

    if (isDuplicate) {
      const boardLabel = formBoard === 'ALL' ? 'Both Boards' : formBoard;
      const context = stm ? `${cls.name} (${stm.name}) [${boardLabel}]` : `${cls.name} [${boardLabel}]`;
      toast.error(`"${finalSubjectName}" is already mapped to ${context}. Duplicate subjects are not allowed.`);
      return;
    }

    const payload = {
      classId: cls.id,
      className: cls.name,
      streamId: stm ? stm.id : null,
      streamName: stm ? stm.name : null,
      subjectName: finalSubjectName,
      board: formBoard,
      status: formStatus,
    };

    setIsSaving(true);
    try {
      if (editingMapping) {
        await updateClassSubject(editingMapping.id, payload);
        toast.success(`Updated ${payload.subjectName} successfully!`);
      } else {
        await mapSubjectToClass(payload, 'mono_math_01');
        toast.success(`Added ${payload.subjectName} to ${payload.className}!`);

        // Automatically expand the added class accordion
        setExpandedClasses((prev) => ({ ...prev, [cls.id]: true }));
        if (stm) {
          setExpandedStreams((prev) => ({ ...prev, [`${cls.id}_${stm.id}`]: true }));
        }
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to save subject');
    } finally {
      setIsSaving(false);
    }
  };

  // Status Toggle
  const handleToggleStatus = async (item) => {
    try {
      await toggleClassSubjectStatus(item.id, item.status);
      toast.success(`${item.subjectName} marked as ${item.status === 'active' ? 'inactive' : 'active'}`);
      setClassSubjects((prev) =>
        prev.map((s) =>
          s.id === item.id
            ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' }
            : s
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
      await unmapSubjectFromClass(deleteTarget.id);
      toast.success(`Removed ${deleteTarget.subjectName} from ${deleteTarget.className}.`);
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to remove subject');
    } finally {
      setIsDeleting(false);
    }
  };

  // Count total subjects displayed
  const totalVisibleSubjects = useMemo(() => {
    return structuredHierarchy.reduce((acc, node) => acc + (node.totalSubjects || 0), 0);
  }, [structuredHierarchy]);

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            Subject Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize academic subjects grouped by class and stream hierarchy.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={handleOpenCreateModal}
          disabled={classes.length === 0}
          className="w-full sm:w-auto shadow-xs"
        >
          Add Subject
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-card !p-2 sm:!p-3 flex flex-col md:flex-row items-center justify-between gap-1.5 sm:gap-2.5">
        <div className="w-full md:w-72">
          <Input
            type="text"
            placeholder="Search subject name (e.g. Mathematics)..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs py-1 sm:py-1.5"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full md:w-auto">
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

          {/* Class Filter */}
          <div className="flex-1 sm:w-44">
            <Select
              value={selectedClassFilter}
              onChange={(e) => {
                setSelectedClassFilter(e.target.value);
                setSelectedStreamFilter('all');
              }}
              options={[
                { value: 'all', label: 'All Classes (6–12)' },
                ...classes.map((c) => ({ value: c.id, label: c.name })),
              ]}
              className="text-xs py-1 sm:py-1.5"
            />
          </div>

          {/* Stream Filter (Only shown when Class 11/12 is selected or available) */}
          {filterClassHasStreams && (
            <div className="w-full sm:w-40">
              <Select
                value={selectedStreamFilter}
                onChange={(e) => setSelectedStreamFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Streams' },
                  ...streams.map((s) => ({ value: s.id, label: s.name })),
                ]}
                className="text-xs py-1 sm:py-1.5"
              />
            </div>
          )}

          <button
            type="button"
            onClick={loadData}
            className="p-1.5 sm:p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-primary-600 hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
            title="Refresh Subjects"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Accordion Hierarchy List View */}
      {loading ? (
        <SkeletonLoader rows={5} />
      ) : structuredHierarchy.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Subjects Found"
          description={
            searchTerm
              ? `No subjects matching "${searchTerm}". Try a different keyword.`
              : classes.length === 0
              ? 'Please add classes first from the Classes page before adding subjects.'
              : 'Click Add Subject button above to map subjects to classes and streams.'
          }
          actionLabel={classes.length > 0 ? 'Add Subject' : undefined}
          onAction={classes.length > 0 ? handleOpenCreateModal : undefined}
        />
      ) : (
        <div className="space-y-1.5 sm:space-y-3">
          {/* Result summary indicator */}
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 px-1">
            <span>
              Showing <strong className="text-slate-700 font-semibold">{totalVisibleSubjects}</strong> subject{totalVisibleSubjects !== 1 ? 's' : ''} across <strong className="text-slate-700 font-semibold">{structuredHierarchy.length}</strong> class{structuredHierarchy.length !== 1 ? 'es' : ''}
            </span>
            {searchTerm.trim() && (
              <span className="text-primary-600 font-medium bg-primary-50 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md text-[10px] sm:text-[11px]">
                Search active
              </span>
            )}
          </div>

          {/* Render Each Class Accordion */}
          {structuredHierarchy.map((classGroup) => {
            const isClassExpanded = expandedClasses[classGroup.classId] || Boolean(searchTerm.trim());

            return (
              <div
                key={classGroup.classId}
                className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                  isClassExpanded ? 'border-primary-200 ring-1 ring-primary-500/10' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* 1. Class Accordion Header Bar */}
                <button
                  type="button"
                  onClick={() => toggleClassAccordion(classGroup.classId)}
                  className={`w-full px-2.5 sm:px-4 py-2 sm:py-3 flex items-center justify-between text-left transition-colors cursor-pointer select-none ${
                    isClassExpanded ? 'bg-slate-50/80 border-b border-slate-100' : 'bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className={`p-1 sm:p-1.5 rounded-lg transition-colors ${
                      isClassExpanded ? 'bg-primary-50 text-primary-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isClassExpanded ? (
                        <FolderOpen className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                      ) : (
                        <Folder className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-xs sm:text-base font-bold text-slate-900 shrink-0">
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

                  <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                    <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.2 sm:px-2.5 sm:py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {classGroup.totalSubjects} Subject{classGroup.totalSubjects !== 1 ? 's' : ''}
                    </span>

                    <div className="text-slate-400">
                      {isClassExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </div>
                  </div>
                </button>

                {/* 2. Class Accordion Body Content */}
                {isClassExpanded && (
                  <div className="divide-y divide-slate-100">
                    {/* A. For Direct Classes (Classes 6 to 10) */}
                    {!classGroup.isSenior && (
                      <div>
                        {classGroup.subjects.length === 0 ? (
                          <div className="py-4 sm:py-6 text-center text-xs text-slate-400">
                            No subjects mapped to {classGroup.className} yet.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {classGroup.subjects.map((sub) => (
                              <div
                                key={sub.id}
                                className="px-2.5 sm:px-4 py-1.5 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3 hover:bg-slate-50/70 transition-colors"
                              >
                                {/* Subject Name & Icon */}
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                                    {sub.subjectName?.charAt(0) || 'S'}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs sm:text-sm font-semibold text-slate-900 block truncate">
                                        {sub.subjectName}
                                      </span>
                                      <span
                                        className={`text-[10px] font-bold px-1.5 py-0.2 sm:py-0.5 rounded ${
                                          sub.board === 'CBSE'
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : sub.board === 'BSEB'
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        }`}
                                      >
                                        {sub.board === 'CBSE' ? 'CBSE' : sub.board === 'BSEB' ? 'BSEB' : 'All Boards'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                                  <Badge variant={sub.status === 'active' ? 'active' : 'inactive'} dot size="sm">
                                    {sub.status === 'active' ? 'Active' : 'Inactive'}
                                  </Badge>

                                  <div className="flex items-center gap-0.5 sm:gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatus(sub)}
                                      className={`p-1 sm:p-1.5 rounded-md cursor-pointer ${
                                        sub.status === 'active'
                                          ? 'text-emerald-600 hover:bg-emerald-50'
                                          : 'text-slate-400 hover:bg-slate-100'
                                      }`}
                                      title={sub.status === 'active' ? 'Deactivate Subject' : 'Activate Subject'}
                                    >
                                      {sub.status === 'active' ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                      ) : (
                                        <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(sub)}
                                      className="p-1 sm:p-1.5 rounded-md text-slate-500 hover:text-primary-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                      title="Edit Subject"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setDeleteTarget(sub)}
                                      className="p-1 sm:p-1.5 rounded-md text-slate-400 hover:text-status-error hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Delete Subject"
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
                    )}

                    {/* B. For Senior Classes (Classes 11 & 12): Nested Stream Accordions */}
                    {classGroup.isSenior && (
                      <div className="p-2 sm:p-3 space-y-2 bg-slate-50/40">
                        {classGroup.streamGroups.map((streamGroup) => {
                          const isStreamExpanded =
                            Boolean(expandedStreams[streamGroup.streamKey]) ||
                            (Boolean(searchTerm.trim()) && streamGroup.hasMatches);

                          return (
                            <div
                              key={streamGroup.streamKey}
                              className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs"
                            >
                              {/* Stream Nested Header */}
                              <button
                                type="button"
                                onClick={() => toggleStreamAccordion(streamGroup.streamKey)}
                                className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer select-none bg-slate-50/30"
                              >
                                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                  <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
                                  <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                                    {streamGroup.streamName}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                  <span className="text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                                    {streamGroup.totalSubjects} Subject{streamGroup.totalSubjects !== 1 ? 's' : ''}
                                  </span>
                                  <div className="text-slate-400">
                                    {isStreamExpanded ? (
                                      <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    )}
                                  </div>
                                </div>
                              </button>

                              {/* Stream Subjects List */}
                              {isStreamExpanded && (
                                <div className="divide-y divide-slate-100 border-t border-slate-100">
                                  {streamGroup.subjects.length === 0 ? (
                                    <div className="py-3 text-center text-xs text-slate-400">
                                      No subjects mapped under {streamGroup.streamName} yet.
                                    </div>
                                  ) : (
                                    streamGroup.subjects.map((sub) => (
                                      <div
                                        key={sub.id}
                                        className="px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3 hover:bg-slate-50/70 transition-colors"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className="w-6 h-6 rounded-md bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-bold text-[11px] shrink-0">
                                            {sub.subjectName?.charAt(0) || 'S'}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                                                {sub.subjectName}
                                              </span>
                                              <span
                                                className={`text-[10px] font-bold px-1.5 py-0.2 sm:py-0.5 rounded ${
                                                  sub.board === 'CBSE'
                                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                    : sub.board === 'BSEB'
                                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                }`}
                                              >
                                                {sub.board === 'CBSE' ? 'CBSE' : sub.board === 'BSEB' ? 'BSEB' : 'All Boards'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                                          <Badge variant={sub.status === 'active' ? 'active' : 'inactive'} dot size="sm">
                                            {sub.status === 'active' ? 'Active' : 'Inactive'}
                                          </Badge>

                                          <div className="flex items-center gap-0.5">
                                            <button
                                              type="button"
                                              onClick={() => handleToggleStatus(sub)}
                                              className={`p-1 sm:p-1.5 rounded-md cursor-pointer ${
                                                sub.status === 'active'
                                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                                  : 'text-slate-400 hover:bg-slate-100'
                                              }`}
                                              title={sub.status === 'active' ? 'Deactivate' : 'Activate'}
                                            >
                                              {sub.status === 'active' ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                              ) : (
                                                <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                              )}
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => handleOpenEditModal(sub)}
                                              className="p-1 sm:p-1.5 rounded-md text-slate-500 hover:text-primary-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                              title="Edit"
                                            >
                                              <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => setDeleteTarget(sub)}
                                              className="p-1 sm:p-1.5 rounded-md text-slate-400 hover:text-status-error hover:bg-red-50 transition-colors cursor-pointer"
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

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingMapping ? `Edit ${editingMapping.subjectName}` : 'Add Academic Subject'}
        subtitle="Map a subject to a class (and stream for senior classes)."
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          {/* Class Selector */}
          <Select
            label="Academic Class"
            value={formClassId}
            onChange={(e) => setFormClassId(e.target.value)}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
            required
          />

          {/* Stream Selector (Dynamically shown ONLY for Class 11 & 12) */}
          {formClassHasStreams && (
            <Select
              label="Academic Stream (Science, Commerce, Arts)"
              value={formStreamId}
              onChange={(e) => setFormStreamId(e.target.value)}
              options={streams.map((s) => ({ value: s.id, label: s.name }))}
              helperText="Strict Rule: Classes 11 and 12 require stream association."
              required
            />
          )}

          {/* Educational Board Selector */}
          <Select
            label="Educational Board"
            value={formBoard}
            onChange={(e) => setFormBoard(e.target.value)}
            options={STANDARD_BOARDS.map((b) => ({ value: b.id, label: b.name }))}
            helperText="Select CBSE, BSEB (Bihar Board), or Both Boards (Common)."
            required
          />

          {/* Subject Name Selector */}
          <Select
            label="Select Subject"
            value={formSubjectName}
            onChange={(e) => setFormSubjectName(e.target.value)}
            options={[
              ...STANDARD_SUBJECTS.map((s) => ({ value: s, label: s })),
              { value: 'Other', label: '+ Other (Custom Subject Name)' },
            ]}
            required
          />

          {/* Custom Subject Name Input (shown if 'Other' selected) */}
          {formSubjectName === 'Other' && (
            <Input
              label="Custom Subject Name"
              placeholder="e.g. Applied Mathematics"
              value={formCustomSubject}
              onChange={(e) => setFormCustomSubject(e.target.value)}
              required
              autoFocus
            />
          )}

          <Select
            label="Subject Status"
            value={formStatus}
            onChange={(e) => setFormStatus(e.target.value)}
            options={[
              { value: 'active', label: 'Active (Visible in App)' },
              { value: 'inactive', label: 'Inactive (Hidden in App)' },
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
              disabled={isSaving}
            >
              {editingMapping ? 'Save Changes' : 'Add Subject'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Subject Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Remove Subject"
        message={`Are you sure you want to remove "${deleteTarget?.subjectName}" from ${deleteTarget?.className}?`}
        confirmText="Remove Subject"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
