import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  UserX,
  Trash2,
  RefreshCw,
  Mail,
  Phone,
  GraduationCap,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Table } from '../../components/common/Table';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { fetchStudents, updateStudentStatus, deleteStudent } from '../../services/studentService';

export const StudentsPage = () => {
  const { userProfile, instituteId: authInstituteId } = useAuth();
  const currentInstituteId = authInstituteId || userProfile?.instituteId || 'mono_math_01';

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'pending' | 'inactive'

  // Modal / Confirm state
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await fetchStudents(currentInstituteId);
      setStudents(data || []);
    } catch (error) {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [currentInstituteId]);

  const handleStatusChange = async (studentId, newStatus) => {
    try {
      setUpdatingId(studentId);
      await updateStudentStatus(studentId, newStatus);
      toast.success(
        newStatus === 'active'
          ? 'Student approved / activated!'
          : `Student status updated to ${newStatus}`
      );
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, status: newStatus } : s))
      );
    } catch (error) {
      toast.error('Failed to update student status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await deleteStudent(deleteId);
      toast.success('Student record deleted successfully');
      setStudents((prev) => prev.filter((s) => s.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      toast.error('Failed to delete student');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered List
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const nameMatch = s.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const emailMatch = s.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const phoneMatch = s.phone?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearch = nameMatch || emailMatch || phoneMatch;

      if (statusFilter === 'all') return matchesSearch;
      return matchesSearch && s.status === statusFilter;
    });
  }, [students, searchQuery, statusFilter]);

  // Counts for Stats Header
  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.status === 'active').length;
    const pending = students.filter((s) => s.status === 'pending').length;
    const inactive = students.filter((s) => s.status === 'inactive').length;
    return { total, active, pending, inactive };
  }, [students]);

  const columns = [
    {
      header: 'Student Info',
      accessorKey: 'name',
      cell: (student) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0">
            {student.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
              {student.name || 'Unnamed Student'}
            </span>
            <span className="text-[11px] text-slate-500 truncate flex items-center gap-1">
              <Mail className="w-3 h-3 shrink-0" />
              {student.email || 'No email'}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Contact / Class',
      accessorKey: 'phone',
      cell: (student) => (
        <div className="flex flex-col text-xs text-slate-700 space-y-0.5">
          <span className="flex items-center gap-1 text-slate-600">
            <Phone className="w-3 h-3 text-slate-400" />
            {student.phone || 'N/A'}
          </span>
          {student.className && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <GraduationCap className="w-3 h-3 text-slate-400" />
              Class: {student.className}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Registration Date',
      accessorKey: 'registeredAt',
      cell: (student) => {
        const time = student.registeredAt || student.createdAt;
        const dateStr = time?.toDate
          ? time.toDate().toLocaleDateString()
          : time
          ? new Date(time).toLocaleDateString()
          : 'Recently';
        return <span className="text-xs text-slate-600 font-medium">{dateStr}</span>;
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (student) => {
        const status = student.status || 'active';
        if (status === 'active') {
          return <Badge variant="success" size="sm">Active</Badge>;
        }
        if (status === 'pending') {
          return <Badge variant="warning" size="sm">Pending Approval</Badge>;
        }
        return <Badge variant="danger" size="sm">Inactive</Badge>;
      },
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (student) => {
        const isPending = student.status === 'pending';
        const isActive = student.status === 'active';

        return (
          <div className="flex items-center gap-1.5 justify-end">
            {isPending && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={updatingId === student.id}
                onClick={() => handleStatusChange(student.id, 'active')}
                icon={CheckCircle2}
                className="py-1 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700"
              >
                Approve
              </Button>
            )}

            {isActive ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={updatingId === student.id}
                onClick={() => handleStatusChange(student.id, 'inactive')}
                className="text-amber-600 hover:bg-amber-50 py-1 px-2 text-xs"
                title="Deactivate Student"
              >
                <UserX className="w-3.5 h-3.5" />
              </Button>
            ) : (
              !isPending && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={updatingId === student.id}
                  onClick={() => handleStatusChange(student.id, 'active')}
                  className="text-emerald-600 hover:bg-emerald-50 py-1 px-2 text-xs"
                  title="Activate Student"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </Button>
              )
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteId(student.id)}
              className="text-red-500 hover:bg-red-50 py-1 px-2 text-xs"
              title="Delete Student"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-primary-50 rounded-xl text-primary-600 border border-primary-100 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Student Directory</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage student accounts, approve new signups, and monitor enrollment status.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={loadStudents}
          icon={RefreshCw}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'all'
              ? 'border-primary-500 bg-primary-50/50 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-semibold text-slate-500">Total Registered</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter('active')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'active'
              ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Active Students</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.active}</div>
        </div>

        <div
          onClick={() => setStatusFilter('pending')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'pending'
              ? 'border-amber-500 bg-amber-50/50 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Pending Approval</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.pending}</div>
        </div>

        <div
          onClick={() => setStatusFilter('inactive')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'inactive'
              ? 'border-red-500 bg-red-50/50 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-600">Inactive</span>
            <UserX className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.inactive}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search by student name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={Search}
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
          {[
            { key: 'all', label: `All (${stats.total})` },
            { key: 'active', label: `Active (${stats.active})` },
            { key: 'pending', label: `Pending (${stats.pending})` },
            { key: 'inactive', label: `Inactive (${stats.inactive})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                statusFilter === tab.key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table / List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <SkeletonLoader rows={5} />
          </div>
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            icon={Users}
            title={searchQuery ? 'No matching students found' : 'No student records'}
            description={
              searchQuery
                ? `No students matching "${searchQuery}" in ${statusFilter} tab.`
                : 'Students registered via the mobile app will appear here.'
            }
          />
        ) : (
          <Table columns={columns} data={filteredStudents} />
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Student Record"
        message="Are you sure you want to delete this student record? This action cannot be undone."
        confirmText="Delete Student"
        isLoading={isDeleting}
      />
    </div>
  );
};
