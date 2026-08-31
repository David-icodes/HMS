'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, UserPlus, History, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { staffFetch } from '@/lib/staff-auth';
import { useStaffReference } from '@/hooks/use-staff-reference';
import { computeTotals, computePayment, inr, toNum } from '@/lib/billing';
import type { Patient, Visit } from '@/types';

const GENDERS = ['Male', 'Female', 'Other'];
const VISIT_TYPES = ['New OP', 'Follow-up'];
const CH_OPTIONS = ['Cash', 'Hospital'];
const FN_OPTIONS = ['Follow', 'Not Follow'];

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20';

export interface RegisteredResult {
  patient: Patient;
  visit: Visit;
}

interface ExistingPatient extends Patient {
  lastVisit?: Visit | null;
  visitCount?: number;
  outstanding?: number;
}

export default function RegistrationForm({
  onRegistered,
}: {
  onRegistered: (result: RegisteredResult) => void;
}) {
  const { branches, departments, paymentMethods, doctorsForDepartment } = useStaffReference();

  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ExistingPatient[]>([]);
  const [selected, setSelected] = useState<ExistingPatient | null>(null);
  const [saving, setSaving] = useState(false);

  const [p, setP] = useState({ name: '', mobile: '', age: '', gender: 'Male', cH: 'Cash', fN: '', address: '' });
  const [v, setV] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    visitType: 'New OP',
    branch: '',
    department: '',
    doctor: '',
    concern: '',
    diagnosis: '',
    treatment: '',
    noOfDays: '0',
    notes: '',
  });
  const [charges, setCharges] = useState({ opConsultation: '', pharmacy: '', lab: '', otherCharges: '', discount: '', tax: '' });
  const [advanced, setAdvanced] = useState('');
  const [methodId, setMethodId] = useState('');
  const [signature, setSignature] = useState('');

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
  const selectedMethod = paymentMethods.find((m) => m._id === methodId);

  const doctors = useMemo(() => doctorsForDepartment(v.department), [doctorsForDepartment, v.department]);

  useEffect(() => {
    if (v.visitType === 'Follow-up') setV((s) => ({ ...s, visitType: 'Follow-up' }));
  }, [v.visitType]);

  const doSearch = async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await staffFetch<{ data: ExistingPatient[] }>(`/api/staff/patients/search?q=${encodeURIComponent(term.trim())}`);
      setResults(res.data ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectPatient = (pat: ExistingPatient) => {
    setSelected(pat);
    setP({
      name: pat.name,
      mobile: pat.mobile,
      age: pat.age != null ? String(pat.age) : '',
      gender: pat.gender || 'Male',
      cH: pat.cH || 'Cash',
      fN: pat.fN || '',
      address: pat.address || '',
    });
    setSearch(pat.name);
    setResults([]);
  };

  const clearSelection = () => {
    setSelected(null);
    setSearch('');
    setResults([]);
    setP({ name: '', mobile: '', age: '', gender: 'Male', cH: 'Cash', fN: '', address: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      const body: Record<string, unknown> = {
        patient: {
          name: p.name.trim(),
          mobile: p.mobile.trim(),
          age: p.age ? Number(p.age) : undefined,
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
          advanced: advanced,
          method: methodId || undefined,
          methodName: selectedMethod?.name,
        },
        signature: signature.trim() || undefined,
      };
      const res = await staffFetch<{ data: { patient: Patient; visit: Visit; isNew: boolean } }>('/api/staff/patients', {
        method: 'POST',
        body,
      });
      const result = { patient: res.data.patient, visit: res.data.visit };
      toast.success(
        res.data.isNew ? `New patient registered: ${res.data.patient.uhid}` : `Visit saved under ${res.data.patient.uhid}`,
      );
      // re-select the newly created patient for context
      setSelected({ ...(result.patient as ExistingPatient), visitCount: 1, outstanding: result.visit.payment.due });
      onRegistered(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register patient');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Existing patient search */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
          <Search className="h-4 w-4 text-teal-600" /> Find Existing Patient
        </h3>
        <p className="mb-3 text-xs text-slate-400">
          Search by UHID, mobile or name. If found, a new visit is added to the same permanent profile (no duplicates).
        </p>
        <div className="relative">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              void doSearch(e.target.value);
            }}
            placeholder="UHID / mobile / name…"
            className={inputCls}
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
        </div>
        {results.length > 0 && (
          <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {results.map((pat) => (
              <li key={pat._id}>
                <button
                  type="button"
                  onClick={() => selectPatient(pat)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50"
                >
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{pat.name}</span>
                    <span className="text-xs text-slate-400">
                      {pat.uhid} · {pat.mobile} · {pat.visitCount ?? 0} visit(s)
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-amber-600">
                    {pat.outstanding ? `Due ${inr(pat.outstanding)}` : 'No due'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selected && (
          <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-teal-800">Existing patient selected</p>
                <p className="mt-0.5 text-teal-700">
                  {selected.uhid} · {selected.name} · {selected.mobile}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-teal-700">
                  <History className="h-3 w-3" /> {selected.visitCount ?? 0} previous visit(s)
                  {selected.outstanding ? ` · Outstanding ${inr(selected.outstanding)}` : ''}
                  {selected.lastVisit?.diagnosis ? ` · Last: ${selected.lastVisit.diagnosis}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="shrink-0 rounded-lg bg-white px-2.5 py-1 font-semibold text-teal-700 hover:bg-teal-100"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Patient details */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
          <UserPlus className="h-4 w-4 text-teal-600" /> Patient Details
          {selected?.uhid && <span className="ml-auto font-mono text-xs font-normal text-slate-400">UHID: {selected.uhid}</span>}
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
          <Field label="C/H">
            <select value={p.cH} onChange={(e) => setP({ ...p, cH: e.target.value })} className={inputCls}>
              {CH_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="F/N">
            <select value={p.fN} onChange={(e) => setP({ ...p, fN: e.target.value })} className={inputCls}>
              <option value="">— Select —</option>
              {FN_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-3">
            <Field label="Address">
              <input value={p.address} onChange={(e) => setP({ ...p, address: e.target.value })} className={inputCls} placeholder="Address" />
            </Field>
          </div>
        </div>
      </section>

      {/* Visit details */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">Visit Details</h3>
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
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>{d.name}{d.designation ? ` · ${d.designation}` : ''}</option>
              ))}
            </select>
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

      {/* Charges + Payment */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">Charges &amp; Payment</h3>
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

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
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

      {/* Record */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">Record</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Doctor / Staff Signature">
            <input value={signature} onChange={(e) => setSignature(e.target.value)} className={inputCls} placeholder="Signature" />
          </Field>
        </div>
      </section>

      {pay.status !== 'Paid' && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4" /> There is an outstanding due of {inr(pay.due)} on this visit.
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        {saving ? 'Saving…' : selected ? 'Save New Visit' : 'Register Patient & Save Visit'}
      </button>
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
  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20';
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
      <p className={`mt-1 text-xl font-bold ${tone === 'amber' ? 'text-amber-600' : 'text-teal-700'}`}>{value}</p>
    </div>
  );
}
