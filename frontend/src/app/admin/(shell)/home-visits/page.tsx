'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Search, Download, Pencil, Trash2, Plus, X, Printer, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { adminFetch } from '@/lib/admin-auth';
import { useAdminReference } from '@/hooks/use-admin-reference';
import { computePayment, inr } from '@/lib/billing';
import type { HomeVisit } from '@/types';

interface ListRes {
  data: HomeVisit[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none';
const fieldCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20';

export default function AdminHomeVisitsPage() {
  const { branches, paymentMethods } = useAdminReference();
  const [rows, setRows] = useState<HomeVisit[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [therapist, setTherapist] = useState('');
  const [referralDoctor, setReferralDoctor] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const emptyForm = {
    patientName: '', diagnosis: '', location: '', timing: '', contact: '', attendance: '',
    reason: '', perSession: '', sessions: '1', advance: '', paymentMethod: '', branch: '', therapist: '',
    referralDoctor: '',
  };
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [original, setOriginal] = useState<HomeVisit | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', sort: '-createdAt' });
      if (search.trim()) params.set('search', search.trim());
      if (branch) params.set('branch', branch);
      if (therapist) params.set('therapist', therapist);
      if (referralDoctor) params.set('referralDoctor', referralDoctor);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await adminFetch<{ data: ListRes }>(`/api/admin/home-visits?${params}`);
      const payload = res.data || { data: [], total: 0, totalPages: 1, page, limit: 20 };
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setTotal(payload.total || 0);
      setTotalPages(payload.totalPages || 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load home visits');
    } finally {
      setLoading(false);
    }
  }, [page, search, branch, therapist, referralDoctor, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setOriginal(null);
    setFormOpen(false);
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (hv: HomeVisit) => {
    setEditingId(hv._id);
    setOriginal(hv);
    setForm({
      patientName: hv.patientName || '',
      diagnosis: hv.diagnosis || '',
      location: hv.location || '',
      timing: hv.timing || '',
      contact: hv.contact || '',
      attendance: hv.attendance || '',
      reason: hv.reason || '',
      perSession: String(hv.perSession ?? ''),
      sessions: String(hv.sessions ?? 1),
      advance: String(hv.advance ?? ''),
      paymentMethod: hv.paymentMethod || '',
      branch: hv.branch && typeof hv.branch === 'object' ? hv.branch._id : '',
      therapist: hv.therapist || '',
      referralDoctor: hv.referralDoctor || '',
    });
    setFormOpen(true);
  };

  const totalAuto = (Number(form.perSession) || 0) * (Number(form.sessions) || 1);
  const dueAuto = Math.max(0, totalAuto - (Number(form.advance) || 0));
  const payAuto = computePayment(totalAuto, Number(form.advance) || 0);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientName.trim()) {
      toast.error('Patient name is required');
      return;
    }
    setSaving(true);
    try {
      const body = {
        patientName: form.patientName.trim(),
        diagnosis: form.diagnosis.trim() || undefined,
        location: form.location.trim() || undefined,
        timing: form.timing.trim() || undefined,
        contact: form.contact.trim() || undefined,
        attendance: form.attendance.trim() || undefined,
        reason: form.reason.trim() || undefined,
        perSession: form.perSession ? Number(form.perSession) : 0,
        sessions: form.sessions ? Number(form.sessions) : 1,
        advance: form.advance ? Number(form.advance) : 0,
        paymentMethod: form.paymentMethod || undefined,
        branch: form.branch || undefined,
        therapist: form.therapist.trim() || undefined,
        referralDoctor: form.referralDoctor.trim() || undefined,
      };
      if (editingId) {
        await adminFetch(`/api/admin/home-visits/${editingId}`, { method: 'PUT', body });
        toast.success('Home visit updated');
      } else {
        await adminFetch('/api/admin/home-visits', { method: 'POST', body });
        toast.success('Home visit added');
      }
      resetForm();
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save home visit');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (hv: HomeVisit) => {
    if (!window.confirm(`Delete home visit for ${hv.patientName}? This cannot be undone.`)) return;
    setDeletingId(hv._id);
    try {
      await adminFetch(`/api/admin/home-visits/${hv._id}`, { method: 'DELETE' });
      toast.success('Home visit deleted');
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete home visit');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ limit: '5000', sort: '-createdAt' });
      if (branch) params.set('branch', branch);
      if (therapist) params.set('therapist', therapist);
      if (referralDoctor) params.set('referralDoctor', referralDoctor);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await adminFetch<{ data: ListRes }>(`/api/admin/home-visits?${params}`);
      const all = (res.data?.data || []).slice().sort((a, b) => (a.serialNo ?? 0) - (b.serialNo ?? 0));
      const workbook = new ExcelJS.Workbook();
      workbook.created = new Date();
      workbook.creator = 'Urmila Raj Hospital';
      const sheet = workbook.addWorksheet('Home Visits');
      sheet.columns = [
        { header: 'S.No', key: 'sno', width: 8 },
        { header: 'Patient Name', key: 'name', width: 24 },
        { header: 'Diagnosis', key: 'diagnosis', width: 24 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Timing', key: 'timing', width: 12 },
        { header: 'Contact', key: 'contact', width: 16 },
        { header: 'Attendance', key: 'attendance', width: 12 },
        { header: 'Per Session (₹)', key: 'perSession', width: 14 },
        { header: 'Sessions', key: 'sessions', width: 10 },
        { header: 'Total (₹)', key: 'total', width: 12 },
        { header: 'Paid (₹)', key: 'advance', width: 12 },
        { header: 'Due (₹)', key: 'due', width: 12 },
        { header: 'Payment Method', key: 'method', width: 18 },
        { header: 'Payment Status', key: 'status', width: 14 },
        { header: 'Branch', key: 'branch', width: 20 },
        { header: 'Therapist', key: 'therapist', width: 20 },
        { header: 'Referral Doctor', key: 'referral', width: 20 },
        { header: 'Created Date', key: 'created', width: 16 },
      ];
      sheet.getRow(1).font = { bold: true };
      all.forEach((hv, i) => {
        const totalAmt = hv.total ?? (hv.perSession * (hv.sessions ?? 1));
        sheet.addRow({
          sno: i + 1,
          name: hv.patientName || '',
          diagnosis: hv.diagnosis || '',
          location: hv.location || '',
          timing: hv.timing || '',
          contact: hv.contact || '',
          attendance: hv.attendance || '',
          perSession: hv.perSession,
          sessions: hv.sessions ?? 1,
          total: totalAmt,
          advance: hv.advance,
          due: hv.due,
          method: hv.paymentMethod || '',
          status: hv.paymentStatus || 'Due',
          branch: hv.branch && typeof hv.branch === 'object' ? hv.branch.name : '',
          therapist: hv.therapist || '',
          referral: hv.referralDoctor || '',
          created: hv.createdAt ? new Date(hv.createdAt).toLocaleDateString() : '',
        });
      });
      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `home-visits-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} home visits`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const branchName = (hv: HomeVisit) => (hv.branch && typeof hv.branch === 'object' ? hv.branch.name : '—');

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search patient, contact, location…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none"
            />
          </div>
          <select value={branch} onChange={(e) => { setBranch(e.target.value); setPage(1); }} className={inputCls}>
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
          <input value={therapist} onChange={(e) => { setTherapist(e.target.value); setPage(1); }} placeholder="Therapist" className={inputCls} />
          <input value={referralDoctor} onChange={(e) => { setReferralDoctor(e.target.value); setPage(1); }} placeholder="Referral doctor" className={inputCls} />
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
            {exporting ? 'Exporting…' : 'Export (.xlsx)'}
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {formOpen && (
        <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Home className="h-4 w-4 text-teal-600" /> {editingId ? 'Edit Home Visit' : 'Add Home Visit'}
            </h3>
            <button type="button" onClick={resetForm} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Patient Name *">
              <input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} className={fieldCls} />
            </Field>
            <Field label="Diagnosis">
              <input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} className={fieldCls} />
            </Field>
            <Field label="Location">
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={fieldCls} />
            </Field>
            <Field label="Timing">
              <input value={form.timing} onChange={(e) => setForm({ ...form, timing: e.target.value })} className={fieldCls} />
            </Field>
            <Field label="Patient Contact">
              <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className={fieldCls} />
            </Field>
            <Field label="Attendance">
              <input value={form.attendance} onChange={(e) => setForm({ ...form, attendance: e.target.value })} className={fieldCls} />
            </Field>
            <Field label="Reason">
              <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={fieldCls} />
            </Field>
            <Field label="Unit / Branch">
              <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className={fieldCls}>
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Per Session (₹)">
              <input value={form.perSession} onChange={(e) => setForm({ ...form, perSession: e.target.value })} type="number" min={0} className={fieldCls} />
            </Field>
            <Field label="No. of Sessions">
              <input value={form.sessions} onChange={(e) => setForm({ ...form, sessions: e.target.value })} type="number" min={1} className={fieldCls} />
            </Field>
            <Field label="Total (auto)">
              <div className="flex h-[38px] items-center rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold">{inr(totalAuto)}</div>
            </Field>
            <Field label="Advance / Paid (₹)">
              <input value={form.advance} onChange={(e) => setForm({ ...form, advance: e.target.value })} type="number" min={0} className={fieldCls} />
            </Field>
            <Field label="Payment Method">
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className={fieldCls}>
                <option value="">Select method</option>
                {paymentMethods.map((m) => (
                  <option key={m._id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Due (auto)">
              <div className="flex h-[38px] items-center rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold">{inr(dueAuto)}</div>
            </Field>
            <Field label="Payment Status">
              <div className="flex h-[38px] items-center rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold">{payAuto.status}</div>
            </Field>
            <Field label="Therapist Name">
              <input value={form.therapist} onChange={(e) => setForm({ ...form, therapist: e.target.value })} className={fieldCls} />
            </Field>
            <Field label="Referral Doctor">
              <input value={form.referralDoctor} onChange={(e) => setForm({ ...form, referralDoctor: e.target.value })} className={fieldCls} />
            </Field>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? 'Saving…' : editingId ? 'Update' : 'Add'}
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1300px] text-left text-xs">
          <thead className="bg-slate-50">
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2.5 font-semibold">S.No</th>
              <th className="px-3 py-2.5 font-semibold">Patient Name</th>
              <th className="px-3 py-2.5 font-semibold">Diagnosis</th>
              <th className="px-3 py-2.5 font-semibold">Location</th>
              <th className="px-3 py-2.5 font-semibold">Timing</th>
              <th className="px-3 py-2.5 font-semibold">Contact</th>
              <th className="px-3 py-2.5 font-semibold">Attendance</th>
              <th className="px-3 py-2.5 font-semibold">Sessions</th>
              <th className="px-3 py-2.5 text-right font-semibold">Total</th>
              <th className="px-3 py-2.5 text-right font-semibold">Paid</th>
              <th className="px-3 py-2.5 text-right font-semibold">Due</th>
              <th className="px-3 py-2.5 font-semibold">Method</th>
              <th className="px-3 py-2.5 font-semibold">Branch</th>
              <th className="px-3 py-2.5 font-semibold">Therapist</th>
              <th className="px-3 py-2.5 font-semibold">Referral</th>
              <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={16} className="px-4 py-12 text-center text-slate-400">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-600" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={16} className="px-4 py-12 text-center text-slate-400">No home visits found.</td>
              </tr>
            ) : (
              rows.map((hv) => (
                <tr key={hv._id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 text-slate-500">{hv.serialNo ?? '—'}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-800">{hv.patientName}</td>
                  <td className="px-3 py-2.5 text-slate-600">{hv.diagnosis || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{hv.location || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{hv.timing || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{hv.contact || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{hv.attendance || '—'}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{hv.sessions ?? 1}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{inr(hv.total ?? (hv.perSession * (hv.sessions ?? 1)))}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{inr(hv.advance)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-amber-600">{inr(hv.due)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{hv.paymentMethod || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{branchName(hv)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{hv.therapist || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{hv.referralDoctor || '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => window.open(`/admin/home-visits/${hv._id}/invoice`, '_blank')}
                        title="Invoice"
                        className="rounded-md border border-teal-200 bg-teal-50 p-1.5 text-teal-700 hover:bg-teal-100"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => openEdit(hv)}
                        title="Edit"
                        className="rounded-md border border-sky-200 bg-sky-50 p-1.5 text-sky-700 hover:bg-sky-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => void remove(hv)}
                        disabled={deletingId === hv._id}
                        title="Delete"
                        className="rounded-md border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 disabled:opacity-40"
                      >
                        {deletingId === hv._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">Page {page} of {totalPages} · {total} record(s)</p>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}