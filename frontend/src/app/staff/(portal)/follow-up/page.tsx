'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Search, Activity, ChevronRight, Repeat } from 'lucide-react';
import { staffFetch } from '@/lib/staff-auth';

interface ActiveCourse {
  _id: string;
  courseNo: string;
  treatment?: string;
  status: string;
  totalDays: number;
  dayNumber: number;
  startDate: string;
  endDate: string;
  courseAmount: number;
  additionalCharges: number;
}

interface ActiveCourseRow {
  course: ActiveCourse;
  patient: { _id: string; uhid?: string; name: string; mobile?: string; cH?: string } | null;
  branch?: string | null;
  department?: string | null;
  doctor?: string | null;
  billed: number;
  paid: number;
  due: number;
  balance: number;
  completedDays: number;
  nextDay: number;
  nextDayDate?: string | null;
  lastVisitDate?: string | null;
  progress: string;
}

export default function FollowUpPage() {
  const [rows, setRows] = useState<ActiveCourseRow[]>([]);
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await staffFetch<{ data: ActiveCourseRow[] }>(`/api/staff/courses/active-list`);
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const q = term.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) => {
        const hay = [r.patient?.name, r.patient?.uhid, r.patient?.mobile, r.course.courseNo, r.course.treatment]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
    : rows;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Patient Follow-up</h1>
        <p className="text-sm text-slate-500">
          {rows.length > 0
            ? `${rows.length} active course patient${rows.length === 1 ? '' : 's'} listed automatically. Click a row to open the course and record visits / payments.`
            : 'Active course patients appear here automatically. Register a course patient to get started.'}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Filter by name, mobile, UHID or course…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-teal-600" /> Loading follow-ups…
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2">
                <Repeat className="h-8 w-8 text-slate-300" />
                <p>No active course patients yet.</p>
              </div>
            ) : (
              <p>
                No patients match “{term}”.{' '}
                <button onClick={() => setTerm('')} className="text-teal-600 hover:underline">
                  Clear
                </button>
              </p>
            )}
          </div>
        ) : (
          <table className="w-full min-w-[1200px] text-left text-xs">
            <thead className="bg-slate-50">
              <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2.5 font-semibold">S.No</th>
                <th className="px-3 py-2.5 font-semibold">Patient</th>
                <th className="px-3 py-2.5 font-semibold">UHID</th>
                <th className="px-3 py-2.5 font-semibold">C/H</th>
                <th className="px-3 py-2.5 font-semibold">Course</th>
                <th className="px-3 py-2.5 font-semibold">Course Days</th>
                <th className="px-3 py-2.5 font-semibold">Progress</th>
                <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                <th className="px-3 py-2.5 text-right font-semibold">Paid</th>
                <th className="px-3 py-2.5 text-right font-semibold">Due</th>
                <th className="px-3 py-2.5 text-right font-semibold">Balance</th>
                <th className="px-3 py-2.5 font-semibold">Last Course Date</th>
                <th className="px-3 py-2.5 font-semibold">Next / Current Day</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r, i) => {
                const overdue = r.nextDayDate && new Date(r.nextDayDate) < new Date(new Date().toDateString());
                return (
                  <tr key={`${r.course._id}-${r.patient?._id}`} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={r.patient ? `/staff/follow-up/${r.patient._id}/${r.course._id}` : '#'}
                        className="font-medium text-slate-800 hover:text-teal-700"
                      >
                        {r.patient?.name || '—'}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{r.patient?.uhid || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-500">
                        {r.patient?.cH || 'C'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-700">
                        <Activity className="h-3 w-3" /> {r.course.courseNo}
                      </span>
                      {r.course.treatment && <span className="ml-1.5 text-slate-600">{r.course.treatment}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {r.completedDays}/{r.course.totalDays}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{r.progress} days</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-700">{inr(r.billed)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-teal-700">{inr(r.paid)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-amber-600">{inr(r.due)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">{inr(r.balance)}</td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {r.lastVisitDate ? formatDate(r.lastVisitDate) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {r.completedDays < r.course.totalDays ? (
                        <span className={overdue ? 'text-amber-600' : ''}>
                          Day {r.nextDay}
                          {r.nextDayDate ? ` · ${formatDate(r.nextDayDate)}` : ''}
                        </span>
                      ) : (
                        'Completed'
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                        {r.course.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link
                        href={r.patient ? `/staff/follow-up/${r.patient._id}/${r.course._id}` : '#'}
                        className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-teal-700"
                      >
                        Open <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function formatDate(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function inr(n: number): string {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}