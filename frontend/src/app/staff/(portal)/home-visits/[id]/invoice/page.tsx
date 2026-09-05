'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Printer, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { staffFetch } from '@/lib/staff-auth';
import { inr } from '@/lib/billing';
import type { HomeVisit } from '@/types';

export default function HomeVisitInvoicePage() {
  const params = useParams<{ id: string }>();
  const [hv, setHv] = useState<HomeVisit | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await staffFetch<{ data: { data: HomeVisit } } | { data: HomeVisit }>(`/api/staff/home-visits/${params.id}`);
      const payload = res.data && typeof res.data === 'object' && 'data' in res.data && (res.data as { data: HomeVisit }).data
        ? (res.data as { data: HomeVisit }).data
        : (res.data as HomeVisit);
      setHv(payload);
    } catch {
      /* handled */
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onBefore = () => document.body.classList.add('printing-invoice');
    const onAfter = () => document.body.classList.remove('printing-invoice');
    window.addEventListener('beforeprint', onBefore);
    window.addEventListener('afterprint', onAfter);
    return () => {
      window.removeEventListener('beforeprint', onBefore);
      window.removeEventListener('afterprint', onAfter);
    };
  }, []);

  const generate = async () => {
    if (!hv) return;
    setGenerating(true);
    try {
      const res = await staffFetch<{ data: { homeVisit: HomeVisit } }>(`/api/staff/home-visits/${hv._id}/invoice`, { method: 'POST', body: {} });
      setHv(res.data.homeVisit ?? hv);
      toast.success(`Invoice generated: ${res.data.homeVisit?.invoiceNumber || 'OK'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!hv) {
    return <p className="py-16 text-center text-slate-400">Home visit not found.</p>;
  }

  const total = hv.total ?? (hv.perSession * (hv.sessions ?? 1));

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <Link href="/staff/home-visits" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-teal-700">
          <ArrowLeft className="h-4 w-4" /> Back to Home Visits
        </Link>
      </div>

      {!hv.invoiceNumber && (
        <div className="print:hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Receipt className="h-5 w-5 text-teal-600" /> Invoice for home visit
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {hv.patientName} · {hv.branch && typeof hv.branch === 'object' ? hv.branch.name : '—'}
              </p>
            </div>
            <button
              onClick={() => void generate()}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              {generating ? 'Generating…' : 'Generate Invoice'}
            </button>
          </div>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
            <Info label="Total" value={inr(total)} />
            <Info label="Paid / Advance" value={inr(hv.advance)} />
            <Info label="Due" value={inr(hv.due)} />
            <Info label="Sessions" value={String(hv.sessions ?? 1)} />
          </div>
        </div>
      )}

      {hv.invoiceNumber && (
        <>
          <div className="flex items-center justify-between print:hidden">
            <span className="text-sm text-slate-600">Invoice {hv.invoiceNumber}</span>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
            >
              <Printer className="h-4 w-4" /> Print Invoice
            </button>
          </div>
          <HomeVisitInvoiceSheet hv={{ ...hv, total }} />
        </>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 text-base font-bold text-slate-800">{value}</p>
    </div>
  );
}

function HomeVisitInvoiceSheet({ hv }: { hv: HomeVisit }) {
  const branch = hv.branch && typeof hv.branch === 'object' ? hv.branch : null;
  const date = new Date(hv.createdAt);

  return (
    <div
      id="print-invoice"
      className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none"
    >
      <div className="flex items-start justify-between border-b border-slate-300 pb-5">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700 text-lg font-extrabold text-white">UR</div>
          <h1 className="mt-3 font-display text-xl font-bold text-slate-900">URMILA RAJ HOSPITAL</h1>
          <p className="mt-1 text-xs text-slate-500">{branch?.name || 'Home Visit'}</p>
          <p className="text-xs text-slate-500">Urmila Raj Hospital</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-slate-400">Home Visit Invoice</p>
          <p className="font-mono text-sm font-bold text-teal-700">{hv.invoiceNumber}</p>
          <p className="mt-1 text-xs text-slate-500">{date.toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-5 text-sm">
        <div>
          <Row label="Patient Name" value={hv.patientName || '—'} />
          <Row label="Contact" value={hv.contact || '—'} />
          <Row label="Location" value={hv.location || '—'} />
          <Row label="S.No" value={hv.serialNo != null ? String(hv.serialNo) : '—'} />
        </div>
        <div>
          <Row label="Timing" value={hv.timing || '—'} />
          <Row label="Attendance" value={hv.attendance || '—'} />
          <Row label="Therapist" value={hv.therapist || '—'} />
          <Row label="Referral Doctor" value={hv.referralDoctor || '—'} />
          <Row label="Branch" value={branch?.name || '—'} />
        </div>
      </div>

      {hv.diagnosis && (
        <div className="mt-4 text-sm">
          <Row label="Diagnosis" value={hv.diagnosis} />
        </div>
      )}
      {hv.reason && (
        <div className="mt-2 text-sm">
          <Row label="Reason" value={hv.reason} />
        </div>
      )}

      <table className="mt-5 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="py-2 font-semibold">Item</th>
            <th className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <tr>
            <td className="py-1.5 text-slate-700">
              Home Visit Care · {hv.sessions ?? 1} session(s) × {inr(hv.perSession)}
            </td>
            <td className="py-1.5 text-right text-slate-800">{inr(hv.total ?? 0)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1.5 text-sm">
          <Row label="TOTAL" value={inr(hv.total ?? 0)} bold />
          <Row label="Paid / Advance" value={inr(hv.advance)} />
          <Row label="Payment Method" value={hv.paymentMethod || '—'} />
          <Row label="Due" value={inr(hv.due)} />
          <Row label="Payment Status" value={hv.paymentStatus || 'Due'} />
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="text-xs text-slate-400">Created By</p>
          <p className="mt-1 font-medium text-slate-700">
            {hv.createdBy && typeof hv.createdBy === 'object' ? hv.createdBy.name : 'Staff'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Therapist / Staff Signature</p>
          <p className="mt-1 font-medium text-slate-700">____________________</p>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-300 pt-4 text-center text-xs text-slate-400">
        Thank you for choosing Urmila Raj Hospital. <br />
        This is a computer-generated invoice and does not require a signature.
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={bold ? 'text-sm font-bold text-slate-900' : 'text-slate-500'}>{label}</span>
      <span className={`${bold ? 'font-bold text-teal-700' : 'font-medium text-slate-800'}`}>{value}</span>
    </div>
  );
}