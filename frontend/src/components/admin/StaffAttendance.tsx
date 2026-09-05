'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, Download, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { adminFetch } from '@/lib/admin-auth';

interface AttendanceRow {
  _id: string;
  user: { _id: string; name: string } | string;
  date: string;
  inTime: string;
  outTime: string;
  totalHours?: string;
}

interface AttendanceRes {
  data: AttendanceRow[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none';

export default function StaffAttendance() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [staff, setStaff] = useState('');
  const [staffList, setStaffList] = useState<{ _id: string; name: string; role: string }[]>([]);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    adminFetch<{ data: { _id: string; name: string; role: string }[] }>('/api/admin/attendance/staff-list')
      .then((r) => setStaffList(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (staff) params.set('staff', staff);
      const res = await adminFetch<{ data: AttendanceRes }>(`/api/admin/attendance?${params}`);
      const payload = res.data || { data: [], total: 0, totalPages: 1, page, limit: 25 };
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setTotal(payload.total || 0);
      setTotalPages(payload.totalPages || 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [page, from, to, staff]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ limit: '5000' });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (staff) params.set('staff', staff);
      const res = await adminFetch<{ data: AttendanceRes }>(`/api/admin/attendance?${params}`);
      const all = res.data?.data || [];
      const workbook = new ExcelJS.Workbook();
      workbook.created = new Date();
      workbook.creator = 'Urmila Raj Hospital';
      const sheet = workbook.addWorksheet('Attendance');
      sheet.columns = [
        { header: 'Staff', key: 'name', width: 24 },
        { header: 'Date', key: 'date', width: 16 },
        { header: 'IN', key: 'in', width: 10 },
        { header: 'OUT', key: 'out', width: 10 },
        { header: 'Total Hours', key: 'hours', width: 14 },
      ];
      sheet.getRow(1).font = { bold: true };
      all.forEach((r) => {
        const name = r.user && typeof r.user === 'object' ? r.user.name : '—';
        sheet.addRow({ name, date: formatDate(r.date), in: r.inTime, out: r.outTime, hours: r.totalHours || '' });
      });
      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} entries`);
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
          <Clock className="h-4 w-4 text-sky-600" />
          Staff Attendance — IN / OUT records with working hours
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select value={staff} onChange={(e) => { setStaff(e.target.value); setPage(1); }} className={inputCls}>
            <option value="">All staff</option>
            {staffList.map((s) => (
              <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
            ))}
          </select>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={inputCls} title="From" />
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={inputCls} title="To" />
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
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Staff</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">IN</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">OUT</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Total Hours</th>
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
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">No attendance records found.</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {r.user && typeof r.user === 'object' ? r.user.name : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{formatDate(r.date)}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">{r.inTime || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">{r.outTime || '—'}</td>
                    <td className="px-4 py-2.5 font-semibold text-teal-700">{r.totalHours || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && rows.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">{total} record{total === 1 ? '' : 's'} · Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(s: string): string {
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}