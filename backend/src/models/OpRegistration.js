const mongoose = require('mongoose');

const opRegistrationSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    age: { type: Number, min: 0, max: 130 },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    address: { type: String, trim: true },
    concern: { type: String, trim: true },
    preferredDate: { type: String, trim: true },
    status: { type: String, enum: ['new', 'registered', 'in-progress', 'completed', 'cancelled'], default: 'new' },
    source: { type: String, enum: ['website', 'admin'], default: 'website' },
    opdNumber: { type: String, trim: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'insurance', 'other', 'pending'],
      default: 'pending',
    },
    amount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    billingStatus: { type: String, enum: ['unbilled', 'billed', 'paid'], default: 'unbilled' },
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

opRegistrationSchema.pre('save', async function (next) {
  if (!this.opdNumber) {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const OpRegistration = mongoose.model('OpRegistration');
    const count = await OpRegistration.countDocuments({
      opdNumber: new RegExp(`^URH-${ymd}-`),
    });
    this.opdNumber = `URH-${ymd}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const OpRegistration = mongoose.model('OpRegistration', opRegistrationSchema);
module.exports = OpRegistration;
