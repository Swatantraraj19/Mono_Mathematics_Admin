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
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchClassSubjects,
  mapSubjectToClass,
  updateClassSubject,
  unmapSubjectFromClass,
  toggleClassSubjectStatus,
  STANDARD_SUBJECTS,
} from '../../services/subjectService';
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

export const SubjectsPage = () => {
  const [classSubjects, setClassSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [selectedStreamFilter, setSelectedStreamFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);

  // Form states
  const [formClassId, setFormClassId] = useState('');
  const [formStreamId, setFormStreamId] = useState('');
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

  // Determine if the selected class in filter has streams (Classes 11 & 12)
  const activeClassObj = classes.find((c) => c.id === selectedClassFilter);
  const filterClassHasStreams = activeClassObj?.hasStreams || activeClassObj?.name?.includes('11') || activeClassObj?.name?.includes('12');

  // Determine if the form's selected class has streams
  const formClassObj = classes.find((c) => c.id === formClassId);
  const formClassHasStreams = formClassObj?.hasStreams || formClassObj?.name?.includes('11') || formClassObj?.name?.includes('12');

  // Filtered and Structured Subjects (Strict Class Order -> Stream -> Subject Name)
  const filteredSubjects = useMemo(() => {
    const list = classSubjects.filter((item) => {
      const matchesSearch = (item.subjectName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = selectedClassFilter === 'all' || item.classId === selectedClassFilter;
      const matchesStream =
        !filterClassHasStreams || selectedStreamFilter === 'all' || item.streamId === selectedStreamFilter;
      return matchesSearch && matchesClass && matchesStream;
    });

    const getClassOrder = (classId, className) => {
      const cls = classes.find((c) => c.id === classId);
      if (cls && typeof cls.orderIndex === 'number') return cls.orderIndex;
      const num = parseInt((className || '').replace(/[^0-9]/g, ''), 10);
      return isNaN(num) ? 99 : num;
    };

    return list.sort((a, b) => {
      const classDiff = getClassOrder(a.classId, a.className) - getClassOrder(b.classId, b.className);
      if (classDiff !== 0) return classDiff;

      const streamDiff = (a.streamName || '').localeCompare(b.streamName || '');
      if (streamDiff !== 0) return streamDiff;

      return (a.subjectName || '').localeCompare(b.subjectName || '');
    });
  }, [classSubjects, classes, searchTerm, selectedClassFilter, selectedStreamFilter, filterClassHasStreams]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingMapping(null);
    const initialClassId = classes[0]?.id || '';
    setFormClassId(initialClassId);
    setFormStreamId(streams[0]?.id || '');
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
        (m.subjectName || '').toLowerCase() === finalSubjectName.toLowerCase() &&
        (!editingMapping || m.id !== editingMapping.id)
    );

    if (isDuplicate) {
      const context = stm ? `${cls.name} (${stm.name})` : cls.name;
      toast.error(`"${finalSubjectName}" is already mapped to ${context}. Duplicate subjects are not allowed.`);
      return;
    }

    const payload = {
      classId: cls.id,
      className: cls.name,
      streamId: stm ? stm.id : null,
      streamName: stm ? stm.name : null,
      subjectName: finalSubjectName,
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
            Configure academic subjects mapped directly to Classes 6–10 and via Streams to Classes 11–12.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={handleOpenCreateModal}
          disabled={classes.length === 0}
          className="w-full sm:w-auto"
        >
          Add Subject
        </Button>
      </div>

      {/* Filter and Search Bar with Hierarchy Cascading */}
      <div className="admin-card p-3 flex flex-col md:flex-row items-center justify-between gap-2.5">
        <div className="w-full md:w-64">
          <Input
            type="text"
            placeholder="Search subject name..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs py-1.5"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Class Filter */}
          <div className="w-full sm:w-44">
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
              className="text-xs py-1.5"
            />
          </div>

          {/* Stream Filter */}
          {filterClassHasStreams && (
            <div className="w-full sm:w-40">
              <Select
                value={selectedStreamFilter}
                onChange={(e) => setSelectedStreamFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Streams' },
                  ...streams.map((s) => ({ value: s.id, label: s.name })),
                ]}
                className="text-xs py-1.5"
              />
            </div>
          )}

          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-primary-600 hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
            title="Refresh Subjects"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <SkeletonLoader rows={5} />
      ) : filteredSubjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Subjects Found"
          description={
            searchTerm
              ? `No subjects matching "${searchTerm}".`
              : classes.length === 0
              ? 'Please add classes first from the Classes page before adding subjects.'
              : 'Click Add Subject button above to map subjects to classes and streams.'
          }
          actionLabel={classes.length > 0 ? 'Add Subject' : undefined}
          onAction={classes.length > 0 ? handleOpenCreateModal : undefined}
        />
      ) : (
        <>
          {/* 1. Mobile Cards View (< 640px) */}
          <div className="grid grid-cols-1 gap-2.5 sm:hidden">
            {filteredSubjects.map((item) => (
              <div
                key={item.id}
                className="admin-card p-3.5 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                      {item.subjectName?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.subjectName}</h4>
                      <span className="text-[11px] text-slate-500 font-medium">{item.className}</span>
                    </div>
                  </div>

                  <Badge variant={item.status === 'active' ? 'active' : 'inactive'}>
                    {item.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                    <GraduationCap className="w-3 h-3 text-slate-500" />
                    {item.className}
                  </span>

                  {item.streamName && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      <Layers className="w-3 h-3" />
                      {item.streamName}
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(item)}
                    className={`text-xs font-semibold flex items-center gap-1 ${
                      item.status === 'active' ? 'text-slate-500' : 'text-emerald-600'
                    }`}
                  >
                    {item.status === 'active' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{item.status === 'active' ? 'Deactivate' : 'Activate'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
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
                  <Table.Head className="w-36">Class</Table.Head>
                  <Table.Head className="w-36">Stream</Table.Head>
                  <Table.Head>Subject Name</Table.Head>
                  <Table.Head className="w-28">Status</Table.Head>
                  <Table.Head className="text-right w-28 pr-6">Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredSubjects.map((item) => (
                  <Table.Row key={item.id}>
                    {/* Class */}
                    <Table.Cell>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-primary-700 border border-indigo-100">
                        <GraduationCap className="w-3.5 h-3.5" />
                        {item.className}
                      </span>
                    </Table.Cell>

                    {/* Stream */}
                    <Table.Cell>
                      {item.streamName ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          <Layers className="w-3 h-3" />
                          {item.streamName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">
                          Direct
                        </span>
                      )}
                    </Table.Cell>

                    {/* Subject Name */}
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                          {item.subjectName?.charAt(0) || 'S'}
                        </div>
                        <span className="text-sm font-bold text-slate-900">{item.subjectName}</span>
                      </div>
                    </Table.Cell>

                    {/* Status */}
                    <Table.Cell>
                      <Badge variant={item.status === 'active' ? 'active' : 'inactive'}>
                        {item.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Cell>

                    {/* Actions */}
                    <Table.Cell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        {/* Status Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            item.status === 'active'
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={item.status === 'active' ? 'Click to Deactivate' : 'Click to Activate'}
                        >
                          {item.status === 'active' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Edit Subject"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-status-error hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Subject"
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
