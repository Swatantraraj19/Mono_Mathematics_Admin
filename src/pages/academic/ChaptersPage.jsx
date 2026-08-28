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
import { Table } from '../../components/common/Table';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';

export const ChaptersPage = () => {
  const [chapters, setChapters] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [selectedStreamFilter, setSelectedStreamFilter] = useState('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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
  const filterClassHasStreams = activeFilterClass?.hasStreams || activeFilterClass?.name?.includes('11') || activeFilterClass?.name?.includes('12');

  // Subjects available under the selected filter class & stream
  const availableFilterSubjects = useMemo(() => {
    return classSubjects.filter((cs) => {
      if (selectedClassFilter !== 'all' && cs.classId !== selectedClassFilter) return false;
      if (filterClassHasStreams && selectedStreamFilter !== 'all' && cs.streamId !== selectedStreamFilter) return false;
      return true;
    });
  }, [classSubjects, selectedClassFilter, selectedStreamFilter, filterClassHasStreams]);

  // Form helpers
  const activeFormClass = classes.find((c) => c.id === formClassId);
  const formClassHasStreams = activeFormClass?.hasStreams || activeFormClass?.name?.includes('11') || activeFormClass?.name?.includes('12');

  const availableFormSubjects = useMemo(() => {
    return classSubjects.filter((cs) => {
      if (cs.classId !== formClassId) return false;
      if (formClassHasStreams && cs.streamId !== formStreamId) return false;
      return true;
    });
  }, [classSubjects, formClassId, formStreamId, formClassHasStreams]);

  // Auto-set the first available subject in form and calculate next chapter number
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

  // Filtered Chapters list sorted hierarchically: Class -> Stream -> Subject -> Chapter Number
  const filteredChapters = useMemo(() => {
    const list = chapters.filter((ch) => {
      const matchesSearch = (ch.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = selectedClassFilter === 'all' || ch.classId === selectedClassFilter;
      const matchesStream = !filterClassHasStreams || selectedStreamFilter === 'all' || ch.streamId === selectedStreamFilter;
      const matchesSubject = selectedSubjectFilter === 'all' || ch.classSubjectId === selectedSubjectFilter;
      return matchesSearch && matchesClass && matchesStream && matchesSubject;
    });

    const getClassNum = (name) => {
      const num = parseInt((name || '').replace(/[^0-9]/g, ''), 10);
      return isNaN(num) ? 99 : num;
    };

    return list.sort((a, b) => {
      const classDiff = getClassNum(a.className) - getClassNum(b.className);
      if (classDiff !== 0) return classDiff;

      const streamDiff = (a.streamName || '').localeCompare(b.streamName || '');
      if (streamDiff !== 0) return streamDiff;

      const subjectDiff = (a.subjectName || '').localeCompare(b.subjectName || '');
      if (subjectDiff !== 0) return subjectDiff;

      return (Number(a.chapterNumber) || 0) - (Number(b.chapterNumber) || 0);
    });
  }, [chapters, searchTerm, selectedClassFilter, selectedStreamFilter, selectedSubjectFilter, filterClassHasStreams]);

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
      toast.error('Please enter chapter name (e.g. Real Numbers).');
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
            Organize syllabus chapters sequentially under each class and subject curriculum.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={handleOpenCreateModal}
          disabled={classSubjects.length === 0}
          className="w-full sm:w-auto"
        >
          Add Chapter
        </Button>
      </div>

      {/* Filter and Search Bar with Full Cascade Selectors */}
      <div className="admin-card p-3 flex flex-col lg:flex-row items-center justify-between gap-2.5">
        <div className="w-full lg:w-56">
          <Input
            type="text"
            placeholder="Search chapter name..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs py-1.5"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Class Filter */}
          <div className="w-full sm:w-36">
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

          {/* Stream Filter (Shows only if senior class is active) */}
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

      {/* Content Area */}
      {loading ? (
        <SkeletonLoader rows={5} />
      ) : filteredChapters.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No Chapters Found"
          description={
            searchTerm
              ? `No chapters matching "${searchTerm}".`
              : classSubjects.length === 0
              ? 'Please add subjects first from the Subjects page before adding chapters.'
              : 'Click Add Chapter button above to organize sequential chapters under a subject.'
          }
          actionLabel={classSubjects.length > 0 ? 'Add Chapter' : undefined}
          onAction={classSubjects.length > 0 ? handleOpenCreateModal : undefined}
        />
      ) : (
        <>
          {/* 1. Mobile Cards View (< 640px) */}
          <div className="grid grid-cols-1 gap-2.5 sm:hidden">
            {filteredChapters.map((ch) => (
              <div
                key={ch.id}
                className="admin-card p-3.5 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs shrink-0">
                      #{ch.chapterNumber}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{ch.name}</h4>
                      <span className="text-[11px] text-primary-700 font-semibold">{ch.subjectName}</span>
                    </div>
                  </div>

                  <Badge variant={ch.status === 'active' ? 'active' : 'inactive'}>
                    {ch.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                    <GraduationCap className="w-3 h-3 text-slate-500" />
                    {ch.className}
                  </span>

                  {ch.streamName && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                      <Layers className="w-3 h-3" />
                      {ch.streamName}
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(ch)}
                    className={`text-xs font-semibold flex items-center gap-1 ${
                      ch.status === 'active' ? 'text-slate-500' : 'text-emerald-600'
                    }`}
                  >
                    {ch.status === 'active' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{ch.status === 'active' ? 'Deactivate' : 'Activate'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(ch)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(ch)}
                      className="p-1.5 rounded-lg text-status-error hover:bg-red-50 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 2. Desktop Table View (>= 640px) */}
          <div className="hidden sm:block">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head className="w-20">Ch #</Table.Head>
                  <Table.Head>Chapter Name</Table.Head>
                  <Table.Head>Subject</Table.Head>
                  <Table.Head>Class / Stream</Table.Head>
                  <Table.Head className="w-28">Status</Table.Head>
                  <Table.Head className="text-right w-28 pr-6">Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredChapters.map((ch) => (
                  <Table.Row key={ch.id}>
                    <Table.Cell>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
                        #{ch.chapterNumber}
                      </span>
                    </Table.Cell>

                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{ch.name}</span>
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                        <span className="text-xs font-semibold text-slate-800">{ch.subjectName}</span>
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          {ch.className}
                        </span>

                        {ch.streamName && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            <Layers className="w-3 h-3" />
                            {ch.streamName}
                          </span>
                        )}
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      <Badge variant={ch.status === 'active' ? 'active' : 'inactive'}>
                        {ch.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Cell>

                    <Table.Cell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        {/* Status Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(ch)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            ch.status === 'active'
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={ch.status === 'active' ? 'Click to Deactivate' : 'Click to Activate'}
                        >
                          {ch.status === 'active' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(ch)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Edit Chapter"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(ch)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-status-error hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Chapter"
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
