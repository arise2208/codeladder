import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import { Input, Button, Badge, LoadingSpinner, Modal, Pagination, StatCard } from '../../components/ui';
import api, { getErrorMessage } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Search,
  Trash2,
  Shield,
  Key,
  Eye,
  RefreshCw,
  Users,
  Layers,
  HelpCircle,
  CheckCircle2,
  X
} from 'lucide-react';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // In-flight state
  const [updatingRoleUser, setUpdatingRoleUser] = useState(null);

  // Action modals
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, username: null });
  const [resetPassModal, setResetPassModal] = useState({ isOpen: false, username: null, password: '', loading: false });
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, loading: false, data: null });

  // Fetch admin stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch users list
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;

      const { data } = await api.get('/admin/users', { params });
      const list = Array.isArray(data) ? data : (data.users || []);
      setUsers(list);
      setTotalPages(data.pagination?.pages || data.totalPages || 1);
      setTotalCount(data.pagination?.total || list.length);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to fetch users'));
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
  };

  // Inspect user details
  const handleOpenDetails = async (username) => {
    try {
      setDetailsModal({ isOpen: true, loading: true, data: null });
      const { data } = await api.get(`/admin/users/${username}`);
      setDetailsModal({ isOpen: true, loading: false, data: data.user || data });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load user details'));
      setDetailsModal({ isOpen: false, loading: false, data: null });
    }
  };

  // Direct role change via backend API
  const handleDirectRoleChange = async (username, newRole) => {
    try {
      setUpdatingRoleUser(username);
      const { data } = await api.patch(`/admin/users/${username}/role`, {
        role: newRole
      });
      toast.success(data.message || `Updated @${username} to ${newRole}`);
      setUsers((prev) =>
        prev.map((u) => (u.username === username ? { ...u, role: newRole } : u))
      );
      fetchStats();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update user role'));
    } finally {
      setUpdatingRoleUser(null);
    }
  };

  // Reset user password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPassModal.password || resetPassModal.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      setResetPassModal((prev) => ({ ...prev, loading: true }));
      await api.post(`/admin/users/${resetPassModal.username}/reset-password`, {
        newPassword: resetPassModal.password
      });
      toast.success(`Password for @${resetPassModal.username} reset successfully`);
      setResetPassModal({ isOpen: false, username: null, password: '', loading: false });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to reset password'));
      setResetPassModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Delete user
  const handleDelete = async () => {
    try {
      await api.delete(`/admin/users/${deleteModal.username}`);
      toast.success(`User @${deleteModal.username} deleted`);
      setDeleteModal({ isOpen: false, username: null });
      fetchUsers();
      fetchStats();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete user'));
    }
  };

  const isCurrentOrProtected = (u) => {
    const name = (u?.username || '').toLowerCase();
    const cur = (currentUser?.username || '').toLowerCase();
    return name === cur || name === 'deepanshu' || name === 'admin';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin: Users & Permissions"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Users' }]}
      />

      {/* Platform Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.users?.total ?? '—'}
          color="#6C5CE7"
          loading={statsLoading}
        />
        <StatCard
          icon={Layers}
          label="Total Ladders"
          value={stats?.ladders?.total ?? '—'}
          color="#00B894"
          loading={statsLoading}
        />
        <StatCard
          icon={HelpCircle}
          label="Catalog Questions"
          value={stats?.questions?.total ?? '—'}
          color="#0984E3"
          loading={statsLoading}
        />
        <StatCard
          icon={CheckCircle2}
          label="Platform Solves"
          value={stats?.solves?.total ?? '—'}
          color="#EAB308"
          loading={statsLoading}
        />
      </div>

      {/* Filters & Actions Bar */}
      <div className="card-padded bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username or email..."
              icon={<Search size={18} className="text-[#6B7280]" />}
              className="pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <Button type="submit" className="bg-[#6C5CE7] text-white">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#1E1F25] bg-white focus:outline-none focus:border-[#6C5CE7]"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admins Only</option>
            <option value="USER">Standard Users</option>
          </select>

          <Button
            variant="outline"
            onClick={() => {
              fetchUsers();
              fetchStats();
            }}
            className="flex items-center gap-2 border-[#E5E7EB] text-[#6B7280] hover:text-[#1E1F25]"
            title="Refresh list"
          >
            <RefreshCw size={15} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Users Data Table */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="card bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E5E7EB] flex justify-between items-center bg-[#FAFBFC]">
            <span className="text-sm font-semibold text-[#1E1F25]">
              Registered Accounts ({totalCount})
            </span>
            {roleFilter && (
              <span className="text-xs text-[#6B7280]">
                Filtered by: <span className="font-semibold">{roleFilter}</span>
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="table-header bg-[#1E1F25] text-white text-xs uppercase tracking-wider">
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Registered</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-sm">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#6B7280]">
                      No users match the search criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = currentUser?.username === u.username;
                    const isProtected = isCurrentOrProtected(u);
                    const isAdmin = u.role === 'ADMIN';
                    const isUpdatingThisUser = updatingRoleUser === u.username;

                    return (
                      <tr
                        key={u._id || u.username}
                        className="table-row hover:bg-[#F8F9FB] transition-colors"
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7] font-semibold flex items-center justify-center text-xs shrink-0">
                              {u.username.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-[#1E1F25] flex items-center gap-1.5">
                                <span>{u.username}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-purple-100 text-[#6C5CE7] px-1.5 py-0.5 rounded font-semibold">
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-[#6B7280] font-mono text-xs">
                          {u.email || '—'}
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <select
                              value={u.role}
                              disabled={isProtected || isUpdatingThisUser}
                              onChange={(e) => handleDirectRoleChange(u.username, e.target.value)}
                              title={isProtected ? 'Protected account' : 'Select role to update in backend'}
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                                isAdmin
                                  ? 'bg-purple-50 text-[#6C5CE7] border-purple-200 hover:bg-purple-100'
                                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                              } ${isProtected ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <option value="USER">USER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                            {isUpdatingThisUser && (
                              <span className="text-[11px] text-[#6C5CE7] animate-pulse">
                                Updating...
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 text-[#6B7280] text-xs">
                          {u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : '—'}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Inspect user */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDetails(u.username)}
                              title="View user details"
                              className="text-[#6B7280] hover:text-[#1E1F25] border-[#E5E7EB]"
                            >
                              <Eye size={15} />
                            </Button>

                            {/* Direct Promote/Demote Action Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isProtected || isUpdatingThisUser}
                              onClick={() =>
                                handleDirectRoleChange(u.username, isAdmin ? 'USER' : 'ADMIN')
                              }
                              title={
                                isProtected
                                  ? 'Protected account role cannot be modified'
                                  : `Click to ${isAdmin ? 'demote to USER' : 'promote to ADMIN'}`
                              }
                              className={`border-[#E5E7EB] ${
                                isAdmin
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-[#6C5CE7] hover:bg-purple-50'
                              }`}
                            >
                              <Shield size={14} className="mr-1 inline" />
                              <span>
                                {isUpdatingThisUser
                                  ? 'Updating...'
                                  : isAdmin
                                  ? 'Demote'
                                  : 'Promote'}
                              </span>
                            </Button>

                            {/* Reset Password */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setResetPassModal({
                                  isOpen: true,
                                  username: u.username,
                                  password: '',
                                  loading: false
                                })
                              }
                              title="Reset Password"
                              className="text-blue-600 border-[#E5E7EB] hover:bg-blue-50"
                            >
                              <Key size={15} />
                            </Button>

                            {/* Delete User */}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isProtected}
                              onClick={() => setDeleteModal({ isOpen: true, username: u.username })}
                              title={
                                isProtected
                                  ? 'Your own account or protected accounts cannot be deleted'
                                  : 'Delete user'
                              }
                              className={`border-red-200 text-red-500 hover:bg-red-50 ${
                                isProtected ? 'opacity-40 cursor-not-allowed' : ''
                              }`}
                            >
                              <Trash2 size={15} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between">
            <span className="text-xs text-[#6B7280]">
              Page {page} of {totalPages}
            </span>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}

      {/* User Details Inspection Modal */}
      <Modal
        open={detailsModal.isOpen}
        isOpen={detailsModal.isOpen}
        onClose={() => setDetailsModal({ isOpen: false, loading: false, data: null })}
        title={`User Profile: @${detailsModal.data?.username || ''}`}
      >
        {detailsModal.loading ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : detailsModal.data ? (
          <div className="space-y-4 text-sm text-[#1E1F25]">
            <div className="grid grid-cols-2 gap-3 bg-[#F8F9FB] p-3 rounded-lg border border-[#E5E7EB]">
              <div>
                <p className="text-xs text-[#6B7280]">Email</p>
                <p className="font-medium font-mono text-xs mt-0.5">
                  {detailsModal.data.email || 'None'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Role</p>
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 border">
                  {detailsModal.data.role}
                </span>
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Joined Date</p>
                <p className="font-medium text-xs mt-0.5">
                  {detailsModal.data.createdAt
                    ? format(new Date(detailsModal.data.createdAt), 'PPP')
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Last Updated</p>
                <p className="font-medium text-xs mt-0.5">
                  {detailsModal.data.updatedAt
                    ? format(new Date(detailsModal.data.updatedAt), 'PPP')
                    : '—'}
                </p>
              </div>
            </div>

            {/* User Statistics */}
            <div>
              <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
                Activity Statistics
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-white border border-[#E5E7EB] rounded-lg">
                  <p className="text-xl font-bold text-[#00B894]">
                    {detailsModal.data.stats?.solvedCount ?? 0}
                  </p>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">Problems Solved</p>
                </div>
                <div className="p-3 bg-white border border-[#E5E7EB] rounded-lg">
                  <p className="text-xl font-bold text-[#EAB308]">
                    {detailsModal.data.stats?.starredCount ?? 0}
                  </p>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">Starred Problems</p>
                </div>
                <div className="p-3 bg-white border border-[#E5E7EB] rounded-lg">
                  <p className="text-xl font-bold text-[#6C5CE7]">
                    {detailsModal.data.stats?.laddersCount ?? 0}
                  </p>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">Ladders Created</p>
                </div>
              </div>
            </div>

            {/* Connected Platform Handles */}
            <div>
              <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
                Connected Handles
              </h4>
              {detailsModal.data.platformAccounts?.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {detailsModal.data.platformAccounts.map((pa) => (
                    <div
                      key={pa.platform}
                      className="p-2 border border-[#E5E7EB] rounded-md bg-white flex justify-between items-center text-xs"
                    >
                      <Badge>{pa.platform}</Badge>
                      <span className="font-mono font-medium">{pa.handle}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6B7280] italic">No competitive programming handles linked.</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setDetailsModal({ isOpen: false, loading: false, data: null })}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={resetPassModal.isOpen}
        isOpen={resetPassModal.isOpen}
        onClose={() =>
          setResetPassModal({ isOpen: false, username: null, password: '', loading: false })
        }
        title={`Reset Password for @${resetPassModal.username}`}
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-[#6B7280]">
            Set a new password for <strong>@{resetPassModal.username}</strong>. They will be able to
            log in with this new password immediately.
          </p>

          <div>
            <label className="block text-xs font-medium text-[#1E1F25] mb-1">
              New Password (minimum 8 characters)
            </label>
            <Input
              type="text"
              placeholder="Enter new password..."
              value={resetPassModal.password}
              onChange={(e) =>
                setResetPassModal((prev) => ({ ...prev, password: e.target.value }))
              }
              required
              minLength={8}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setResetPassModal({ isOpen: false, username: null, password: '', loading: false })
              }
              disabled={resetPassModal.loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={resetPassModal.loading || resetPassModal.password.length < 8}
              className="bg-[#6C5CE7] text-white"
            >
              {resetPassModal.loading ? 'Resetting...' : 'Save New Password'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        open={deleteModal.isOpen}
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, username: null })}
        title="Delete User Account"
      >
        <div className="space-y-4 text-sm text-[#1E1F25]">
          <p>
            Are you sure you want to permanently delete user{' '}
            <strong>@{deleteModal.username}</strong>?
          </p>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
            This will permanently remove the user, all ladders they created, their ladder memberships,
            solve logs, and connected accounts. This action cannot be reversed.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ isOpen: false, username: null })}
            >
              Cancel
            </Button>
            <Button className="bg-red-500 text-white hover:bg-red-600" onClick={handleDelete}>
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
