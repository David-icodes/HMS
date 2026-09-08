'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2, UserRound, Activity, ChevronRight, LayoutGrid } from 'lucide-react';
import { staffFetch } from '@/lib/staff-auth';
import type { Patient, Visit } from '@/types';

interface CourseRowVisit extends Visit {
  paymentStatus?: string;
}

interface PatientCoursesRes {
  data: {
    patient: Patient;
    courses: Array<{
      _id: string;
      courseNo: string;
      courseAmount: number;
      additionalCharges: number;
      billed: number;
      paid: number;
      due: number;
      status: string;
      totalDays: number;
      dayNumber: number;
      treatment?: string;
      department?: { _id: string; name: string } | null;
      doctor?: { _id: string; name: string } | null;
      branch?: { _id: string; name: string } | null;
      startDate: string;
      completedDays: number;
      visits: CourseRowVisit[];
    }>;
  };
}

export default function PatientCoursesPage() {
  const params = useParams<{ patientId: string }>();
  const patientId = params.patientId;
  const [data, setData] = useState<PatientCoursesRes['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await staffFetch<PatientCoursesRes>(`/api/staff/courses/patient/${patientId}`);
      setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId) void load();
  }, [patientId, load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin text-teal-600" /> Loading courses…
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">{data.patient.name}</p>
            <p className="text-xs text-slate-500">
              UHID {data.patient.uhid} • {data.patient.mobile || 'No mobile'} • {data.patient.cH || 'C'}
            </p>
          </div>
        </div>
        <Link
          href="/staff/follow-up"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Back to Follow-up
        </Link>
      </div>

      {data.courses.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          No courses found for this patient.
        </div>
      ) : (
        <div className="space-y-4">
          {data.courses.map((c) => {
            const billed = c.billed ?? (c.courseAmount + (c.additionalCharges || 0));
            const totalDays = c.totalDays || 1;
            return (
              <div key={c._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-700">
                      <Activity className="h-3 w-3" /> {c.courseNo}
                    </span>
                    <span
                      className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${
                        c.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : c.status === 'Active'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {c.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {c.treatment || 'Treatment'} {c.department ? `• ${c.department.name}` : ''}{' '}
                      {c.doctor ? `• Dr. ${c.doctor.name}` : ''}
                    </span>
                  </div>
                  <Link
                    href={`/staff/follow-up/${data.patient._id}/${c._id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                  >
                    Open course <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-5">
                  <Stat label="Total Billing" value={`₹${billed.toLocaleString('en-IN')}`} />
                  <Stat label="Total Paid" value={`₹${c.paid.toLocaleString('en-IN')}`} accent="text-teal-700" />
                  <Stat label="Due" value={`₹${c.due.toLocaleString('en-IN')}`} accent="text-amber-600" />
                  <Stat label="Progress" value={`${c.completedDays}/${totalDays} days`} />
                  <Stat label="Start Date" value={new Date(c.startDate).toLocaleDateString('en-IN')} />
                </div>

                <div className="mt-3 overflow-hidden rounded-lg border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50">
                      <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-2 font-semibold">Day</th>
                        <th className="px-3 py-2 font-semibold">Date</th>
                        <th className="px-3 py-2 font-semibold">Treatment</th>
                        <th className="px-3 py-2 text-right font-semibold">Paid</th>
                        <th className="px-3 py-2 font-semibold">Method</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {c.visits.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                            No visits recorded yet.
                          </td>
                        </tr>
                      ) : (
                        c.visits.map((v) => (
                          <tr key={v._id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-semibold text-slate-700">
                              Day {v.dayNumber ?? '?'}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {new Date(v.visitDate).toLocaleDateString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-slate-600">{v.treatment || v.diagnosis || '—'}</td>
                            <td className="px-3 py-2 text-right font-semibold text-teal-700">
                              ₹{(v.payment?.advanced ?? 0).toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-slate-600">{v.payment?.methodName || '—'}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                  !v.payment || v.payment.status === 'Paid'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : v.payment.status === 'Partial'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-red-50 text-red-600'
                                }`}
                              >
                                {v.payment?.status || 'Paid'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
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