'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Home, Users, Stethoscope, ArrowRight } from 'lucide-react';
import RegistrationForm, { type RegisteredResult } from '@/components/staff/RegistrationForm';
import { staffFetch } from '@/lib/staff-auth';
import type { Patient } from '@/types';

interface PatientRow extends Patient {
  visitCount?: number;
  outstanding?: number;
  billed?: number;
  paid?: number;
  due?: number;
  balance?: number;
  activeCourse?: { courseNo?: string; totalDays?: number; dayNumber?: number } | null;
}

interface PatientsRes {
  data: { data: PatientRow[]; total: number };
}

function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function StaffDashboard() {
  const router = useRouter();
  const [todayPatients, setTodayPatients] = useState<PatientRow[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [stats, setStats] = useState({ clinic: 0, home: 0 });
  const [loading, setLoading] = useState(true);

  const today = localDate(new Date());

  const loadPatients = useCallback(async () => {
    try {
      const res = await staffFetch<PatientsRes>(
        `/api/staff/patients?from=${today}&to=${today}&limit=1000&sort=-createdAt`,
      );
      const patients = Array.isArray(res.data?.data) ? res.data.data : [];
      setTodayPatients(patients);
      setTodayTotal(res.data?.total ?? patients.length);
      setStats({
        clinic: patients.filter((p) => !/^\s*home\s*$/i.test(p.cH || '')).length,
        home: patients.filter((p) => /^\s*home\s*$/i.test(p.cH || '')).length,
      });
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  const handleRegistered = (result: RegisteredResult) => {
    void loadPatients();
  };

  const recent = todayPatients.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatBox icon={Users} label="TODAY'S PATIENTS" value={todayTotal} sub={`${stats.clinic} Clinic · ${stats.home} Home`} />
        <StatBox icon={Stethoscope} label="Clinic Today" value={stats.clinic} tone="teal" />
        <StatBox icon={Home} label="Home Today" value={stats.home} tone="indigo" />
      </div>

      <RegistrationForm onRegistered={handleRegistered} />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900">Today's Patients</h3>
          <Link
            href="/staff/patients"
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : todayPatients.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-400">No patients registered today yet.</p>
          ) : (
            <>
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2.5 font-semibold">S.No</th>
                    <th className="px-4 py-2.5 font-semibold">UHID</th>
                    <th className="px-4 py-2.5 font-semibold">Patient</th>
                    <th className="px-4 py-2.5 font-semibold">Mobile</th>
                    <th className="px-4 py-2.5 font-semibold">C/H</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Billed</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Paid</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Due</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Balance</th>
                    <th className="px-4 py-2.5 font-semibold">Course</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent.map((p, i) => (
                    <tr
                      key={p._id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => router.push(`/staff/patients/${p._id}`)}
                    >
                      <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{p.uhid || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{p.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{p.mobile || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{p.cH || 'Clinic'}</td>
                      <td className="px-4 py-3 text-right text-slate-800">{inr(p.billed)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{inr(p.paid)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-600">{inr(p.due)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-teal-600">{inr(p.balance)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.activeCourse
                          ? `${p.activeCourse.courseNo} (${p.activeCourse.dayNumber}/${p.activeCourse.totalDays})`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {todayPatients.length > 4 && (
                <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
                  Showing the latest {Math.min(recent.length, 4)} of {todayPatients.length} patients registered today.
                  <Link href="/staff/patients" className="ml-1 font-semibold text-teal-600 hover:underline">
                    View all
                  </Link>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function inr(n: number | undefined): string {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}

function StatBox({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'default',
}: {
  icon: typeof Users;
  label: string;
  value: number;
  sub?: string;
  tone?: 'default' | 'teal' | 'indigo';
}) {
  const bg = tone === 'indigo' ? 'bg-indigo-50 text-indigo-600' : tone === 'teal' ? 'bg-teal-50 text-teal-600' : 'bg-teal-50 text-teal-600';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}