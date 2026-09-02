'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus, Printer, Save, Trash2, Receipt, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { staffFetch } from '@/lib/staff-auth';
import type { Invoice } from '@/types';

interface Patient {
  _id: string;
  name: string;
  mobile: string;
  opdNumber: string;
  address?: string;
  branch?: { name: string; address?: string; city?: string; phone?: string };
  department?: { name: string };
}

interface LineItem {
  description: string;
  qty: number;
  rate: number;
}

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [items, setItems] = useState<LineItem[]>([{ description: '', qty: 1, rate: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const load = useCallback(async () => {
    try {
      const pRes = await staffFetch<{ data: Patient }>(`/api/staff/patients/${params.id}`);
      setPatient(pRes.data);
    } catch {
      /* handled by staffFetch */
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

  const subtotal = items.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0), 0);
  const total = Math.max(0, subtotal - (discount || 0) + (tax || 0));

  const updateItem = (i: number, field: keyof LineItem, value: string) => {
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i ? { ...it, [field]: field === 'description' ? value : Number(value) || 0 } : it,
      ),
    );
  };

  const announce = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Voice announcement not supported in this browser');
      return;
    }
    const amount = Math.round(total);
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

  const generate = async () => {
    if (!patient) return;
    const validItems = items.filter((it) => it.description.trim() && it.qty > 0);
    if (validItems.length === 0) {
      toast.error('Add at least one item with a description and quantity');
      return;
    }
    setGenerating(true);
    try {
      const res = await staffFetch<{ data: { invoice: Invoice } }>(
        `/api/staff/patients/${patient._id}/invoice`,
        {
          method: 'POST',
          body: {
            items: validItems.map((it) => ({ ...it, amount: it.qty * it.rate })),
            discount: Number(discount) || 0,
            tax: Number(tax) || 0,
            amountPaid: amountPaid !== '' ? Number(amountPaid) : total,
            paymentMethod,
          },
        },
      );
      setInvoice(res.data.invoice);
      toast.success('Invoice generated');
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

  if (!patient) {
    return <p className="py-16 text-center text-slate-400">Patient not found.</p>;
  }

  // Printable invoice view after generation
  if (invoice) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <Link
              href="/staff/patients"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <button
              onClick={() => setInvoice(null)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              New invoice
            </button>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <Printer className="h-4 w-4" /> Print Invoice
          </button>
        </div>

        <InvoiceSheet invoice={invoice} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/staff/patients"
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-teal-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to patients
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
            <Receipt className="h-5 w-5 text-teal-600" /> Invoice Generator
          </h3>

          <div className="mb-5 rounded-xl bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-slate-800">{patient.name}</p>
            <p className="text-slate-500">
              {patient.opdNumber} · {patient.mobile}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {patient.branch?.name || '—'} · {patient.department?.name || '—'}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Line items</p>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_70px_90px_36px] items-center gap-2">
                <input
                  value={it.description}
                  onChange={(e) => updateItem(i, 'description', e.target.value)}
                  placeholder="Description"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
                <input
                  value={it.qty || ''}
                  onChange={(e) => updateItem(i, 'qty', e.target.value)}
                  type="number"
                  min={0}
                  placeholder="Qty"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
                <input
                  value={it.rate || ''}
                  onChange={(e) => updateItem(i, 'rate', e.target.value)}
                  type="number"
                  min={0}
                  placeholder="Rate"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
                <button
                  onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={items.length === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setItems((prev) => [...prev, { description: '', qty: 1, rate: 0 }])}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700"
            >
              <Plus className="h-4 w-4" /> Add line item
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Discount (₹)</label>
              <input
                value={discount || ''}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                type="number"
                min={0}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Tax (₹)</label>
              <input
                value={tax || ''}
                onChange={(e) => setTax(Number(e.target.value) || 0)}
                type="number"
                min={0}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Paid (₹)</label>
              <input
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                type="number"
                min={0}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-slate-500">Payment method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="insurance">Insurance</option>
              <option value="other">Other</option>
            </select>
          </div>

          <button
            type="button"
            onClick={announce}
            disabled={total <= 0}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-50"
          >
            <Volume2 className="h-4 w-4" /> Announce Bill Amount · ₹{total.toLocaleString('en-IN')}
          </button>

          <button
            onClick={() => void generate()}
            disabled={generating}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {generating ? 'Generating…' : `Generate Invoice · ₹${total.toLocaleString()}`}
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-900">Summary</h3>
            <SummaryRow label="Subtotal" value={subtotal} />
            <SummaryRow label="Discount" value={-(discount || 0)} />
            <SummaryRow label="Tax" value={tax || 0} />
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-sm font-bold text-slate-900">Total</span>
              <span className="text-lg font-bold text-teal-700">₹{total.toLocaleString()}</span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            After generating, you can print or save this invoice as a PDF for the patient.
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">₹{value.toLocaleString()}</span>
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

function InvoiceSheet({ invoice }: { invoice: Invoice }) {
  const date = new Date(invoice.createdAt);
  return (
    <div
      id="print-invoice"
      className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none"
    >
      <div className="flex items-start justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-lg font-extrabold text-white">
            UR
          </div>
          <h1 className="mt-3 font-display text-xl font-bold text-slate-900">Urmila Raj Hospital</h1>
          <p className="text-xs text-slate-500">
            {invoice.branch?.address || 'Hyderabad, Telangana, India'}
            {invoice.branch?.phone ? ` · ${invoice.branch.phone}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-slate-400">Invoice</p>
          <p className="font-mono text-sm font-semibold text-teal-700">{invoice.invoiceNumber}</p>
          <p className="mt-1 text-xs text-slate-500">{date.toLocaleDateString()} · {date.toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 py-5 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Billed To</p>
          <p className="mt-1 font-semibold text-slate-800">{invoice.patientName}</p>
          <p className="text-slate-500">{invoice.patientMobile}</p>
          {invoice.patientAddress && <p className="text-slate-500">{invoice.patientAddress}</p>}
          {invoice.opdNumber && <p className="mt-1 font-mono text-xs text-slate-400">OPD: {invoice.opdNumber}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-slate-400">Department</p>
          <p className="mt-1 font-medium text-slate-700">{invoice.department?.name || '—'}</p>
          <p className="mt-4 text-xs uppercase tracking-wider text-slate-400">Status</p>
          <p className="mt-1 inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-teal-700">
            {invoice.status}
          </p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400">
            <th className="py-2 text-left font-semibold">Description</th>
            <th className="py-2 text-center font-semibold">Qty</th>
            <th className="py-2 text-right font-semibold">Rate</th>
            <th className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoice.items.map((it, i) => (
            <tr key={i}>
              <td className="py-2 text-slate-700">{it.description}</td>
              <td className="py-2 text-center text-slate-600">{it.qty}</td>
              <td className="py-2 text-right text-slate-600">₹{it.rate.toLocaleString()}</td>
              <td className="py-2 text-right font-medium text-slate-800">₹{it.amount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5 flex justify-end">
        <div className="w-56 space-y-1.5 text-sm">
          <SummaryRow label="Subtotal" value={invoice.subtotal} />
          {invoice.discount > 0 && <SummaryRow label="Discount" value={-invoice.discount} />}
          {invoice.tax > 0 && <SummaryRow label="Tax" value={invoice.tax} />}
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="font-bold text-slate-900">Total</span>
            <span className="text-lg font-bold text-teal-700">₹{invoice.total.toLocaleString()}</span>
          </div>
          {(invoice.paymentMethod !== 'pending' || invoice.amountPaid > 0) && (
            <SummaryRow label={`Paid (${invoice.paymentMethod})`} value={invoice.amountPaid} />
          )}
          {invoice.status === 'issued' && invoice.total - invoice.amountPaid > 0 && (
            <SummaryRow label="Due" value={invoice.total - invoice.amountPaid} />
          )}
        </div>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        Thank you for choosing Urmila Raj Hospital. <br />
        This is a computer-generated invoice and does not require a signature.
      </div>
    </div>
  );
}
