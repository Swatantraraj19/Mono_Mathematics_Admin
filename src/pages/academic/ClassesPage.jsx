import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Layers,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchClasses,
  createClass,
  updateClass,
  deleteClass,
  toggleClassStatus,
} from '../../services/classService';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Table } from '../../components/common/Table';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';

const CLASS_OPTIONS = [
  { value: 'Class 6', label: 'Class 6 (Direct Subjects)', order: 6, hasStreams: false },
  { value: 'Class 7', label: 'Class 7 (Direct Subjects)', order: 7, hasStreams: false },
  { value: 'Class 8', label: 'Class 8 (Direct Subjects)', order: 8, hasStreams: false },
  { value: 'Class 9', label: 'Class 9 (Direct Subjects)', order: 9, hasStreams: false },
  { value: 'Class 10', label: 'Class 10 (Direct Subjects)', order: 10, hasStreams: false },
  { value: 'Class 11', label: 'Class 11 (Streams: Science, Commerce, Arts)', order: 11, hasStreams: true },
  { value: 'Class 12', label: 'Class 12 (Streams: Science, Commerce, Arts)', order: 12, hasStreams: true },
];

export const getClassOrder = (cls) => {
  if (cls?.orderIndex && Number(cls.orderIndex) > 0) {
    return Number(cls.orderIndex);
  }
  const match = (cls?.name || '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
};

export const ClassesPage = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  // Form state
  const [selectedClassOption, setSelectedClassOption] = useState('Class 6');
  const [classStatus, setClassStatus] = useState('active');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const data = await fetchClasses('mono_math_01');
      const sorted = [...data].sort((a, b) => getClassOrder(a) - getClassOrder(b));
      setClasses(sorted);
    } catch {
      toast.error('Failed to load academic classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  // Filtered list
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const name = cls?.name || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'stream'
          ? cls.hasStreams
          : cls.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [classes, searchTerm, statusFilter]);

  // Open Modal for Add Class
  const handleOpenCreateModal = () => {
    setEditingClass(null);
    const existingNames = new Set(classes.map((c) => (c?.name || '').toLowerCase()));
    const firstAvailable = CLASS_OPTIONS.find((opt) => !existingNames.has(opt.value.toLowerCase()));
    setSelectedClassOption(firstAvailable ? firstAvailable.value : CLASS_OPTIONS[0].value);
    setClassStatus('active');
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (cls) => {
    setEditingClass(cls);
    setSelectedClassOption(cls.name);
    setClassStatus(cls.status || 'active');
    setIsModalOpen(true);
  };

  const handleSaveClass = async (e) => {
    e.preventDefault();

    const selectedOption = CLASS_OPTIONS.find((opt) => opt.value === selectedClassOption) || {
      value: selectedClassOption,
      order: 0,
      hasStreams: selectedClassOption.includes('11') || selectedClassOption.includes('12'),
    };

    // Strict Uniqueness Check on both CREATE and EDIT
    const isDuplicate = classes.some(
      (c) =>
        (c?.name || '').toLowerCase() === selectedOption.value.toLowerCase() &&
        (!editingClass || c.id !== editingClass.id)
    );

    if (isDuplicate) {
      toast.error(`${selectedOption.value} is already present in your institute.`);
      return;
    }

    const payload = {
      name: selectedOption.value,
      slug: selectedOption.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
      orderIndex: selectedOption.order,
      hasStreams: selectedOption.hasStreams,
      status: classStatus,
    };

    setIsSaving(true);
    try {
      if (editingClass) {
        await updateClass(editingClass.id, payload);
        toast.success(`Updated to ${payload.name} successfully!`);
      } else {
        await createClass(payload, 'mono_math_01');
        toast.success(`Added ${payload.name} successfully!`);
      }
      setIsModalOpen(false);
      loadClasses();
    } catch (err) {
      toast.error(err.message || 'Failed to save class');
    } finally {
      setIsSaving(false);
    }
  };

  // Status Toggle
  const handleToggleStatus = async (cls) => {
    try {
      await toggleClassStatus(cls.id, cls.status);
      toast.success(`${cls.name} marked as ${cls.status === 'active' ? 'inactive' : 'active'}`);
      setClasses((prev) =>
        prev.map((item) =>
          item.id === cls.id
            ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' }
            : item
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
      await deleteClass(deleteTarget.id);
      toast.success(`Deleted ${deleteTarget.name} successfully.`);
      setDeleteTarget(null);
      loadClasses();
    } catch (err) {
      toast.error(err.message || 'Failed to delete class');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalClasses = classes.length;
  const activeClasses = classes.filter((c) => c.status === 'active').length;
  const streamEnabledClasses = classes.filter((c) => c.hasStreams).length;

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            Class Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage academic classes (Classes 6 to 12) and their stream configurations.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={handleOpenCreateModal}
          className="w-full sm:w-auto"
        >
          Add Class
        </Button>
      </div>

      {/* Responsive KPI Stat Cards */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
        <div className="admin-card !p-2 sm:!p-4 flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-medium text-slate-500 truncate">Total Classes</span>
          <div className="text-sm sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">{totalClasses}</div>
        </div>

        <div className="admin-card !p-2 sm:!p-4 flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-medium text-slate-500 truncate">Active Classes</span>
          <div className="text-sm sm:text-2xl font-bold text-emerald-600 mt-0.5 sm:mt-1">{activeClasses}</div>
        </div>

        <div className="admin-card !p-2 sm:!p-4 flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-medium text-slate-500 truncate">Streams (11–12)</span>
          <div className="text-sm sm:text-2xl font-bold text-purple-600 mt-0.5 sm:mt-1">{streamEnabledClasses}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-card !p-2 sm:!p-3 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2.5">
        <div className="w-full sm:w-72">
          <Input
            type="text"
            placeholder="Search class name..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs py-1 sm:py-1.5"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:w-44">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active Only' },
                { value: 'inactive', label: 'Inactive Only' },
                { value: 'stream', label: 'Stream Enabled (11–12)' },
              ]}
              className="text-xs py-1 sm:py-1.5"
            />
          </div>

          <button
            type="button"
            onClick={loadClasses}
            className="p-1.5 sm:p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-primary-600 hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
            title="Refresh Classes"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <SkeletonLoader rows={4} />
      ) : filteredClasses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No Academic Classes Added"
          description={
            searchTerm
              ? `No classes matching "${searchTerm}". Try a different search.`
              : 'Click Add Class button above to select and add a class from the dropdown.'
          }
          actionLabel="Add Class"
          onAction={handleOpenCreateModal}
        />
      ) : (
        <>
          {/* 1. Mobile High-Density Compact Cards (< 640px) */}
          <div className="grid grid-cols-1 gap-1.5 sm:hidden">
            {filteredClasses.map((cls) => (
              <div
                key={cls.id}
                className="admin-card !p-2 flex items-center justify-between gap-2 shadow-2xs hover:border-primary-200 transition-colors"
              >
                {/* Left: Class Number Badge + Name */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-primary-600 font-bold text-xs shrink-0">
                    {cls.name.replace(/[^0-9]/g, '') || cls.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{cls.name}</h4>
                      <Badge variant={cls.status === 'active' ? 'active' : 'inactive'} dot size="sm">
                        {cls.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block truncate">
                      {cls.hasStreams ? 'Stream-Based (11–12)' : 'Direct Subjects (6–10)'}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(cls)}
                    className={`p-1.5 rounded-md cursor-pointer ${
                      cls.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                    }`}
                    title={cls.status === 'active' ? 'Deactivate' : 'Activate'}
                  >
                    {cls.status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(cls)}
                    className="p-1.5 rounded-md text-slate-500 hover:text-primary-600 hover:bg-indigo-50 cursor-pointer"
                    title="Edit Class"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(cls)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-status-error hover:bg-red-50 cursor-pointer"
                    title="Delete Class"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 2. Desktop Table View (Visible on Tablet/Laptop/Desktop >= 640px) */}
          <div className="hidden sm:block">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head className="w-16">Order</Table.Head>
                  <Table.Head>Class Name</Table.Head>
                  <Table.Head>Curriculum Hierarchy</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head className="text-right">Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredClasses.map((cls) => (
                  <Table.Row key={cls.id}>
                    <Table.Cell>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        #{getClassOrder(cls)}
                      </span>
                    </Table.Cell>

                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-primary-600 font-bold text-xs shrink-0">
                          {cls.name.replace(/[^0-9]/g, '') || cls.name.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-slate-900">{cls.name}</span>
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      {cls.hasStreams ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          <Layers className="w-3 h-3" />
                          Stream-Based (Science, Commerce, Arts)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Direct Subjects (Class 6–10)
                        </span>
                      )}
                    </Table.Cell>

                    <Table.Cell>
                      <Badge variant={cls.status === 'active' ? 'active' : 'inactive'}>
                        {cls.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Cell>

                    <Table.Cell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Status Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(cls)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            cls.status === 'active'
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={cls.status === 'active' ? 'Click to Deactivate' : 'Click to Activate'}
                        >
                          {cls.status === 'active' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(cls)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Edit Class"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(cls)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-status-error hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Class"
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

      {/* Add / Edit Class Modal with Clean Dropdown Selection */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingClass ? `Edit ${editingClass.name}` : 'Select & Add Academic Class'}
        subtitle="Select the class from the dropdown list to configure it."
      >
        <form onSubmit={handleSaveClass} className="space-y-4">
          <Select
            label="Select Academic Class"
            value={selectedClassOption}
            onChange={(e) => setSelectedClassOption(e.target.value)}
            options={CLASS_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
            required
          />

          <Select
            label="Class Status"
            value={classStatus}
            onChange={(e) => setClassStatus(e.target.value)}
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
              {editingClass ? 'Save Changes' : 'Add Class'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Academic Class"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete Class"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
