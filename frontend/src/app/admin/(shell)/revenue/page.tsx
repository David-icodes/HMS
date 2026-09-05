'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, IndianRupee, Wallet, AlertTriangle, Users, ReceiptText, RotateCcw, Download, X, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { adminFetch } from '@/lib/admin-auth';
import { inr } from '@/lib/billing';
import type { Branch } from '@/types';

interface RevenuePayload {
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
    clinicPatients: number;
    homeVisits: number;
  }[];
  methodRows: {
    methodName: string;
    transactions: number;
    revenue: number;
    billed: number;
    due: number;
    totalPatients: number;
  }[];
}

const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none';

export default function AdminRevenuePage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [branch, setBranch] = useState('');
  const [method, setMethod] = useState('');
  const [ch, setCh] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [methods, setMethods] = useState<{ _id: string; name: string }[]>([]);
  const [data, setData] = useState<RevenuePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<'branch' | 'method' | null>(null);

  useEffect(() => {
    fetch('/api/site/branches')
      .then((r) => r.json())
      .then((d) => setBranches(d.data || []))
      .catch(() => {});
    adminFetch<{ data: { _id: string; name: string }[] }>('/api/staff/payment-methods')
      .then((r) => setMethods(r.data || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (branch) params.set('branch', branch);
      if (method) params.set('method', method);
      if (ch) params.set('ch', ch);
      const q = params.toString();
      const res = await adminFetch<{ data: RevenuePayload }>(`/api/admin/analytics/revenue${q ? `?${q}` : ''}`);
      setData(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load revenue');
    } finally {
      setLoading(false);
    }
  }, [from, to, branch, method]);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setFrom('');
    setTo('');
    setBranch('');
    setMethod('');
    setCh('');
  };

  const runExport = async (kind: 'branch' | 'method') => {
    setExporting(kind);
    const qs = {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(branch ? { branch } : {}),
      ...(method ? { method } : {}),
      ...(ch ? { ch } : {}),
    };
    const q = new URLSearchParams(qs).toString();
    try {
      const res = await adminFetch<{ data: RevenuePayload }>(`/api/admin/analytics/revenue${q ? `?${q}` : ''}`);
      const payload = res.data;
      const workbook = new ExcelJS.Workbook();
      workbook.created = new Date();
      workbook.creator = 'Urmila Raj Hospital';

      if (kind === 'branch') {
        const sheet = workbook.addWorksheet('Branch Revenue');
        sheet.columns = [
          { header: 'S.No.', key: 'sno', width: 6 },
          { header: 'Branch', key: 'branch', width: 24 },
          { header: 'Clinic Patients', key: 'clinic', width: 16 },
          { header: 'Home Visits', key: 'home', width: 14 },
          { header: 'Total Patients (Clinic + Home)', key: 'patients', width: 28 },
          { header: 'Total Billing (₹)', key: 'billed', width: 18 },
          { header: 'Paid / Collected (₹)', key: 'paid', width: 20 },
          { header: 'Due (₹)', key: 'due', width: 14 },
        ];
        sheet.getRow(1).font = { bold: true };
        (payload.branchRows ?? []).forEach((b, i) => {
          sheet.addRow({
            sno: i + 1,
            branch: b.branchName,
            clinic: b.clinicPatients ?? 0,
            home: b.homeVisits ?? 0,
            patients: b.totalPatients,
            billed: b.totalBilled,
            paid: b.totalPaid,
            due: b.totalDue,
          });
        });
        if ((payload.branchRows ?? []).length === 0) {
          sheet.addRow({ sno: 1, branch: 'No data', clinic: 0, home: 0, patients: 0, billed: 0, paid: 0, due: 0 });
        }
      } else {
        const sheet = workbook.addWorksheet('Payment Method Revenue');
        sheet.columns = [
          { header: 'S.No.', key: 'sno', width: 6 },
          { header: 'Payment Method', key: 'method', width: 24 },
          { header: 'Transaction Count', key: 'txn', width: 18 },
          { header: 'Total Billing (₹)', key: 'billed', width: 18 },
          { header: 'Paid / Collected (₹)', key: 'paid', width: 20 },
          { header: 'Due (₹)', key: 'due', width: 14 },
        ];
        sheet.getRow(1).font = { bold: true };
        (payload.methodRows ?? []).forEach((m, i) => {
          sheet.addRow({
            sno: i + 1,
            method: m.methodName,
            txn: m.transactions,
            billed: m.billed,
            paid: m.revenue,
            due: m.due,
          });
        });
        if ((payload.methodRows ?? []).length === 0) {
          sheet.addRow({ sno: 1, method: 'No data', txn: 0, billed: 0, paid: 0, due: 0 });
        }
      }

      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const label = kind === 'branch' ? 'Branch Revenue' : 'Payment Method Revenue';
      a.download = `${label.toLowerCase().replace(/ /g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${label} exported as Excel (.xlsx)`);
      setExportOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const s = data?.summary;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Branch</label>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className={inputCls}>
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Payment Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
              <option value="">All methods</option>
              {methods.map((m) => (
                <option key={m._id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Clinic / Home</label>
            <select value={ch} onChange={(e) => setCh(e.target.value)} className={inputCls}>
              <option value="">All (Clinic + Home)</option>
              <option value="clinic">Clinic (C)</option>
              <option value="home">Home (H)</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button
            onClick={() => setExportOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" /> Export Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <SummaryCard icon={IndianRupee} label="Total Billed" value={inr(s?.totalBilled ?? 0)} tone="sky" />
        <SummaryCard icon={Wallet} label="Received / Paid" value={inr(s?.totalPaid ?? 0)} tone="emerald" />
        <SummaryCard icon={AlertTriangle} label="Due" value={inr(s?.totalDue ?? 0)} tone="amber" />
        <SummaryCard icon={Users} label="Patients" value={(s?.totalPatients ?? 0).toLocaleString()} tone="violet" />
        <SummaryCard icon={ReceiptText} label="Transactions" value={(s?.totalTransactions ?? 0).toLocaleString()} tone="slate" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">Branch-wise Revenue</h3>
            <p className="text-xs text-slate-400">Billing from actual bills (course billed once) &amp; revenue from actual payments — each counted once</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Branch</th>
                  <th className="px-3 py-3 text-right font-semibold">Clinic</th>
                  <th className="px-3 py-3 text-right font-semibold">Home Visits</th>
                  <th className="px-3 py-3 text-right font-semibold">Total Patients</th>
                  <th className="px-3 py-3 text-right font-semibold">Billed</th>
                  <th className="px-3 py-3 text-right font-semibold">Paid</th>
                  <th className="px-5 py-3 text-right font-semibold">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-600" /></td></tr>
                ) : (data?.branchRows ?? []).length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No revenue data for the selected filters.</td></tr>
                ) : (
                  (data?.branchRows ?? []).map((b) => (
                    <tr key={b.branchId} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-800">{b.branchName}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{b.clinicPatients ?? 0}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{b.homeVisits ?? 0}</td>
                      <td className="px-3 py-3 text-right font-medium text-slate-800">{b.totalPatients}</td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-800">{inr(b.totalBilled)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-emerald-600">{inr(b.totalPaid)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-amber-600">{inr(b.totalDue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">Payment Method-wise</h3>
            <p className="text-xs text-slate-400">Revenue collected by each payment method</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Method</th>
                  <th className="px-3 py-3 text-right font-semibold">Transactions</th>
                  <th className="px-3 py-3 text-right font-semibold">Patients</th>
                  <th className="px-3 py-3 text-right font-semibold">Collected</th>
                  <th className="px-5 py-3 text-right font-semibold">Billed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-600" /></td></tr>
                ) : (data?.methodRows ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No payment data for the selected filters.</td></tr>
                ) : (
                  (data?.methodRows ?? []).map((m) => (
                    <tr key={m.methodName} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-800">{m.methodName}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{m.transactions}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{m.totalPatients}</td>
                      <td className="px-3 py-3 text-right font-semibold text-emerald-600">{inr(m.revenue)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">{inr(m.billed)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Export Data (Excel)</h3>
              <button onClick={() => setExportOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              Export the current filtered data as <b>.xlsx</b> (Microsoft Excel). Choose the export structure.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => void runExport('branch')}
                disabled={exporting === 'branch'}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
              >
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">Branch-wise Export</span>
                  <span className="block text-xs text-slate-500">S.No, Branch, Patients, OPs, Billed, Paid, Due</span>
                </span>
                {exporting === 'branch' && <Loader2 className="ml-auto h-4 w-4 animate-spin text-emerald-600" />}
              </button>
              <button
                onClick={() => void runExport('method')}
                disabled={exporting === 'method'}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
              >
                <Wallet className="h-5 w-5 text-emerald-600" />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">Payment Method-wise Export</span>
                  <span className="block text-xs text-slate-500">S.No, Method, Transactions, Billed, Paid, Due</span>
                </span>
                {exporting === 'method' && <Loader2 className="ml-auto h-4 w-4 animate-spin text-emerald-600" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof IndianRupee; label: string; value: string; tone: 'sky' | 'emerald' | 'amber' | 'violet' | 'slate' }) {
  const tones: Record<string, string> = {
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
