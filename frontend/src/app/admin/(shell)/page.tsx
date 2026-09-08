'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  Ticket,
  Stethoscope,
  Building2,
  Briefcase,
  Star,
  FileText,
  Image as ImageIcon,
  Users,
  Eye,
  Loader2,
  IndianRupee,
  Wallet,
  AlertTriangle,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/admin-auth';
import { inr } from '@/lib/billing';
import type { Branch } from '@/types';

interface Stat {
  totalAppointments: number;
  todayAppointments: number;
  totalOp: number;
  todayOp: number;
  totalDoctors: number;
  totalBranches: number;
  totalServices: number;
  totalTestimonials: number;
  totalPosts: number;
  totalGallery: number;
  totalUsers: number;
  totalVisitors: number;
  todayVisitors: number;
}

interface RevenueData {
  summary: {
    totalBilled: number;
    totalPaid: number;
    totalDue: number;
    totalPatients: number;
    totalTransactions: number;
  };
  branchRows: {
    branchId: string;
    branchName: string;
    totalBilled: number;
    totalPaid: number;
    totalDue: number;
    transactions: number;
    totalPatients: number;
    clinicPatients: number;
    homeVisits: number;
  }[];
  methodRows: {
    methodName: string;
    transactions: number;
    revenue: number;
    billed: number;
    totalPatients: number;
  }[];
}

interface DayRow {
  date: string;
  billed: number;
  received: number;
  due: number;
  balance: number;
  patients: number;
  clinicPatients: number;
  homeVisits: number;
  transactions: number;
  cumBilled: number;
  cumReceived: number;
}

interface DayWiseData {
  rows: DayRow[];
  summary: {
    totalBilled: number;
    totalReceived: number;
    totalDue: number;
    totalBalance: number;
    totalPatients: number;
    totalTransactions: number;
    startDate: string | null;
    endDate: string | null;
  };
}

function StatCard({ icon: Icon, label, value, sub, to }: { icon: typeof Eye; label: string; value: number; sub?: string; to?: string }) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </>
  );
  const cls = 'block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-sky-200';
  return to ? <Link href={to} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

