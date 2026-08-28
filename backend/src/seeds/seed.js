const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Doctor = require('../models/Doctor');
const Service = require('../models/Service');
const Department = require('../models/Department');
const GalleryItem = require('../models/GalleryItem');
const Testimonial = require('../models/Testimonial');
const HeroSlide = require('../models/HeroSlide');
const BlogPost = require('../models/BlogPost');
const Setting = require('../models/Setting');
const Appointment = require('../models/Appointment');
const OpRegistration = require('../models/OpRegistration');
const PageSection = require('../models/PageSection');
const ActivityLog = require('../models/ActivityLog');
const AboutImage = require('../models/AboutImage');

const MODELS = [
  User,
  Branch,
  Doctor,
  Service,
  Department,
  GalleryItem,
  Testimonial,
  HeroSlide,
  BlogPost,
  Setting,
  Appointment,
  OpRegistration,
  PageSection,
  ActivityLog,
  AboutImage,
];

const PHONE_1 = '9390098723';
const PHONE_2 = '9294002293';

const branchSeed = (name, area, extra = {}) => ({
  name,
  area,
  city: 'Hyderabad',
  phone: PHONE_1,
  whatsapp: PHONE_1,
  emergencyPhone: PHONE_2,
  workingHours: 'Mon - Sat: 9:00 AM - 9:00 PM',
  address: `Urmila Raj Hospital, ${area}, Hyderabad, Telangana - 5000xx`,
  googleMapsEmbed: `https://www.google.com/maps?q=${encodeURIComponent(area + ', Hyderabad')}&output=embed`,
  googleMapsLink: `https://maps.google.com/?q=${encodeURIComponent(area + ', Hyderabad')}`,
  isActive: true,
  ...extra,
});

const BRANCHES = [
  branchSeed('Nizampet', 'Nizampet'),
  branchSeed('Jagadgirigutta', 'Jagadgirigutta'),
  branchSeed('Kukatpally', 'Kukatpally'),
  branchSeed('Miyapur', 'Miyapur'),
  branchSeed('Bandari Layout', 'Bandari Layout'),
  branchSeed('Mallampet / Dundigal', 'Mallampet'),
  branchSeed('Dommara Pochampally', 'Dommara Pochampally'),
];

const SERVICES = [
  { name: 'Physiotherapy', icon: 'Activity', shortDescription: 'Personalised physiotherapy to restore movement, strength and quality of life.', featured: true },
  { name: 'Neurological Rehabilitation', icon: 'Brain', shortDescription: 'Specialised rehab for stroke, paralysis and neurological conditions.', featured: true },
  { name: 'Orthopaedic Rehabilitation', icon: 'Bone', shortDescription: 'Recovery programs after fractures, joint replacement and orthopaedic surgery.' },
  { name: 'Sports Injury Rehabilitation', icon: 'Dumbbell', shortDescription: 'Return-to-play programs for athletes and active individuals.' },
  { name: 'Massage Therapy', icon: 'HandHeart', shortDescription: 'Therapeutic massage for pain relief, relaxation and circulation.' },
  { name: 'Post Operative Rehabilitation', icon: 'Stethoscope', shortDescription: 'Structured recovery plans following surgery for faster healing.' },
  { name: "Women's Health Physiotherapy", icon: 'HeartHandshake', shortDescription: 'Care for pregnancy, postnatal recovery and pelvic health.' },
  { name: 'Pediatric Physiotherapy', icon: 'Baby', shortDescription: 'Gentle therapy for children with developmental and mobility concerns.' },
  { name: 'Spine & Pain Management', icon: 'Spine', shortDescription: 'Non-surgical relief for back pain, neck pain and chronic pain.' },
  { name: 'Diagnostics', icon: 'Microscope', shortDescription: 'Accurate laboratory and imaging diagnostics at your doorstep.' },
  { name: 'General Physician', icon: 'UserRound', shortDescription: 'Comprehensive consultations for everyday health concerns.' },
  { name: 'Paediatrics', icon: 'Baby', shortDescription: 'Complete child healthcare from infancy through adolescence.' },
  { name: 'Gynaecology', icon: 'HeartPulse', shortDescription: 'Complete women\u2019s health care by experienced gynaecologists.' },
  { name: 'Blood Sample Collection', icon: 'Droplets', shortDescription: 'Convenient home blood sample collection with prompt reports.' },
];

const DEPARTMENTS = [
  { name: 'General Medicine', icon: 'UserRound' },
  { name: 'Paediatrics', icon: 'Baby' },
  { name: 'Gynaecology & Obstetrics', icon: 'HeartPulse' },
  { name: 'Orthopaedics', icon: 'Bone' },
  { name: 'Physiotherapy & Rehabilitation', icon: 'Activity' },
  { name: 'General Surgery', icon: 'Stethoscope' },
  { name: 'Surgical Oncology', icon: 'Microscope' },
  { name: 'Diagnostics & Laboratory', icon: 'FlaskConical' },
];

