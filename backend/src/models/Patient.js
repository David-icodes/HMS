const mongoose = require('mongoose');
const { nextSequence } = require('./Counter');

const patientSchema = new mongoose.Schema(
  {
    uhid: { type: String, unique: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    mobile: { type: String, required: true, trim: true },
    age: { type: Number, min: 0, max: 130 },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
    // C/H = Clinic / Home (free text on purpose: no enum so legacy values remain safe)
    cH: { type: String, trim: true },
    // F/N = Follow / Not Follow
    fN: { type: String, enum: ['Follow', 'Not Follow', ''], default: '' },
    address: { type: String, trim: true, maxlength: 300 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Staff name snapshot so reports keep working if the user record is later removed.
    createdByName: { type: String, trim: true },
    // Admin → Staff registry reference (from the signature / attendant autocomplete).
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  },
  { timestamps: true }
);

patientSchema.index({ mobile: 1 });
patientSchema.index({ name: 1 });

async function generateUhid() {
  if (this.uhid) return;
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const seq = await nextSequence(`patient-uhid-${ymd}`);
  this.uhid = `URH-${ymd}-${String(seq).padStart(4, '0')}`;
}

patientSchema.pre('save', async function (next) {
  try {
    await generateUhid.call(this);
    next();
  } catch (err) {
    next(err);
  }
});

const Patient = mongoose.model('Patient', patientSchema);
module.exports = Patient;
