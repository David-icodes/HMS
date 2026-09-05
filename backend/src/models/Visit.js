const mongoose = require('mongoose');
const { nextSequence } = require('./Counter');

const chargesSchema = new mongoose.Schema(
  {
    opConsultation: { type: Number, default: 0, min: 0 },
    pharmacy: { type: Number, default: 0, min: 0 },
    lab: { type: Number, default: 0, min: 0 },
    otherCharges: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    advanced: { type: Number, default: 0, min: 0 },
    method: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod' },
    methodName: { type: String, trim: true },
    due: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['Paid', 'Partial', 'Due'], default: 'Due' },
  },
  { _id: false }
);

const visitSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    uhid: { type: String, trim: true },
    visitDate: { type: Date, default: Date.now },
    visitType: { type: String, enum: ['New OP', 'Follow-up'], default: 'New OP' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    referralDoctor: { type: String, trim: true, default: '' },
    opNumber: { type: String, unique: true, trim: true },
    concern: { type: String, trim: true, maxlength: 500 },
    diagnosis: { type: String, trim: true, maxlength: 500 },
    treatment: { type: String, trim: true, maxlength: 500 },
    noOfDays: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true, maxlength: 500 },
    charges: { type: chargesSchema, default: () => ({}) },
    payment: { type: paymentSchema, default: () => ({}) },
    invoiceNumber: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    signature: { type: String, trim: true },
    // Optional course linkage: follow-up visits belong to a Course and never create
    // a new billing event on their own (billing is the course + explicit add-ons).
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    dayNumber: { type: Number, min: 1 },
    totalDays: { type: Number, min: 1 },
  },
  { timestamps: true }
);

visitSchema.index({ patient: 1, visitDate: -1 });
visitSchema.index({ branch: 1, visitDate: -1 });
visitSchema.index({ uhid: 1 });

async function generateOpNumber() {
  if (this.opNumber) return;
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const seq = await nextSequence(`visit-op-${ymd}`);
  this.opNumber = `OP-${String(seq).padStart(4, '0')}-${ymd}`;
}

visitSchema.pre('save', async function (next) {
  try {
    await generateOpNumber.call(this);
    next();
  } catch (err) {
    next(err);
  }
});

const Visit = mongoose.model('Visit', visitSchema);
module.exports = Visit;
