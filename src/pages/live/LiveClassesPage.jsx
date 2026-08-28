import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  Plus,
  Search,
  Calendar,
  Clock,
  Video,
  ExternalLink,
  Edit2,
  Trash2,
  XCircle,
  CheckCircle2,
  Layers,
  GraduationCap,
  BookOpen,
  RefreshCw,
  AlertCircle,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchLiveClasses,
  createLiveClass,
  updateLiveClass,
  cancelLiveClass,
  deleteLiveClass,
  isValidMeetingUrl,
} from '../../services/liveClassService';
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

export const LiveClassesPage = () => {
  const [liveClasses, setLiveClasses] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter and Tabs State
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'live' | 'upcoming' | 'completed' | 'cancelled'
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [selectedStreamFilter, setSelectedStreamFilter] = useState('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingLiveClass, setEditingLiveClass] = useState(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formStreamId, setFormStreamId] = useState('');
  const [formClassSubjectId, setFormClassSubjectId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('17:00');
  const [formEndTime, setFormEndTime] = useState('18:00');
  const [formZoomUrl, setFormZoomUrl] = useState('');

  // Cancel & Delete Modal State
  const [cancelTarget, setCancelTarget] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Format today's date in YYYY-MM-DD for form default
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [liveClassesData, subjectsData, classesData, streamsData] = await Promise.all([
        fetchLiveClasses('mono_math_01'),
        fetchClassSubjects('mono_math_01'),
        fetchClasses('mono_math_01'),
        fetchStreams('mono_math_01'),
      ]);

      setLiveClasses(liveClassesData);
      setClassSubjects(subjectsData);
      setClasses(classesData);
      setStreams(streamsData);

      if (classesData.length > 0 && !formClassId) {
        setFormClassId(classesData[0].id);
      }
      if (streamsData.length > 0 && !formStreamId) {
        setFormStreamId(streamsData[0].id);
      }
      if (!formDate) {
        setFormDate(getTodayDateString());
      }
    } catch (err) {
      toast.error('Failed to load live classes data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Helpers
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

  // Form Helpers
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

  useEffect(() => {
    if (availableFormSubjects.length > 0) {
      if (!availableFormSubjects.some((s) => s.id === formClassSubjectId)) {
        setFormClassSubjectId(availableFormSubjects[0].id);
      }
    } else {
      setFormClassSubjectId('');
    }
  }, [availableFormSubjects, formClassSubjectId]);

  // Computed Filtered List
  const filteredLiveClasses = useMemo(() => {
    const trimmedSearch = searchTerm.trim().toLowerCase();

    return liveClasses.filter((lc) => {
      // 1. Status Tab Filter
      if (activeTab !== 'all' && lc.computedStatus !== activeTab) {
        return false;
      }

      // 2. Class Filter
      if (selectedClassFilter !== 'all' && lc.classId !== selectedClassFilter) {
        return false;
      }

      // 3. Stream Filter (if 11/12)
      if (filterClassHasStreams && selectedStreamFilter !== 'all' && lc.streamId !== selectedStreamFilter) {
        return false;
      }

      // 4. Subject Filter
      if (selectedSubjectFilter !== 'all' && lc.classSubjectId !== selectedSubjectFilter) {
        return false;
      }

      // 5. Search Filter
      if (trimmedSearch) {
        const titleMatch = (lc.title || '').toLowerCase().includes(trimmedSearch);
        const subjectMatch = (lc.subjectName || '').toLowerCase().includes(trimmedSearch);
        const classMatch = (lc.className || '').toLowerCase().includes(trimmedSearch);
        if (!titleMatch && !subjectMatch && !classMatch) return false;
      }

      return true;
    });
  }, [liveClasses, activeTab, selectedClassFilter, selectedStreamFilter, selectedSubjectFilter, searchTerm, filterClassHasStreams]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: liveClasses.length,
      live: liveClasses.filter((lc) => lc.computedStatus === 'live').length,
      upcoming: liveClasses.filter((lc) => lc.computedStatus === 'upcoming').length,
      completed: liveClasses.filter((lc) => lc.computedStatus === 'completed').length,
      cancelled: liveClasses.filter((lc) => lc.computedStatus === 'cancelled').length,
    };
  }, [liveClasses]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingLiveClass(null);
    setFormTitle('');
    const initialClassId = classes[0]?.id || '';
    setFormClassId(initialClassId);
    setFormStreamId(streams[0]?.id || '');
    setFormDate(getTodayDateString());
    setFormStartTime('17:00');
    setFormEndTime('18:00');
    setFormZoomUrl('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (lc) => {
    setEditingLiveClass(lc);
    setFormTitle(lc.title);
    setFormClassId(lc.classId);
    setFormStreamId(lc.streamId || '');
    setFormClassSubjectId(lc.classSubjectId);
    setFormDate(lc.date);
    setFormStartTime(lc.startTime);
    setFormEndTime(lc.endTime);
    setFormZoomUrl(lc.zoomUrl);
    setIsModalOpen(true);
  };

  // Save / Submit Live Class
  const handleSaveLiveClass = async (e) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      toast.error('Please enter a live class topic/title.');
      return;
    }

    if (!formClassSubjectId) {
      toast.error('Please select an academic subject.');
      return;
    }

    if (!formDate || !formStartTime || !formEndTime) {
      toast.error('Please provide valid date, start time, and end time.');
      return;
    }

    if (formStartTime >= formEndTime) {
      toast.error('End time must be later than start time.');
      return;
    }

    if (!isValidMeetingUrl(formZoomUrl)) {
      toast.error('Please enter a valid Zoom meeting URL.');
      return;
    }

    const matchedSubject = classSubjects.find((cs) => cs.id === formClassSubjectId);
    if (!matchedSubject) {
      toast.error('Selected subject not found.');
      return;
    }

    const payload = {
      title: formTitle.trim(),
      classId: matchedSubject.classId,
      className: matchedSubject.className,
      streamId: matchedSubject.streamId || null,
      streamName: matchedSubject.streamName || null,
      subjectId: matchedSubject.subjectId,
      subjectName: matchedSubject.subjectName,
      classSubjectId: matchedSubject.id,
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      zoomUrl: formZoomUrl.trim(),
    };

    setIsSaving(true);
    try {
      if (editingLiveClass) {
        await updateLiveClass(editingLiveClass.id, payload);
        toast.success(`Updated "${payload.title}" successfully!`);
      } else {
        await createLiveClass(payload, 'mono_math_01');
        toast.success(`Scheduled live class "${payload.title}"!`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to save live class');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel Live Class
  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      await cancelLiveClass(cancelTarget.id);
      toast.success(`Session "${cancelTarget.title}" marked as Cancelled.`);
      setCancelTarget(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel session');
    } finally {
      setIsCancelling(false);
    }
  };

  // Delete Live Class
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteLiveClass(deleteTarget.id);
      toast.success(`Deleted session "${deleteTarget.title}".`);
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete session');
    } finally {
      setIsDeleting(false);
    }
  };

  // Format Time for Display: "17:00" -> "05:00 PM"
  const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${String(formattedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  // Format Date for Display: "2026-08-28" -> "28 Aug 2026"
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600" />
            Live Classes Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Schedule and coordinate live Zoom educational sessions for students (Asia/Kolkata IST).
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
          Schedule Live Class
        </Button>
      </div>

      {/* Status Lifecycle Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs">
        {[
          { id: 'all', label: 'All Sessions', count: tabCounts.all },
          { id: 'live', label: 'Live Now', count: tabCounts.live, isLive: true },
          { id: 'upcoming', label: 'Upcoming', count: tabCounts.upcoming },
          { id: 'completed', label: 'Completed', count: tabCounts.completed },
          { id: 'cancelled', label: 'Cancelled', count: tabCounts.cancelled },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition-colors whitespace-nowrap cursor-pointer select-none ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.isLive && tab.count > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            )}
            {tab.label}
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-card p-3 flex flex-col lg:flex-row items-center justify-between gap-2.5">
        <div className="w-full lg:w-72">
          <Input
            type="text"
            placeholder="Search by topic, class, subject..."
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
            title="Refresh Live Classes"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <SkeletonLoader rows={4} />
      ) : filteredLiveClasses.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No Live Classes Found"
          description={
            searchTerm
              ? `No sessions found matching "${searchTerm}". Try a different keyword.`
              : activeTab !== 'all'
              ? `No ${activeTab} live sessions in the selected filters.`
              : 'Click Schedule Live Class above to schedule a new live Zoom session.'
          }
          actionLabel={activeTab === 'all' && classSubjects.length > 0 ? 'Schedule Live Class' : undefined}
          onAction={activeTab === 'all' && classSubjects.length > 0 ? handleOpenCreateModal : undefined}
        />
      ) : (
        <>
          {/* 1. Mobile Cards View (< 640px) */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {filteredLiveClasses.map((lc) => (
              <div
                key={lc.id}
                className="admin-card p-3.5 flex flex-col justify-between space-y-3 relative overflow-hidden"
              >
                {/* Top Status & Academic Path */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-primary-700">
                      {lc.className}
                    </span>
                    {lc.streamName && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700">
                        {lc.streamName}
                      </span>
                    )}
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                      {lc.subjectName}
                    </span>
                  </div>

                  {/* Status Badge */}
                  {lc.computedStatus === 'live' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                      Live Now
                    </span>
                  ) : lc.computedStatus === 'upcoming' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Upcoming
                    </span>
                  ) : lc.computedStatus === 'completed' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Cancelled
                    </span>
                  )}
                </div>

                {/* Session Title */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">
                    {lc.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDateDisplay(lc.date)}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatTimeDisplay(lc.startTime)} – {formatTimeDisplay(lc.endTime)}
                    </span>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={lc.zoomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      lc.computedStatus === 'cancelled'
                        ? 'bg-slate-100 text-slate-400 pointer-events-none'
                        : lc.computedStatus === 'live'
                        ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    Join Zoom <ExternalLink className="w-3 h-3" />
                  </a>

                  <div className="flex items-center gap-1">
                    {lc.computedStatus === 'upcoming' && (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(lc)}
                        className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 text-xs font-bold cursor-pointer"
                        title="Cancel Session"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(lc)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(lc)}
                      className="p-1.5 rounded-lg text-status-error hover:bg-red-50 cursor-pointer"
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
                  <Table.Head className="w-24">Status</Table.Head>
                  <Table.Head>Live Session Topic</Table.Head>
                  <Table.Head className="w-44">Academic Context</Table.Head>
                  <Table.Head className="w-48">Scheduled Date & Time</Table.Head>
                  <Table.Head className="text-right w-44 pr-6">Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredLiveClasses.map((lc) => (
                  <Table.Row key={lc.id}>
                    <Table.Cell>
                      {lc.computedStatus === 'live' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                          Live Now
                        </span>
                      ) : lc.computedStatus === 'upcoming' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Upcoming
                        </span>
                      ) : lc.computedStatus === 'completed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Cancelled
                        </span>
                      )}
                    </Table.Cell>

                    <Table.Cell>
                      <div>
                        <span className="text-sm font-bold text-slate-900 block">{lc.title}</span>
                        <span className="text-[11px] text-slate-400 font-mono truncate max-w-xs block">
                          {lc.zoomUrl}
                        </span>
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-slate-800">{lc.className}</span>
                          {lc.streamName && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700">
                              {lc.streamName}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 font-medium">{lc.subjectName}</span>
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      <div className="space-y-0.5 text-xs">
                        <span className="font-mono text-slate-800 font-semibold flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDateDisplay(lc.date)}
                        </span>
                        <span className="font-mono text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatTimeDisplay(lc.startTime)} – {formatTimeDisplay(lc.endTime)}
                        </span>
                      </div>
                    </Table.Cell>

                    <Table.Cell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={lc.zoomUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                            lc.computedStatus === 'cancelled'
                              ? 'bg-slate-100 text-slate-400 pointer-events-none'
                              : lc.computedStatus === 'live'
                              ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
                              : 'bg-primary-600 text-white hover:bg-primary-700'
                          }`}
                          title="Open Zoom in new tab"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Join Zoom
                        </a>

                        {lc.computedStatus === 'upcoming' && (
                          <button
                            type="button"
                            onClick={() => setCancelTarget(lc)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Cancel Session"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(lc)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(lc)}
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

      {/* Schedule / Edit Live Class Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingLiveClass ? `Edit Live Session: ${editingLiveClass.title}` : 'Schedule Live Class (Zoom)'}
        subtitle="Configure live interactive session linked to class and subject (Asia/Kolkata IST)."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveLiveClass} className="space-y-3.5">
          <Input
            label="Live Class Topic / Title"
            placeholder="e.g. Live Doubt Session: Trigonometric Identities"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Academic Class */}
            <Select
              label="Academic Class"
              value={formClassId}
              onChange={(e) => setFormClassId(e.target.value)}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
              required
            />

            {/* Academic Stream (Only displayed for Classes 11 & 12) */}
            {formClassHasStreams && (
              <Select
                label="Academic Stream"
                value={formStreamId}
                onChange={(e) => setFormStreamId(e.target.value)}
                options={streams.map((s) => ({ value: s.id, label: s.name }))}
                required
              />
            )}

            {/* Subject */}
            <div className={formClassHasStreams ? 'col-span-1 sm:col-span-2' : 'col-span-1'}>
              <Select
                label="Subject"
                value={formClassSubjectId}
                onChange={(e) => setFormClassSubjectId(e.target.value)}
                options={availableFormSubjects.map((s) => ({
                  value: s.id,
                  label: s.subjectName,
                }))}
                helperText={availableFormSubjects.length === 0 ? 'No subjects mapped in this context.' : undefined}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Date */}
            <div>
              <Input
                label="Session Date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
              />
            </div>

            {/* Start Time */}
            <div>
              <Input
                label="Start Time (IST)"
                type="time"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                required
              />
            </div>

            {/* End Time */}
            <div>
              <Input
                label="End Time (IST)"
                type="time"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Zoom URL */}
          <Input
            label="Zoom Meeting Link"
            placeholder="e.g. https://us02web.zoom.us/j/1234567890?pwd=..."
            value={formZoomUrl}
            onChange={(e) => setFormZoomUrl(e.target.value)}
            required
            helperText="Enter the full invite/meeting link generated in your Zoom application."
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
              {editingLiveClass ? 'Save Changes' : 'Schedule Session'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Session Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        onClose={() => !isCancelling && setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        title="Cancel Live Session"
        message={`Are you sure you want to cancel the upcoming session "${cancelTarget?.title}"? The session will remain in records but marked as Cancelled.`}
        confirmText="Cancel Session"
        variant="danger"
        isLoading={isCancelling}
      />

      {/* Delete Session Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Live Class"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete Record"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
