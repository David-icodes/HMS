'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Receipt, Users, CalendarCheck } from 'lucide-react';
import RegistrationForm, { type RegisteredResult } from '@/components/staff/RegistrationForm';
import { staffFetch } from '@/lib/staff-auth';

interface Patient {
  _id: string;
  name: string;
  mobile: string;
  opdNumber: string;
  status: string;
  amount?: number;
  billingStatus?: string;
  createdAt: string;
  branch?: { name: string };
  department?: { name: string };
}

interface Stats {
  todayOp: number;
  todayInvoice: number;
  todayPatients: number;
}

export default function StaffDashboard() {
  const router = useRouter();
  const [recent, setRecent] = useState<Patient[]>([]);
  const [stats, setStats] = useState<Stats>({ todayOp: 0, todayInvoice: 0, todayPatients: 0 });
  const [loading, setLoading] = useState(true);

  const loadRecent = useCallback(async () => {
    try {
      const res = await staffFetch<{
        data: { data: Patient[]; total: number };
      }>('/api/staff/patients?limit=8');
      const patients = Array.isArray(res.data?.data) ? res.data.data : [];
      setRecent(patients);
      setStats((s) => ({ ...s, todayPatients: res.data?.total || 0 }));
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RegistrationForm onRegistered={handleRegistered} />

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recently registered patients</h3>
            <Link href="/staff/patients" className="text-xs font-semibold text-teal-600 hover:underline">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : recent.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No patients registered yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((p) => (
                <li key={p._id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      {p.opdNumber} · {p.branch?.name || '—'} · {p.department?.name || 'General'}
                    </p>
                  </div>
                  <Link
                    href={`/staff/patients/${p._id}/invoice`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                  >
                    <Receipt className="h-3.5 w-3.5" /> Invoice
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
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