const HERO_SLIDES = [
  {
    title: 'Compassionate Care, Advanced Medicine',
    subtitle: 'Urmila Raj Hospital',
    description: 'Best healthcare solution in Hyderabad with expert doctors, modern diagnostics and 24\u00d77 emergency support across 7 branches.',
    ctaLabel: 'Book Appointment',
    ctaHref: '/book-appointment',
    secondaryLabel: 'Online OP Registration',
    secondaryHref: '/op-registration',
    order: 1,
  },
  {
    title: 'Expert Doctors You Can Trust',
    subtitle: 'Specialists Across Every Department',
    description: 'From surgical oncology to physiotherapy, our senior specialists deliver world-class treatment with a personal touch.',
    ctaLabel: 'Meet Our Doctors',
    ctaHref: '/doctors',
    secondaryLabel: 'Book Appointment',
    secondaryHref: '/book-appointment',
    order: 2,
  },
  {
    title: '24\u00d77 Emergency & OP Care',
    subtitle: 'Always Here When You Need Us',
    description: 'Seven branches across Hyderabad ready to serve you at any hour with rapid response and compassionate teams.',
    ctaLabel: 'Contact Us',
    ctaHref: '/contact',
    secondaryLabel: 'Call Now',
    secondaryHref: 'tel:9390098723',
    order: 3,
  },
];

const TESTIMONIALS = [
  {
    patientName: 'Srinivas Reddy',
    role: 'Orthopaedic Patient',
    treatment: 'Knee Rehabilitation',
    rating: 5,
    message: 'After my knee surgery, the physiotherapy team at Urmila Raj Hospital helped me walk again in record time. Truly grateful for their care.',
    featured: true,
  },
  {
    patientName: 'Fatima Begum',
    role: 'Mother & Patient',
    treatment: 'Gynaecology',
    rating: 5,
    message: 'Dr. Mounika and her team made my entire journey comfortable and stress-free. The hospital feels clean, modern and very welcoming.',
    featured: true,
  },
  {
    patientName: 'Ramesh Kumar',
    role: 'Cardiac & General Medicine',
    treatment: 'General Physician',
    rating: 4,
    message: 'Quick consultation, thorough check-up and very reasonable pricing. The Nizampet branch is my family\u2019s first choice now.',
    featured: true,
  },
  {
    patientName: 'Anitha Rao',
    role: 'Physiotherapy Patient',
    treatment: 'Spine & Pain Management',
    rating: 5,
    message: 'Years of back pain treated with patience and expertise. Manoj sir\u2019s therapy changed my life. Highly recommended.',
  },
];

const BLOG_POSTS = [
  {
    title: '5 Simple Habits for a Healthy Spine',
    slug: 'healthy-spine-habits',
    excerpt: 'Small daily habits can protect your spine and prevent chronic back pain. Here is what our physiotherapists recommend.',
    author: 'Urmila Raj Hospital',
    tags: ['Physiotherapy', 'Wellness'],
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
  {
    title: 'When Should You See a Gynaecologist?',
    slug: 'when-to-see-gynaecologist',
    excerpt: 'Annual check-ups matter. Learn the signs and reasons to book a gynaecology consultation without delay.',
    author: 'Dr. Yerrapragada Mounika',
    tags: ['Women\u2019s Health', 'Gynaecology'],
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
  },
  {
    title: 'Recovering After Orthopaedic Surgery',
    slug: 'orthopaedic-surgery-recovery',
    excerpt: 'A guided rehabilitation plan is the key to a strong recovery after joint replacement or fracture surgery.',
    author: 'Urmila Raj Hospital',
    tags: ['Orthopaedics', 'Rehabilitation'],
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12),
  },
];

const GALLERY_CATEGORIES = ['Reception', 'Waiting Area', 'Treatment', 'Equipment'];
const GALLERY_ITEMS = [];
BRANCHES.forEach((b, bi) => {
  GALLERY_CATEGORIES.forEach((cat, ci) => {
    GALLERY_ITEMS.push({
      title: `${b.name} - ${cat}`,
      category: cat,
      type: 'image',
      isActive: true,
      order: ci + 1,
      branchName: b.name,
      color: `hsl(${(bi * 47 + ci * 91) % 360} 35% 45%)`,
    });
  });
});

