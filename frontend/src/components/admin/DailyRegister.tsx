'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Download, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { adminFetch } from '@/lib/admin-auth';
import type { Branch } from '@/types';

interface RegisterRow {
  date: string;
  branch: string;
  cH: string;
  patientName: string;
  uhid: string;
  opNo: string;
  serialNo: string;
  department: string;
  doctor: string;
  visitType: string;
  courseDay: string;
  courseProgress: string;
  billed: number;
  paid: number;
  due: number;
  paymentMethod: string;
  createdBy: string;
}

interface RegisterRes {
  data: RegisterRow[];
  totals: { billed: number; paid: number; due: number };
  count: number;
}

const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none';

export default function DailyRegister() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [branch, setBranch] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rows, setRows] = useState<RegisterRow[]>([]);
  const [totals, setTotals] = useState<{ billed: number; paid: number; due: number }>({ billed: 0, paid: 0, due: 0 });
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
      const res = await adminFetch<{ data: RegisterRes }>(`/api/admin/daily-register/detail?${params}`);
      const payload = res.data || { data: [], totals: { billed: 0, paid: 0, due: 0 }, count: 0 };
      setRows(payload.data || []);
      setTotals(payload.totals || { billed: 0, paid: 0, due: 0 });
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
      const header = [
        'Date',
        'Branch',
        'C/H',
        'Patient Name',
        'UHID',
        'OP Number',
        'Home S.No',
        'Department',
        'Doctor',
        'Visit Type',
        'Course Day',
        'Course Progress',
        'Total Billing',
        'Paid',
        'Due',
        'Payment Method',
        'Created By',
      ];
      sheet.columns = header.map((h) => ({ header: h, key: h.replace(/\s|\.|\//g, '_'), width: 18 }));
      sheet.getRow(1).font = { bold: true };
      rows.forEach((r) => {
        sheet.addRow({
          Date: r.date,
          Branch: r.branch,
          C_H: r.cH,
          Patient_Name: r.patientName,
          UHID: r.uhid,
          OP_Number: r.opNo,
          Home_S_No: r.serialNo,
          Department: r.department,
          Doctor: r.doctor,
          Visit_Type: r.visitType,
          Course_Day: r.courseDay,
          Course_Progress: r.courseProgress,
          Total_Billing: r.billed,
          Paid: r.paid,
          Due: r.due,
          Payment_Method: r.paymentMethod,
          Created_By: r.createdBy,
        });
      });
      sheet.addRow({
        Branch: 'TOTAL',
        Total_Billing: totals.billed,
        Paid: totals.paid,
        Due: totals.due,
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
          Daily Register — detailed entries (Clinic + Home), Branch shown on every row
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
          <table className="w-full min-w-[1500px] text-left text-xs">
            <thead className="bg-slate-50">
              <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2.5 font-semibold">Date</th>
                <th className="px-3 py-2.5 font-semibold">Branch</th>
                <th className="px-3 py-2.5 font-semibold">C/H</th>
                <th className="px-3 py-2.5 font-semibold">Patient Name</th>
                <th className="px-3 py-2.5 font-semibold">UHID</th>
                <th className="px-3 py-2.5 font-semibold">OP No / Home S.No</th>
                <th className="px-3 py-2.5 font-semibold">Department</th>
                <th className="px-3 py-2.5 font-semibold">Doctor</th>
                <th className="px-3 py-2.5 font-semibold">Visit Type</th>
                <th className="px-3 py-2.5 font-semibold">Course Day</th>
                <th className="px-3 py-2.5 font-semibold">Progress</th>
                <th className="px-3 py-2.5 text-right font-semibold">Billing</th>
                <th className="px-3 py-2.5 text-right font-semibold">Paid</th>
                <th className="px-3 py-2.5 text-right font-semibold">Due</th>
                <th className="px-3 py-2.5 font-semibold">Method</th>
                <th className="px-3 py-2.5 font-semibold">Created By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={16} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-sky-600" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-4 py-10 text-center text-slate-400">
                    No register entries. Adjust date/branch filters and click Apply.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.date}-${r.patientName}-${i}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 text-slate-800">{formatDate(r.date)}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                        {r.branch}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${r.cH === 'Home' ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'}`}>
                        {r.cH}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{r.patientName || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{r.uhid || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{r.opNo || r.serialNo || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{r.department || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{r.doctor || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{r.visitType}</td>
                    <td className="px-3 py-2.5 text-slate-600">{r.courseDay || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{r.courseProgress || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{inr(r.billed)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-teal-700">{inr(r.paid)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-amber-600">{inr(r.due)}</td>
                    <td className="px-3 py-2.5 text-slate-600">{r.paymentMethod || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{r.createdBy || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold">
              <tr className="border-t border-slate-200">
                <td className="px-3 py-3 text-slate-900" colSpan={11}></td>
                <td className="px-3 py-3 text-right text-slate-900">{inr(totals.billed)}</td>
                <td className="px-3 py-3 text-right text-teal-700">{inr(totals.paid)}</td>
                <td className="px-3 py-3 text-right text-amber-600">{inr(totals.due)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        {rows.length} entry{rows.length === 1 ? '' : 'ies'} — totals: <span className="font-semibold">Billed {inr(totals.billed)}</span>,{' '}
        <span className="font-semibold text-teal-700">Paid {inr(totals.paid)}</span>,{' '}
        <span className="font-semibold text-amber-600">Due {inr(totals.due)}</span>
      </p>
    </div>
  );
}

function formatDate(s: string): string {
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function inr(n: number): string {
  return `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
}