'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Printer, Receipt, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { staffFetch } from '@/lib/staff-auth';
import { inr } from '@/lib/billing';
import type { Invoice, Visit } from '@/types';

export default function VisitInvoicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await staffFetch<{ data: Visit }>(`/api/staff/visits/${params.id}`);
      setVisit(res.data);
      if (res.data.invoiceNumber) {
        // fetch invoice by invoice number is not available; generate will reuse. For now keep generating idempotently.
      }
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
    if (!visit) return;
    setGenerating(true);
    try {
      const res = await staffFetch<{ data: { invoice: Invoice } }>(`/api/staff/visits/${visit._id}/invoice`, { method: 'POST', body: {} });
      setInvoice(res.data.invoice);
      setVisit({ ...visit, invoiceNumber: res.data.invoice.invoiceNumber });
      toast.success(`Invoice generated: ${res.data.invoice.invoiceNumber}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const announce = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Voice announcement not supported in this browser');
      return;
    }
    const amount = Math.round(visit?.charges?.total || 0);
    const text = `Bill amount is ${amountInWords(amount)} rupees.`;
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => /en(-|_)?in/i.test(v.lang)) || voices.find((v) => v.lang === 'en-US') || voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    toast.success(`Announcing ₹${amount.toLocaleString('en-IN')}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!visit) {
    return <p className="py-16 text-center text-slate-400">Visit not found.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <Link href="/staff/op-list" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-teal-700">
          <ArrowLeft className="h-4 w-4" /> Back to OP list
        </Link>
      </div>

      {(!visit.invoiceNumber || !invoice) && (
        <div className="print:hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Receipt className="h-5 w-5 text-teal-600" /> Invoice for visit
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {patientName(visit)} · {visit.opNumber || '—'} ·{' '}
                {visit.branch?.name || '—'}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={announce}
                disabled={!visit.charges?.total}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-50"
              >
                <Volume2 className="h-4 w-4" /> Announce Amount
              </button>
              <button
                onClick={() => void generate()}
                disabled={generating}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                {generating ? 'Generating…' : 'Generate Invoice'}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <Info label="Total" value={inr(visit.charges?.total || 0)} />
            <Info label="Paid / Advance" value={inr(visit.payment?.advanced || 0)} />
            <Info label="Due" value={inr(visit.payment?.due || 0)} />
          </div>
        </div>
      )}

      {(visit.invoiceNumber || invoice) && (
        <>
          <div className="flex items-center justify-between print:hidden">
            <span className="text-sm text-slate-600">Invoice {visit.invoiceNumber || invoice?.invoiceNumber}</span>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
            >
              <Printer className="h-4 w-4" /> Print Invoice
            </button>
          </div>
          <VisitInvoiceSheet visit={visit} invoice={invoice} />
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

function patientName(v: Visit): string {
  const p = v.patient;
  return typeof p === 'object' && p ? p.name : v.uhid || '—';
}

function VisitInvoiceSheet({ visit, invoice }: { visit: Visit; invoice: Invoice | null }) {
  const pat = typeof visit.patient === 'object' && visit.patient ? visit.patient : null;
  const branch = visit.branch;
  const c = visit.charges || { opConsultation: 0, pharmacy: 0, lab: 0, otherCharges: 0, discount: 0, tax: 0, total: 0 };
  const pay = visit.payment || { advanced: 0, due: 0, status: 'Due', methodName: '' };
  const invoiceNo = visit.invoiceNumber || invoice?.invoiceNumber || '—';
  const date = new Date(visit.visitDate || visit.createdAt);

  return (
    <div
      id="print-invoice"
      className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-300 pb-5">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700 text-lg font-extrabold text-white">
            UR
          </div>
          <h1 className="mt-3 font-display text-xl font-bold text-slate-900">URMILA RAJ HOSPITAL</h1>
          <p className="mt-1 text-xs text-slate-500">
            {branch?.name || ''}
            {branch?.address ? ` · ${branch.address}` : ''}
          </p>
          <p className="text-xs text-slate-500">
            {branch?.area || ''}{branch?.city ? `, ${branch.city}` : 'Hyderabad'}
            {branch?.phone ? ` · ${branch.phone}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-slate-400">Invoice</p>
          <p className="font-mono text-sm font-bold text-teal-700">{invoiceNo}</p>
          <p className="mt-1 text-xs text-slate-500">{date.toLocaleDateString()}</p>
        </div>
      </div>

      {/* Patient / visit info */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-5 text-sm">
        <div>
          <Row label="Patient ID / UHID" value={pat?.uhid || visit.uhid || '—'} />
          <Row label="Patient Name" value={pat?.name || '—'} />
          <Row label="Mobile" value={pat?.mobile || '—'} />
          <Row label="Age" value={pat?.age != null ? String(pat.age) : '—'} />
          <Row label="Gender" value={pat?.gender || '—'} />
        </div>
        <div>
          <Row label="Doctor" value={visit.doctor?.name || '—'} />
          <Row label="Referral Doctor" value={visit.referralDoctor || '—'} />
          <Row label="Department" value={visit.department?.name || '—'} />
          <Row label="Visit Type" value={visit.visitType || '—'} />
          <Row label="OP / Token No." value={visit.opNumber || '—'} />
          <Row label="Branch" value={branch?.name || '—'} />
        </div>
      </div>

      {/* Diagnosis / treatment */}
      <div className="mt-4 space-y-1 text-sm">
        <Row label="Diagnosis" value={visit.diagnosis || '—'} />
        <Row label="Treatment / Procedure" value={visit.treatment || '—'} />
        <Row label="No. of Days" value={String(visit.noOfDays ?? 0)} />
      </div>

      {/* Charges */}
      <table className="mt-5 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="py-2 font-semibold">Charges</th>
            <th className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <ChargeRow label="OP / Consultation" value={c.opConsultation} />
          <ChargeRow label="Pharmacy" value={c.pharmacy} />
          <ChargeRow label="Lab" value={c.lab} />
          <ChargeRow label="Other Charges" value={c.otherCharges} />
          {c.discount > 0 && <ChargeRow label="Discount" value={-c.discount} />}
          {c.tax > 0 && <ChargeRow label="Tax" value={c.tax} />}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1.5 text-sm">
          <Row label="TOTAL" value={inr(c.total)} bold />
          <Row label="Paid / Advance" value={inr(pay.advanced)} />
          <Row label="Payment Method" value={pay.methodName || '—'} />
          <Row label="Due" value={inr(pay.due)} />
          <Row label="Payment Status" value={pay.status} />
        </div>
      </div>

      {/* Signatures */}
      <div className="mt-10 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="text-xs text-slate-400">Created By</p>
          <p className="mt-1 font-medium text-slate-700">
            {visit.createdBy?.name || (typeof visit.patient === 'object' ? 'Staff' : 'Staff')}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Doctor / Staff Signature</p>
          <p className="mt-1 font-medium text-slate-700">{visit.signature || '____________________'}</p>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-300 pt-4 text-center text-xs text-slate-400">
        Thank you for choosing Urmila Raj Hospital. <br />
        This is a computer-generated invoice and does not require a signature.
      </div>
    </div>
  );
}

function amountInWords(num: number): string {
  if (num === 0) return 'zero';
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const two = (n: number): string => {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  };
  const three = (n: number): string => {
    if (n < 100) return two(n);
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return ones[h] + ' hundred' + (rest ? ' and ' + two(rest) : '');
  };
  if (num >= 10000000) {
    const c = Math.floor(num / 10000000);
    const rest = num % 10000000;
    return amountInWords(c) + ' crore' + (rest ? ' ' + amountInWords(rest) : '');
  }
  if (num >= 100000) {
    const l = Math.floor(num / 100000);
    const rest = num % 100000;
    return amountInWords(l) + ' lakh' + (rest ? ' ' + amountInWords(rest) : '');
  }
  if (num >= 1000) {
    const t = Math.floor(num / 1000);
    const rest = num % 1000;
    return amountInWords(t) + ' thousand' + (rest ? ' ' + three(rest) : '');
  }
  return three(num);
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={bold ? 'text-sm font-bold text-slate-900' : 'text-slate-500'}>{label}</span>
      <span className={`${bold ? 'font-bold text-teal-700' : 'font-medium text-slate-800'}`}>{value}</span>
    </div>
  );
}

function ChargeRow({ label, value }: { label: string; value: number }) {
  return (
    <tr>
      <td className="py-1.5 text-slate-700">{label}</td>
      <td className="py-1.5 text-right text-slate-800">{inr(value)}</td>
    </tr>
  );
}
