'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { staffFetch } from '@/lib/staff-auth';
import { useStaffReference } from '@/hooks/use-staff-reference';
import type { Visit } from '@/types';

interface ListRes {
  data: { data: Visit[]; total: number; totalPages: number; page: number; limit: number };
}

export default function OpListPage() {
  const router = useRouter();
  const { branches } = useStaffReference();
  const [rows, setRows] = useState<Visit[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search.trim()) params.set('search', search.trim());
      if (branch) params.set('branch', branch);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (status) params.set('status', status);
      const res = await staffFetch<ListRes>(`/api/staff/visits?${params}`);
      const payload = res.data || { data: [], total: 0, totalPages: 1, page, limit: 25 };
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setTotal(payload.total || 0);
      setTotalPages(payload.totalPages || 1);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, search, branch, from, to, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const filterCls =
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none';

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
            placeholder="Search UHID / name / mobile / OP…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select value={branch} onChange={(e) => { setBranch(e.target.value); setPage(1); }} className={filterCls}>
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={filterCls} title="From" />
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={filterCls} title="To" />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={filterCls}>
            <option value="">All payment</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Due">Due</option>
          </select>
          <span className="whitespace-nowrap text-xs text-slate-500">{total} record(s)</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1200px] text-left text-xs">
          <thead className="bg-slate-50">
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2.5 font-semibold">S.No</th>
              <th className="px-3 py-2.5 font-semibold">C/H</th>
              <th className="px-3 py-2.5 font-semibold">F/N</th>
              <th className="px-3 py-2.5 font-semibold">Patient Name</th>
              <th className="px-3 py-2.5 font-semibold">Age</th>
              <th className="px-3 py-2.5 font-semibold">Gender</th>
              <th className="px-3 py-2.5 font-semibold">Diagnosis</th>
              <th className="px-3 py-2.5 font-semibold">Treatment</th>
              <th className="px-3 py-2.5 font-semibold">OP</th>
              <th className="px-3 py-2.5 font-semibold">Phone</th>
              <th className="px-3 py-2.5 font-semibold text-right">Pharma</th>
              <th className="px-3 py-2.5 font-semibold text-right">Lab</th>
              <th className="px-3 py-2.5 font-semibold text-right">Advance</th>
              <th className="px-3 py-2.5 font-semibold text-right">Due</th>
              <th className="px-3 py-2.5 font-semibold text-right">Total</th>
              <th className="px-3 py-2.5 font-semibold">No. Days</th>
              <th className="px-3 py-2.5 font-semibold">Signature</th>
              <th className="px-3 py-2.5 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={18} className="px-4 py-12 text-center text-slate-400">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-600" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={18} className="px-4 py-12 text-center text-slate-400">
                  No visits found.
                </td>
              </tr>
            ) : (
              rows.map((v, i) => {
                const pat = typeof v.patient === 'object' ? v.patient : null;
                return (
                  <tr key={v._id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-slate-500">{(page - 1) * 25 + i + 1}</td>
                    <td className="px-3 py-2.5 text-slate-600">{pat?.cH || (v.charges?.opConsultation ? 'Client' : '—')}</td>
                    <td className="px-3 py-2.5 text-slate-600">{pat?.fN || '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{pat?.name || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{pat?.age ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{pat?.gender || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{v.diagnosis || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{v.treatment || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{v.opNumber || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{pat?.mobile || '—'}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{inr(v.charges?.pharmacy)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{inr(v.charges?.lab)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{inr(v.payment?.advanced)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-amber-600">{inr(v.payment?.due)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{inr(v.charges?.total)}</td>
                    <td className="px-3 py-2.5 text-slate-600">{v.noOfDays ?? 0}</td>
                    <td className="px-3 py-2.5 text-slate-600">{v.signature || '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => router.push(`/staff/visits/${v._id}/invoice`)}
                        className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-teal-700"
                      >
                        <Printer className="h-3 w-3" /> {v.invoiceNumber ? 'Print Invoice' : 'Invoice'}
                      </button>
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
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
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
