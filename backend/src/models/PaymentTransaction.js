const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
    homeVisitId: { type: mongoose.Schema.Types.ObjectId, ref: 'HomeVisit' },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, trim: true },
    paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod' },
    paymentDate: { type: Date, default: Date.now },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    note: { type: String, trim: true, maxlength: 300 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ patientId: 1, paymentDate: -1 });
paymentTransactionSchema.index({ courseId: 1, paymentDate: -1 });
paymentTransactionSchema.index({ branchId: 1, paymentDate: -1 });
paymentTransactionSchema.index({ paymentDate: 1 });

const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);
module.exports = PaymentTransaction;