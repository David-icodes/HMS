export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string>[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface HeroSlide {
  _id: string;
  title: string;
  subtitle: string;
  description: string;
  image?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  isActive: boolean;
  order: number;
}

export interface Branch {
  _id: string;
  name: string;
  slug: string;
  code?: string;
  address: string;
  area: string;
  city: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  workingHours?: string;
  emergencyPhone?: string;
  googleMapsEmbed?: string;
  googleMapsLink?: string;
  image?: string;
  description?: string;
  isActive: boolean;
  order: number;
  doctors?: Doctor[];
}

export interface Doctor {
  _id: string;
  name: string;
  slug: string;
  photo?: string;
  designation?: string;
  qualifications: string[];
  specialization: string;
  experience?: string;
  about?: string;
  consultationTimings?: string;
  available247?: boolean;
  featured?: boolean;
  department?: string | { _id: string; name: string } | null;
  branches: Branch[];
  isActive: boolean;
  order: number;
}

export interface Service {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  shortDescription: string;
  description: string;
  image?: string;
  featured?: boolean;
  isActive: boolean;
  order: number;
}

export interface Department {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  shortDescription?: string;
  description: string;
  image?: string;
  isActive: boolean;
  order: number;
}

export interface GalleryItem {
  _id: string;
  title: string;
  category?: string;
  branch?: string | { _id: string; name?: string; slug?: string };
  type: 'photo' | 'video' | 'facility' | 'event';
  image?: string;
  videoUrl?: string;
  isActive: boolean;
  order: number;
}

export interface Testimonial {
  _id: string;
  patientName: string;
  role?: string;
  treatment?: string;
  rating: number;
  message: string;
  photo?: string;
  videoUrl?: string;
  featured?: boolean;
  isActive: boolean;
  order: number;
}

export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image?: string;
  author?: string;
  tags?: string[];
  isActive: boolean;
  publishedAt: string;
}

export interface Appointment {
  _id: string;
  branch?: string | { _id: string; name?: string } | null;
  doctor?: string | { _id: string; name?: string } | null;
  name: string;
  mobile: string;
  date?: string;
  time?: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  source?: string;
  createdAt: string;
}

export interface OpRegistration {
  _id: string;
  branch?: string | { _id: string; name?: string } | null;
  department?: string | { _id: string; name?: string } | null;
  name: string;
  mobile: string;
  age?: number;
  gender?: string;
  address?: string;
  concern?: string;
  preferredDate?: string;
  status: 'registered' | 'in-consultation' | 'completed' | 'cancelled';
  source?: string;
  opdNumber?: string;
  createdAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  username?: string;
  mobileNumber?: string;
  role: 'superAdmin' | 'admin' | 'receptionist' | 'contentEditor';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AboutImage {
  _id: string;
  title?: string;
  caption?: string;
  image?: string;
  order: number;
  isActive: boolean;
}

export interface InvoiceItem {
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  patient?: string | { _id: string; name: string; mobile: string; opdNumber: string } | null;
  branch?: { _id: string; name: string; address?: string; phone?: string } | null;
  department?: { _id: string; name: string } | null;
  patientName: string;
  patientMobile: string;
  patientAddress?: string;
  opdNumber?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'insurance' | 'other' | 'pending';
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  issuedBy?: { _id: string; name: string } | null;
  notes?: string;
  createdAt: string;
}

export interface ActivityLog {
  _id: string;
  user?: { _id: string; name: string; email: string } | null;
  action: string;
  module: string;
  details?: string;
  ip?: string;
  createdAt: string;
}

export interface StatSummary {
  totalAppointments: number;
  totalOp: number;
  totalDoctors: number;
  totalBranches: number;
  totalUsers: number;
  pendingAppointments: number;
  pendingOp: number;
  todayAppointments: number;
  todayOp: number;
  totalBlogs: number;
  totalServices: number;
}

export interface DashboardData {
  stats: StatSummary;
  recentAppointments: Appointment[];
  recentOp: OpRegistration[];
  appointmentTrend: { date: string; count: number }[];
  opTrend: { date: string; count: number }[];
  branchDistribution: { name: string; value: number }[];
  departmentDistribution: { name: string; value: number }[];
}

export interface ContentModuleMeta {
  key: string;
  label: string;
  singular: string;
  description: string;
  icon: string;
  role: string[];
}

export interface PaymentMethod {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  order: number;
}

export interface Patient {
  _id: string;
  uhid: string;
  name: string;
  mobile: string;
  age?: number;
  gender: 'Male' | 'Female' | 'Other';
  cH?: string;
  fN?: string;
  address?: string;
  createdAt: string;
  lastVisit?: Visit | null;
  visitCount?: number;
  outstanding?: number;
}

export interface VisitCharges {
  opConsultation: number;
  pharmacy: number;
  lab: number;
  otherCharges: number;
  discount: number;
  tax: number;
  total: number;
}

export interface VisitPayment {
  advanced: number;
  method?: string | { _id: string; name: string } | null;
  methodName?: string;
  due: number;
  status: 'Paid' | 'Partial' | 'Due';
}

export interface Visit {
  _id: string;
  patient: string | { _id: string; uhid: string; name: string; mobile: string; age?: number; gender?: string; cH?: string; fN?: string; address?: string };
  uhid?: string;
  visitDate: string;
  visitType: 'New OP' | 'Follow-up';
  branch?: { _id: string; name: string; address?: string; area?: string; city?: string; phone?: string } | null;
  department?: { _id: string; name: string; slug?: string } | null;
  doctor?: { _id: string; name: string; designation?: string } | null;
  referralDoctor?: string;
  opNumber?: string;
  concern?: string;
  diagnosis?: string;
  treatment?: string;
  noOfDays: number;
  notes?: string;
  charges: VisitCharges;
  payment: VisitPayment;
  invoiceNumber?: string;
  createdBy?: { _id: string; name: string } | null;
  signature?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface HomeVisit {
  _id: string;
  serialNo?: number;
  patientName: string;
  diagnosis?: string;
  location?: string;
  timing?: string;
  contact?: string;
  attendance?: string;
  reason?: string;
  perSession: number;
  advance: number;
  due: number;
  branch?: { _id: string; name: string } | null;
  therapist?: string;
  referralDoctor?: string;
  staffInTime?: string;
  staffOutTime?: string;
  createdAt: string;
}
