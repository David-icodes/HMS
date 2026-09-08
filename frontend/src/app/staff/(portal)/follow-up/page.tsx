'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Search, UserRound, Activity, X, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { staffFetch } from '@/lib/staff-auth';
import type { Patient } from '@/types';

interface SearchRow extends Patient {
  activeCourse?: {
    _id: string;
    courseNo: string;
    status: string;
    totalDays: number;
    dayNumber: number;
    courseAmount: number;
    paid: number;
    due: number;
    treatment?: string;
    department?: { _id: string; name: string } | null;
    doctor?: { _id: string; name: string } | null;
  } | null;
}

export default function FollowUpPage() {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!term.trim()) {
      toast.error('Enter a name, mobile, UHID or OP number');
      return;
    }
    setLoading(true);
    try {
      const res = await staffFetch<{ data: SearchRow[] }>(
        `/api/staff/patients/search?q=${encodeURIComponent(term.trim())}`
      );
      setRows(Array.isArray(res.data) ? res.data : []);
      setSearched(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Patient Follow-up</h1>
        <p className="text-sm text-slate-500">
          Search a patient to open their course and record follow-up visits / payments.
        </p>
      </div>

      <form onSubmit={search} className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search by patient name, mobile, UHID or OP number…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-teal-600" /> Searching…
          </div>
        ) : searched && rows.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            No patients found. <button onClick={() => setTerm('')} className="text-teal-600 hover:underline">Clear</button>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-slate-400">Search for a patient to get started.</div>
        ) : (
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-slate-50">
              <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2.5 font-semibold">Patient</th>
                <th className="px-3 py-2.5 font-semibold">Mobile</th>
                <th className="px-3 py-2.5 font-semibold">UHID</th>
                <th className="px-3 py-2.5 font-semibold">Active Course</th>
                <th className="px-3 py-2.5 font-semibold text-right">Progress</th>
                <th className="px-3 py-2.5 text-right font-semibold">Due</th>
                <th className="px-3 py-2.5 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 font-medium text-slate-800">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                        <UserRound className="h-4 w-4" />
                      </span>
                      {p.name}
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-500">
                        {p.cH || 'C'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{p.mobile || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{p.uhid}</td>
                  <td className="px-3 py-2.5">
                    {p.activeCourse ? (
                      <Link
                        href={`/staff/follow-up/${p._id}/${p.activeCourse._id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-700 hover:bg-teal-100"
                      >
                        <Activity className="h-3 w-3" /> {p.activeCourse.courseNo} — {p.activeCourse.treatment || 'Treatment'}
                      </Link>
                    ) : (
                      <span className="text-slate-400">No active course</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-600">
                    {p.activeCourse ? `${p.activeCourse.dayNumber}/${p.activeCourse.totalDays}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-amber-600">
                    {p.activeCourse ? `₹${p.activeCourse.due.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => router.push(p.activeCourse ? `/staff/follow-up/${p._id}/${p.activeCourse._id}` : `/staff/follow-up/${p._id}`)}
                      className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-teal-700"
                    >
                      Open <ChevronRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {rows.length > 0 && (
        <p className="text-xs text-slate-400">
          Showing top {rows.length} patient(s). Use the search box to narrow results.
        </p>
      )}
    </div>
  );
}