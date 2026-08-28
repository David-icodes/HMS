'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Search, Download, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { adminFetch } from '@/lib/admin-auth';
import { opStatus } from '@/lib/site-data';
import StatusBadge from '@/components/admin/StatusBadge';
import type { Branch } from '@/types';

interface Patient {
  _id: string;
  name: string;
  mobile: string;
  opdNumber: string;
  status: string;
  billingStatus: string;
  amount?: number;
  total?: number;
  branch?: { name: string };
  department?: { name: string };
  gender?: string;
  age?: number;
  source?: string;
  createdAt: string;
}

interface ListRes {
  data: Patient[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

const STATUS_OPTS = ['', 'registered', 'in-consultation', 'completed', 'cancelled'];

export default function AdminPatientsPage() {
  const [rows, setRows] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    fetch('/api/site/branches')
      .then((r) => r.json())
      .then((d) => setBranches(d.data || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        sort: sort.dir === 'desc' ? `-${sort.key}` : sort.key,
      });
      if (search.trim()) params.set('search', search.trim());
      if (branch) params.set('branch', branch);
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await adminFetch<{ data: ListRes }>(`/api/admin/patients?${params}`);
      setRows(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [page, search, branch, status, from, to, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSort = (key: string) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    setPage(1);
  };

  const sortIcon = (key: string) => {
    if (sort.key !== key) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (branch) params.set('branch', branch);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await adminFetch<{ data: Patient[] }>(`/api/admin/patients/export?${params}`);
      const all = res.data || [];
      const workbook = new ExcelJS.Workbook();
      workbook.created = new Date();
      workbook.creator = 'Urmila Raj Hospital';
      const sheet = workbook.addWorksheet('Patients');
      sheet.columns = [
        { header: 'OP No.', key: 'opdNumber', width: 18 },
        { header: 'Name', key: 'name', width: 24 },
        { header: 'Mobile', key: 'mobile', width: 16 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Age', key: 'age', width: 8 },
        { header: 'Branch', key: 'branch', width: 20 },
        { header: 'Department', key: 'department', width: 24 },
        { header: 'Amount (₹)', key: 'amount', width: 12 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Source', key: 'source', width: 12 },
        { header: 'Registered', key: 'createdAt', width: 18 },
      ];
      sheet.getRow(1).font = { bold: true };
      all.forEach((p) => {
        sheet.addRow({
          opdNumber: p.opdNumber || '',
          name: p.name || '',
          mobile: p.mobile || '',
          gender: p.gender || '',
          age: p.age ?? '',
          branch: p.branch?.name || '',
          department: p.department?.name || '',
          amount: p.total ?? p.amount ?? 0,
          status: p.status || '',
          source: p.source || '',
          createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '',
        });
      });
      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patients-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} patients`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const inputCls =
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-6">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, mobile, OP no…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none"
            />
          </div>
          <select value={branch} onChange={(e) => { setBranch(e.target.value); setPage(1); }} className={inputCls}>
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputCls}>
            <option value="">All statuses</option>
            {STATUS_OPTS.filter(Boolean).map((s) => (
              <option key={s} value={s}>{opStatus(s).label}</option>
            ))}
          </select>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={inputCls} />
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={inputCls} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={() => void handleExport()}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? 'Exporting…' : 'Export All (.xlsx)'}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <Th label="OP No." onSort={() => handleSort('opdNumber')} icon={sortIcon('opdNumber')} />
                <Th label="Patient" onSort={() => handleSort('name')} icon={sortIcon('name')} />
                <Th label="Mobile" onSort={() => handleSort('mobile')} icon={sortIcon('mobile')} />
                <Th label="Branch" />
                <Th label="Department" />
                <Th label="Amount" onSort={() => handleSort('total')} icon={sortIcon('total')} />
                <Th label="Status" onSort={() => handleSort('status')} icon={sortIcon('status')} />
                <Th label="Registered" onSort={() => handleSort('createdAt')} icon={sortIcon('createdAt')} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-600" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">No patients found.</td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.opdNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.mobile}</td>
                    <td className="px-4 py-3 text-slate-600">{p.branch?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.department?.name || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">₹{(p.total ?? p.amount ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge value={p.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">{total} patient{total === 1 ? '' : 's'}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-medium text-slate-600">Page {page} of {totalPages}</span>
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

function Th({ label, onSort, icon }: { label: string; onSort?: () => void; icon?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 font-semibold">
      {onSort ? (
        <button onClick={onSort} className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-700">
          {label}{icon}
        </button>
      ) : (
        label
      )}
    </th>
  );
}
