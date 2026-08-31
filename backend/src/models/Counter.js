const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Atomically reserve the next sequence value for a given key.
 * Uses an upsert findOneAndUpdate so concurrent requests never get duplicates.
 */
const nextSequence = async (key) => {
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc.seq;
};

module.exports = Counter;
module.exports.nextSequence = nextSequence;
