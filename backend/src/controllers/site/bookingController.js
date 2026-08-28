const Appointment = require('../../models/Appointment');
const OpRegistration = require('../../models/OpRegistration');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const bookAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.create({ ...req.body, source: 'website' });
  res.status(201).json(
    new ApiResponse(201, { appointment }, 'Appointment request received. Our team will confirm shortly.')
  );
});

const registerOp = asyncHandler(async (req, res) => {
  const registration = await OpRegistration.create({ ...req.body, source: 'website' });
  res.status(201).json(
    new ApiResponse(
      201,
      { registration },
      `Registration successful. Your OP number is ${registration.opdNumber}.`
    )
  );
});

module.exports = { bookAppointment, registerOp };
