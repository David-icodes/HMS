'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, UserPlus, User, CalendarCheck, ReceiptText, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/admin-auth';
import { computeTotals, computePayment, inr, toNum } from '@/lib/billing';
import type { Branch, Department, Doctor, PaymentMethod, Visit } from '@/types';

const GENDERS = ['Male', 'Female', 'Other'];
const VISIT_TYPES = ['New OP', 'Follow-up'];
const CH_OPTIONS = ['Clinic', 'Home'];

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20';

interface VisitEditFormProps {
  visit: Visit;
  onSaved: () => void;
  onCancel: () => void;
}

export default function VisitEditForm({ visit, onSaved, onCancel }: VisitEditFormProps) {
  const pat = visit.patient && typeof visit.patient === 'object' ? visit.patient : null;

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [saving, setSaving] = useState(false);

  const [p, setP] = useState({
    name: pat?.name || '',
    mobile: pat?.mobile || '',
    age: pat?.age != null ? String(pat.age) : '',
    gender: pat?.gender || 'Male',
    cH: pat?.cH || 'Clinic',
    fN: pat?.fN || '',
    address: pat?.address || '',
  });

  const visitDate = visit.visitDate ? new Date(visit.visitDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const [v, setV] = useState({
    visitDate,
    visitType: (visit.visitType || 'New OP') as string,
    branch: visit.branch?._id || '',
    department: visit.department?._id || '',
    doctor: visit.doctor?._id || '',
    referralDoctor: visit.referralDoctor || '',
    concern: visit.concern || '',
    diagnosis: visit.diagnosis || '',
    treatment: visit.treatment || '',
    noOfDays: visit.noOfDays != null ? String(visit.noOfDays) : '0',
    notes: visit.notes || '',
  });

  const [charges, setCharges] = useState({
    opConsultation: visit.charges?.opConsultation != null ? String(visit.charges.opConsultation) : '',
    pharmacy: visit.charges?.pharmacy != null ? String(visit.charges.pharmacy) : '',
    lab: visit.charges?.lab != null ? String(visit.charges.lab) : '',
    otherCharges: visit.charges?.otherCharges != null ? String(visit.charges.otherCharges) : '',
    discount: visit.charges?.discount != null ? String(visit.charges.discount) : '',
    tax: visit.charges?.tax != null ? String(visit.charges.tax) : '',
  });
  const [advanced, setAdvanced] = useState(visit.payment?.advanced != null ? String(visit.payment.advanced) : '');
  const [methodId, setMethodId] = useState(visit.payment?.method && typeof visit.payment.method === 'object' ? visit.payment.method._id : '');
  const [signature, setSignature] = useState(visit.signature || '');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [b, dept, doc, pm] = await Promise.all([
          adminFetch<{ data: Branch[] }>('/api/site/branches?limit=50'),
          adminFetch<{ data: Department[] }>('/api/site/departments'),
          adminFetch<{ data: Doctor[] }>('/api/site/doctors?limit=100'),
          adminFetch<{ data: PaymentMethod[] }>('/api/admin/payment-methods'),
        ]);
        if (!mounted) return;
        setBranches(b.data ?? []);
        setDepartments(dept.data ?? []);
        setDoctors(doc.data ?? []);
        setPaymentMethods(pm.data ?? []);
      } catch {
        /* leave empty */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const doctorsForDepartment = useMemo(() => {
    if (!v.department) return doctors;
    const matched = doctors.filter((d) => {
      const dep = d.department;
      if (dep && typeof dep === 'object') return dep._id === v.department;
      if (dep && typeof dep === 'string') return dep === v.department;
      return false;
    });
    return matched.length > 0 ? matched : doctors;
  }, [doctors, v.department]);

  const totals = useMemo(
    () =>
      computeTotals({
        opConsultation: toNum(charges.opConsultation),
        pharmacy: toNum(charges.pharmacy),
        lab: toNum(charges.lab),
        otherCharges: toNum(charges.otherCharges),
        discount: toNum(charges.discount),
        tax: toNum(charges.tax),
      }),
    [charges],
  );
  const pay = useMemo(() => computePayment(totals.total, toNum(advanced)), [totals.total, advanced]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!p.name.trim() || !p.mobile.trim()) {
      toast.error('Patient name and mobile are required');
      return;
    }
    if (!/^[0-9]{10,15}$/.test(p.mobile.trim())) {
      toast.error('Enter a valid mobile number (10-15 digits)');
      return;
    }
    setSaving(true);
    try {
      await adminFetch(`/api/admin/visits/${visit._id}`, {
        method: 'PUT',
        body: {
          patient: {
            name: p.name.trim(),
            mobile: p.mobile.trim(),
            age: p.age !== '' ? Number(p.age) : undefined,
            gender: p.gender,
            cH: p.cH || undefined,
            fN: p.fN || undefined,
            address: p.address.trim() || undefined,
          },
          visit: {
            visitDate: v.visitDate,
            visitType: v.visitType,
            branch: v.branch || undefined,
            department: v.department || undefined,
            doctor: v.doctor || undefined,
            referralDoctor: v.referralDoctor.trim() || '',
            concern: v.concern.trim() || undefined,
            diagnosis: v.diagnosis.trim() || undefined,
            treatment: v.treatment.trim() || undefined,
            noOfDays: v.noOfDays ? Number(v.noOfDays) : 0,
            notes: v.notes.trim() || undefined,
          },
          charges: {
            opConsultation: charges.opConsultation,
            pharmacy: charges.pharmacy,
            lab: charges.lab,
            otherCharges: charges.otherCharges,
            discount: charges.discount,
            tax: charges.tax,
          },
          payment: {
            advanced,
            method: methodId || undefined,
            methodName: paymentMethods.find((m) => m._id === methodId)?.name,
          },
          signature: signature.trim() || undefined,
        },
      });
      toast.success('OP updated');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update OP');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Patient details */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
          <User className="h-4 w-4 text-sky-600" /> Patient Details
          {pat?.uhid && <span className="ml-auto font-mono text-xs font-normal text-slate-400">UHID: {pat.uhid}</span>}
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Patient Name *">
            <input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} className={inputCls} placeholder="Full name" />
          </Field>
          <Field label="Mobile Number *">
            <input value={p.mobile} onChange={(e) => setP({ ...p, mobile: e.target.value })} className={inputCls} placeholder="10-digit mobile" />
          </Field>
          <Field label="Age">
            <input value={p.age} onChange={(e) => setP({ ...p, age: e.target.value })} type="number" min={0} max={130} className={inputCls} />
          </Field>
          <Field label="Gender">
            <select value={p.gender} onChange={(e) => setP({ ...p, gender: e.target.value })} className={inputCls}>
              {GENDERS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="C/H (Clinic/Home)">
            <select value={p.cH} onChange={(e) => setP({ ...p, cH: e.target.value })} className={inputCls}>
              {CH_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="F/N">
            <input value={p.fN} onChange={(e) => setP({ ...p, fN: e.target.value })} className={inputCls} placeholder="F/N" />
          </Field>
          <div className="sm:col-span-3">
            <Field label="Address">
              <input value={p.address} onChange={(e) => setP({ ...p, address: e.target.value })} className={inputCls} placeholder="Address" />
            </Field>
          </div>
        </div>
      </section>

      {/* Visit / OP details */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
          <CalendarCheck className="h-4 w-4 text-sky-600" /> Visit / OP Details
          {visit.opNumber && <span className="ml-auto font-mono text-xs font-normal text-slate-400">OP No: {visit.opNumber}</span>}
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Visit Date">
            <input value={v.visitDate} onChange={(e) => setV({ ...v, visitDate: e.target.value })} type="date" className={inputCls} />
          </Field>
          <Field label="Visit Type">
            <select value={v.visitType} onChange={(e) => setV({ ...v, visitType: e.target.value })} className={inputCls}>
              {VISIT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Branch">
            <select value={v.branch} onChange={(e) => setV({ ...v, branch: e.target.value })} className={inputCls}>
              <option value="">Select branch</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Department">
            <select
              value={v.department}
              onChange={(e) => setV({ ...v, department: e.target.value, doctor: '' })}
              className={inputCls}
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Doctor">
            <select value={v.doctor} onChange={(e) => setV({ ...v, doctor: e.target.value })} className={inputCls}>
              <option value="">Select doctor</option>
              {doctorsForDepartment.map((d) => (
                <option key={d._id} value={d._id}>{d.name}{d.designation ? ` · ${d.designation}` : ''}</option>
              ))}
            </select>
          </Field>
          <Field label="Referral Doctor">
            <input
              value={v.referralDoctor}
              onChange={(e) => setV({ ...v, referralDoctor: e.target.value })}
              placeholder="Optional referring doctor"
              className={inputCls}
            />
          </Field>
          <Field label="No. of Days">
            <input value={v.noOfDays} onChange={(e) => setV({ ...v, noOfDays: e.target.value })} type="number" min={0} className={inputCls} />
          </Field>
          <Field label="Concern / Symptoms" wide>
            <textarea value={v.concern} onChange={(e) => setV({ ...v, concern: e.target.value })} rows={2} className={inputCls} />
          </Field>
          <Field label="Diagnosis" wide>
            <textarea value={v.diagnosis} onChange={(e) => setV({ ...v, diagnosis: e.target.value })} rows={2} className={inputCls} />
          </Field>
          <Field label="Treatment / Procedure" wide>
            <textarea value={v.treatment} onChange={(e) => setV({ ...v, treatment: e.target.value })} rows={2} className={inputCls} />
          </Field>
          <Field label="Notes / Remarks" wide>
            <textarea value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} rows={2} className={inputCls} />
          </Field>
        </div>
      </section>

      {/* Billing / Charges */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
          <ReceiptText className="h-4 w-4 text-sky-600" /> Billing
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <MoneyField label="OP / Consultation" value={charges.opConsultation} onChange={(v) => setCharges({ ...charges, opConsultation: v })} />
          <MoneyField label="Pharmacy" value={charges.pharmacy} onChange={(v) => setCharges({ ...charges, pharmacy: v })} />
          <MoneyField label="Lab" value={charges.lab} onChange={(v) => setCharges({ ...charges, lab: v })} />
          <MoneyField label="Other Charges" value={charges.otherCharges} onChange={(v) => setCharges({ ...charges, otherCharges: v })} />
          <MoneyField label="Discount" value={charges.discount} onChange={(v) => setCharges({ ...charges, discount: v })} />
          <MoneyField label="Tax" value={charges.tax} onChange={(v) => setCharges({ ...charges, tax: v })} />
        </div>
        <div className="mt-4 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <SummaryBlock label="Total" value={inr(totals.total)} />
          <SummaryBlock label="Due" value={inr(pay.due)} tone={pay.due > 0 ? 'amber' : 'green'} />
        </div>
      </section>

      {/* Payment */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">Payment</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Advance / Paid (₹)">
            <input value={advanced} onChange={(e) => setAdvanced(e.target.value)} type="number" min={0} className={inputCls} />
          </Field>
          <Field label="Payment Method">
            <select value={methodId} onChange={(e) => setMethodId(e.target.value)} className={inputCls}>
              <option value="">— Select —</option>
              {paymentMethods.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Payment Status">
            <div className="flex h-[38px] items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold">
              {pay.status}
            </div>
          </Field>
        </div>
      </section>

      {/* Record Information */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
          <FileText className="h-4 w-4 text-sky-600" /> Record Information
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Doctor / Staff Signature">
            <input value={signature} onChange={(e) => setSignature(e.target.value)} className={inputCls} placeholder="Signature" />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          <span>Created By: <span className="font-semibold text-slate-700">{createdByName(visit)}</span></span>
          <span>Created: <span className="font-semibold text-slate-700">{formatDateTime(visit.createdAt)}</span></span>
          <span>Last Updated: <span className="font-semibold text-slate-700">{formatDateTime(visit.updatedAt ?? visit.createdAt)}</span></span>
        </div>
      </section>

      {pay.status !== 'Paid' && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4" /> There is an outstanding due of {inr(pay.due)} on this visit.
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
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

function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label} (₹)</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} type="number" min={0} className={inputCls} />
    </div>
  );
}

function SummaryBlock({ label, value, tone = 'green' }: { label: string; value: string; tone?: 'green' | 'amber' }) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone === 'amber' ? 'text-amber-600' : 'text-sky-700'}`}>{value}</p>
    </div>
  );
}

function createdByName(visit: Visit): string {
  const cb = visit.createdBy;
  if (cb && typeof cb === 'object' && cb.name) return cb.name;
  return '—';
}

function formatDateTime(s: string | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}