function RevStat({ label, value, tone }: { label: string; value: string; tone: 'sky' | 'emerald' | 'amber' }) {
  const tones: Record<string, string> = {
    sky: 'text-sky-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
  };
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

const inputCls =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none';

function dayOffsetIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stat | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  // Day-wise state
  const [mode, setMode] = useState<'today' | 'yesterday' | 'date' | 'range'>('today');
  const [customDate, setCustomDate] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [branch, setBranch] = useState('');
  const [ch, setCh] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [dayData, setDayData] = useState<DayWiseData | null>(null);
  const [dayLoading, setDayLoading] = useState(false);

  useEffect(() => {
    fetch('/api/site/branches')
      .then((r) => r.json())
      .then((d) => setBranches(d.data || []))
      .catch(() => {});
  }, []);

  const dayParams = useMemo(() => {
    if (mode === 'today') return { from: todayIso(), to: todayIso() };
    if (mode === 'yesterday') {
      const yd = dayOffsetIso(-1);
      return { from: yd, to: yd };
    }
    if (mode === 'date') {
      const d = customDate || todayIso();
      return { from: d, to: d };
    }
    return { from: fromDate || '' , to: toDate || '' };
  }, [mode, customDate, fromDate, toDate]);

  const loadDay = useCallback(async () => {
    setDayLoading(true);
    try {
      const p = new URLSearchParams();
      if (dayParams.from) p.set('from', dayParams.from);
      if (dayParams.to) p.set('to', dayParams.to);
      if (branch) p.set('branch', branch);
      if (ch) p.set('ch', ch);
      const res = await adminFetch<{ data: DayWiseData }>(`/api/admin/analytics/revenue/day-wise?${p.toString()}`);
      setDayData(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load day-wise data');
    } finally {
      setDayLoading(false);
    }
  }, [dayParams, branch, ch]);

  useEffect(() => {
    void loadDay();
  }, [loadDay]);

  useEffect(() => {
    adminFetch<{ data: { stats: Stat } }>('/api/admin/dashboard')
      .then((res) => setStats(res.data.stats))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    adminFetch<{ data: RevenueData }>('/api/admin/analytics/revenue')
      .then((res) => setRevenue(res.data))
      .catch(() => {});
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  const s = revenue?.summary;

  const modeLabel =
    (mode === 'today' ? 'Today' : mode === 'yesterday' ? 'Yesterday' : mode === 'date' ? (customDate || 'Today') : dayParams.from && dayParams.to ? `${dayParams.from} → ${dayParams.to}` : 'Date range') +
    (branch ? ` · ${branches.find((b) => b._id === branch)?.name || ''}` : '') +
    (ch ? ` · ${ch === 'home' ? 'Home' : 'Clinic'}` : '');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={CalendarCheck} label="Appointments" value={stats.totalAppointments} sub={`${stats.todayAppointments} today`} to="/admin/appointments" />
        <StatCard icon={Ticket} label="OP Registrations" value={stats.totalOp} sub={`${stats.todayOp} today`} to="/admin/op-registrations" />
        <StatCard icon={Stethoscope} label="Active Doctors" value={stats.totalDoctors} to="/admin/doctors" />
        <StatCard icon={Building2} label="Branches" value={stats.totalBranches} to="/admin/branches" />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <CalendarIcon className="h-4 w-4 text-sky-600" /> Daily Financial Analytics
          </h3>
          <Link href="/admin/revenue" className="text-xs font-semibold text-sky-600 hover:underline">
            Full revenue report →
          </Link>
        </div>

        {/* Date filters */}
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-1">
            {([
              ['today', 'Today'],
              ['yesterday', 'Yesterday'],
              ['date', 'Custom Date'],
              ['range', 'Date Range'],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setMode(k)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mode === k ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'date' && (
            <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className={inputCls} title="Date" />
          )}
          {mode === 'range' && (
            <>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} title="From" />
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} title="To" />
            </>
          )}
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className={inputCls} title="Branch">
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
          <select value={ch} onChange={(e) => setCh(e.target.value)} className={inputCls} title="C/H">
            <option value="">All (Clinic + Home)</option>
            <option value="clinic">Clinic (C)</option>
            <option value="home">Home (H)</option>
          </select>
          <button
            onClick={() => void loadDay()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            <CalendarIcon className="h-4 w-4" /> Apply
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {dayLoading && !dayData ? (
            <p className="py-10 text-center text-sm text-slate-400">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-600" />
            </p>
          ) : (
            <>
              <p className="mb-4 text-xs text-slate-400">
                Showing <span className="font-semibold text-slate-600">{modeLabel}</span> — Billing follows the bill date; Received follows the actual payment date. Due is cumulative.
              </p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                <RevStat label="Total Billed" value={inr(dayData?.summary.totalBilled ?? 0)} tone="sky" />
                <RevStat label="Received" value={inr(dayData?.summary.totalReceived ?? 0)} tone="emerald" />
                <RevStat label="Due" value={inr(dayData?.summary.totalDue ?? 0)} tone="amber" />
                <RevStat label="Balance" value={inr(dayData?.summary.totalBalance ?? 0)} tone="sky" />
                <RevStat label="Patients" value={(dayData?.summary.totalPatients ?? 0).toLocaleString()} tone="sky" />
                <RevStat label="Transactions" value={(dayData?.summary.totalTransactions ?? 0).toLocaleString()} tone="emerald" />
              </div>

              {mode === 'range' && dayData && dayData.rows.length > 0 && (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Date</th>
                        <th className="px-3 py-2 text-right font-semibold">Billed</th>
                        <th className="px-3 py-2 text-right font-semibold">Received</th>
                        <th className="px-3 py-2 text-right font-semibold">Due</th>
                        <th className="px-3 py-2 text-right font-semibold">Balance</th>
                        <th className="px-3 py-2 text-right font-semibold">Patients</th>
                        <th className="px-3 py-2 text-right font-semibold">Clinic</th>
                        <th className="px-3 py-2 text-right font-semibold">Home Visits</th>
                        <th className="px-3 py-2 text-right font-semibold">Transactions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dayData.rows.map((r) => (
                        <tr key={r.date} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-800">{formatDate(r.date)}</td>
                          <td className="px-3 py-2 text-right text-slate-800">{inr(r.billed)}</td>
                          <td className="px-3 py-2 text-right font-medium text-emerald-600">{inr(r.received)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-amber-600">{inr(r.due)}</td>
                          <td className="px-3 py-2 text-right font-medium text-slate-600">{inr(r.balance)}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{r.patients}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{r.clinicPatients}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{r.homeVisits}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{r.transactions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Revenue &amp; OP overview (all time)</h3>
          <Link href="/admin/revenue" className="text-xs font-semibold text-sky-600 hover:underline">
            Full revenue report →
          </Link>
        </div>
        {revenue ? (
          <>
            <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-5">
              <RevStat label="Billed" value={inr(s?.totalBilled ?? 0)} tone="sky" />
              <RevStat label="Received" value={inr(s?.totalPaid ?? 0)} tone="emerald" />
              <RevStat label="Due" value={inr(s?.totalDue ?? 0)} tone="amber" />
              <RevStat label="Patients" value={(s?.totalPatients ?? 0).toLocaleString()} tone="sky" />
              <RevStat label="Transactions" value={(s?.totalTransactions ?? 0).toLocaleString()} tone="emerald" />
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Branch-wise revenue</h4>
                <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
                  {revenue.branchRows.map((b) => (
                    <div key={b.branchId} className="rounded-lg bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">{b.branchName}</p>
                        <p className="text-sm font-bold text-emerald-600">{inr(b.totalPaid)}</p>
                      </div>
                      <p className="text-xs text-slate-400">
                        {b.clinicPatients} clinic + {b.homeVisits} home · billed {inr(b.totalBilled)}
                      </p>
                    </div>
                  ))}
                  {revenue.branchRows.length === 0 && (
                    <p className="py-6 text-center text-sm text-slate-400">No revenue data yet.</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Payment method-wise</h4>
                <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
                  {revenue.methodRows.map((m) => (
                    <div key={m.methodName} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{m.methodName}</p>
                        <p className="text-xs text-slate-400">{m.transactions} transaction(s)</p>
                      </div>
                      <p className="text-sm font-bold text-sky-700">{inr(m.revenue)}</p>
                    </div>
                  ))}
                  {revenue.methodRows.length === 0 && (
                    <p className="py-6 text-center text-sm text-slate-400">No payment data yet.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="py-10 text-center text-sm text-slate-400">Loading revenue…</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">Content overview</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {[
            { label: 'Doctors', value: stats.totalDoctors, icon: Stethoscope, href: '/admin/doctors' },
            { label: 'Branches', value: stats.totalBranches, icon: Building2, href: '/admin/branches' },
            { label: 'Services', value: stats.totalServices, icon: Briefcase, href: '/admin/services' },
            { label: 'Testimonials', value: stats.totalTestimonials, icon: Star, href: '/admin/testimonials' },
            { label: 'Posts', value: stats.totalPosts, icon: FileText, href: '/admin/blog' },
            { label: 'Gallery', value: stats.totalGallery, icon: ImageIcon, href: '/admin/gallery' },
            { label: 'Users', value: stats.totalUsers, icon: Users, href: '/admin/users' },
            { label: 'Visitors', value: stats.totalVisitors, icon: Eye, href: '/admin' },
          ].map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center transition-colors hover:border-sky-200 hover:bg-sky-50"
            >
              <c.icon className="h-5 w-5 text-sky-600" />
              <div>
                <p className="text-lg font-bold text-slate-900">{c.value.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500">{c.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-sm text-sky-800">
        <Wallet className="h-4 w-4 shrink-0" />
        <span>Revenue is aggregated from actual OP visit charges &amp; payments. Medical billing follows the bill date; received follows the actual payment transaction date. Open the <Link href="/admin/revenue" className="font-semibold underline">Revenue</Link> or <Link href="/admin/branch-reports" className="font-semibold underline">Branch Reports</Link> pages to filter by branch, date and payment method.</span>
        <AlertTriangle className="ml-auto h-4 w-4 shrink-0 opacity-40" />
      </div>
    </div>
  );
}

function formatDate(s: string): string {
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
