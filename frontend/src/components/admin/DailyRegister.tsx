'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Download, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { adminFetch } from '@/lib/admin-auth';
import type { Branch } from '@/types';

interface RegisterRow {
  date: string;
  branchId: string | null;
  branchName: string;
  clinic: number;
  home: number;
  total: number;
}

interface RegisterRes {
  data: RegisterRow[];
  totals: { clinic: number; home: number; total: number };
}

const CH_OPTIONS = ['All', 'Clinic', 'Home'];

const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none';

export default function DailyRegister() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [branch, setBranch] = useState('');
  const [ch, setCh] = useState('All');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rows, setRows] = useState<RegisterRow[]>([]);
  const [totals, setTotals] = useState<{ clinic: number; home: number; total: number }>({ clinic: 0, home: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const base = '/api/admin/daily-register';

  const branchNameMap = useCallback(() => {
    const map: Record<string, string> = {};
    branches.forEach((b) => (map[b._id] = b.name));
    return map;
  }, [branches]);

  useEffect(() => {
    fetch('/api/site/branches')
      .then((r) => r.json())
      .then((d) => setBranches(d.data || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (branch) params.set('branch', branch);
      if (ch !== 'All') params.set('ch', ch.toLowerCase());
      const res = await adminFetch<{ data: RegisterRes }>(`${base}?${params}`);
      const payload = res.data || { data: [], totals: { clinic: 0, home: 0, total: 0 } };
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setTotals(payload.totals || { clinic: 0, home: 0, total: 0 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load daily register');
    } finally {
      setLoading(false);
    }
  }, [base, from, to, branch, ch]);

  useEffect(() => {
    void load();
  }, [load]);

  const branchNames = branchNameMap();

  const handleExport = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.created = new Date();
      workbook.creator = 'Urmila Raj Hospital';
      const sheet = workbook.addWorksheet('Daily Register');
      const header = ['Date', 'Branch', 'Clinic', 'Home', 'Total'];
      sheet.columns = header.map((h) => ({ header: h, key: h, width: 18 }));
      sheet.getRow(1).font = { bold: true };
      rows.forEach((r) => {
        sheet.addRow({
          Date: r.date,
          Branch: r.branchName || (r.branchId && branchNames[r.branchId]) || 'Unassigned',
          Clinic: r.clinic,
          Home: r.home,
          Total: r.total,
        });
      });
      sheet.addRow({
        Branch: 'TOTAL',
        Clinic: totals.clinic,
        Home: totals.home,
        Total: totals.total,
      });
      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-register-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} rows`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <CalendarDays className="h-4 w-4 text-sky-600" />
          Daily Register — Clinic + Home visits per date and branch
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} title="From" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} title="To" />
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className={inputCls} title="Branch">
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
          <select value={ch} onChange={(e) => setCh(e.target.value)} className={inputCls} title="C/H">
            {CH_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> Apply
          </button>
          <button
            onClick={() => void handleExport()}
            disabled={exporting || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? 'Exporting…' : 'Export (.xlsx)'}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead className="bg-slate-50">
              <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2.5 font-semibold">Date</th>
                <th className="px-3 py-2.5 font-semibold">Branch</th>
                <th className="px-3 py-2.5 text-right font-semibold">Clinic</th>
                <th className="px-3 py-2.5 text-right font-semibold">Home</th>
                <th className="px-3 py-2.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-sky-600" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No register entries. Adjust date/branch filters and click Apply.
                  </td>
                </tr>
              ) : (
                (() => {
                  const grouped: { date: string; rows: RegisterRow[] }[] = [];
                  rows.forEach((r) => {
                    const last = grouped[grouped.length - 1];
                    if (last && last.date === r.date) last.rows.push(r);
                    else grouped.push({ date: r.date, rows: [r] });
                  });
                  return grouped.map((g) => (
                    <FragmentGroup key={g.date} group={g} branchNames={branchNames} />
                  ));
                })()
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold">
              <tr className="border-t border-slate-200">
                <td className="px-3 py-3 text-slate-900" colSpan={2}></td>
                <td className="px-3 py-3 text-right text-slate-900">{totals.clinic}</td>
                <td className="px-3 py-3 text-right text-slate-900">{totals.home}</td>
                <td className="px-3 py-3 text-right text-slate-900">{totals.total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        {rows.length} record{rows.length === 1 ? '' : 's'} — totals: <span className="font-semibold">Clinic {totals.clinic}</span>,{' '}
        <span className="font-semibold">Home {totals.home}</span>,{' '}
        <span className="font-semibold">Total {totals.total}</span>
      </p>
    </div>
  );
}

function FragmentGroup({ group, branchNames }: { group: { date: string; rows: RegisterRow[] }; branchNames: Record<string, string> }) {
  const dateTotal = group.rows.reduce((acc, r) => ({ clinic: acc.clinic + r.clinic, home: acc.home + r.home, total: acc.total + r.total }), { clinic: 0, home: 0, total: 0 });
  return (
    <>
      {group.rows.map((r) => (
        <tr key={`${r.date}-${r.branchId || 'none'}`} className="border-b border-slate-100 hover:bg-slate-50/60">
          <td className="px-3 py-2.5 text-slate-800">{formatDate(r.date)}</td>
          <td className="px-3 py-2.5">
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
              {r.branchName || (r.branchId && branchNames[r.branchId]) || 'Unassigned'}
            </span>
          </td>
          <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{r.clinic}</td>
          <td className="px-3 py-2.5 text-right font-semibold text-purple-700">{r.home}</td>
          <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{r.total}</td>
        </tr>
      ))}
      <tr className="border-b border-slate-200 bg-slate-50/70">
        <td className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Subtotal</td>
        <td className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500">{group.date}</td>
        <td className="px-3 py-2 text-right text-[10px] font-semibold text-slate-600">{dateTotal.clinic}</td>
        <td className="px-3 py-2 text-right text-[10px] font-semibold text-slate-600">{dateTotal.home}</td>
        <td className="px-3 py-2 text-right text-[10px] font-semibold text-slate-700">{dateTotal.total}</td>
      </tr>
    </>
  );
}

function formatDate(s: string): string {
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
