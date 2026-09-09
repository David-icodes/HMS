'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search, UserPlus, History, AlertCircle, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { staffFetch } from '@/lib/staff-auth';
import { useStaffReference } from '@/hooks/use-staff-reference';
import { computeTotals, computePayment, inr, toNum } from '@/lib/billing';
import type { Course, Patient, Staff, Visit } from '@/types';

const GENDERS = ['Male', 'Female', 'Other'];
const CH_OPTIONS = ['Clinic', 'Home'];
const VISIT_TYPES = ['New OP', 'Follow-up'];
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

interface StaffOption {
  _id: string;
  name: string;
  role: string;
  mobileNumber: string;
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
  const submittingRef = useRef(false);
  const submissionIdRef = useRef<string | null>(null);
  const [submissionComplete, setSubmissionComplete] = useState(false);

  const [p, setP] = useState({ name: '', mobile: '', age: '', gender: 'Male', cH: 'Clinic', fN: '', address: '' });
  const [v, setV] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    visitType: 'New OP',
    branch: '',
    department: '',
    doctor: '',
    referralDoctor: '',
    concern: '',
    diagnosis: '',
    treatment: '',
    notes: '',
  });
  const [charges, setCharges] = useState({ opConsultation: '', pharmacy: '', lab: '', otherCharges: '', discount: '', tax: '' });
  const [previousAdvance, setPreviousAdvance] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [methodId, setMethodId] = useState('');
  const [signature, setSignature] = useState('');

  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [staffQuery, setStaffQuery] = useState('');
  const [staffId, setStaffId] = useState('');

  // Course mode: package treatment billed ONCE, many follow-up visits (₹0 unless extra).
  const [courseMode, setCourseMode] = useState(false);
  const [course, setCourse] = useState({ totalDays: '10', courseAmount: '' });
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeVisits, setActiveVisits] = useState<Visit[]>([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const [additionalCharge, setAdditionalCharge] = useState('');

  useEffect(() => {
    (async () => {
      try {
        // Staff registry from Admin → Staff (not Users & Roles).
        const res = await staffFetch<{ data: Staff[] }>('/api/staff/staffs');
        setStaffList(
          (res.data ?? []).map((s) => ({
            _id: s._id,
            name: s.name,
            role: s.role || '',
            mobileNumber: s.mobile || '',
          })),
        );
      } catch {
        setStaffList([]);
      }
    })();
  }, []);

  const staffMatches = useMemo(() => {
    const q = staffQuery.trim().toLowerCase();
    if (!q) return staffList.slice(0, 30);
    return staffList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.mobileNumber || '').toLowerCase().includes(q) ||
        (s.role || '').toLowerCase().includes(q),
    ).slice(0, 30);
  }, [staffList, staffQuery]);

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
  const applied = toNum(previousAdvance) + toNum(amountPaid);
  const pay = useMemo(() => computePayment(totals.total, applied), [totals.total, applied]);
  const selectedMethod = paymentMethods.find((m) => m._id === methodId);
  const coursePay = useMemo(() => computePayment(toNum(course.courseAmount), applied), [course.courseAmount, applied]);

  const doctors = useMemo(() => doctorsForDepartment(v.department), [doctorsForDepartment, v.department]);

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

  const loadActiveCourse = async (patId: string) => {
    setCourseLoading(true);
    try {
      const res = await staffFetch<{ data: { course: Course | null; visits: Visit[] } }>(`/api/staff/courses/active?patient=${patId}`);
      setActiveCourse(res.data.course ?? null);
      setActiveVisits(res.data.visits ?? []);
    } catch {
      setActiveCourse(null);
      setActiveVisits([]);
    } finally {
      setCourseLoading(false);
    }
  };

  const selectPatient = (pat: ExistingPatient) => {
    setSubmissionComplete(false);
    submissionIdRef.current = null;
    setSelected(pat);
    setP({
      name: pat.name,
      mobile: pat.mobile,
      age: pat.age != null ? String(pat.age) : '',
      gender: pat.gender || 'Male',
      cH: pat.cH || 'Clinic',
      fN: pat.fN || '',
      address: pat.address || '',
    });
    setSearch(pat.name);
    setResults([]);
    void loadActiveCourse(pat._id);
  };

  const clearSelection = () => {
    setSubmissionComplete(false);
    submissionIdRef.current = null;
    setSelected(null);
    setSearch('');
    setResults([]);
    setP({ name: '', mobile: '', age: '', gender: 'Male', cH: 'Clinic', fN: '', address: '' });
    setActiveCourse(null);
    setActiveVisits([]);
    setAdditionalCharge('');
  };

  const validateRequired = (): boolean => {
    if (!p.name.trim() || !p.mobile.trim()) {
      toast.error('Patient name and mobile are required');
      return false;
    }
    if (!/^[0-9]{10,15}$/.test(p.mobile.trim())) {
      toast.error('Enter a valid mobile number (10-15 digits)');
      return false;
    }
    if (!v.branch) {
      toast.error('Branch is required.');
      return false;
    }
    if (!v.department) {
      toast.error('Department is required.');
      return false;
    }
    if (!v.doctor) {
      toast.error('Doctor is required.');
      return false;
    }
    if (!signature.trim()) {
      toast.error('Doctor / Staff signature is required.');
      return false;
    }
    return true;
  };

  const handleCourseFollowUp = async () => {
    if (!activeCourse) return;
    setSaving(true);
    try {
      const res = await staffFetch<{ data: { course: Course; visit: Visit } }>(`/api/staff/courses/${activeCourse._id}/follow-up`, {
        method: 'POST',
        body: {
          visitDate: v.visitDate,
          diagnosis: v.diagnosis.trim() || undefined,
          treatment: v.treatment.trim() || undefined,
          notes: v.notes.trim() || undefined,
          signature: signature.trim() || undefined,
          additionalCharge: additionalCharge ? Number(additionalCharge) : 0,
          staffId: staffId || undefined,
        },
      });
      toast.success(`Day ${res.data.visit.dayNumber ?? ''} follow-up added`);
      setSubmissionComplete(true);
      setAdditionalCharge('');
      setV((s) => ({ ...s, diagnosis: '', treatment: '', notes: '', visitType: 'Follow-up' }));
      void loadActiveCourse(activeCourse.patient && typeof activeCourse.patient === 'object' ? activeCourse.patient._id : String(selected?._id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleCourseCreate = async () => {
    const amt = toNum(course.courseAmount);
    if (amt <= 0) {
      toast.error('Course amount (₹) must be greater than zero');
      return;
    }
    if (Number(course.totalDays) < 1) {
      toast.error('Total days must be at least 1');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        branch: v.branch || undefined,
        department: v.department || undefined,
        doctor: v.doctor || undefined,
        treatment: v.treatment.trim() || undefined,
        notes: v.notes.trim() || undefined,
        startDate: v.visitDate,
        totalDays: Number(course.totalDays),
        courseAmount: amt,
        previousAdvance: toNum(previousAdvance),
        firstPayment: toNum(amountPaid),
        paymentMethod: methodId || undefined,
        signature: signature.trim() || undefined,
        staffId: staffId || undefined,
      };
      if (selected) {
        body.patientId = selected._id;
      } else {
        body.name = p.name.trim();
        body.mobile = p.mobile.trim();
        body.age = p.age ? Number(p.age) : undefined;
        body.gender = p.gender;
        body.cH = p.cH;
        body.fN = p.fN || undefined;
        body.address = p.address.trim() || undefined;
      }
      const res = await staffFetch<{ data: { course: Course; visit: Visit } }>('/api/staff/courses', { method: 'POST', body });
      const courseData = res.data?.course;
      if (!courseData?._id || !res.data?.visit?._id) {
        throw new Error('Course registration was not confirmed by the server. Please try again.');
      }
      const coursePatient =
        courseData.patient && typeof courseData.patient === 'object' ? (courseData.patient as Patient) : null;
      if (!coursePatient?._id || !coursePatient.createdAt) {
        throw new Error('Course patient was not confirmed by the server. Please try again.');
      }
      const patId = coursePatient?._id || selected?._id || '';
      toast.success(`Course ${courseData.courseNo} created (billed ${inr(amt)})`);
      setCourseMode(false);
      setCourse({ totalDays: '10', courseAmount: '' });
      setPreviousAdvance('');
      setAmountPaid('');
      setSignature('');
      setSubmissionComplete(true);
      onRegistered({
        patient:
          coursePatient ??
          ({ _id: patId, uhid: '', name: p.name.trim(), mobile: p.mobile.trim() } as Patient),
        visit: res.data.visit,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || submissionComplete) return;
    submittingRef.current = true;
    try {
      if (!validateRequired()) return;

      if (selected && activeCourse && v.visitType === 'Follow-up') {
        await handleCourseFollowUp();
        return;
      }

      if (courseMode && !(selected && activeCourse)) {
        await handleCourseCreate();
        return;
      }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        submissionId: submissionIdRef.current ?? (submissionIdRef.current = crypto.randomUUID()),
        patientId: selected?._id || undefined,
        patient: {
          name: p.name.trim(),
          mobile: p.mobile.trim(),
          age: p.age ? Number(p.age) : undefined,
          gender: p.gender,
          cH: p.cH,
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
          cH: p.cH,
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
          previousAdvance: previousAdvance || '0',
          amountPaid: amountPaid || '0',
          method: methodId || undefined,
          methodName: selectedMethod?.name,
        },
        signature: signature.trim() || undefined,
        staffId: staffId || undefined,
      };
      const res = await staffFetch<{ data: { patient: Patient; visit: Visit; isNew: boolean } }>('/api/staff/patients', {
        method: 'POST',
        body,
      });
      if (!res.data?.patient?._id || !res.data?.patient?.createdAt || !res.data?.visit?._id) {
        throw new Error('Registration was not confirmed by the server. Please try again.');
      }
      const result = { patient: res.data.patient, visit: res.data.visit };
      toast.success(
        res.data.isNew ? `New patient registered: ${res.data.patient.uhid}` : `Visit saved under ${res.data.patient.uhid}`,
      );
      setSignature('');
      setSelected({ ...(result.patient as ExistingPatient), visitCount: 1, outstanding: result.visit.payment.due });
      submissionIdRef.current = null;
      setSubmissionComplete(true);
      onRegistered(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register patient');
    } finally {
      setSaving(false);
    }
    } finally {
      submittingRef.current = false;
    }
  };

  const nextDay = activeCourse ? Math.min(activeCourse.totalDays, activeVisits.length + 1) : 0;
  const courseDone = !!activeCourse && nextDay > activeCourse.totalDays;

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
        {selected && activeCourse && (
          <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-indigo-800">Active course</p>
                <p className="mt-0.5 text-indigo-700">
                  {activeCourse.courseNo} · {activeCourse.treatment || 'Treatment'} · Day {activeCourse.dayNumber}/
                  {activeCourse.totalDays}
                </p>
                <p className="mt-0.5 text-indigo-700">
                  Billed {inr(activeCourse.courseAmount + activeCourse.additionalCharges)} · Paid {inr(activeCourse.paid)} ·
                  Due <b>{inr(activeCourse.due)}</b>
                </p>
                {courseDone && <p className="mt-0.5 font-semibold text-indigo-800">Course completed — no follow-ups left.</p>}
              </div>
              {courseLoading && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
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
          <Field label="Branch *">
            <select value={v.branch} onChange={(e) => setV({ ...v, branch: e.target.value })} className={inputCls}>
              <option value="">Select branch</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Department *">
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
          <Field label="Doctor *">
            <select value={v.doctor} onChange={(e) => setV({ ...v, doctor: e.target.value })} className={inputCls}>
              <option value="">Select doctor</option>
              {doctors.map((d) => (
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

      {selected && activeCourse && v.visitType === 'Follow-up' ? (
        <section className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900">
            <Layers className="h-4 w-4 text-indigo-600" /> Course Follow-up — Day {nextDay} of {activeCourse.totalDays}
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Follow-up visits never create a new bill. Leave the charge blank for a free follow-up (default ₹0); enter a
            value only for an explicit additional charge (e.g. lab test).
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Additional Charge (₹)" hint="Optional — 0 unless explicitly billed">
              <input
                value={additionalCharge}
                onChange={(e) => setAdditionalCharge(e.target.value)}
                type="number"
                min={0}
                className={inputCls}
                placeholder="0"
              />
            </Field>
          </div>
          {courseMode && (
            <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-3">
              <Field label="Staff (course attendant)" hint="Pick from list">
                <input
                  list="staff-search-list"
                  value={staffQuery}
                  onChange={(e) => {
                    setStaffQuery(e.target.value);
                    setStaffId('');
                  }}
                  onBlur={() => {
                    const match = staffMatches.find((s) => s.name === staffQuery.trim());
                    if (match) setStaffId(match._id);
                  }}
                  placeholder="Type to search staff…"
                  className={inputCls}
                />
                <datalist id="staff-search-list">
                  {staffMatches.map((s) => (
                    <option key={s._id} value={`${s.name} · ${s.mobileNumber || ''}`}>{s.role}</option>
                  ))}
                </datalist>
              </Field>
            </div>
          )}
        </section>
      ) : (
        <>
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
              <Field label="Previous Advance (₹)">
                <input
                  value={previousAdvance}
                  onChange={(e) => setPreviousAdvance(e.target.value)}
                  type="number"
                  min={0}
                  className={inputCls}
                  placeholder="0"
                />
              </Field>
              <Field label="Amount Paid (₹)">
                <input
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  type="number"
                  min={0}
                  className={inputCls}
                  placeholder="0"
                />
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
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-xs text-slate-400">Applied to this visit</p>
                <p className="text-lg font-bold text-teal-700">{inr(applied)}</p>
              </div>
            </div>
          </section>

          {!activeCourse && (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-5 shadow-sm">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={courseMode}
                  onChange={(e) => setCourseMode(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">Register as a treatment course</span>
                  <span className="block text-xs text-slate-500">
                    Billed once for N days, follow-up days are ₹0 (additional charges only when entered). Recommended for
                    package treatments.
                  </span>
                </span>
              </label>

              {courseMode && (
                <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-3">
                  <Field label="Total Days">
                    <input
                      value={course.totalDays}
                      onChange={(e) => setCourse({ ...course, totalDays: e.target.value })}
                      type="number"
                      min={1}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Course Amount (₹) *">
                    <input
                      value={course.courseAmount}
                      onChange={(e) => setCourse({ ...course, courseAmount: e.target.value })}
                      type="number"
                      min={0}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Staff (course attendant)" hint="Pick from list">
                    <input
                      list="staff-search-list"
                      value={staffQuery}
                      onChange={(e) => {
                        setStaffQuery(e.target.value);
                        setStaffId('');
                      }}
                      onBlur={() => {
                        const match = staffMatches.find((s) => s.name === staffQuery.trim());
                        if (match) setStaffId(match._id);
                      }}
                      placeholder="Type to search staff…"
                      className={inputCls}
                    />
                    <datalist id="staff-search-list">
                      {staffMatches.map((s) => (
                        <option key={s._id} value={`${s.name} · ${s.mobileNumber || ''}`}>{s.role}</option>
                      ))}
                    </datalist>
                  </Field>
                  <div className="rounded-xl bg-white p-3 shadow-sm">
                    <p className="text-xs text-slate-400">Course billing preview</p>
                    <p className="text-lg font-bold text-teal-700">Billed {inr(toNum(course.courseAmount))} · Paid {inr(applied)} · Due {inr(coursePay.due)}</p>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* Record */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">Record</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Doctor / Staff Signature *" hint="Autocomplete from Admin → Staff registry">
            <input
              list="signature-staff-list"
              value={signature}
              onChange={(e) => {
                setSignature(e.target.value);
                setStaffId('');
              }}
              onBlur={() => {
                const q = signature.trim().toLowerCase();
                const match = staffList.find((s) => s.name.trim().toLowerCase() === q);
                if (match) setStaffId(match._id);
              }}
              className={inputCls}
              placeholder="Type a staff/doctor name…"
            />
            <datalist id="signature-staff-list">
              {staffList.map((s) => (
                <option key={s._id} value={s.name}>{`${s.role || 'Staff'}${s.mobileNumber ? ` · ${s.mobileNumber}` : ''}`}</option>
              ))}
            </datalist>
            {staffId ? (
              <p className="mt-1 text-xs font-medium text-emerald-600">✓ Linked to {signature}</p>
            ) : signature.trim() ? (
              <p className="mt-1 text-xs text-slate-400">Custom signature (no staff registry match)</p>
            ) : null}
          </Field>
        </div>
      </section>

      {!courseMode && !(selected && activeCourse && v.visitType === 'Follow-up') && pay.status !== 'Paid' && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4" /> There is an outstanding due of {inr(pay.due)} on this visit.
        </div>
      )}

      <button
        type="submit"
        disabled={saving || submissionComplete}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        {saving
          ? 'Saving…'
          : submissionComplete
            ? 'Saved — select or clear a patient to register again'
          : selected && activeCourse && v.visitType === 'Follow-up'
            ? `Add Follow-up (Day ${nextDay})`
            : courseMode && !activeCourse
              ? selected
                ? 'Start Course'
                : 'Register Patient & Start Course'
              : selected
                ? 'Save New Visit'
                : 'Register Patient & Save Visit'}
      </button>
    </form>
  );
}

function Field({ label, children, wide, hint }: { label: string; children: React.ReactNode; wide?: boolean; hint?: string }) {
  return (
    <div className={wide ? 'sm:col-span-3' : ''}>
      <label className="mb-1 block text-xs font-medium text-slate-500">
        {label}
        {hint && <span className="ml-1 font-normal text-slate-400">({hint})</span>}
      </label>
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
      <p className={`mt-1 text-xl font-bold ${tone === 'amber' ? 'text-amber-600' : 'text-teal-700'}`}>{value}</p>
    </div>
  );
}
