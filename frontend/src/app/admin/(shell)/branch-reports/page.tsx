'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Building2, Users, ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, IndianRupee, Wallet, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/admin-auth';

interface BranchRow {
  _id: string;
  name: string;
  area: string;
  patients: number;
  clinicPatients: number;
  homePatients: number;
  billed: number;
  paid: number;
  due: number;
  balance: number;
}

interface RegistrationRow {
  _id: string;
  uhid?: string;
  name: string;
  mobile: string;
  age?: number;
  gender?: string;
  cH?: string;
  fN?: string;
  createdAt: string;
}

interface BranchDetail {
  branch: { _id: string; name: string; area: string; phone?: string };
  stats: { patients: number; clinicPatients: number; homePatients: number };
  registrations: RegistrationRow[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none';

const fmtMoney = (n: number | undefined): string => {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export default function AdminBranchReportsPage() {
  const [rows, setRows] = useState<BranchRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<BranchDetail | null>(null);
  const [branchLoading, setBranchLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [branchPage, setBranchPage] = useState(1);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const q = params.toString();
      const res = await adminFetch<{ data: BranchRow[] }>(`/api/admin/analytics/branches${q ? `?${q}` : ''}`);
      setRows(res.data || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load branches');
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, [from, to]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openBranch = useCallback(async (id: string) => {
    setBranchLoading(true);
    setSelected(null);
    try {
      const params = new URLSearchParams({ page: '1', limit: '100' });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const q = params.toString();
      const res = await adminFetch<{ data: BranchDetail }>(`/api/admin/analytics/branches/${id}?${q}`);
      setSelected(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load branch details');
    } finally {
      setBranchLoading(false);
    }
  }, [from, to]);

  const loadDetailPage = useCallback(async (id: string) => {
    setBranchLoading(true);
    try {
      const params = new URLSearchParams({ page: String(branchPage), limit: '100' });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const q = params.toString();
      const res = await adminFetch<{ data: BranchDetail }>(`/api/admin/analytics/branches/${id}?${q}`);
      setSelected(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load branch details');
    } finally {
      setBranchLoading(false);
    }
  }, [branchPage, from, to]);

  useEffect(() => {
    if (selected && branchPage !== selected.page) {
      void loadDetailPage(selected.branch._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchPage]);

  const back = () => setSelected(null);
  const reset = () => {
    setFrom('');
    setTo('');
  };

  if (selected || branchLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={back} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" /> All branches
          </button>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm">
            <Building2 className="h-4 w-4 text-sky-600" />
            <span className="font-semibold text-slate-800">{selected?.branch?.name || 'Loading…'}</span>
            {selected?.branch?.area && <span className="text-slate-400">· {selected.branch.area}</span>}
          </div>
        </div>

        {branchLoading || !selected ? (
          <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat label="Patients" value={selected.stats.patients.toLocaleString()} icon={Users} tone="sky" />
              <Stat label="Clinic Registrations" value={selected.stats.clinicPatients.toLocaleString()} icon={Users} tone="emerald" />
              <Stat label="Home Registrations" value={selected.stats.homePatients.toLocaleString()} icon={Users} tone="violet" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-900">Registered Patients</h3>
                <p className="text-xs text-slate-400">{selected.total} patient(s) registered at this branch</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <Th>No</Th><Th>UHID</Th><Th>Registered</Th><Th>Patient</Th><Th>Mobile</Th><Th>C/H</Th><Th>Gender</Th><Th>Age</Th><Th>F/N</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.registrations.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No registrations for the selected date range.</td></tr>
                    ) : (
                      selected.registrations.map((r, i) => (
                        <tr key={r._id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-slate-500">{(selected.page - 1) * selected.limit + i + 1}</td>
                          <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{r.uhid || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-600">{formatDate(r.createdAt)}</td>
                          <td className="px-3 py-2.5 font-medium text-slate-800">{r.name || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-600">{r.mobile || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-600">{r.cH || 'Clinic'}</td>
                          <td className="px-3 py-2.5 text-slate-600">{r.gender || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-600">{r.age ?? '—'}</td>
                          <td className="px-3 py-2.5 text-slate-600">{r.fN || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-500">Page {selected.page} of {selected.totalPages}</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setBranchPage((p) => Math.max(1, p - 1))}
                    disabled={selected.page <= 1}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setBranchPage((p) => Math.min(selected.totalPages, p + 1))}
                    disabled={selected.page >= selected.totalPages}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <p className="text-sm text-slate-500">
          Patients are actual registrations. Revenue/Billed comes from billing (a course is billed once), Paid from valid payments, Due = Billed − Paid (never negative).
        </p>
        <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      {loadingList ? (
        <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((b) => (
            <button
              key={b._id}
              onClick={() => { setBranchPage(1); void openBranch(b._id); }}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/40"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-100">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="rounded-md bg-sky-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                  {b.patients.toLocaleString()} Patients
                </span>
              </div>
              <p className="mt-3 text-base font-bold text-slate-900">{b.name}</p>
              <p className="text-xs text-slate-400">{b.area || '—'}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                <Money label="Revenue" value={b.billed} icon={IndianRupee} tone="sky" />
                <Money label="Paid" value={b.paid} icon={Wallet} tone="emerald" />
                <Money label="Due" value={b.due} icon={AlertTriangle} tone={b.due > 0 ? 'rose' : 'slate'} />
                <Money label="Balance" value={b.balance} icon={Wallet} tone="violet" />
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                  {b.clinicPatients} Clinic
                </span>
                <span className="rounded bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-600">
                  {b.homePatients} Home
                </span>
              </div>
            </button>
          ))}
          {rows.length === 0 && (
            <p className="col-span-full py-16 text-center text-sm text-slate-400">No branch data for the selected date range.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2.5 font-semibold">{children}</th>;
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Users; tone: 'sky' | 'emerald' | 'violet' }) {
  const tones: Record<string, string> = {
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></div>
      </div>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Money({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Wallet; tone: 'sky' | 'emerald' | 'rose' | 'violet' | 'slate' }) {
  const tones: Record<string, string> = {
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="rounded-lg bg-slate-50/60 px-3 py-2">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className={`mt-0.5 text-sm font-bold ${tones[tone].split(' ')[1]}`}>₹{fmtMoney(value)}</p>
    </div>
  );
}

function formatDate(s: string | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}