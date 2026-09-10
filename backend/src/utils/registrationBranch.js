const mongoose = require('mongoose');
const Visit = require('../models/Visit');
const Patient = require('../models/Patient');

// Canonical branch attribution for a patient registration.
//
// A Patient record is ONE registration. The branch where that registration
// happened is the branch of the patient's chronologically first "New OP" visit
// (the registration visit). This single attribution is the source of truth for
// BOTH the Admin Patients branch filter and the Branch Reports patient counts,
// so the two views always agree: a new registration increments the branch count,
// an archived (deleted) registration drops out of both, and follow-ups / course
// days / payments / visits never multiply the count.

const HOME_CH = /^\s*home\s*$/i;

// The visit that created the registration: the chronologically FIRST "New OP"
// visit of the patient that carries a branch. Grouped GLOBALLY (no branch pre-
// filter) so the $first is truly the registration visit — a later New OP at a
// different branch never re-attributes the patient.
const registrationStage = [
  {
    $match: {
      visitType: 'New OP',
      branch: { $ne: null },
      patient: { $ne: null },
    },
  },
  { $sort: { createdAt: 1, _id: 1 } },
  { $group: { _id: '$patient', branch: { $first: '$branch' } } },
];

const isHomeExpr = { $in: [{ $toLower: { $trim: { input: { $ifNull: ['$doc.cH', ''] } } } }, ['home']] };

// Counts per branch of ACTIVE registrations (optionally within a createdAt
// window). Returns Map<branchId, { patients, clinic, home }>.
const registrationCountsByBranch = async (range = {}) => {
  const rows = await Visit.aggregate([
    ...registrationStage,
    { $lookup: { from: 'patients', localField: '_id', foreignField: '_id', as: 'doc' } },
    { $unwind: '$doc' },
    {
      $match: {
        'doc.isArchived': { $ne: true },
        ...(range.$gte || range.$lte ? { 'doc.createdAt': range } : {}),
      },
    },
    {
      $group: {
        _id: '$branch',
        patients: { $sum: 1 },
        clinic: { $sum: { $cond: [isHomeExpr, 0, 1] } },
        home: { $sum: { $cond: [isHomeExpr, 1, 0] } },
      },
    },
  ]);
  const out = new Map();
  rows.forEach((r) => out.set(r._id.toString(), { patients: r.patients, clinic: r.clinic, home: r.home }));
  return out;
};

// OBJECT IDs of active registrations attributed to one branch. The branch is
// filtered on the attribution result (never pre-matched), so this set EXACTLY
// matches the branch listed in registrationCountsByBranch: Admin Patients'
// branch filter and Branch Reports always agree.
const patientIdsByRegistrationBranch = async (branchId) => {
  if (!mongoose.isValidObjectId(branchId)) return [];
  const rows = await Visit.aggregate([
    ...registrationStage,
    { $match: { branch: new mongoose.Types.ObjectId(branchId) } },
    { $lookup: { from: 'patients', localField: '_id', foreignField: '_id', as: 'doc' } },
    { $unwind: '$doc' },
    { $match: { 'doc.isArchived': { $ne: true } } },
  ]);
  return rows.map((r) => r._id);
};

module.exports = { registrationCountsByBranch, patientIdsByRegistrationBranch, HOME_CH };