const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    qty: { type: Number, default: 1, min: 0 },
    rate: { type: Number, default: 0, min: 0 },
    amount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, trim: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'OpRegistration' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    patientName: { type: String, required: true, trim: true },
    patientMobile: { type: String, required: true, trim: true },
    patientAddress: { type: String, trim: true },
    opdNumber: { type: String, trim: true },
    items: { type: [invoiceItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    // Free text on purpose: payment methods come from the configurable PaymentMethod
    // master (e.g. "Manoj GPay", "Cash", "UPI") and must not be restricted to a static enum.
    paymentMethod: { type: String, default: 'pending', trim: true },
    status: { type: String, enum: ['draft', 'issued', 'paid', 'cancelled'], default: 'draft' },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

invoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const Invoice = mongoose.model('Invoice');
    const count = await Invoice.countDocuments({
      invoiceNumber: new RegExp(`^URH-INV-${ymd}-`),
    });
    this.invoiceNumber = `URH-INV-${ymd}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;
