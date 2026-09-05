'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw, Search, X, Users as UsersIcon, Activity as ActivityIcon, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch, useAuth } from '@/lib/admin-auth';
import StatusBadge from '@/components/admin/StatusBadge';
import StaffActivity from '@/components/admin/StaffActivity';
import StaffAttendance from '@/components/admin/StaffAttendance';

interface UserRow {
  _id: string;
  name: string;
  email: string;
  username?: string;
  mobileNumber: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

interface UserList {
  data: UserRow[];
  total: number;
  totalPages: number;
}

const ROLE_OPTIONS = [
  { value: 'superAdmin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'contentEditor', label: 'Content Editor' },
  { value: 'receptionist', label: 'Receptionist' },
];

export default function AdminUsersPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superAdmin';

  const [tab, setTab] = useState<'users' | 'activity' | 'attendance'>('users');
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; editing: UserRow | null }>({ open: false, editing: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search.trim()) params.set('search', search.trim());
      if (role) params.set('role', role);
      const res = await adminFetch<{ data: UserList }>(`/api/admin/users?${params}`);
      setRows(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (row: UserRow) => {
    if (!window.confirm(`Delete user "${row.name}"? This cannot be undone.`)) return;
    try {
      await adminFetch(`/api/admin/users/${row._id}`, { method: 'DELETE' });
      toast.success('User deleted');
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <TabButton active={tab === 'users'} onClick={() => setTab('users')} icon={<UsersIcon className="h-4 w-4" />} label="Users & Roles" />
        <TabButton active={tab === 'activity'} onClick={() => setTab('activity')} icon={<ActivityIcon className="h-4 w-4" />} label="Staff Activity" />
        <TabButton active={tab === 'attendance'} onClick={() => setTab('attendance')} icon={<Clock className="h-4 w-4" />} label="Attendance (IN/OUT)" />
      </div>

      {tab !== 'users' ? (
        tab === 'activity' ? <StaffActivity /> : <StaffAttendance />
      ) : (
      <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email, mobile…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
          >
            <option value="">All roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setDialog({ open: true, editing: null })}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Mobile</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Last login</th>
                {isSuperAdmin && <th className="w-28 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold uppercase text-sky-700">
                        {r.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-slate-800">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{r.email}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{r.mobileNumber}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 capitalize">
                      {ROLE_OPTIONS.find((o) => o.value === r.role)?.label || r.role}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge value={r.isActive ? 'active' : 'inactive'} /></td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString() : '—'}
                  </td>
                  {isSuperAdmin && (
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setDialog({ open: true, editing: r })}
                          className="rounded-md px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void handleDelete(r)}
                          disabled={r.role === 'superAdmin' || r._id === user?._id}
                          className="rounded-md px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !loading && (
            <div className="py-14 text-center text-sm text-slate-400">No users found.</div>
          )}
          {loading && (
            <div className="flex items-center justify-center gap-2 border-t border-slate-100 py-3 text-xs text-slate-400">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">{total} user{total === 1 ? '' : 's'}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-medium text-slate-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {dialog.open && isSuperAdmin && (
        <UserFormDialog
          editing={dialog.editing}
          onClose={() => setDialog({ open: false, editing: null })}
          onSaved={() => { setDialog({ open: false, editing: null }); void load(); }}
        />
      )}
      </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function UserFormDialog({
  editing,
  onClose,
  onSaved,
}: {
  editing: UserRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    email: editing?.email || '',
    username: editing?.username || '',
    mobileNumber: editing?.mobileNumber || '',
    role: editing?.role || 'contentEditor',
    password: '',
    isActive: editing ? editing.isActive : true,
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string | boolean) => setForm((prev) => ({ ...prev, [k]: v }));

  const isReceptionist = form.role === 'receptionist';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    const pw = form.password;
    if (isReceptionist) {
      if (!editing && !/^[0-9]{4,8}$/.test(pw)) {
        toast.error('Receptionist PIN must be 4 to 8 digits');
        return;
      }
      if (editing && pw !== '' && !/^[0-9]{4,8}$/.test(pw)) {
        toast.error('Receptionist PIN must be 4 to 8 digits');
        return;
      }
    } else {
      if (!editing && (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw))) {
        toast.error('Password must be at least 8 characters with a letter and a number');
        return;
      }
      if (editing && pw !== '' && (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw))) {
        toast.error('Password must be at least 8 characters with a letter and a number');
        return;
      }
    }
    setSaving(true);
    try {
      if (editing) {
        await adminFetch(`/api/admin/users/${editing._id}`, {
          method: 'PUT',
          body: {
            name: form.name,
            email: form.email,
            username: form.username || undefined,
            mobileNumber: form.mobileNumber,
            role: form.role,
            isActive: form.isActive,
            ...(form.password ? { password: form.password } : {}),
          },
        });
        toast.success('User updated');
      } else {
        await adminFetch('/api/admin/users', {
          method: 'POST',
          body: {
            name: form.name,
            email: form.email,
            username: form.username || undefined,
            mobileNumber: form.mobileNumber,
            role: form.role,
            password: form.password,
          },
        });
        toast.success('User created');
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            {editing ? 'Edit user' : 'Add new user'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Full name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={input} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email *</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={input} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Mobile</label>
              <input value={form.mobileNumber} onChange={(e) => set('mobileNumber', e.target.value)} className={input} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Username</label>
              <input
                value={form.username}
                onChange={(e) => set('username', e.target.value)}
                placeholder="Login username (optional)"
                className={input}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Role *</label>
              <select value={form.role} onChange={(e) => set('role', e.target.value)} className={input}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {editing ? `${isReceptionist ? 'New PIN' : 'New password'} (leave blank to keep)` : isReceptionist ? 'PIN *' : 'Password *'}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder={
                  isReceptionist ? '4-8 digit PIN' : editing ? '••••••••' : 'Min 8 chars, letter + number'
                }
                className={input}
              />
            </div>
          </div>
          {editing && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => set('isActive', !form.isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-sky-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-slate-700">{form.isActive ? 'Active' : 'Deactivated'}</span>
            </div>
          )}
        </form>
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? 'Save changes' : 'Create user'}
          </button>
        </div>
      </div>
    </div>
  );
}
