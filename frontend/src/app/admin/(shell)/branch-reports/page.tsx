'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Building2, Users, ReceiptText, Wallet, AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/admin-auth';
import { inr } from '@/lib/billing';

interface BranchRow {
  _id: string;
  name: string;
  area: string;
  totalPatients: number;
  totalOPVisits: number;
  totalBilled: number;
  totalPaid: number;
  totalDue: number;
}

interface VisitRow {
  _id: string;
  uhid?: string;
  visitDate: string;
  visitType: string;
  opNumber?: string;
  diagnosis?: string;
  treatment?: string;
  patient?: { _id: string; uhid: string; name: string; mobile: string } | null;
  department?: { name: string } | null;
  doctor?: { name: string } | null;
  charges: {
    opConsultation: number;
    pharmacy: number;
    lab: number;
    otherCharges: number;
    discount: number;
    tax: number;
    total: number;
  };
  payment: { advanced: number; due: number; methodName?: string; status: string };
}

interface BranchDetail {
  branch: { _id: string; name: string; area: string; phone?: string };
  stats: {
    totalPatients: number;
    totalOPVisits: number;
    totalBilled: number;
    totalPaid: number;
    totalDue: number;
  };
  visits: VisitRow[];
}

const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none';

export default function AdminBranchReportsPage() {
  const [rows, setRows] = useState<BranchRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<BranchDetail | null>(null);
  const [branchLoading, setBranchLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

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

  const openBranch = async (id: string) => {
    setBranchLoading(true);
    setSelected(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const q = params.toString();
      const res = await adminFetch<{ data: BranchDetail }>(`/api/admin/analytics/branches/${id}${q ? `?${q}` : ''}`);
      setSelected(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load branch details');
    } finally {
      setBranchLoading(false);
    }
  };

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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <Stat label="Patients" value={selected.stats.totalPatients.toLocaleString()} icon={Users} tone="sky" />
              <Stat label="OP Visits" value={selected.stats.totalOPVisits.toLocaleString()} icon={ReceiptText} tone="violet" />
              <Stat label="Billed" value={inr(selected.stats.totalBilled)} icon={Wallet} tone="sky" />
              <Stat label="Paid" value={inr(selected.stats.totalPaid)} icon={Wallet} tone="emerald" />
              <Stat label="Due" value={inr(selected.stats.totalDue)} icon={AlertTriangle} tone="amber" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-900">Patients &amp; OP Visits</h3>
                <p className="text-xs text-slate-400">{selected.visits.length} visit(s)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1400px] text-left text-xs">
                  <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <Th>No</Th><Th>UHID</Th><Th>Patient</Th><Th>Mobile</Th><Th>Visit Date</Th>
                      <Th>Type</Th><Th>Department</Th><Th>Doctor</Th><Th>Diagnosis</Th><Th>Treatment</Th>
                      <Th right>OP</Th><Th right>Pharmacy</Th><Th right>Lab</Th><Th right>Other</Th>
                      <Th right>Total</Th><Th right>Paid</Th><Th right>Due</Th><Th>Method</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.visits.length === 0 ? (
                      <tr><td colSpan={18} className="px-4 py-10 text-center text-slate-400">No OP visits for the selected date range.</td></tr>
                    ) : (
                      selected.visits.map((v, i) => (
                        <tr key={v._id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                          <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{v.patient?.uhid || v.uhid || '—'}</td>
                          <td className="px-3 py-2.5 font-medium text-slate-800">{v.patient?.name || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-600">{v.patient?.mobile || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-600">{v.visitDate ? new Date(v.visitDate).toLocaleDateString() : '—'}</td>
                          <td className="px-3 py-2.5 text-slate-600">{v.visitType || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-600">{v.department?.name || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-600">{v.doctor?.name || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-600">{v.diagnosis || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-600">{v.treatment || '—'}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{inr(v.charges?.opConsultation)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{inr(v.charges?.pharmacy)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{inr(v.charges?.lab)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{inr(v.charges?.otherCharges)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{inr(v.charges?.total)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-emerald-600">{inr(v.payment?.advanced)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-amber-600">{inr(v.payment?.due)}</td>
                          <td className="px-3 py-2.5 text-slate-600">{v.payment?.methodName || v.payment?.status || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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
        <p className="text-sm text-slate-500">Branch-wise patient &amp; OP overview. Select a branch to view its detailed patient list.</p>
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
              onClick={() => void openBranch(b._id)}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/40"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-100">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {b.totalOPVisits} visits
                </span>
              </div>
              <p className="mt-3 text-base font-bold text-slate-900">{b.name}</p>
              <p className="text-xs text-slate-400">{b.area}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                <Mini label="Patients" value={b.totalPatients.toLocaleString()} />
                <Mini label="Billed" value={inr(b.totalBilled)} />
                <Mini label="Due" value={inr(b.totalDue)} tone="amber" />
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

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-3 py-2.5 font-semibold ${right ? 'text-right' : ''}`}>{children}</th>;
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Users; tone: 'sky' | 'emerald' | 'amber' | 'violet' }) {
  const tones: Record<string, string> = {
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
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

function Mini({ label, value, tone }: { label: string; value: string; tone?: 'amber' }) {
  return (
    <div>
      <p className={`text-sm font-bold ${tone === 'amber' ? 'text-amber-600' : 'text-slate-800'}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
