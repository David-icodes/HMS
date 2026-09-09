'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChartColumn, IdCard, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/admin-auth';
import { inr } from '@/lib/billing';
import type { Staff } from '@/types';

interface StaffRow {
  _id: string;
  name: string;
  role: string;
  mobile: string;
  email: string;
  branchId: string | null;
  branchName: string;
  isActive: boolean;
  createdAt: string;
}

interface StaffRes {
  data: StaffRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface StaffAnalyticsRow {
  staffId: string;
  staffName: string;
  role: string;
  entries: number;
  newPatients: number;
  courses: number;
  followUps: number;
  billed: number;
  paid: number;
  due: number;
  balance: number;
  payments: number;
}

interface StaffAnalyticsRes {
  data: StaffAnalyticsRow[];
  totals: {
    entries: number;
    newPatients: number;
    courses: number;
    followUps: number;
    billed: number;
    paid: number;
    due: number;
    balance: number;
    payments: number;
  };
}

interface DetailRow {
  date: string;
  createdTime: string;
  staff: string;
  branch: string;
  patientName: string;
  uhid: string;
  type: string;
  cH: string;
  recordNo: string;
  billed: number;
  paid: number;
  due: number;
}

interface PerStaffRes {
  staff: { _id: string; name: string; role: string };
  data: DetailRow[];
  summary: {
    entries: number;
    newPatients: number;
    courses: number;
    followUps: number;
    homeVisits: number;
    payments: number;
    billed: number;
    paid: number;
    due: number;
  };
}

const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none';

const EMPTY_TOTALS = {
  entries: 0,
  newPatients: 0,
  courses: 0,
  followUps: 0,
  billed: 0,
  paid: 0,
  due: 0,
  balance: 0,
  payments: 0,
};

const EMPTY_FORM = { name: '', role: 'Receptionist', mobile: '', email: '', branchId: '' };

const TYPE_TONES: Record<string, string> = {
  'New OP': 'bg-sky-50 text-sky-700',
  'Follow-up': 'bg-violet-50 text-violet-700',
  'Home Visit': 'bg-amber-50 text-amber-700',
  'Course Registration': 'bg-teal-50 text-teal-700',
  'New Patient': 'bg-emerald-50 text-emerald-700',
  Payment: 'bg-slate-100 text-slate-700',
};

export default function StaffPage() {
  const [tab, setTab] = useState<'registry' | 'analytics'>('registry');

  // Registry
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [res, setRes] = useState<StaffRes | null>(null);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [branches, setBranches] = useState<{ _id: string; name: string }[]>([]);

  // Per-staff analytics modal
  const [viewStaff, setViewStaff] = useState<StaffRow | null>(null);
  const [mFrom, setMFrom] = useState('');
  const [mTo, setMTo] = useState('');
  const [mLoading, setMLoading] = useState(false);
  const [mRes, setMRes] = useState<PerStaffRes | null>(null);

  // Team analytics
  const [aFrom, setAFrom] = useState('');
  const [aTo, setATo] = useState('');
  const [aStaff, setAStaff] = useState('');
  const [aCh, setACh] = useState('');
  const [staffList, setStaffList] = useState<{ _id: string; name: string; role: string }[]>([]);
  const [rows, setRows] = useState<StaffAnalyticsRow[]>([]);
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [detail, setDetail] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    adminFetch<{ data: { _id: string; name: string; role: string }[] }>('/api/admin/attendance/staff-list')
      .then((r) => setStaffList(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    adminFetch<{ data: { _id: string; name: string }[] }>('/api/admin/analytics/branches')
      .then((r) => {
        if (Array.isArray(r.data)) setBranches(r.data.map((b) => ({ _id: b._id, name: b.name })));
      })
      .catch(() => {});
  }, []);

  const loadRegistry = useCallback(async () => {
    setRegistryLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      params.set('page', String(page));
      if (includeInactive) params.set('includeInactive', '1');
      const r = await adminFetch<{ data: StaffRes }>(`/api/admin/staff?${params.toString()}`);
      setRes(r.data || null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load staff');
    } finally {
      setRegistryLoading(false);
    }
  }, [search, page, includeInactive]);

  useEffect(() => {
    void loadRegistry();
  }, [loadRegistry]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Staff name is required');
      return;
    }
    setSaving(true);
    try {
      await adminFetch<{ data: Staff }>(editingStaff ? `/api/admin/staff/${editingStaff._id}` : '/api/admin/staff', {
        method: editingStaff ? 'PUT' : 'POST',
        body: {
          name: form.name.trim(),
          role: form.role.trim() || 'Receptionist',
          mobile: form.mobile.trim(),
          email: form.email.trim(),
          branch: form.branchId || undefined,
        },
      });
      toast.success(editingStaff ? 'Staff member updated' : 'Staff member added');
      setAddOpen(false);
      setEditingStaff(null);
      setForm(EMPTY_FORM);
      void loadRegistry();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add staff');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (staff: StaffRow) => {
    setEditingStaff(staff);
    setForm({ name: staff.name, role: staff.role, mobile: staff.mobile, email: staff.email, branchId: staff.branchId || '' });
    setAddOpen(true);
  };

  const handleToggle = async (s: StaffRow) => {
    try {
      await adminFetch(`/api/admin/staff/${s._id}`, { method: 'DELETE' });
      toast.success(s.isActive ? 'Staff member deactivated' : 'Staff member activated');
      void loadRegistry();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update staff');
    }
  };

  const openAnalytics = async (s: StaffRow) => {
    setViewStaff(s);
    setMRes(null);
    setMFrom('');
    setMTo('');
    setMLoading(true);
    try {
      const r = await adminFetch<{ data: PerStaffRes }>(`/api/admin/staff/${s._id}/analytics`);
      setMRes(r.data || null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load staff analytics');
    } finally {
      setMLoading(false);
    }
  };

  const mReload = async () => {
    if (!viewStaff) return;
    setMLoading(true);
    try {
      const params = new URLSearchParams();
      if (mFrom) params.set('from', mFrom);
      if (mTo) params.set('to', mTo);
      const r = await adminFetch<{ data: PerStaffRes }>(`/api/admin/staff/${viewStaff._id}/analytics?${params.toString()}`);
      setMRes(r.data || null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load staff analytics');
    } finally {
      setMLoading(false);
    }
  };

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (aFrom) params.set('from', aFrom);
      if (aTo) params.set('to', aTo);
      if (aStaff) params.set('staff', aStaff);
      if (aCh) params.set('ch', aCh);
      const res2 = await adminFetch<{ data: StaffAnalyticsRes }>(`/api/admin/staff-analytics?${params.toString()}`);
      const payload = res2.data || { data: [], totals: EMPTY_TOTALS };
      setRows(payload.data || []);
      setTotals(payload.totals || EMPTY_TOTALS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load staff analytics');
    } finally {
      setLoading(false);
    }
  }, [aFrom, aTo, aStaff, aCh]);

  const loadTeamDetail = useCallback(async () => {
    setDetailLoading(true);
    try {
      const params = new URLSearchParams();
      if (aFrom) params.set('from', aFrom);
      if (aTo) params.set('to', aTo);
      if (aStaff) params.set('staff', aStaff);
      if (aCh) params.set('ch', aCh);
      const res3 = await adminFetch<{ data: DetailRow[] }>(`/api/admin/staff-analytics/detail?${params.toString()}`);
      setDetail(Array.isArray(res3.data) ? res3.data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load staff analytics detail');
    } finally {
      setDetailLoading(false);
    }
  }, [aFrom, aTo, aStaff, aCh]);

  useEffect(() => {
    if (tab !== 'analytics') return;
    void loadTeam();
    void loadTeamDetail();
  }, [tab, loadTeam, loadTeamDetail]);

  const aLabel =
    (aFrom && aTo ? `${formatDate(aFrom)} → ${formatDate(aTo)}` : aFrom ? `From ${formatDate(aFrom)}` : aTo ? `Till ${formatDate(aTo)}` : 'All time') +
    (aStaff ? ' · selected staff' : '') +
    (aCh ? ` · ${aCh === 'home' ? 'Home' : 'Clinic'}` : '');

  const summaryChips = useMemo(() => {
    if (!mRes) return [];
    return [
      { label: 'Entries', value: mRes.summary.entries },
      { label: 'New OP', value: mRes.summary.newPatients },
      { label: 'Courses', value: mRes.summary.courses },
      { label: 'Follow-ups', value: mRes.summary.followUps },
      { label: 'Home Visits', value: mRes.summary.homeVisits },
      { label: 'Billed', value: inr(mRes.summary.billed) },
      { label: 'Paid', value: inr(mRes.summary.paid) },
      { label: 'Due', value: inr(mRes.summary.due) },
    ];
  }, [mRes]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab('registry')}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
            tab === 'registry' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <IdCard className="h-4 w-4" /> Staff registry
        </button>
        <button
          onClick={() => setTab('analytics')}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
            tab === 'analytics' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ChartColumn className="h-4 w-4" /> Team analytics
        </button>
      </div>

      {tab === 'registry' && (
        <div className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-4">
              <IdCard className="h-4 w-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">Staff registry</h3>
              <p className="ml-1 text-xs text-slate-400">Source for Doctor / Staff signature autocomplete in the OP form.</p>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className={`${inputCls} pl-8`}
                    placeholder="Search name / role / mobile…"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={includeInactive}
                    onChange={(e) => {
                      setIncludeInactive(e.target.checked);
                      setPage(1);
                    }}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  Show inactive
                </label>
                <button
                  onClick={() => { setEditingStaff(null); setForm(EMPTY_FORM); setAddOpen(true); }}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
                >
                  <Plus className="h-4 w-4" /> Add staff
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">S.No</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Staff</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Mobile</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Branch</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registryLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-600" />
                      </td>
                    </tr>
                  ) : !res || res.data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        No staff members match the current filters. Add your first staff member to power the signature autocomplete.
                      </td>
                    </tr>
                  ) : (
                    res.data.map((s, i) => (
                      <tr key={s._id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/60 ${!s.isActive ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-2.5 text-slate-500">{(res.page - 1) * res.limit + i + 1}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-slate-800">{s.name}</span>
                          <span className="ml-2 text-[11px] uppercase tracking-wide text-slate-400">{s.role}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{s.mobile || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-700">{s.branchName}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(s)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => void openAnalytics(s)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              <UserCheck className="h-3.5 w-3.5" /> Analytics
                            </button>
                            <button
                              onClick={() => void handleToggle(s)}
                              title={s.isActive ? 'Deactivate' : 'Activate'}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              {s.isActive ? <Trash2 className="h-3.5 w-3.5 text-slate-400" /> : <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />}
                              {s.isActive ? 'Delete' : 'Undo'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {res && res.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
                <span className="text-xs text-slate-400">
                  Page {res.page} of {res.totalPages} · {res.total} staff
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page >= res.totalPages}
                    onClick={() => setPage((p) => Math.min(res.totalPages, p + 1))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {res && (
            <p className="text-xs text-slate-400">
              Deleting a staff member only deactivates them — their historical patient records, visits and payments are never
              touched (names are kept as snapshots). Reactivate from the same list anytime.
            </p>
          )}
        </div>
      )}

      {tab === 'analytics' && (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <select value={aStaff} onChange={(e) => setAStaff(e.target.value)} className={inputCls}>
                <option value="">All staff</option>
                {staffList.map((s) => (
                  <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                ))}
              </select>
              <select value={aCh} onChange={(e) => setACh(e.target.value)} className={inputCls}>
                <option value="">All (Clinic + Home)</option>
                <option value="clinic">Clinic (C)</option>
                <option value="home">Home (H)</option>
              </select>
              <input type="date" value={aFrom} onChange={(e) => setAFrom(e.target.value)} className={inputCls} title="From" />
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={aTo} onChange={(e) => setATo(e.target.value)} className={inputCls} title="To" />
              <button
                onClick={() => {
                  void loadTeam();
                  void loadTeamDetail();
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" /> Apply
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-600">{aLabel}</span> — per-staff entries, recruitments, courses, follow-ups and financials.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <UserCheck className="h-4 w-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">Summary of each staff</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">S.No</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Staff</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Entries</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Recruitments</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Course</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Follow-ups</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Billed</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Due</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Balance</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Payments</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-600" />
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                        No staff analytics for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, i) => (
                      <tr key={r.staffId || `unassigned-${i}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-slate-800">{r.staffName}</span>
                          {r.role && <span className="ml-2 text-[11px] uppercase tracking-wide text-slate-400">{r.role}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{r.entries}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{r.newPatients}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{r.courses}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{r.followUps}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-slate-800">{inr(r.billed)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-emerald-600">{inr(r.paid)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-amber-600">{inr(r.due)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-slate-600">{inr(r.balance)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{r.payments}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                    <td className="px-4 py-3 text-slate-900" colSpan={2}>TOTAL</td>
                    <td className="px-4 py-3 text-right text-slate-900">{totals.entries}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{totals.newPatients}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{totals.courses}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{totals.followUps}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{inr(totals.billed)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{inr(totals.paid)}</td>
                    <td className="px-4 py-3 text-right text-amber-700">{inr(totals.due)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{inr(totals.balance)}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{totals.payments}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <ChartColumn className="h-4 w-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">Detailed entries</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Staff</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Patient</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">C/H</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Branch</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Record No</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Billed</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {detailLoading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-600" />
                      </td>
                    </tr>
                  ) : detail.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                        No detailed entries for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    detail.map((r, i) => (
                      <tr key={`${r.date}-${r.patientName}-${r.type}-${i}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 text-slate-700">
                          {formatDate(r.date)}
                          {r.createdTime && <span className="ml-1 text-[11px] text-slate-400">{r.createdTime}</span>}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{r.staff}</td>
                        <td className="px-4 py-2.5 text-slate-700">
                          {r.patientName}
                          {r.uhid && <span className="ml-1 text-[11px] text-slate-400">#{r.uhid}</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_TONES[r.type] || 'bg-slate-100 text-slate-700'}`}>
                            {r.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{r.cH || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600">{r.branch || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600">{r.recordNo || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-slate-800">{inr(r.billed)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-emerald-600">{inr(r.paid)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-amber-600">{inr(r.due)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">{editingStaff ? 'Edit staff member' : 'Add staff member'}</h3>
              <button onClick={() => { setAddOpen(false); setEditingStaff(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. Priya Sharma"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Role</label>
                <input
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className={inputCls}
                  placeholder="Receptionist / Nurse / Doctor…"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Branch</label>
                <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className={inputCls}>
                  <option value="">— Select —</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Mobile</label>
                <input
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  className={inputCls}
                  placeholder="98765 43210"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                  placeholder="name@hospital.in"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setAddOpen(false); setEditingStaff(null); }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editingStaff ? 'Save changes' : 'Add staff'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewStaff && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
          <div className="mt-6 w-full max-w-4xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{viewStaff.name}</h3>
                <p className="text-xs text-slate-400">{viewStaff.role} · {viewStaff.branchName}</p>
              </div>
              <button onClick={() => setViewStaff(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-3">
              <input type="date" value={mFrom} onChange={(e) => setMFrom(e.target.value)} className={inputCls} title="From" />
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={mTo} onChange={(e) => setMTo(e.target.value)} className={inputCls} title="To" />
              <button
                onClick={() => void mReload()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" /> Apply
              </button>
            </div>

            <div className="px-6 py-4">
              {mLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
                </div>
              ) : !mRes ? (
                <p className="py-8 text-center text-sm text-slate-400">No data available.</p>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {summaryChips.map((c) => (
                      <div key={c.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">{c.label}</p>
                        <p className="text-sm font-bold text-slate-800">{c.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="max-h-[50vh] overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Patient</th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">C/H</th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Record No</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Billed</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Paid</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mRes.data.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                              No entries for the selected range.
                            </td>
                          </tr>
                        ) : (
                          mRes.data.map((r, i) => (
                            <tr key={`${r.date}-${r.patientName}-${r.type}-${i}`} className="border-b border-slate-100 last:border-0">
                              <td className="px-3 py-2 text-slate-700">
                                {formatDate(r.date)}
                                {r.createdTime && <span className="ml-1 text-[11px] text-slate-400">{r.createdTime}</span>}
                              </td>
                              <td className="px-3 py-2 text-slate-700">
                                {r.patientName}
                                {r.uhid && <span className="ml-1 text-[11px] text-slate-400">#{r.uhid}</span>}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_TONES[r.type] || 'bg-slate-100 text-slate-700'}`}>
                                  {r.type}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-600">{r.cH || '—'}</td>
                              <td className="px-3 py-2 text-slate-600">{r.recordNo || '—'}</td>
                              <td className="px-3 py-2 text-right font-medium text-slate-800">{inr(r.billed)}</td>
                              <td className="px-3 py-2 text-right font-medium text-emerald-600">{inr(r.paid)}</td>
                              <td className="px-3 py-2 text-right font-medium text-amber-600">{inr(r.due)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(s: string): string {
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
