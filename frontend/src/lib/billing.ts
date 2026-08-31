// Client-side billing helpers mirroring backend/src/utils/billing.js.
// These are for instant UI feedback; the backend ALWAYS recomputes/validates.

export const toNum = (v: unknown): number => {
  const n = typeof v === 'string' && v.trim() === '' ? 0 : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface ChargeInput {
  opConsultation?: number;
  pharmacy?: number;
  lab?: number;
  otherCharges?: number;
  discount?: number;
  tax?: number;
}

export interface ChargeTotals {
  op: number;
  ph: number;
  lab: number;
  other: number;
  disc: number;
  tax: number;
  total: number;
}

export function computeTotals(c: ChargeInput): ChargeTotals {
  const op = Math.max(0, round2(toNum(c.opConsultation)));
  const ph = Math.max(0, round2(toNum(c.pharmacy)));
  const lab = Math.max(0, round2(toNum(c.lab)));
  const other = Math.max(0, round2(toNum(c.otherCharges)));
  const disc = Math.max(0, round2(toNum(c.discount)));
  const tax = Math.max(0, round2(toNum(c.tax)));
  const total = Math.max(0, round2(op + ph + lab + other - disc + tax));
  return { op, ph, lab, other, disc, tax, total };
}

export function computePayment(total: number, advanced: number): {
  advanced: number;
  due: number;
  status: 'Paid' | 'Partial' | 'Due';
} {
  const adv = Math.max(0, round2(toNum(advanced)));
  const due = Math.max(0, round2(total - adv));
  let status: 'Paid' | 'Partial' | 'Due' = 'Due';
  if (total > 0 && adv > 0 && adv < total) status = 'Partial';
  else if (total > 0 && adv >= total) status = 'Paid';
  return { advanced: adv, due, status };
}

export const inr = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`;
