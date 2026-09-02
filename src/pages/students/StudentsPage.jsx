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
  ChevronLeft,
  ChevronRight,
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

const ITEMS_PER_PAGE = 10;

export const StudentsPage = () => {
  const { userProfile, instituteId: authInstituteId } = useAuth();
  const currentInstituteId = authInstituteId || userProfile?.instituteId || 'mono_math_01';

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' by default for instant admin approvals
  const [currentPage, setCurrentPage] = useState(1);

  // Modal / Action states
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

  // Reset page number on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleStatusChange = async (studentId, newStatus) => {
    try {
      setUpdatingId(studentId);
      await updateStudentStatus(studentId, newStatus);
      toast.success(
        newStatus === 'active'
          ? 'Student approved successfully!'
          : `Student status set to ${newStatus}`
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
      await updateStudentStatus(deleteId, 'inactive');
      toast.success('Student account deactivated successfully');
      setStudents((prev) =>
        prev.map((s) => (s.id === deleteId ? { ...s, status: 'inactive' } : s))
      );
      setDeleteId(null);
    } catch (error) {
      toast.error('Failed to deactivate student');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered List
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = s.name?.toLowerCase().includes(q);
      const emailMatch = s.email?.toLowerCase().includes(q);
      const phoneMatch = s.phone?.toLowerCase().includes(q);
      const matchesSearch = !q || nameMatch || emailMatch || phoneMatch;

      if (statusFilter === 'all') return matchesSearch;
      return matchesSearch && s.status === statusFilter;
    });
  }, [students, searchQuery, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStudents, currentPage]);

  // Counts for Stats Header
  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.status === 'active').length;
    const pending = students.filter((s) => s.status === 'pending').length;
    const inactive = students.filter((s) => s.status === 'inactive').length;
    return { total, active, pending, inactive };
  }, [students]);

  // Desktop Table Columns Definition
  const columns = [
    {
      header: 'Student Info',
      accessorKey: 'name',
      cell: (student) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
            {student.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
              {student.name || 'Unnamed Student'}
            </span>
            <span className="text-[11px] text-slate-500 truncate flex items-center gap-1">
              <Mail className="w-3 h-3 shrink-0 text-slate-400" />
              {student.email || 'No email registered'}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Contact & Class',
      accessorKey: 'phone',
      cell: (student) => (
        <div className="flex flex-col text-xs text-slate-700 space-y-0.5">
          <span className="flex items-center gap-1 text-slate-600 font-medium">
            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
            {student.phone || 'N/A'}
          </span>
          {student.className && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
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
          return <Badge variant="warning" size="sm">Pending</Badge>;
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
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header & Refresh Button (Clean, compact SaaS style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            Student Directory
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Manage student accounts, approve new signups, and monitor enrollment status.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={loadStudents}
          icon={RefreshCw}
          disabled={loading}
          className="w-full sm:w-auto text-xs py-1.5"
        >
          Refresh
        </Button>
      </div>

      {/* Responsive KPI Stat Cards (Compact SaaS sizing on mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
        <div
          onClick={() => setStatusFilter('all')}
          className={`admin-card !p-2 sm:!p-3.5 cursor-pointer transition-all ${
            statusFilter === 'all'
              ? 'border-primary-500 bg-primary-50/50 shadow-xs'
              : 'hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 block truncate">Total Registered</span>
          <div className="text-base sm:text-2xl font-bold text-slate-900 mt-0.5">{stats.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter('active')}
          className={`admin-card !p-2 sm:!p-3.5 cursor-pointer transition-all ${
            statusFilter === 'active'
              ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
              : 'hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 truncate">Active</span>
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-base sm:text-2xl font-bold text-slate-900 mt-0.5">{stats.active}</div>
        </div>

        <div
          onClick={() => setStatusFilter('pending')}
          className={`admin-card !p-2 sm:!p-3.5 cursor-pointer transition-all ${
            statusFilter === 'pending'
              ? 'border-amber-500 bg-amber-50/50 shadow-xs'
              : 'hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-amber-700 truncate">Pending</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
          </div>
          <div className="text-base sm:text-2xl font-bold text-slate-900 mt-0.5">{stats.pending}</div>
        </div>

        <div
          onClick={() => setStatusFilter('inactive')}
          className={`admin-card !p-2 sm:!p-3.5 cursor-pointer transition-all ${
            statusFilter === 'inactive'
              ? 'border-red-500 bg-red-50/50 shadow-xs'
              : 'hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-red-600 truncate">Inactive</span>
            <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 shrink-0" />
          </div>
          <div className="text-base sm:text-2xl font-bold text-slate-900 mt-0.5">{stats.inactive}</div>
        </div>
      </div>

      {/* Filter and Search Controls (High-density compact layout) */}
      <div className="admin-card !p-1.5 sm:!p-3 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2.5">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={Search}
            className="text-xs py-1 sm:py-1.5"
          />
        </div>

        {/* Horizontal Mobile Scrollable Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto select-none">
          {[
            { key: 'pending', label: `Pending (${stats.pending})` },
            { key: 'active', label: `Active (${stats.active})` },
            { key: 'all', label: `All (${stats.total})` },
            { key: 'inactive', label: `Inactive (${stats.inactive})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                statusFilter === tab.key
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Container: Desktop Table View vs Mobile Touch Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-4 sm:p-6 space-y-3">
            <SkeletonLoader rows={4} />
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
          <>
            {/* Desktop View (Table Layout) */}
            <div className="hidden sm:block overflow-x-auto">
              <Table columns={columns} data={paginatedStudents} />
            </div>

            {/* Mobile View: Sleek, High-Density Compact Cards (Matches Classes/Streams) */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {paginatedStudents.map((student) => {
                const isPending = student.status === 'pending';
                const isActive = student.status === 'active';
                return (
                  <div key={student.id} className="p-2.5 space-y-2 bg-white hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      {/* Left: Avatar + Details */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-primary-600 font-bold text-xs flex items-center justify-center shrink-0">
                          {student.name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {student.name || 'Unnamed Student'}
                            </h4>
                            {student.status === 'active' ? (
                              <Badge variant="success" size="sm">Active</Badge>
                            ) : student.status === 'pending' ? (
                              <Badge variant="warning" size="sm">Pending</Badge>
                            ) : (
                              <Badge variant="danger" size="sm">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                            <Mail className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            {student.email || 'No email'}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        {isPending && (
                          <button
                            type="button"
                            disabled={updatingId === student.id}
                            onClick={() => handleStatusChange(student.id, 'active')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                        )}

                        {isActive ? (
                          <button
                            type="button"
                            disabled={updatingId === student.id}
                            onClick={() => handleStatusChange(student.id, 'inactive')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Deactivate Student"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          !isPending && (
                            <button
                              type="button"
                              disabled={updatingId === student.id}
                              onClick={() => handleStatusChange(student.id, 'active')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Activate Student"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Sub-details (Class & Phone) */}
                    {(student.phone || student.className) && (
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 pl-9">
                        {student.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            {student.phone}
                          </span>
                        )}
                        {student.className && (
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <GraduationCap className="w-2.5 h-2.5 text-slate-400" />
                            Class: {student.className}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Responsive Pagination Bar (for handling 100+ / 500+ students smoothly) */}
            {totalPages > 1 && (
              <div className="p-2 sm:p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600 select-none">
                <span className="text-[11px] sm:text-xs">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)} of{' '}
                  {filteredStudents.length} students
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="py-1 px-2 text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </Button>

                  <span className="px-2 font-semibold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="py-1 px-2 text-xs"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirm Deactivate Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Deactivate Student"
        message="Are you sure you want to deactivate this student? Their access will be suspended, and you can reactivate them anytime."
        confirmText="Deactivate Student"
        isLoading={isDeleting}
      />
    </div>
  );
};
