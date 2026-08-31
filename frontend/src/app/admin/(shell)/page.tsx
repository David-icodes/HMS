'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  Ticket,
  Stethoscope,
  Building2,
  Briefcase,
  Star,
  FileText,
  Image as ImageIcon,
  Users,
  Eye,
  Loader2,
  IndianRupee,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/admin-auth';
import { inr } from '@/lib/billing';

interface Stat {
  totalAppointments: number;
  todayAppointments: number;
  totalOp: number;
  todayOp: number;
  totalDoctors: number;
  totalBranches: number;
  totalServices: number;
  totalTestimonials: number;
  totalPosts: number;
  totalGallery: number;
  totalUsers: number;
  totalVisitors: number;
  todayVisitors: number;
}

interface RevenueData {
  summary: {
    totalBilled: number;
    totalPaid: number;
    totalDue: number;
    totalPatients: number;
    totalTransactions: number;
  };
  branchRows: {
    branchId: string;
    branchName: string;
    totalBilled: number;
    totalPaid: number;
    totalDue: number;
    transactions: number;
    totalPatients: number;
  }[];
  methodRows: {
    methodName: string;
    transactions: number;
    revenue: number;
    billed: number;
    totalPatients: number;
  }[];
}

function StatCard({ icon: Icon, label, value, sub, to }: { icon: typeof Eye; label: string; value: number; sub?: string; to?: string }) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </>
  );
  const cls = 'block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-sky-200';
  return to ? <Link href={to} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

function RevStat({ label, value, tone }: { label: string; value: string; tone: 'sky' | 'emerald' | 'amber' }) {
  const tones: Record<string, string> = {
    sky: 'text-sky-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
  };
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stat | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<{ data: { stats: Stat } }>('/api/admin/dashboard')
      .then((res) => setStats(res.data.stats))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    adminFetch<{ data: RevenueData }>('/api/admin/analytics/revenue')
      .then((res) => setRevenue(res.data))
      .catch(() => {});
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  const s = revenue?.summary;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={CalendarCheck} label="Appointments" value={stats.totalAppointments} sub={`${stats.todayAppointments} today`} to="/admin/appointments" />
        <StatCard icon={Ticket} label="OP Registrations" value={stats.totalOp} sub={`${stats.todayOp} today`} to="/admin/op-registrations" />
        <StatCard icon={Stethoscope} label="Active Doctors" value={stats.totalDoctors} to="/admin/doctors" />
        <StatCard icon={Building2} label="Branches" value={stats.totalBranches} to="/admin/branches" />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Revenue &amp; OP overview</h3>
          <Link href="/admin/revenue" className="text-xs font-semibold text-sky-600 hover:underline">
            Full revenue report →
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {revenue ? (
            <>
              <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-5">
                <RevStat label="Billed" value={inr(s?.totalBilled ?? 0)} tone="sky" />
                <RevStat label="Received" value={inr(s?.totalPaid ?? 0)} tone="emerald" />
                <RevStat label="Due" value={inr(s?.totalDue ?? 0)} tone="amber" />
                <RevStat label="Patients" value={(s?.totalPatients ?? 0).toLocaleString()} tone="sky" />
                <RevStat label="Transactions" value={(s?.totalTransactions ?? 0).toLocaleString()} tone="emerald" />
              </div>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Branch-wise revenue</h4>
                  <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
                    {revenue.branchRows.map((b) => (
                      <div key={b.branchId} className="rounded-lg bg-slate-50 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-800">{b.branchName}</p>
                          <p className="text-sm font-bold text-emerald-600">{inr(b.totalPaid)}</p>
                        </div>
                        <p className="text-xs text-slate-400">
                          {b.totalPatients} patient(s) · {b.transactions} visit(s) · billed {inr(b.totalBilled)}
                        </p>
                      </div>
                    ))}
                    {revenue.branchRows.length === 0 && (
                      <p className="py-6 text-center text-sm text-slate-400">No revenue data yet.</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Payment method-wise</h4>
                  <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
                    {revenue.methodRows.map((m) => (
                      <div key={m.methodName} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{m.methodName}</p>
                          <p className="text-xs text-slate-400">{m.transactions} transaction(s)</p>
                        </div>
                        <p className="text-sm font-bold text-sky-700">{inr(m.revenue)}</p>
                      </div>
                    ))}
                    {revenue.methodRows.length === 0 && (
                      <p className="py-6 text-center text-sm text-slate-400">No payment data yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">Loading revenue…</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">Content overview</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {[
            { label: 'Doctors', value: stats.totalDoctors, icon: Stethoscope, href: '/admin/doctors' },
            { label: 'Branches', value: stats.totalBranches, icon: Building2, href: '/admin/branches' },
            { label: 'Services', value: stats.totalServices, icon: Briefcase, href: '/admin/services' },
            { label: 'Testimonials', value: stats.totalTestimonials, icon: Star, href: '/admin/testimonials' },
            { label: 'Posts', value: stats.totalPosts, icon: FileText, href: '/admin/blog' },
            { label: 'Gallery', value: stats.totalGallery, icon: ImageIcon, href: '/admin/gallery' },
            { label: 'Users', value: stats.totalUsers, icon: Users, href: '/admin/users' },
            { label: 'Visitors', value: stats.totalVisitors, icon: Eye, href: '/admin' },
          ].map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center transition-colors hover:border-sky-200 hover:bg-sky-50"
            >
              <c.icon className="h-5 w-5 text-sky-600" />
              <div>
                <p className="text-lg font-bold text-slate-900">{c.value.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500">{c.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-sm text-sky-800">
        <Wallet className="h-4 w-4 shrink-0" />
        <span>Revenue is aggregated from actual OP visit charges &amp; payments. Open the <Link href="/admin/revenue" className="font-semibold underline">Revenue</Link> or <Link href="/admin/branch-reports" className="font-semibold underline">Branch Reports</Link> pages to filter by branch, date and payment method.</span>
        <AlertTriangle className="ml-auto h-4 w-4 shrink-0 opacity-40" />
      </div>
    </div>
  );
}
