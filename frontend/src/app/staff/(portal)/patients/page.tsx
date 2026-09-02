'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Receipt, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { staffFetch } from '@/lib/staff-auth';
import type { Patient } from '@/types';

interface ListRes {
  data: { data: Patient[]; total: number; totalPages: number; page: number; limit: number };
}

export default function StaffPatients() {
  const [rows, setRows] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      const res = await staffFetch<ListRes>(`/api/staff/patients?${params}`);
      const payload = res.data || { data: [], total: 0, totalPages: 1, page, limit: 20 };
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setTotal(payload.total || 0);
      setTotalPages(payload.totalPages || 1);
    } catch {
      setError('Unable to load patients. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-md sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, mobile, UHID, OP no…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <p className="text-xs text-slate-500">{total} patient{total === 1 ? '' : 's'}</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1300px] text-left text-xs">
          <thead className="bg-slate-50">
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2.5 font-semibold">S.No</th>
              <th className="px-3 py-2.5 font-semibold">C/H</th>
              <th className="px-3 py-2.5 font-semibold">F/N</th>
              <th className="px-3 py-2.5 font-semibold">UHID</th>
              <th className="px-3 py-2.5 font-semibold">Patient Name</th>
              <th className="px-3 py-2.5 font-semibold">Age</th>
              <th className="px-3 py-2.5 font-semibold">Gender</th>
              <th className="px-3 py-2.5 font-semibold">Diagnosis</th>
              <th className="px-3 py-2.5 font-semibold">Treatment</th>
              <th className="px-3 py-2.5 font-semibold">Branch</th>
              <th className="px-3 py-2.5 font-semibold">Department</th>
              <th className="px-3 py-2.5 font-semibold">Doctor</th>
              <th className="px-3 py-2.5 font-semibold">OP</th>
              <th className="px-3 py-2.5 font-semibold">Phone</th>
              <th className="px-3 py-2.5 text-right font-semibold">Pharma</th>
              <th className="px-3 py-2.5 text-right font-semibold">Lab</th>
              <th className="px-3 py-2.5 text-right font-semibold">Advance</th>
              <th className="px-3 py-2.5 text-right font-semibold">Due</th>
              <th className="px-3 py-2.5 text-right font-semibold">Total</th>
              <th className="px-3 py-2.5 font-semibold">No. Days</th>
              <th className="px-3 py-2.5 font-semibold">Signature</th>
              <th className="px-3 py-2.5 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={22} className="px-4 py-12 text-center text-slate-400">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-600" />
                  <p className="mt-2">Loading patients...</p>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={22} className="px-4 py-12 text-center text-red-500">{error}</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={22} className="px-4 py-12 text-center text-slate-400">No patients found.</td>
              </tr>
            ) : (
              rows.map((p, i) => {
                const lv = p.lastVisit || null;
                return (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-slate-500">{(page - 1) * 20 + i + 1}</td>
                    <td className="px-3 py-2.5 text-slate-600">{p.cH || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{p.fN || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{p.uhid || '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{p.name}</td>
                    <td className="px-3 py-2.5 text-slate-600">{p.age ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{p.gender || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{lv?.diagnosis || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{lv?.treatment || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{lv?.branch?.name || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{lv?.department?.name || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{lv?.doctor?.name || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{lv?.opNumber || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{p.mobile || '—'}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{inr(lv?.charges?.pharmacy)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{inr(lv?.charges?.lab)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{inr(lv?.payment?.advanced)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-amber-600">{inr(lv ? lv.payment?.due : p.outstanding)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{inr(lv?.charges?.total)}</td>
                    <td className="px-3 py-2.5 text-slate-600">{lv?.noOfDays ?? 0}</td>
                    <td className="px-3 py-2.5 text-slate-600">{lv?.signature || '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/staff/patients/${p._id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          <Eye className="h-3 w-3" /> View
                        </Link>
                        <Link
                          href={`/staff/patients/${p._id}/invoice`}
                          className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-teal-700"
                        >
                          <Receipt className="h-3 w-3" /> Invoice
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
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

function inr(n: number | undefined): string {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}