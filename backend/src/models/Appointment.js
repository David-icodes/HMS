const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    date: { type: String, trim: true },
    time: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
    source: { type: String, enum: ['website', 'admin', 'whatsapp'], default: 'website' },
  },
  { timestamps: true }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment;
