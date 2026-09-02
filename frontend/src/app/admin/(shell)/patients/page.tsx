'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, Search, Download, Eye, Pencil, Trash2, Receipt, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { adminFetch } from '@/lib/admin-auth';
import type { Branch, Patient, Visit } from '@/types';

interface ListRes {
  data: Visit[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

interface PeopleRes {
  data: Patient[];
}

const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none';
const fieldCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none';

export default function AdminPatientsPage() {
  const [rows, setRows] = useState<Visit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [editing, setEditing] = useState<Patient | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', mobile: '', age: '', gender: '', cH: '', fN: '', address: '' });

  useEffect(() => {
    fetch('/api/site/branches')
      .then((r) => r.json())
      .then((d) => setBranches(d.data || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25', sort: '-createdAt' });
      if (search.trim()) params.set('search', search.trim());
      if (branch) params.set('branch', branch);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await adminFetch<{ data: ListRes }>(`/api/admin/visits?${params}`);
      const payload = res.data || { data: [], total: 0, totalPages: 1, page, limit: 25 };
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setTotal(payload.total || 0);
      setTotalPages(payload.totalPages || 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [page, search, branch, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const patientOf = (v: Visit): Patient | null =>
    v.patient && typeof v.patient === 'object' ? (v.patient as Patient) : null;

  const openEdit = (p: Patient) => {
    setEditForm({
      name: p.name || '',
      mobile: p.mobile || '',
      age: p.age != null ? String(p.age) : '',
      gender: p.gender || 'Male',
      cH: p.cH || '',
      fN: p.fN || '',
      address: p.address || '',
    });
    setEditing(p);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editForm.name.trim() || !editForm.mobile.trim()) {
      toast.error('Name and mobile are required');
      return;
    }
    setSaving(true);
    try {
      await adminFetch(`/api/admin/patients/${editing._id}`, {
        method: 'PUT',
        body: {
          name: editForm.name.trim(),
          mobile: editForm.mobile.trim(),
          age: editForm.age !== '' ? Number(editForm.age) : undefined,
          gender: editForm.gender,
          cH: editForm.cH.trim(),
          fN: editForm.fN.trim(),
          address: editForm.address.trim(),
        },
      });
      toast.success('Patient updated');
      setEditing(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update patient');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (v: Visit) => {
    const p = patientOf(v);
    if (!p) {
      toast.error('Patient reference not available');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete this patient?\n\n${p.name} (${p.mobile})`)) return;
    setDeletingId(p._id);
    try {
      await adminFetch(`/api/admin/patients/${p._id}`, { method: 'DELETE' });
      toast.success('Patient deleted');
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete patient');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (branch) params.set('branch', branch);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await adminFetch<{ data: Patient[] }>(`/api/admin/patients/export?${params}`);
      const all = Array.isArray(res.data) ? res.data : [];
      const workbook = new ExcelJS.Workbook();
      workbook.created = new Date();
      workbook.creator = 'Urmila Raj Hospital';
      const sheet = workbook.addWorksheet('Patients');
      sheet.columns = [
        { header: 'UHID', key: 'uhid', width: 18 },
        { header: 'Name', key: 'name', width: 24 },
        { header: 'Mobile', key: 'mobile', width: 16 },
        { header: 'C/H', key: 'cH', width: 10 },
        { header: 'F/N', key: 'fN', width: 12 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Age', key: 'age', width: 8 },
        { header: 'OP No.', key: 'op', width: 16 },
        { header: 'Branch', key: 'branch', width: 20 },
        { header: 'Department', key: 'department', width: 24 },
        { header: 'Doctor', key: 'doctor', width: 20 },
        { header: 'Diagnosis', key: 'diagnosis', width: 28 },
        { header: 'Treatment', key: 'treatment', width: 28 },
        { header: 'Total (₹)', key: 'total', width: 12 },
        { header: 'Advance (₹)', key: 'advanced', width: 12 },
        { header: 'Due (₹)', key: 'due', width: 12 },
        { header: 'Visits', key: 'visits', width: 8 },
      ];
      sheet.getRow(1).font = { bold: true };
      all.forEach((p) => {
        const lv = p.lastVisit || null;
        sheet.addRow({
          uhid: p.uhid || '',
          name: p.name || '',
          mobile: p.mobile || '',
          cH: p.cH || '',
          fN: p.fN || '',
          gender: p.gender || '',
          age: p.age ?? '',
          op: lv?.opNumber || '',
          branch: lv?.branch?.name || '',
          department: lv?.department?.name || '',
          doctor: lv?.doctor?.name || '',
          diagnosis: lv?.diagnosis || '',
          treatment: lv?.treatment || '',
          total: lv?.charges?.total ?? p.outstanding ?? 0,
          advanced: lv?.payment?.advanced ?? 0,
          due: lv ? lv.payment?.due : p.outstanding,
          visits: p.visitCount ?? 0,
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, mobile, UHID, OP no…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none"
            />
          </div>
          <select value={branch} onChange={(e) => { setBranch(e.target.value); setPage(1); }} className={inputCls}>
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={inputCls} title="From" />
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={inputCls} title="To" />
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
            {exporting ? 'Exporting…' : 'Export Data (.xlsx)'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead className="bg-slate-50">
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2.5 font-semibold">S.No</th>
              <th className="px-3 py-2.5 font-semibold">OP No.</th>
              <th className="px-3 py-2.5 font-semibold">Patient</th>
              <th className="px-3 py-2.5 font-semibold">Mobile</th>
              <th className="px-3 py-2.5 font-semibold">Department</th>
              <th className="px-3 py-2.5 font-semibold">Doctor</th>
              <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
              <th className="px-3 py-2.5 text-right font-semibold">Paid</th>
              <th className="px-3 py-2.5 text-right font-semibold">Due</th>
              <th className="px-3 py-2.5 font-semibold">Date</th>
              <th className="px-3 py-2.5 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-600" />
                  <p className="mt-2">Loading patients...</p>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-slate-400">No OP records found.</td>
              </tr>
            ) : (
              rows.map((v, i) => {
                const p = patientOf(v);
                return (
                  <tr key={v._id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-slate-500">{(page - 1) * 25 + i + 1}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{v.opNumber || '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{p?.name || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{p?.mobile || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{v.department?.name || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{v.doctor?.name || '—'}</td>
                    <td className="px-3 py-2.5 text-right text-slate-800">{inr(v.charges?.total)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{inr(v.payment?.advanced)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-amber-600">{inr(v.payment?.due)}</td>
                    <td className="px-3 py-2.5 text-slate-600">{formatDate(v.visitDate || v.createdAt)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/admin/patients/${p?._id || ''}`}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-sky-50 hover:text-sky-600"
                          aria-label="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => p && openEdit(p)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-sky-50 hover:text-sky-600"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => void remove(v)}
                          disabled={p ? deletingId === p._id : false}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          aria-label="Delete"
                        >
                          {p && deletingId === p._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                        <Link
                          href={`/staff/patients/${p?._id || ''}/invoice`}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-teal-50 hover:text-teal-600"
                          aria-label="Invoice"
                        >
                          <Receipt className="h-3.5 w-3.5" />
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
          <p className="text-xs text-slate-500">{total} OP record{total === 1 ? '' : 's'}</p>
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={(e) => void saveEdit(e)} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Edit Patient</h3>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Name *</label>
                <input className={fieldCls} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Mobile *</label>
                <input className={fieldCls} value={editForm.mobile} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Age</label>
                <input className={fieldCls} type="number" min={0} value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Gender</label>
                <select className={fieldCls} value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">C/H (Client/Home)</label>
                <input className={fieldCls} value={editForm.cH} onChange={(e) => setEditForm({ ...editForm, cH: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">F/N</label>
                <input className={fieldCls} value={editForm.fN} onChange={(e) => setEditForm({ ...editForm, fN: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-500">Address</label>
                <input className={fieldCls} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
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