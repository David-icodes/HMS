const User = require('../models/User');
const Branch = require('../models/Branch');
const Department = require('../models/Department');
const Service = require('../models/Service');
const PaymentMethod = require('../models/PaymentMethod');

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
  try {
    await seedMasterData();
  } catch (err) {
    console.error('[PROVISION] Master data seed failed:', err.message);
  }
  return created;
};

const PAYMENT_METHODS = [
  { name: 'Hevanthi GPay', description: 'UPI via Hevanthi GPay account' },
  { name: 'Hevanthi Pay', description: 'Pay app via Hevanthi account' },
  { name: 'Current Account', description: 'Bank current account transfer' },
  { name: 'Cash', description: 'Cash payment' },
  { name: 'UPI', description: 'Other UPI / GPay / PhonePe' },
  { name: 'Other', description: 'Other payment method' },
];

const MASTER_BRANCHES = [
  {
    name: 'Nizampet Branch',
    area: 'Nizampet',
    address:
      'H. No. 3/147/200/P/910G2, Nizampet Village, Main Road, Near SBI Bank, Behind Bata Showroom, Hyderabad – 500090',
    phone: '8977210888',
    whatsapp: '8977210888',
    city: 'Hyderabad',
  },
  { name: 'Jagadgirigutta Branch', area: 'Jagadgirigutta', address: '', phone: '9441598723', whatsapp: '9441598723', city: 'Hyderabad' },
  { name: 'Bandari Layout Branch', area: 'Bandari Layout', address: '', phone: '9441534125', whatsapp: '9441534125', city: 'Hyderabad' },
  { name: 'Mallampet Branch', area: 'Mallampet', address: '', phone: '9676698723', whatsapp: '9676698723', city: 'Hyderabad' },
  { name: 'Gandimaisamma Branch', area: 'Gandimaisamma', address: '', phone: '7995498723', whatsapp: '7995498723', city: 'Hyderabad' },
  { name: 'Miyapur Branch', area: 'Miyapur', address: '', phone: '8977210888', whatsapp: '8977210888', city: 'Hyderabad' },
];

const MASTER_DEPARTMENTS = [
  'General Physician',
  'Gynaecologist',
  'Pediatrician',
  'Orthopedic',
  'Pharmacy',
  'Physiotherapy',
  'Gen. Cancer Surgeon',
  'Lab – Diagnostic',
  'Nursing Care',
  'Bedside Assistance',
];

const PHYSIO_SERVICES = [
  'Stroke (Paralysis)',
  'Obesity',
  'Back Pain',
  'Neck Pain',
  'Shoulder Pain',
  "Bell's Palsy",
  'Frozen Shoulder',
  'Arthritis',
  'Carpal Tunnel Syndrome',
  'Chronic Pain Syndrome',
  'Sports Injury',
  "Parkinson's Disease",
  'Multiple Sclerosis (MS)',
  'Tennis Elbow',
  "Golfer's Elbow",
];

const upsertByKey = async (Model, list, make) => {
  let created = 0;
  for (const entry of list) {
    const data = make ? make(entry) : entry;
    const key = { slug: (data.name || data.key || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') };
    const exists = await Model.findOne(key);
    if (!exists) {
      await Model.create(data);
      created += 1;
    }
  }
  return created;
};

const upsertBranches = async (list) => {
  let created = 0;
  for (const data of list) {
    const existing = await Branch.findOne({ name: new RegExp('^' + data.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
    if (!existing) {
      await Branch.create(data);
      created += 1;
    } else {
      // update contact / address details so masters stay in sync
      const patch = {};
      if (data.address) patch.address = data.address;
      if (data.phone) patch.phone = data.phone;
      if (data.whatsapp) patch.whatsapp = data.whatsapp;
      if (data.area && !existing.area) patch.area = data.area;
      if (Object.keys(patch).length) await Branch.updateOne({ _id: existing._id }, { $set: patch });
    }
  }
  return created;
};

const seedMasterData = async () => {
  const results = {
    paymentMethods: await upsertByKey(PaymentMethod, PAYMENT_METHODS),
    branches: await upsertBranches(MASTER_BRANCHES),
    departments: await upsertByKey(
      Department,
      MASTER_DEPARTMENTS.map((n) => ({ name: n, shortDescription: `${n} department` }))
    ),
    services: await upsertByKey(Service, PHYSIO_SERVICES.map((n) => ({ name: n, shortDescription: n }))),
  };
  console.log('[PROVISION] Master data:', JSON.stringify(results));
  return results;
};

module.exports = provision;
module.exports.seedMasterData = seedMasterData;
