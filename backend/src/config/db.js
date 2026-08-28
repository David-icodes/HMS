const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  const conn = await mongoose.connect(env.mongoUri);
  console.log(`[DB] MongoDB connected: ${conn.connection.host}`);
  return conn;
};

module.exports = connectDB;
