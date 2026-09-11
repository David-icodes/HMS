const mongoose = require('mongoose');
const Visit = require('../models/Visit');
const Patient = require('../models/Patient');

// Canonical branch attribution for a patient registration.
//
// A Patient record is ONE registration. The branch where that registration
// happened is the branch of the patient's earliest visit that carries a branch
// (the registration visit), PREFERRING a "New OP" visit when one exists so an
// early admin recording / follow-up at a first branch never misattributes a
// patient whose real registration visit is a later New OP. This single
// attribution is the source of truth for BOTH the Admin Patients branch filter
// and the Branch Reports patient counts, so the two views always agree: a new
// registration increments the branch count, an archived (deleted) registration
// drops out of both, and follow-ups / course days / payments / visits never
// multiply the count.

const HOME_CH = /^\s*home\s*$/i;

// The visit that created the registration: the earliest visit of the patient
// carrying a branch. "New OP" visits rank first so the true registration visit
// wins over an earlier stray Follow-up; among equal ranks the chronologically
// earliest wins. Grouped GLOBALLY (no branch pre-filter) so the $first is truly
// the registration visit — a later visit at a different branch never re-
// attributes the patient.
const registrationStage = [
  {
    $match: {
      branch: { $ne: null },
      patient: { $ne: null },
    },
  },
  {
    $addFields: {
      __regPrio: { $cond: [{ $eq: ['$visitType', 'New OP'] }, 0, 1] },
    },
  },
  { $sort: { __regPrio: 1, createdAt: 1, _id: 1 } },
  { $group: { _id: '$patient', branch: { $first: '$branch' } } },
];

const isHomeExpr = { $in: [{ $toLower: { $trim: { input: { $ifNull: ['$doc.cH', ''] } } } }, ['home']] };

// ONE aggregation that returns, per branch of ACTIVE registrations (optionally
// within a createdAt window):
//   counts       Map<branchId, { patients, clinic, home }>
//   idsByBranch  Map<branchId, ObjectId[]>
//   attribution  Map<patientId, branchId>
// The patient set produced here is the SINGLE source of truth for BOTH the
// branch patient counts AND the branch financial figures: money is restricted
// to these same patients in branchFinancialMap, so a deleted (archived)
// registration drops out of BOTH Patients and Revenue/Paid/Due together.
const registrationDataByBranch = async (range = {}) => {
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
        ids: { $push: '$_id' },
      },
    },
  ]);
  const counts = new Map();
  const idsByBranch = new Map();
  const attribution = new Map();
  rows.forEach((r) => {
    const key = r._id.toString();
    counts.set(key, { patients: r.patients, clinic: r.clinic, home: r.home });
    idsByBranch.set(key, r.ids);
    r.ids.forEach((id) => attribution.set(id.toString(), key));
  });
  return { counts, idsByBranch, attribution };
};

// Counts per branch of ACTIVE registrations (optionally within a createdAt
// window). Returns Map<branchId, { patients, clinic, home }>.
const registrationCountsByBranch = async (range = {}) => (await registrationDataByBranch(range)).counts;

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

module.exports = { registrationCountsByBranch, registrationDataByBranch, patientIdsByRegistrationBranch, HOME_CH };