const Setting = require('../../models/Setting');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const recordVisit = asyncHandler(async (req, res) => {
  const day = new Date().toISOString().slice(0, 10);

  await Setting.updateOne({ key: 'visits.total' }, { $inc: { value: 1 } }, { upsert: true });

  const today = await Setting.findOne({ key: 'visits.today' });
  if (today && today.value && today.value.day === day) {
    today.value.count = (today.value.count || 0) + 1;
    await today.save();
  } else {
    await Setting.updateOne(
      { key: 'visits.today' },
      { $set: { value: { day, count: 1 } } },
      { upsert: true }
    );
  }

  res.status(200).json(new ApiResponse(200, null, 'Visit recorded'));
});

module.exports = { recordVisit };