const SETTINGS = [
  {
    key: 'contact.phones',
    label: 'Contact Phone Numbers',
    value: [
      { label: 'Main', number: PHONE_1 },
      { label: 'Alternate', number: PHONE_2 },
    ],
    group: 'contact',
    isPublic: true,
  },
  { key: 'contact.whatsapp', label: 'WhatsApp Number', value: PHONE_1, group: 'contact', isPublic: true },
  { key: 'contact.email', label: 'Contact Email', value: 'care@urmilarajhospital.com', group: 'contact', isPublic: true },
  { key: 'contact.address', label: 'Head Office Address', value: 'Urmila Raj Hospital, Hyderabad, Telangana, India', group: 'contact', isPublic: true },
  { key: 'emergency.phone', label: 'Emergency Helpline', value: PHONE_2, group: 'contact', isPublic: true },
  {
    key: 'social',
    label: 'Social Media Links',
    value: { facebook: '#', instagram: '#', twitter: '#', youtube: '#' },
    group: 'contact',
    isPublic: true,
  },
  {
    key: 'stats',
    label: 'Hospital Statistics',
    value: { years: 15, patients: 120000, doctors: 7, branches: 7, successRate: 98 },
    group: 'home',
    isPublic: true,
  },
  {
    key: 'home.intro',
    label: 'Home Introduction',
    value: {
      heading: 'A Hospital Built on Trust',
      subheading: 'Welcome to Urmila Raj Hospital',
      description:
        'For over a decade, Urmila Raj Hospital has been a trusted name in healthcare across Hyderabad. With seven branches, expert specialists and a patient-first culture, we bring advanced, affordable and compassionate medical care to every family.',
      points: ['24\u00d77 emergency support', '100+ expert doctors and staff', 'Advanced diagnostics and physiotherapy'],
    },
    group: 'home',
    isPublic: true,
  },
  {
    key: 'home.whyChooseUs',
    label: 'Why Choose Us',
    value: {
      heading: 'Why Patients Choose Us',
      description: 'We combine clinical excellence with genuine compassion to deliver the best outcomes.',
      items: [
        { title: 'Expert Specialists', description: 'Senior doctors across every department, available when you need them.' },
        { title: 'Advanced Diagnostics', description: 'Modern laboratory and imaging for fast, accurate results.' },
        { title: 'Affordable Care', description: 'Transparent, honest pricing with no hidden costs.' },
        { title: '7 Convenient Branches', description: 'Quality healthcare close to home, across Hyderabad.' },
        { title: 'Patient-First Culture', description: 'We listen, explain and care at every step of your journey.' },
        { title: '24\u00d77 Emergency', description: 'Rapid response teams ready around the clock.' },
      ],
    },
    group: 'home',
    isPublic: true,
  },
  {
    key: 'home.cta',
    label: 'Home CTA Banner',
    value: {
      heading: 'Need Medical Help Today?',
      description: 'Book an appointment online or call our helpline and get the care you deserve.',
      primaryLabel: 'Book Appointment',
      primaryHref: '/book-appointment',
      secondaryLabel: 'Call 9390098723',
      secondaryHref: 'tel:9390098723',
    },
    group: 'home',
    isPublic: true,
  },
  {
    key: 'seo',
    label: 'Default SEO',
    value: {
      title: 'Urmila Raj Hospital | Best Healthcare Solution in Hyderabad',
      description:
        'Urmila Raj Hospital — trusted multi-speciality hospital in Hyderabad with 7 branches, expert doctors, physiotherapy, diagnostics and 24\u00d77 emergency care.',
      keywords: 'hospital hyderabad, physiotherapy, orthopaedics, gynaecology, urmila raj hospital',
    },
    group: 'seo',
    isPublic: false,
  },
];

