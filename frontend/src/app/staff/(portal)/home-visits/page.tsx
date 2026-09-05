'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Search, X, ChevronLeft, ChevronRight, Home, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { staffFetch } from '@/lib/staff-auth';
import { useStaffReference } from '@/hooks/use-staff-reference';
import { computePayment, inr } from '@/lib/billing';
import type { HomeVisit } from '@/types';

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20';

interface ListRes {
  data: { data: HomeVisit[]; total: number; totalPages: number; page: number; limit: number };
}

export default function HomeVisitsPage() {
  const { branches, paymentMethods } = useStaffReference();
  const [rows, setRows] = useState<HomeVisit[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [therapist, setTherapist] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = {
    patientName: '', diagnosis: '', location: '', timing: '', contact: '', attendance: '',
    reason: '', perSession: '', sessions: '1', advance: '', paymentMethod: '', branch: '', therapist: '',
    referralDoctor: '',
  };
  const [form, setForm] = useState({ ...emptyForm });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', sort: '-createdAt' });
      if (search.trim()) params.set('search', search.trim());
      if (branch) params.set('branch', branch);
      if (therapist) params.set('therapist', therapist);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await staffFetch<ListRes>(`/api/staff/home-visits?${params}`);
      const payload = res.data || { data: [], total: 0, totalPages: 1, page, limit: 20 };
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setTotal(payload.total || 0);
      setTotalPages(payload.totalPages || 1);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, search, branch, therapist, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setForm({ ...emptyForm });
    setOpen(false);
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
      await staffFetch('/api/staff/home-visits', { method: 'POST', body });
      toast.success('Home visit added');
      reset();
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save home visit');
    } finally {
      setSaving(false);
    }
  };

  const filterCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{total} home visit(s)</p>
        </div>
        <button
          onClick={() => { reset(); setOpen(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> Add Home Visit
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search patient / contact / location…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>
        <select value={branch} onChange={(e) => { setBranch(e.target.value); setPage(1); }} className={filterCls}>
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
        <input value={therapist} onChange={(e) => { setTherapist(e.target.value); setPage(1); }} placeholder="Therapist" className={filterCls} />
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={filterCls} />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={filterCls} />
      </div>

      {open && (
        <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Home className="h-4 w-4 text-teal-600" /> Add Home Visit
            </h3>
            <button type="button" onClick={reset} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Patient Name *">
              <input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Diagnosis">
              <input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Location">
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Timing">
              <input value={form.timing} onChange={(e) => setForm({ ...form, timing: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Patient Contact">
              <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Attendance">
              <input value={form.attendance} onChange={(e) => setForm({ ...form, attendance: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Reason">
              <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Unit / Branch">
              <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className={inputCls}>
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Per Session (₹)">
              <input value={form.perSession} onChange={(e) => setForm({ ...form, perSession: e.target.value })} type="number" min={0} className={inputCls} />
            </Field>
            <Field label="No. of Sessions">
              <input value={form.sessions} onChange={(e) => setForm({ ...form, sessions: e.target.value })} type="number" min={1} className={inputCls} />
            </Field>
            <Field label="Total (auto)">
              <div className="flex h-[38px] items-center rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold">
                {inr(totalAuto)}
              </div>
            </Field>
            <Field label="Advance / Paid (₹)">
              <input value={form.advance} onChange={(e) => setForm({ ...form, advance: e.target.value })} type="number" min={0} className={inputCls} />
            </Field>
            <Field label="Payment Method">
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className={inputCls}>
                <option value="">Select method</option>
                {paymentMethods.map((m) => (
                  <option key={m._id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Due (auto)">
              <div className="flex h-[38px] items-center rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold">
                {inr(dueAuto)}
              </div>
            </Field>
            <Field label="Payment Status">
              <div className="flex h-[38px] items-center rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold">
                {payAuto.status}
              </div>
            </Field>
            <Field label="Therapist Name">
              <input value={form.therapist} onChange={(e) => setForm({ ...form, therapist: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Referral Doctor">
              <input value={form.referralDoctor} onChange={(e) => setForm({ ...form, referralDoctor: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Add'}
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1200px] text-left text-xs">
          <thead className="bg-slate-50">
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2.5 font-semibold">S.No</th>
              <th className="px-3 py-2.5 font-semibold">Patient Name</th>
              <th className="px-3 py-2.5 font-semibold">Diagnosis</th>
              <th className="px-3 py-2.5 font-semibold">Location</th>
              <th className="px-3 py-2.5 font-semibold">Timing</th>
              <th className="px-3 py-2.5 font-semibold">Contact</th>
              <th className="px-3 py-2.5 font-semibold">Attendance</th>
              <th className="px-3 py-2.5 font-semibold">Per Session</th>
              <th className="px-3 py-2.5 font-semibold text-right">Sessions</th>
              <th className="px-3 py-2.5 text-right font-semibold">Total</th>
              <th className="px-3 py-2.5 text-right font-semibold">Paid</th>
              <th className="px-3 py-2.5 text-right font-semibold">Due</th>
              <th className="px-3 py-2.5 font-semibold">Method</th>
              <th className="px-3 py-2.5 font-semibold">Branch</th>
              <th className="px-3 py-2.5 font-semibold">Therapist</th>
              <th className="px-3 py-2.5 font-semibold">Referral</th>
              <th className="px-3 py-2.5 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={17} className="px-4 py-12 text-center text-slate-400">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-600" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={17} className="px-4 py-12 text-center text-slate-400">
                  No home visits found.
                </td>
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
                  <td className="px-3 py-2.5 text-right text-slate-600">{inr(hv.perSession)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{hv.sessions ?? 1}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{inr(hv.total ?? (hv.perSession * (hv.sessions ?? 1)))}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{inr(hv.advance)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-amber-600">{inr(hv.due)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{hv.paymentMethod || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{hv.branch && typeof hv.branch === 'object' ? hv.branch.name : '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{hv.therapist || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{hv.referralDoctor || '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => window.open(`/staff/home-visits/${hv._id}/invoice`, '_blank')}
                      className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-teal-700"
                    >
                      <Printer className="h-3 w-3" /> {hv.invoiceNumber ? 'Print Invoice' : 'Invoice'}
                    </button>
                  </td>
                </tr>
              ))
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

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-3' : ''}>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}