/**
 * Centralized billing calculations shared by controllers.
 * Ensures totals/due are always computed the same way and never trust
 * client-supplied totals blindly.
 */

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Compute total from individual charge components.
 * total = opConsultation + pharmacy + lab + otherCharges - discount + tax
 * All values coerced to non-negative finite numbers. NaN inputs become 0.
 */
const computeTotal = (charges) => {
  const op = Math.max(0, round2(toNum(charges?.opConsultation)));
  const ph = Math.max(0, round2(toNum(charges?.pharmacy)));
  const lab = Math.max(0, round2(toNum(charges?.lab)));
  const other = Math.max(0, round2(toNum(charges?.otherCharges)));
  const disc = Math.max(0, round2(toNum(charges?.discount)));
  const tax = Math.max(0, round2(toNum(charges?.tax)));
  const total = Math.max(0, round2(op + ph + lab + other - disc + tax));
  return { op, ph, lab, other, disc, tax, total };
};

/**
 * Convert charges object to normalized safe components.
 */
const normalizeCharges = (charges) => {
  const { op, ph, lab, other, disc, tax, total } = computeTotal(charges);
  return {
    opConsultation: op,
    pharmacy: ph,
    lab,
    otherCharges: other,
    discount: disc,
    tax,
    total,
  };
};

/**
 * Compute payment given a normalized total and advance/paid amount.
 * due = total - advanced (never negative).
 * status = Paid / Partial / Due.
 */
const computePayment = (total, advanced, methodName) => {
  const due = Math.max(0, round2(total - toNum(advanced)));
  const adv = Math.max(0, round2(toNum(advanced)));
  let status = 'Due';
  if (total > 0 && adv > 0 && adv < total) status = 'Partial';
  else if (total > 0 && adv >= total) status = 'Paid';
  else if (total === 0 && adv === 0) status = 'Due';
  return { advanced: adv, due, status, methodName };
};

module.exports = { toNum, round2, computeTotal, normalizeCharges, computePayment };
