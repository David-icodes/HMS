'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChartColumn, Loader2, RefreshCw, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/admin-auth';
import { inr } from '@/lib/billing';

interface StaffRow {
  staffId: string | null;
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

interface StaffRes {
  data: StaffRow[];
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

const TYPE_TONES: Record<string, string> = {
  'New OP': 'bg-sky-50 text-sky-700',
  'Follow-up': 'bg-violet-50 text-violet-700',
  'Home Visit': 'bg-amber-50 text-amber-700',
  'Course Registration': 'bg-teal-50 text-teal-700',
  'New Patient': 'bg-emerald-50 text-emerald-700',
  Payment: 'bg-slate-100 text-slate-700',
};

export default function StaffAnalyticsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [staff, setStaff] = useState('');
  const [ch, setCh] = useState('');
  const [staffList, setStaffList] = useState<{ _id: string; name: string; role: string }[]>([]);
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [detail, setDetail] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    adminFetch<{ data: { _id: string; name: string; role: string }[] }>('/api/admin/attendance/staff-list')
      .then((r) => setStaffList(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (staff) params.set('staff', staff);
      if (ch) params.set('ch', ch);
      const res = await adminFetch<{ data: StaffRes }>(`/api/admin/staff-analytics?${params.toString()}`);
      const payload = res.data || { data: [], totals: EMPTY_TOTALS };
      setRows(payload.data || []);
      setTotals(payload.totals || EMPTY_TOTALS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load staff analytics');
    } finally {
      setLoading(false);
    }
  }, [from, to, staff, ch]);

  const loadDetail = useCallback(async () => {
    setDetailLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (staff) params.set('staff', staff);
      if (ch) params.set('ch', ch);
      const res = await adminFetch<{ data: DetailRow[] }>(`/api/admin/staff-analytics/detail?${params.toString()}`);
      setDetail(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load staff analytics detail');
    } finally {
      setDetailLoading(false);
    }
  }, [from, to, staff, ch]);

  useEffect(() => {
    void loadSummary();
    void loadDetail();
  }, [loadSummary, loadDetail]);

  const label =
    (from && to ? `${formatDate(from)} → ${formatDate(to)}` : from ? `From ${formatDate(from)}` : to ? `Till ${formatDate(to)}` : 'All time') +
    (staff ? ' · selected staff' : '') +
    (ch ? ` · ${ch === 'home' ? 'Home' : 'Clinic'}` : '');

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <select value={staff} onChange={(e) => setStaff(e.target.value)} className={inputCls}>
            <option value="">All staff</option>
            {staffList.map((s) => (
              <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
            ))}
          </select>
          <select value={ch} onChange={(e) => setCh(e.target.value)} className={inputCls}>
            <option value="">All (Clinic + Home)</option>
            <option value="clinic">Clinic (C)</option>
            <option value="home">Home (H)</option>
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} title="From" />
          <span className="text-xs text-slate-400">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} title="To" />
          <button
            onClick={() => { void loadSummary(); void loadDetail(); }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> Apply
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-600">{label}</span> — per-staff entries, recruitments, courses, follow-ups and financials.
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
    </div>
  );
}

function formatDate(s: string): string {
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
