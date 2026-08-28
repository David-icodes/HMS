const User = require('../models/User');

const DEFAULT_ACCOUNTS = [
  {
    username: 'admin',
    role: 'superAdmin',
    name: 'Primary Admin',
    email: 'primaryadmin@urmilarajhospital.com',
    mobileNumber: '9294002293',
  },
  {
    username: 'staff',
    role: 'receptionist',
    name: 'Hospital Staff',
    email: 'staff@urmilarajhospital.com',
    mobileNumber: '9000111222',
  },
];

const provision = async () => {
  const created = [];
  for (const acct of DEFAULT_ACCOUNTS) {
    try {
      const existing = await User.findOne({ username: acct.username });
      if (!existing) {
        const password =
          acct.username === 'admin'
            ? process.env.ADMIN_PASSWORD || 'admin'
            : process.env.STAFF_PASSWORD || '2026';
        await User.create({
          name: acct.name,
          email: acct.email,
          mobileNumber: acct.mobileNumber,
          username: acct.username,
          role: acct.role,
          password,
        });
        created.push(acct.username);
        console.log(`[PROVISION] Created ${acct.username} account`);
      }
    } catch (err) {
      if (err && err.code === 11000) {
        console.log(`[PROVISION] ${acct.username} already exists (skipped)`);
      } else {
        console.error(`[PROVISION] Failed to create ${acct.username}:`, err.message);
      }
    }
  }
  console.log(
    `[PROVISION] Done. Usernames: admin -> 'admin'/'${process.env.ADMIN_PASSWORD || 'admin'}', staff -> 'staff'/'${process.env.STAFF_PASSWORD || '2026'}'`
  );
  return created;
};

module.exports = provision;
