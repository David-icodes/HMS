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

const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none';

export default function DailyRegister() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [branch, setBranch] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rows, setRows] = useState<RegisterRow[]>([]);
  const [totals, setTotals] = useState<{ clinic: number; home: number; total: number }>({ clinic: 0, home: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

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
      const res = await adminFetch<{ data: RegisterRes }>(`/api/admin/daily-register?${params}`);
      const payload = res.data || { data: [], totals: { clinic: 0, home: 0, total: 0 } };
      setRows(payload.data || []);
      setTotals(payload.totals || { clinic: 0, home: 0, total: 0 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load daily register');
    } finally {
      setLoading(false);
    }
  }, [from, to, branch]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.created = new Date();
      workbook.creator = 'Urmila Raj Hospital';
      const sheet = workbook.addWorksheet('Daily Register');
      sheet.columns = [
        { header: 'Date', key: 'date', width: 16 },
        { header: 'Branch', key: 'branch', width: 24 },
        { header: 'Clinic Visits', key: 'clinic', width: 14 },
        { header: 'Home Visits', key: 'home', width: 14 },
        { header: 'Total', key: 'total', width: 10 },
      ];
      sheet.getRow(1).font = { bold: true };
      rows.forEach((r) => sheet.addRow(r));
      sheet.addRow({ branch: 'TOTAL', clinic: totals.clinic, home: totals.home, total: totals.total });
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
      toast.success(`Exported ${rows.length} entries`);
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
          Daily Register — Clinic + Home Visits per date &amp; branch (operational counts)
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} title="From" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} title="To" />
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className={inputCls}>
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
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
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Branch</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Clinic Visits</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Home Visits</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
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
                rows.map((r, i) => (
                  <tr key={`${r.date}-${r.branchId}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 text-slate-800">{formatDate(r.date)}{r.date > todayIso() && <span title="Future dated entry"> *</span>}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.branchName}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{r.clinic}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{r.home}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{r.total}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                <td className="px-4 py-3 text-slate-900" colSpan={2}>TOTAL ({rows.length} row{rows.length === 1 ? '' : 's'})</td>
                <td className="px-4 py-3 text-right text-slate-900">{totals.clinic}</td>
                <td className="px-4 py-3 text-right text-slate-900">{totals.home}</td>
                <td className="px-4 py-3 text-right text-teal-700">{totals.total}</td>
              </tr>
            </tfoot>
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}