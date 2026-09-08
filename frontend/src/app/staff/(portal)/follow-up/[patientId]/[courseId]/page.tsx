'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2, ChevronLeft, Plus, Banknote, X } from 'lucide-react';
import { toast } from 'sonner';
import { staffFetch } from '@/lib/staff-auth';
import { useStaffReference } from '@/hooks/use-staff-reference';
import { computePayment, inr } from '@/lib/billing';
import type { Patient, Visit, PaymentMethod } from '@/types';

interface CourseRowVisit extends Visit {
  paymentStatus?: string;
}

interface CourseDetailRes {
  data: {
    patient: Patient;
    course: {
      _id: string;
      courseNo: string;
      treatment?: string;
      branch?: { _id: string; name: string } | null;
      department?: { _id: string; name: string } | null;
      doctor?: { _id: string; name: string } | null;
      totalDays: number;
      dayNumber: number;
      startDate: string;
      courseAmount: number;
      additionalCharges: number;
      paid: number;
      due: number;
      billed: number;
      status: string;
    };
    visits: CourseRowVisit[];
    payments: Array<{ _id: string; amount: number; paymentMethod?: string; paymentDate: string }>;
    completedDays: number;
  };
}

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20';

export default function CourseDetailPage() {
  const params = useParams<{ patientId: string; courseId: string }>();
  const { courseId } = params;
  const { paymentMethods } = useStaffReference();
  const [data, setData] = useState<CourseDetailRes['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [followMode, setFollowMode] = useState(false);
  const [payMode, setPayMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyFollow = {
    treatment: '',
    diagnosis: '',
    additionalCharge: '',
    paymentAmount: '',
    paymentMethod: '',
    visitDate: new Date().toISOString().slice(0, 10),
    notes: '',
  };
  const [follow, setFollow] = useState({ ...emptyFollow });

  const emptyPay = { amount: '', paymentMethod: '', paymentDate: new Date().toISOString().slice(0, 10), note: '' };
  const [pay, setPay] = useState({ ...emptyPay });

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError('');
    try {
      const res = await staffFetch<CourseDetailRes>(
        `/api/staff/courses/${courseId}/visits`
      );
      const course = res.data.course;
      const agg = await staffFetch<{ data: { billed: number; paid: number; due: number; transactions: number } }>(
        `/api/staff/courses/${courseId}/balance`
      );
      setData({
        ...res.data,
        course: { ...course, ...agg.data },
        payments: agg.data.transactions ? [] : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    if (!follow.treatment.trim() && !follow.diagnosis.trim()) {
      toast.error('Enter treatment or diagnosis for this follow-up');
      return;
    }
    const paymentAmount = Number(follow.paymentAmount) || 0;
    if (paymentAmount > 0 && !follow.paymentMethod) {
      toast.error('Select a payment method for the received amount');
      return;
    }
    setSaving(true);
    try {
      await staffFetch(`/api/staff/courses/${courseId}/follow-up`, {
        method: 'POST',
        body: {
          treatment: follow.treatment.trim() || undefined,
          diagnosis: follow.diagnosis.trim() || undefined,
          notes: follow.notes.trim() || undefined,
          additionalCharge: follow.additionalCharge ? Number(follow.additionalCharge) : 0,
          paymentAmount,
          paymentMethod: follow.paymentMethod || undefined,
          visitDate: follow.visitDate,
        },
      });
      toast.success('Follow-up recorded');
      setFollowMode(false);
      setFollow({ ...emptyFollow });
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record follow-up');
    } finally {
      setSaving(false);
    }
  };

  const recordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    const amount = Number(pay.amount) || 0;
    if (amount <= 0) {
      toast.error('Enter an amount greater than zero');
      return;
    }
    if (!pay.paymentMethod) {
      toast.error('Select a payment method');
      return;
    }
    setSaving(true);
    try {
      await staffFetch(`/api/staff/courses/${courseId}/payments`, {
        method: 'POST',
        body: {
          amount,
          paymentMethod: pay.paymentMethod,
          paymentDate: pay.paymentDate,
          note: pay.note.trim() || undefined,
        },
      });
      toast.success('Payment recorded');
      setPayMode(false);
      setPay({ ...emptyPay });
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin text-teal-600" /> Loading course…
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>;
  }

  if (!data) return null;

  const course = data.course;
  const billed = course.billed ?? course.courseAmount + (course.additionalCharges || 0);
  const totalDays = course.totalDays || 1;
  const payAuto = computePayment(billed, course.paid);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/staff/follow-up/${data.patient._id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-teal-600"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> {data.patient.name}
        </Link>
        <div className="flex items-center gap-2">
          {course.status === 'Active' && data.completedDays < totalDays && (
            <button
              onClick={() => { setPayMode(false); setFollow({ ...emptyFollow, visitDate: new Date().toISOString().slice(0, 10) }); setFollowMode(true); }}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" /> Add Day {data.completedDays + 1}
            </button>
          )}
          {course.due > 0 && (
            <button
              onClick={() => { setFollowMode(false); setPay({ ...emptyPay, paymentDate: new Date().toISOString().slice(0, 10) }); setPayMode(true); }}
              className="inline-flex items-center gap-2 rounded-lg border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
            >
              <Banknote className="h-4 w-4" /> Record Payment
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-teal-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-700">
            {course.courseNo}
          </span>
          <span
            className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${
              course.status === 'Completed'
                ? 'bg-emerald-50 text-emerald-700'
                : course.status === 'Active'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-slate-100 text-slate-500'
            }`}
          >
            {course.status}
          </span>
          <h2 className="text-sm font-bold text-slate-900">
            {course.treatment || 'Course'} {course.department ? `• ${course.department.name}` : ''}{' '}
            {course.doctor ? `• Dr. ${course.doctor.name}` : ''}
          </h2>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-6">
          <Stat label="Total Billing" value={inr(billed)} />
          <Stat label="Total Paid" value={inr(course.paid)} accent="text-teal-700" />
          <Stat label="Due" value={inr(course.due)} accent="text-amber-600" />
          <Stat label="Progress" value={`${data.completedDays}/${totalDays} days`} />
          <Stat label="Start Date" value={new Date(course.startDate).toLocaleDateString('en-IN')} />
          <Stat label="Branch" value={course.branch?.name || '—'} />
        </div>
      </div>

      {followMode && (
        <form onSubmit={addFollowUp} className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Day {data.completedDays + 1} Follow-up</h3>
            <button type="button" onClick={() => setFollowMode(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Treatment">
              <input value={follow.treatment} onChange={(e) => setFollow({ ...follow, treatment: e.target.value })} className={inputCls} placeholder="Treatment given" />
            </Field>
            <Field label="Diagnosis">
              <input value={follow.diagnosis} onChange={(e) => setFollow({ ...follow, diagnosis: e.target.value })} className={inputCls} placeholder="Diagnosis" />
            </Field>
            <Field label="Visit Date">
              <input type="date" value={follow.visitDate} onChange={(e) => setFollow({ ...follow, visitDate: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Additional Charge (₹)">
              <input value={follow.additionalCharge} onChange={(e) => setFollow({ ...follow, additionalCharge: e.target.value })} type="number" min={0} className={inputCls} placeholder="0" />
            </Field>
            <Field label="Amount Paid Today (₹)">
              <input value={follow.paymentAmount} onChange={(e) => setFollow({ ...follow, paymentAmount: e.target.value })} type="number" min={0} className={inputCls} placeholder="0" />
            </Field>
            <Field label="Payment Method">
              <select value={follow.paymentMethod} onChange={(e) => setFollow({ ...follow, paymentMethod: e.target.value })} className={inputCls}>
                <option value="">Select</option>
                {paymentMethods.map((m: PaymentMethod) => (
                  <option key={m._id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Notes" wide>
              <input value={follow.notes} onChange={(e) => setFollow({ ...follow, notes: e.target.value })} className={inputCls} placeholder="Optional notes" />
            </Field>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? 'Saving…' : `Save Day ${data.completedDays + 1}`}
          </button>
        </form>
      )}

      {payMode && (
        <form onSubmit={recordPayment} className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Record Payment</h3>
            <button type="button" onClick={() => setPayMode(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Amount (₹)">
              <input value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} type="number" min={0} className={inputCls} placeholder="0" />
            </Field>
            <Field label="Payment Method">
              <select value={pay.paymentMethod} onChange={(e) => setPay({ ...pay, paymentMethod: e.target.value })} className={inputCls}>
                <option value="">Select</option>
                {paymentMethods.map((m: PaymentMethod) => (
                  <option key={m._id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Payment Date">
              <input type="date" value={pay.paymentDate} onChange={(e) => setPay({ ...pay, paymentDate: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Note">
              <input value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} className={inputCls} placeholder="Optional" />
            </Field>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save Payment'}
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-slate-50">
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2.5 font-semibold">Day</th>
              <th className="px-3 py-2.5 font-semibold">Date</th>
              <th className="px-3 py-2.5 font-semibold">Treatment</th>
              <th className="px-3 py-2.5 font-semibold">Charges</th>
              <th className="px-3 py-2.5 text-right font-semibold">Paid</th>
              <th className="px-3 py-2.5 font-semibold">Method</th>
              <th className="px-3 py-2.5 text-right font-semibold">Due</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.visits.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No follow-ups recorded yet.
                </td>
              </tr>
            )}
            {data.visits.map((v) => {
              const charges = v.charges?.total ?? 0;
              const paid = v.payment?.advanced ?? 0;
              const due = v.payment?.due ?? Math.max(0, charges - paid);
              const status = v.payment?.status || (paid >= charges ? 'Paid' : 'Due');
              return (
                <tr key={v._id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-bold text-slate-800">Day {v.dayNumber ?? '?'}</td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {v.visitDate ? new Date(v.visitDate).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{v.treatment || v.diagnosis || '—'}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-700">{inr(charges)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-teal-700">{inr(paid)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{v.payment?.methodName || '—'}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-amber-600">{inr(due)}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : status === 'Partial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-slate-600">
            Final status: <span className="text-slate-900">{payAuto.status}</span> (billed {inr(billed)}, paid {inr(course.paid)}, due {inr(course.due)})
          </p>
          <p className="text-slate-400">Follow-ups with no money received are not billed or counted as revenue.</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2 lg:col-span-4' : ''}>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 font-bold text-slate-800 ${accent || ''}`}>{value}</p>
    </div>
  );
}