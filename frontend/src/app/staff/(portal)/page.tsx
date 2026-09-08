'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Home, Users, Stethoscope } from 'lucide-react';
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

export default function StaffDashboard() {
  const router = useRouter();
  const [todayPatients, setTodayPatients] = useState<PatientRow[]>([]);
  const [stats, setStats] = useState({ total: 0, clinic: 0, home: 0 });
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  const loadPatients = useCallback(async () => {
    try {
      const res = await staffFetch<PatientsRes>(
        `/api/staff/patients?from=${today}&to=${today}&limit=100&sort=-createdAt`,
      );
      const patients = Array.isArray(res.data?.data) ? res.data.data : [];
      setTodayPatients(patients);
      setStats({
        total: patients.length,
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatBox icon={Users} label="Daily Patients" value={stats.total} />
        <StatBox icon={Stethoscope} label="Clinic Today" value={stats.clinic} tone="teal" />
        <StatBox icon={Home} label="Home Today" value={stats.home} tone="indigo" />
      </div>

      <RegistrationForm onRegistered={handleRegistered} />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900">Today&apos;s Patients</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : todayPatients.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-400">No patients registered today yet.</p>
          ) : (
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
                {todayPatients.map((p, i) => (
                  <tr
                    key={p._id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => router.push(`/staff/patients?search=${encodeURIComponent(p.uhid || p.name)}`)}
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
  tone = 'default',
}: {
  icon: typeof Users;
  label: string;
  value: number;
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
    </div>
  );
}