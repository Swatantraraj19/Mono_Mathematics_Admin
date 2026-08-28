import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchStreams,
  createStream,
  updateStream,
  deleteStream,
  toggleStreamStatus,
} from '../../services/streamService';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Table } from '../../components/common/Table';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';

const STREAM_OPTIONS = [
  { value: 'Science', label: 'Science (Class 11 & 12)', order: 1 },
  { value: 'Commerce', label: 'Commerce (Class 11 & 12)', order: 2 },
  { value: 'Arts', label: 'Arts (Class 11 & 12)', order: 3 },
];

export const StreamsPage = () => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStream, setEditingStream] = useState(null);

  // Form states
  const [selectedStreamName, setSelectedStreamName] = useState('Science');
  const [streamStatus, setStreamStatus] = useState('active');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadStreams = async () => {
    try {
      setLoading(true);
      const data = await fetchStreams('mono_math_01');
      setStreams(data);
    } catch (err) {
      toast.error('Failed to load streams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStreams();
  }, []);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingStream(null);
    const existingNames = new Set(streams.map((s) => (s?.name || '').toLowerCase()));
    const firstAvailable = STREAM_OPTIONS.find((opt) => !existingNames.has(opt.value.toLowerCase()));
    setSelectedStreamName(firstAvailable ? firstAvailable.value : STREAM_OPTIONS[0].value);
    setStreamStatus('active');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (stm) => {
    setEditingStream(stm);
    setSelectedStreamName(stm.name);
    setStreamStatus(stm.status || 'active');
    setIsModalOpen(true);
  };

  const handleSaveStream = async (e) => {
    e.preventDefault();

    const selectedOpt = STREAM_OPTIONS.find((s) => s.value === selectedStreamName) || {
      value: selectedStreamName,
      order: 1,
    };

    // Strict Uniqueness Check on both CREATE and EDIT
    const isDuplicate = streams.some(
      (s) =>
        (s?.name || '').toLowerCase() === selectedOpt.value.toLowerCase() &&
        (!editingStream || s.id !== editingStream.id)
    );

    if (isDuplicate) {
      toast.error(`${selectedOpt.value} stream is already present in your institute.`);
      return;
    }

    const payload = {
      name: selectedOpt.value,
      code: selectedOpt.value.toLowerCase(),
      orderIndex: selectedOpt.order,
      applicableClasses: 'Class 11, Class 12',
      status: streamStatus,
    };

    setIsSaving(true);
    try {
      if (editingStream) {
        await updateStream(editingStream.id, payload);
        toast.success(`Updated to ${payload.name} stream!`);
      } else {
        await createStream(payload, 'mono_math_01');
        toast.success(`Added ${payload.name} stream!`);
      }
      setIsModalOpen(false);
      loadStreams();
    } catch (err) {
      toast.error(err.message || 'Failed to save stream');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle status
  const handleToggleStatus = async (stm) => {
    try {
      await toggleStreamStatus(stm.id, stm.status);
      toast.success(`${stm.name} marked as ${stm.status === 'active' ? 'inactive' : 'active'}`);
      setStreams((prev) =>
        prev.map((item) =>
          item.id === stm.id
            ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' }
            : item
        )
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
      await deleteStream(deleteTarget.id);
      toast.success(`Deleted ${deleteTarget.name} stream.`);
      setDeleteTarget(null);
      loadStreams();
    } catch (err) {
      toast.error(err.message || 'Failed to delete stream');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Clean Single Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            Stream Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Academic streams (Science, Commerce, Arts) applicable strictly for Class 11 and Class 12.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto"
          >
            Add Stream
          </Button>

          <button
            type="button"
            onClick={loadStreams}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-primary-600 hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <SkeletonLoader rows={4} />
      ) : streams.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Streams Added"
          description="Click Add Stream button to select and add Science, Commerce, or Arts."
          actionLabel="Add Stream"
          onAction={handleOpenCreateModal}
        />
      ) : (
        <>
          {/* 1. Mobile Cards View (Visible on Mobile Screens < 640px) */}
          <div className="grid grid-cols-1 gap-2.5 sm:hidden">
            {streams.map((stm) => (
              <div
                key={stm.id}
                className="admin-card p-3.5 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0">
                      {stm.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{stm.name}</h4>
                      <span className="text-[10px] font-mono text-slate-400">Order: #{stm.orderIndex}</span>
                    </div>
                  </div>

                  <Badge variant={stm.status === 'active' ? 'active' : 'inactive'}>
                    {stm.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    <Layers className="w-3 h-3" />
                    Class 11 & Class 12
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(stm)}
                    className={`text-xs font-semibold flex items-center gap-1 ${
                      stm.status === 'active' ? 'text-slate-500' : 'text-emerald-600'
                    }`}
                  >
                    {stm.status === 'active' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{stm.status === 'active' ? 'Deactivate' : 'Activate'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(stm)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(stm)}
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

          {/* 2. Desktop Table View (Visible on Tablet/Laptop/Desktop >= 640px) */}
          <div className="hidden sm:block">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head className="w-16">Order</Table.Head>
                  <Table.Head>Stream Name</Table.Head>
                  <Table.Head>Applicable For</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head className="text-right">Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {streams.map((stm) => (
                  <Table.Row key={stm.id}>
                    <Table.Cell>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        #{stm.orderIndex}
                      </span>
                    </Table.Cell>

                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0">
                          {stm.name.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-slate-900">{stm.name}</span>
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <Layers className="w-3 h-3" />
                        Class 11 & Class 12
                      </span>
                    </Table.Cell>

                    <Table.Cell>
                      <Badge variant={stm.status === 'active' ? 'active' : 'inactive'}>
                        {stm.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Cell>

                    <Table.Cell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Status Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(stm)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            stm.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={stm.status === 'active' ? 'Click to Deactivate' : 'Click to Activate'}
                        >
                          {stm.status === 'active' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(stm)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Edit Stream"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(stm)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-status-error hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Stream"
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

      {/* Add / Edit Stream Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingStream ? `Edit ${editingStream.name} Stream` : 'Select & Add Academic Stream'}
        subtitle="Select the stream from standard options: Science, Commerce, Arts."
      >
        <form onSubmit={handleSaveStream} className="space-y-4">
          <Select
            label="Select Stream"
            value={selectedStreamName}
            onChange={(e) => setSelectedStreamName(e.target.value)}
            options={STREAM_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
            required
          />

          <Select
            label="Stream Status"
            value={streamStatus}
            onChange={(e) => setStreamStatus(e.target.value)}
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
              {editingStream ? 'Save Changes' : 'Add Stream'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Stream Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Academic Stream"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmText="Delete Stream"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
