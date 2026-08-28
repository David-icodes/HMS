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
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { toast } from 'sonner';
import { adminFetch, useAuth } from '@/lib/admin-auth';
import StatusBadge from '@/components/admin/StatusBadge';

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

interface TrendPoint {
  _id: string;
  count: number;
}

interface DashboardData {
  stats: Stat;
  charts: {
    appointmentsTrend: TrendPoint[];
    opTrend: TrendPoint[];
    appointmentByStatus: { _id: string; count: number }[];
  };
  recent: {
    appointments: { _id: string; name: string; mobile: string; date: string; time: string; status: string; branch?: { name: string }; doctor?: { name: string } }[];
    opRegistrations: { _id: string; name: string; opdNumber: string; mobile: string; status: string; branch?: { name: string }; department?: { name: string } }[];
  };
  activity: { _id: string; userName: string; action: string; entity: string; createdAt: string }[];
}

interface RevenueData {
  summary: {
    totalRevenue: number;
    totalBilled: number;
    opFees: number;
    totalPatients: number;
    completedPatients: number;
    invoicesIssued: number;
  };
  branchRows: { _id: string; branchName: string; area: string; totalPatients: number; completedPatients: number; revenue: number }[];
  dailyRevenue: { _id: string; revenue: number; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#0284c7',
  completed: '#10b981',
  cancelled: '#f43f5e',
};

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof Eye; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function RevenueStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 flex items-center gap-1 text-xl font-bold text-emerald-600">
        <IndianRupee className="h-4 w-4" />
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);

  useEffect(() => {
    adminFetch<{ data: DashboardData }>('/api/admin/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    adminFetch<{ data: RevenueData }>('/api/admin/revenue')
      .then((res) => setRevenue(res.data))
      .catch(() => {});
  }, []);

  if (loading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  const { stats, charts, recent, activity } = data;
  const canManageAppointments = user?.role === 'superAdmin' || user?.role === 'admin' || user?.role === 'receptionist';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={CalendarCheck} label="Appointments" value={stats.totalAppointments} sub={`${stats.todayAppointments} today`} />
        <StatCard icon={Ticket} label="OP Registrations" value={stats.totalOp} sub={`${stats.todayOp} today`} />
        <StatCard icon={Stethoscope} label="Active Doctors" value={stats.totalDoctors} />
        <StatCard icon={Building2} label="Branches" value={stats.totalBranches} />
        <StatCard icon={Briefcase} label="Services" value={stats.totalServices} />
        <StatCard icon={Star} label="Testimonials" value={stats.totalTestimonials} />
        <StatCard icon={FileText} label="Blog Posts" value={stats.totalPosts} />
        <StatCard icon={Eye} label="Visitors" value={stats.totalVisitors} sub={`${stats.todayVisitors} today`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h3 className="mb-4 text-sm font-bold text-slate-900">Appointment trend (last 14 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={charts.appointmentsTrend}>
              <defs>
                <linearGradient id="appt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="count" name="Appointments" stroke="#0284c7" strokeWidth={2} fill="url(#appt)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">Appointments by status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={charts.appointmentByStatus} dataKey="count" nameKey="_id" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {charts.appointmentByStatus.map((entry) => (
                  <Cell key={entry._id} fill={STATUS_COLORS[entry._id] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {canManageAppointments && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900">Latest activity</h3>
              <Link href="/admin/activity" className="text-xs font-semibold text-sky-600 hover:underline">
                View all
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {activity.map((a) => (
                <li key={a._id} className="flex items-center gap-3 px-5 py-3">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-700">
                      <span className="font-semibold capitalize">{a.action}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="capitalize">{a.entity.replace(/-/g, ' ')}</span>
                    </p>
                    <p className="text-xs text-slate-400">{a.userName} · {new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                </li>
              ))}
              {activity.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-400">No activity yet.</li>}
            </ul>
          </div>
        )}

        {canManageAppointments && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-900">Recent appointments</h3>
                <Link href="/admin/appointments" className="text-xs font-semibold text-sky-600 hover:underline">
                  View all
                </Link>
              </div>
              <ul className="divide-y divide-slate-100">
                {recent.appointments.slice(0, 5).map((a) => (
                  <li key={a._id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{a.name}</p>
                      <p className="text-xs text-slate-400">
                        {a.doctor?.name || 'Any doctor'} · {a.date?.slice(0, 10)} {a.time}
                      </p>
                    </div>
                    <StatusBadge value={a.status} />
                  </li>
                ))}
                {recent.appointments.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-400">No appointments yet.</li>}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-900">Recent OP registrations</h3>
                <Link href="/admin/op-registrations" className="text-xs font-semibold text-sky-600 hover:underline">
                  View all
                </Link>
              </div>
              <ul className="divide-y divide-slate-100">
                {recent.opRegistrations.slice(0, 5).map((r) => (
                  <li key={r._id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{r.name}</p>
                      <p className="text-xs text-slate-400">{r.department?.name || 'General'} · OP-{r.opdNumber}</p>
                    </div>
                    <StatusBadge value={r.status} />
                  </li>
                ))}
                {recent.opRegistrations.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-400">No registrations yet.</li>}
              </ul>
            </div>
          </div>
        )}

        {!canManageAppointments && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <h3 className="mb-4 text-sm font-bold text-slate-900">Recent activity</h3>
            <ul className="divide-y divide-slate-100">
              {activity.slice(0, 8).map((a) => (
                <li key={a._id} className="flex items-center gap-3 py-3">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-700">
                      <span className="font-semibold capitalize">{a.action}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="capitalize">{a.entity.replace(/-/g, ' ')}</span>
                    </p>
                    <p className="text-xs text-slate-400">{a.userName} · {new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                </li>
              ))}
              {activity.length === 0 && <li className="py-8 text-center text-sm text-slate-400">No activity yet.</li>}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">Revenue &amp; OP overview</h3>
        {revenue ? (
          <>
            <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
              <RevenueStat label="Total Revenue" value={revenue.summary.totalRevenue} />
              <RevenueStat label="Billed" value={revenue.summary.totalBilled} />
              <RevenueStat label="OP Fees" value={revenue.summary.opFees} />
              <RevenueStat label="Invoices" value={revenue.summary.invoicesIssued} />
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 xl:col-span-2">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Revenue trend
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenue.dailyRevenue}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Branch-wise revenue
                </h4>
                <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                  {revenue.branchRows
                    .filter((b) => b.revenue > 0 || b.totalPatients > 0)
                    .map((b) => (
                      <div key={b._id} className="rounded-lg bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-800">{b.branchName}</p>
                          <p className="text-sm font-bold text-emerald-600">₹{b.revenue.toLocaleString()}</p>
                        </div>
                        <p className="text-xs text-slate-400">
                          {b.totalPatients} patient{b.totalPatients === 1 ? '' : 's'} · {b.completedPatients} completed
                        </p>
                      </div>
                    ))}
                  {revenue.branchRows.filter((b) => b.revenue > 0 || b.totalPatients > 0).length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-400">No revenue data yet.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">Loading revenue…</p>
        )}
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
    </div>
  );
}
