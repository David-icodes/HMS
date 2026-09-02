'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Receipt, Users, CalendarCheck, Printer } from 'lucide-react';
import RegistrationForm, { type RegisteredResult } from '@/components/staff/RegistrationForm';
import { staffFetch } from '@/lib/staff-auth';
import type { Visit } from '@/types';

interface RecentRes {
  data: { data: Visit[]; total: number };
}

interface Stats {
  todayOp: number;
  todayInvoice: number;
  todayPatients: number;
}

export default function StaffDashboard() {
  const router = useRouter();
  const [recent, setRecent] = useState<Visit[]>([]);
  const [stats, setStats] = useState<Stats>({ todayOp: 0, todayInvoice: 0, todayPatients: 0 });
  const [loading, setLoading] = useState(true);

  const loadRecent = useCallback(async () => {
    try {
      const [patientsRes, opRes] = await Promise.all([
        staffFetch<PeopleRes>('/api/staff/patients?limit=1&page=1'),
        staffFetch<RecentRes>('/api/staff/visits?limit=5&sort=-createdAt'),
      ]);
      const ops = Array.isArray(opRes.data?.data) ? opRes.data.data : [];
      setRecent(ops);
      setStats((s) => ({
        ...s,
        todayPatients: patientsRes.data?.total ?? s.todayPatients,
        todayOp:
          ops.filter((v) => {
            const d = new Date(v.visitDate || v.createdAt);
            const today = new Date();
            return d.toDateString() === today.toDateString();
          }).length,
      }));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  const handleRegistered = (result: RegisteredResult) => {
    void loadRecent();
    const invoiceUrl = `/staff/patients/${result.patient._id}/invoice`;
    router.push(invoiceUrl);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatBox icon={Users} label="Patients Registered" value={stats.todayPatients} />
        <StatBox icon={CalendarCheck} label="Today's OPs" value={stats.todayOp} />
        <StatBox icon={Receipt} label="Invoices Today" value={stats.todayInvoice} />
      </div>

      <RegistrationForm onRegistered={handleRegistered} />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900">Recent OP List</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : recent.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-400">No OPs registered yet.</p>
          ) : (
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-slate-50">
                <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5 font-semibold">S.No</th>
                  <th className="px-4 py-2.5 font-semibold">OP No.</th>
                  <th className="px-4 py-2.5 font-semibold">Patient</th>
                  <th className="px-4 py-2.5 font-semibold">Mobile</th>
                  <th className="px-4 py-2.5 font-semibold">Department</th>
                  <th className="px-4 py-2.5 font-semibold">Doctor</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Paid</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Due</th>
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((v, i) => {
                  const pat = typeof v.patient === 'object' ? v.patient : null;
                  return (
                    <tr key={v._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{v.opNumber || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{pat?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{pat?.mobile || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{v.department?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{v.doctor?.name || '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-800">{inr(v.charges?.total)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{inr(v.payment?.advanced)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-600">{inr(v.payment?.due)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(v.visitDate || v.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => router.push(`/staff/visits/${v._id}/invoice`)}
                          className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-teal-700"
                        >
                          <Printer className="h-3 w-3" /> {v.invoiceNumber ? 'Print Invoice' : 'Invoice'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

interface PeopleRes {
  data: { data: unknown[]; total: number };
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

function StatBox({
  icon: Icon,
  label,
  value,
  prefix = '',
}: {
  icon: typeof Users;
  label: string;
  value: number;
  prefix?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {prefix}
        {value.toLocaleString()}
      </p>
    </div>
  );
}