const mongoose = require('mongoose');
const { nextSequence } = require('./Counter');

const courseSchema = new mongoose.Schema(
  {
    courseNo: { type: String, unique: true, trim: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    patientName: { type: String, trim: true },
    treatment: { type: String, trim: true, maxlength: 500 },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    totalDays: { type: Number, min: 1, default: 1 },
    dayNumber: { type: Number, min: 1, default: 1 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    courseAmount: { type: Number, default: 0, min: 0 },
    additionalCharges: { type: Number, default: 0, min: 0 },
    paid: { type: Number, default: 0, min: 0 },
    due: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['Active', 'Completed', 'Cancelled'], default: 'Active' },
    notes: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

courseSchema.index({ patient: 1, status: 1, createdAt: -1 });
courseSchema.index({ branch: 1, createdAt: -1 });
courseSchema.index({ status: 1, createdAt: -1 });

async function generateCourseNo() {
  if (this.courseNo) return;
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const seq = await nextSequence(`course-${ymd}`);
  this.courseNo = `CRS-${String(seq).padStart(4, '0')}-${ymd}`;
}

courseSchema.pre('save', async function (next) {
  try {
    await generateCourseNo.call(this);
    next();
  } catch (err) {
    next(err);
  }
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;