const seed = async (reset = false) => {
  if (reset) {
    await Promise.all(MODELS.map((M) => M.deleteMany({})));
    console.log('[SEED] Database cleared');
  }

  const superAdmin = await User.create({
    name: env.superAdmin.name,
    email: env.superAdmin.email,
    mobileNumber: env.superAdmin.mobile,
    username: 'superadmin',
    role: 'superAdmin',
    password: env.superAdmin.password,
  });
  console.log('[SEED] Super admin created');

  await User.create([
    { name: 'Primary Admin', email: 'primaryadmin@urmilarajhospital.com', mobileNumber: '9294002293', username: 'admin', role: 'superAdmin', password: 'admin' },
    { name: 'Hospital Admin', email: 'admin@urmilarajhospital.com', mobileNumber: '9294002293', role: 'admin', password: 'Admin@2026' },
    { name: 'Content Editor', email: 'editor@urmilarajhospital.com', mobileNumber: '9848012345', username: 'contenteditor', role: 'contentEditor', password: 'Editor@2026' },
    { name: 'Reception Desk', email: 'reception@urmilarajhospital.com', mobileNumber: '9000111222', username: 'staff', role: 'receptionist', password: '2026' },
  ]);

  const branches = await Branch.create(BRANCHES);
  console.log(`[SEED] ${branches.length} branches created`);

  const doctorsData = [
    { name: 'Dr. Koteswara Rao', designation: 'Consultant Surgical Oncologist', qualifications: ['MBBS', 'DNB', 'DrNB'], specialization: 'Surgical Oncology', experience: '20+ years', consultationTimings: 'Mon - Sat: 10:00 AM - 2:00 PM', branches: [0, 1, 2], featured: true },
    { name: 'Dr. S. Pramod', designation: 'General Physician', qualifications: ['MBBS', 'MD'], specialization: 'General Medicine', experience: '15+ years', consultationTimings: 'Mon - Sat: 9:00 AM - 6:00 PM', branches: [0, 2, 3], featured: true },
    { name: 'Dr. Yerrapragada Mounika', designation: 'Consultant Gynaecologist', qualifications: ['MBBS', 'MS (OBG)'], specialization: 'Gynaecology & Obstetrics', experience: '12+ years', consultationTimings: 'Mon - Sat: 11:00 AM - 4:00 PM', branches: [0, 4, 6], featured: true },
    { name: 'Dr. Rentala Naveen', designation: 'Consultant Paediatrician', qualifications: ['MBBS', 'MD Paediatrics'], specialization: 'Paediatrics', experience: '10+ years', consultationTimings: 'Mon - Sat: 10:00 AM - 5:00 PM', branches: [0, 1, 5], featured: true },
    { name: 'Dr. G Hari Krishna', designation: 'Consultant Orthopaedic Surgeon', qualifications: ['MBBS', 'MS Orthopaedics'], specialization: 'Orthopaedics', experience: '14+ years', consultationTimings: 'Mon - Sat: 11:00 AM - 3:00 PM', branches: [0, 3, 6], featured: true },
    { name: 'Dr. Mahadevi', designation: 'Ayurveda Consultant (Lady Doctor)', qualifications: ['AYU'], specialization: 'Piles, Fissure & Fistula', experience: '10+ years', consultationTimings: 'Mon - Sat: 10:00 AM - 6:00 PM', branches: [0, 2], featured: false, about: 'Specialised ayurvedic treatment for piles, fissure and fistula with gentle, natural methods.' },
    { name: 'Manoj Kumar', designation: 'Senior Physiotherapist', qualifications: ['MLT', 'BPT'], specialization: 'Physiotherapy & Rehabilitation', experience: '12+ years', consultationTimings: '24\u00d77 Available', available247: true, branches: [0, 1, 2, 3, 4, 5, 6], featured: true },
  ];

  const doctors = await Doctor.create(
    doctorsData.map((d) => ({
      ...d,
      branches: d.branches.map((i) => branches[i]._id),
    }))
  );
  console.log(`[SEED] ${doctors.length} doctors created`);

  await Service.create(SERVICES);
  await Department.create(DEPARTMENTS);
  await HeroSlide.create(HERO_SLIDES);
  await Testimonial.create(TESTIMONIALS);
  await BlogPost.create(BLOG_POSTS);

  await Promise.all(
    GALLERY_ITEMS.map(async (g) => {
      const branch = branches.find((b) => b.name === g.branchName);
      const { branchName, color, ...rest } = g;
      return GalleryItem.create({ ...rest, branch: branch ? branch._id : undefined });
    })
  );
  console.log(`[SEED] ${GALLERY_ITEMS.length} gallery items created`);

  await Setting.create(SETTINGS);

  await AboutImage.create([
    { title: 'Our Hospital Building', caption: 'State-of-the-art facility at Nizampet', order: 1, isActive: true },
    { title: 'Advanced Diagnostics', caption: 'Modern lab and imaging services', order: 2, isActive: true },
    { title: 'Caring Staff', caption: 'Dedicated doctors and support team', order: 3, isActive: true },
  ]);
  console.log('[SEED] About images created');

  await ActivityLog.create({
    user: superAdmin._id,
    userName: superAdmin.name,
    action: 'seed',
    entity: 'system',
    details: { note: 'Database seeded' },
  });

  console.log('[SEED] Done!\n');
  console.log('=== Login Credentials ===');
  console.log(`Super Admin   : ${env.superAdmin.email} / ${env.superAdmin.password}`);
  console.log('Admin         : admin@urmilarajhospital.com / Admin@2026');
  console.log('Content Editor: editor@urmilarajhospital.com / Editor@2026');
  console.log('Receptionist  : reception@urmilarajhospital.com / Reception@2026');
  console.log('==========================\n');
};

const run = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    const reset = process.argv.includes('--reset');
    await seed(reset);
    await mongoose.disconnect();
  } catch (err) {
    console.error('[SEED] Error:', err);
    process.exit(1);
  }
};

run();
