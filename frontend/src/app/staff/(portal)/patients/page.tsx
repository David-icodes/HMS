'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { staffFetch } from '@/lib/staff-auth';
import type { Patient } from '@/types';

interface PatientRow extends Patient {
  visitCount?: number;
  outstanding?: number;
  billed?: number;
  paid?: number;
  due?: number;
  balance?: number;
  activeCourse?: { courseNo?: string; totalDays?: number; dayNumber?: number } | null;
}

interface ListRes {
  data: { data: PatientRow[]; total: number; totalPages: number; page: number; limit: number };
}

const filterCls =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none';

const CH_OPTIONS = ['All', 'Clinic', 'Home'];

export default function StaffPatients() {
  const router = useRouter();
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [ch, setCh] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25', sort: '-createdAt' });
      if (search.trim()) params.set('search', search.trim());
      if (ch !== 'All') params.set('ch', ch);
      const res = await staffFetch<ListRes>(`/api/staff/patients?${params}`);
      const payload = res.data || { data: [], total: 0, totalPages: 1, page, limit: 25 };
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setTotal(payload.total || 0);
      setTotalPages(payload.totalPages || 1);
    } catch {
      setError('Unable to load patients. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, ch]);

  useEffect(() => {
    const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('search') : null;
    if (q) setSearch(q);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative lg:max-w-xs lg:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search UHID / name / mobile…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <select value={ch} onChange={(e) => { setCh(e.target.value); setPage(1); }} className={filterCls}>
            {CH_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <span className="whitespace-nowrap text-xs text-slate-500">{total} patient(s)</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1050px] text-left text-xs">
          <thead className="bg-slate-50">
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2.5 font-semibold">S.No</th>
              <th className="px-3 py-2.5 font-semibold">UHID</th>
              <th className="px-3 py-2.5 font-semibold">Patient</th>
              <th className="px-3 py-2.5 font-semibold">Mobile</th>
              <th className="px-3 py-2.5 font-semibold">C/H</th>
              <th className="px-3 py-2.5 text-right font-semibold">Visits</th>
              <th className="px-3 py-2.5 text-right font-semibold">Billed</th>
              <th className="px-3 py-2.5 text-right font-semibold">Paid</th>
              <th className="px-3 py-2.5 text-right font-semibold">Due</th>
              <th className="px-3 py-2.5 text-right font-semibold">Balance</th>
              <th className="px-3 py-2.5 font-semibold">Last Visit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-600" />
                  <p className="mt-2">Loading patients...</p>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-red-500">{error}</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                  No patients found.
                </td>
              </tr>
            ) : (
              rows.map((p, i) => (
                <tr key={p._id} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-3 py-2.5 text-slate-500">{(page - 1) * 25 + i + 1}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{p.uhid || '—'}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-800">
                    {p.name || '—'}
                    {p.activeCourse && (
                      <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-600">
                        {p.activeCourse.courseNo} {p.activeCourse.dayNumber}/{p.activeCourse.totalDays}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{p.mobile || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{p.cH || 'Clinic'}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{p.visitCount || 0}</td>
                  <td className="px-3 py-2.5 text-right text-slate-800">{inr(p.billed)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{inr(p.paid)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-amber-600">{inr(p.due)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-teal-600">{inr(p.balance)}</td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {p.lastVisit ? formatDate(p.lastVisit.visitDate) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
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
    </div>
  );
}

function formatDate(s: string | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function inr(n: number | undefined): string {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}