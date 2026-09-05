const mongoose = require('mongoose');
const { nextSequence } = require('./Counter');

const homeVisitSchema = new mongoose.Schema(
  {
    serialNo: { type: Number, unique: true },
    patientName: { type: String, required: true, trim: true },
    diagnosis: { type: String, trim: true, maxlength: 500 },
    location: { type: String, trim: true, maxlength: 300 },
    timing: { type: String, trim: true },
    contact: { type: String, trim: true },
    attendance: { type: String, trim: true },
    reason: { type: String, trim: true, maxlength: 500 },
    perSession: { type: Number, default: 0, min: 0 },
    sessions: { type: Number, default: 1, min: 1 },
    total: { type: Number, default: 0, min: 0 },
    advance: { type: Number, default: 0, min: 0 },
    due: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, trim: true, default: '' },
    paymentStatus: { type: String, enum: ['Paid', 'Partial', 'Due'], default: 'Due' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    therapist: { type: String, trim: true },
    referralDoctor: { type: String, trim: true, default: '' },
    staffInTime: { type: String, trim: true, default: '' },
    staffOutTime: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    invoiceNumber: { type: String, trim: true },
  },
  { timestamps: true }
);

homeVisitSchema.index({ branch: 1, createdAt: -1 });
homeVisitSchema.index({ patientName: 1 });

async function generateSerial() {
  if (this.serialNo) return;
  // Sequential S.No. across all home-visit records (independent of the OP/UHID counter).
  const seq = await nextSequence('home-visit-serial');
  this.serialNo = seq;
}

homeVisitSchema.pre('save', async function (next) {
  try {
    await generateSerial.call(this);
    next();
  } catch (err) {
    next(err);
  }
});

const HomeVisit = mongoose.model('HomeVisit', homeVisitSchema);
module.exports = HomeVisit;
