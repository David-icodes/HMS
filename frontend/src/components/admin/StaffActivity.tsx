'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity as ActivityIcon, Download, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { adminFetch } from '@/lib/admin-auth';
import type { Branch } from '@/types';

interface ActivityRow {
  date: string;
  staffId: string;
  staffName: string;
  branchId: string;
  branchName: string;
  clinic: number;
  home: number;
  total: number;
}

interface ActivityRes {
  data: ActivityRow[];
  totals: { clinic: number; home: number; total: number };
}

const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none';

export default function StaffActivity() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [branch, setBranch] = useState('');
  const [staff, setStaff] = useState('');
  const [visitType, setVisitType] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<{ _id: string; name: string; role: string }[]>([]);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [totals, setTotals] = useState<{ clinic: number; home: number; total: number }>({ clinic: 0, home: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch('/api/site/branches')
      .then((r) => r.json())
      .then((d) => setBranches(d.data || []))
      .catch(() => {});
    adminFetch<{ data: { _id: string; name: string; role: string }[] }>('/api/admin/attendance/staff-list')
      .then((r) => setStaffList(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (branch) params.set('branch', branch);
      if (staff) params.set('staff', staff);
      if (visitType) params.set('visitType', visitType);
      const res = await adminFetch<{ data: ActivityRes }>(`/api/admin/staff-activity?${params}`);
      const payload = res.data || { data: [], totals: { clinic: 0, home: 0, total: 0 } };
      setRows(payload.data || []);
      setTotals(payload.totals || { clinic: 0, home: 0, total: 0 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load staff activity');
    } finally {
      setLoading(false);
    }
  }, [from, to, branch, staff, visitType]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (branch) params.set('branch', branch);
      if (staff) params.set('staff', staff);
      if (visitType) params.set('visitType', visitType);
      const res = await adminFetch<{ data: { date: string; createdTime: string; staff: string; branch: string; patientName: string; visitType: string; opNo: string; serialNo: string }[] }>(
        `/api/admin/staff-activity/detail?${params}`,
      );
      const detail = Array.isArray(res.data) ? res.data : [];
      const workbook = new ExcelJS.Workbook();
      workbook.created = new Date();
      workbook.creator = 'Urmila Raj Hospital';
      const sheet = workbook.addWorksheet('Staff Activity');
      sheet.columns = [
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Time', key: 'time', width: 10 },
        { header: 'Staff', key: 'staff', width: 24 },
        { header: 'Branch', key: 'branch', width: 20 },
        { header: 'Visit Type', key: 'visitType', width: 14 },
        { header: 'Patient Name', key: 'patient', width: 24 },
        { header: 'OP No.', key: 'opNo', width: 16 },
        { header: 'Home S.No', key: 'serialNo', width: 12 },
      ];
      sheet.getRow(1).font = { bold: true };
      detail.forEach((r) =>
        sheet.addRow({
          date: formatDateShort(r.date),
          time: r.createdTime,
          staff: r.staff,
          branch: r.branch,
          visitType: r.visitType,
          patient: r.patientName,
          opNo: r.opNo,
          serialNo: r.serialNo,
        }),
      );
      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `staff-activity-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${detail.length} entries`);
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
          <ActivityIcon className="h-4 w-4 text-sky-600" />
          Staff Activity — Clinic &amp; Home Visit entries per staff per day
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select value={staff} onChange={(e) => setStaff(e.target.value)} className={inputCls}>
            <option value="">All staff</option>
            {staffList.map((s) => (
              <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
            ))}
          </select>
          <select value={visitType} onChange={(e) => setVisitType(e.target.value)} className={inputCls}>
            <option value="">All visit types</option>
            <option value="clinic">Clinic</option>
            <option value="home">Home Visit</option>
          </select>
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className={inputCls}>
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} title="From" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} title="To" />
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
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Staff</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Branch</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Clinic</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Home Visits</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total Entries</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-sky-600" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No activity for the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.date}-${r.staffId}-${r.branchId}-${i}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 text-slate-800">{formatDate(r.date)}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{r.staffName}</td>
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
                <td className="px-4 py-3 text-slate-900" colSpan={3}>TOTAL</td>
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

function formatDateShort(s: string): string {
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-IN');
}