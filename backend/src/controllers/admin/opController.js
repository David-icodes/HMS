const mongoose = require('mongoose');
const OpRegistration = require('../../models/OpRegistration');
const Invoice = require('../../models/Invoice');
const Branch = require('../../models/Branch');
const Department = require('../../models/Department');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { logActivity } = require('./authController');

const parseRange = (from, to) => {
  const range = {};
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) range.$gte = new Date(d.setHours(0, 0, 0, 0));
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) range.$lte = new Date(d.setHours(23, 59, 59, 999));
  }
  return range;
};

const listPatients = asyncHandler(async (req, res) => {
  const { search, from, to, branch, status, page = 1, limit = 10, sort = '-createdAt' } = req.query;
  const query = {};

  if (search) {
    const term = search.trim();
    const digits = term.replace(/\D/g, '');
    const or = [
      { name: new RegExp(term, 'i') },
      { mobile: new RegExp(term, 'i') },
      { opdNumber: new RegExp(term, 'i') },
      { concern: new RegExp(term, 'i') },
    ];
    if (digits) or.push({ mobile: new RegExp(digits) });
    query.$or = or;
  }

  const range = parseRange(from, to);
  if (range.$gte || range.$lte) query.createdAt = range;
  if (branch) query.branch = branch;
  if (status) query.status = status;

  const total = await OpRegistration.countDocuments(query);
  const sortKey = sort.replace(/^-/, '');
  const sortDir = sort.startsWith('-') ? -1 : 1;

  const items = await OpRegistration.find(query)
    .sort({ [sortKey]: sortDir })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate('branch', 'name area')
    .populate('department', 'name');

  res.status(200).json(
    new ApiResponse(200, {
      data: items,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.max(1, Math.ceil(total / Number(limit))),
    })
  );
});

const exportPatients = asyncHandler(async (req, res) => {
  const { from, to, branch } = req.query;
  const query = {};
  const range = parseRange(from, to);
  if (range.$gte || range.$lte) query.createdAt = range;
  if (branch) query.branch = branch;
  const items = await OpRegistration.find(query)
    .sort({ createdAt: -1 })
    .populate('branch', 'name')
    .populate('department', 'name');
  res.status(200).json(new ApiResponse(200, items));
});

const revenueReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const range = parseRange(from, to);

  const dateFilter = range.$gte || range.$lte
    ? { createdAt: range, status: { $ne: 'cancelled' } }
    : { status: { $ne: 'cancelled' } };

  const [invoices, op] = await Promise.all([
    Invoice.find(dateFilter),
    OpRegistration.find(dateFilter),
  ]);

  const invoiceRevenue = invoices.reduce((s, i) => s + (i.amountPaid > 0 ? i.amountPaid : i.total || 0), 0);
  const invoiceBilled = invoices.reduce((s, i) => s + (i.total || 0), 0);

  const invoicedOpIds = new Set(invoices.map((i) => i.patient && i.patient.toString()));
  const opFees = op
    .filter((o) => o.amount > 0 && !invoicedOpIds.has(o._id.toString()))
    .reduce((s, o) => s + (o.amount || 0), 0);

  const branchRows = await Promise.all(
    (
      await Branch.find({ isActive: true }).sort({ order: 1 })
    ).map(async (b) => {
      const inv = invoices.filter((i) => i.branch && i.branch.toString() === b._id.toString());
      const ops = op.filter((o) => o.branch && o.branch.toString() === b._id.toString());
      return {
        branch: b._id,
        branchName: b.name,
        area: b.area,
        totalPatients: ops.length,
        completedPatients: ops.filter((o) => o.status === 'completed').length,
        revenue: inv.reduce((s, i) => s + (i.amountPaid || i.total || 0), 0),
      };
    })
  );

  const dailyRevenue = await Invoice.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$total' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const patientTrend = await OpRegistration.aggregate([
    {
      $match: range.$gte || range.$lte ? { createdAt: range } : {},
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      summary: {
        totalRevenue: invoiceRevenue,
        totalBilled: invoiceBilled,
        opFees,
        totalPatients: op.length,
        completedPatients: op.filter((o) => o.status === 'completed').length,
        invoicesIssued: invoices.length,
      },
      branchRows,
      dailyRevenue,
      patientTrend,
    })
  );
});

const generateInvoice = asyncHandler(async (req, res) => {
  const patientId = req.params.id || req.params.patientId;
  const patient = await OpRegistration.findById(patientId).populate('branch', 'name address')
    .populate('department', 'name');
  if (!patient) throw new ApiError(404, 'Patient not found');

  const { items = [], discount = 0, tax = 0, amountPaid, paymentMethod = 'pending' } = req.body;
  const lines = Array.isArray(items) && items.length
    ? items
    : [{ description: patient.department ? patient.department.name : 'OP Consultation', qty: 1, rate: 0, amount: 0 }];
  const normalized = lines.map((l) => {
    const qty = Number(l.qty) || 0;
    const rate = Number(l.rate) || 0;
    return { description: l.description, qty, rate, amount: qty * rate };
  });
  const subtotal = normalized.reduce((s, l) => s + l.amount, 0);
  const disc = Number(discount) || 0;
  const taxAmt = Number(tax) || 0;
  const total = Math.max(0, subtotal - disc + taxAmt);
  const paid = amountPaid !== undefined ? Number(amountPaid) : 0;

  const invoice = await Invoice.create({
    patient: patient._id,
    branch: patient.branch,
    department: patient.department,
    patientName: patient.name,
    patientMobile: patient.mobile,
    patientAddress: patient.address,
    opdNumber: patient.opdNumber,
    items: normalized,
    subtotal,
    discount: disc,
    tax: taxAmt,
    total,
    amountPaid: Math.max(0, paid),
    paymentMethod,
    status: paid >= total && total > 0 ? 'paid' : 'issued',
    issuedBy: req.user._id,
  });

  patient.billingStatus = (invoice.status === 'paid') ? 'paid' : 'billed';
  patient.amount = invoice.total;
  patient.subtotal = subtotal;
  patient.discount = disc;
  patient.tax = taxAmt;
  patient.total = total;
  patient.paymentMethod = paymentMethod;
  await patient.save();

  await logActivity({
    req,
    action: 'generate_invoice',
    entity: 'invoice',
    entityId: invoice._id,
    details: { invoiceNumber: invoice.invoiceNumber, patient: patient.name, total },
  });

  const full = await Invoice.findById(invoice._id)
    .populate('branch', 'name address')
    .populate('department', 'name')
    .populate('issuedBy', 'name');
  res.status(201).json(new ApiResponse(201, { invoice: full }, 'Invoice generated'));
});

module.exports = { listPatients, exportPatients, revenueReport, generateInvoice };
