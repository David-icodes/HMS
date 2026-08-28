import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  CalendarCheck,
  Ticket,
  Image as ImageIcon,
  Users,
  Stethoscope,
  Briefcase,
  Building2,
  Star,
  FileText,
  Layers,
  Activity as ActivityIcon,
  UserCog,
  Settings as SettingsIcon,
  HeartPulse,
  Landmark,
  Receipt,
} from 'lucide-react';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'image'
  | 'icon';

export interface ModuleField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  ref?: 'branches' | 'doctors' | 'departments';
  colSpan?: 1 | 2;
  textareaRows?: number;
  help?: string;
}

export interface ModuleColumn {
  key: string;
  label: string;
  type?: 'text' | 'badge' | 'boolean' | 'date' | 'datetime' | 'reference' | 'status';
}

export interface ModuleConfig {
  key: string;
  label: string;
  singular: string;
  description: string;
  icon: LucideIcon;
  category: 'content' | 'appointments' | 'op' | 'settings' | 'users' | 'activity' | 'dashboard';
  statusField: string | null;
  columns: ModuleColumn[];
  fields: ModuleField[];
}

const ICON_OPTIONS = [
  'Activity', 'Ambulance', 'Baby', 'Bandage', 'Bone', 'Brain', 'ClipboardPlus', 'Clock3',
  'Dna', 'Droplets', 'Ear', 'Eye', 'FlaskConical', 'Heart', 'HeartPulse', 'Hospital',
  'Microscope', 'Pill', 'Plus', 'Scan', 'ShieldPlus', 'Stethoscope', 'Syringe', 'TestTubes',
  'Thermometer', 'UserRound', 'Utensils', 'BabyIcon', 'Zap', 'Sparkles',
].map((v) => ({ value: v, label: v }));

const APPOINTMENT_STATUS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const OP_STATUS = [
  { value: 'registered', label: 'Registered' },
  { value: 'in-consultation', label: 'In Consultation' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const GALLERY_TYPES = [
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Video' },
  { value: 'facility', label: 'Facility' },
  { value: 'event', label: 'Event' },
];

export const MODULES: Record<string, ModuleConfig> = {
  heroes: {
    key: 'heroes',
    label: 'Hero Slides',
    singular: 'Hero Slide',
    description: 'Manage the rotating banner on the website home page.',
    icon: LayoutDashboard,
    category: 'content',
    statusField: 'isActive',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'subtitle', label: 'Subtitle' },
      { key: 'ctaLabel', label: 'CTA' },
      { key: 'order', label: 'Order', type: 'text' },
      { key: 'isActive', label: 'Status', type: 'boolean' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, colSpan: 1 },
      { name: 'subtitle', label: 'Subtitle', type: 'text', colSpan: 1 },
      { name: 'description', label: 'Description', type: 'textarea', textareaRows: 4, colSpan: 2 },
      { name: 'image', label: 'Background Image URL', type: 'image', colSpan: 2 },
      { name: 'ctaLabel', label: 'Button Label', type: 'text', colSpan: 1 },
      { name: 'ctaHref', label: 'Button Link', type: 'text', colSpan: 1 },
      { name: 'secondaryLabel', label: 'Secondary Label', type: 'text', colSpan: 1 },
      { name: 'secondaryHref', label: 'Secondary Link', type: 'text', colSpan: 1 },
      { name: 'order', label: 'Order', type: 'number', colSpan: 1 },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  doctors: {
    key: 'doctors',
    label: 'Doctors',
    singular: 'Doctor',
    description: 'Manage doctors, their profiles and branch associations.',
    icon: Stethoscope,
    category: 'content',
    statusField: 'isActive',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'specialization', label: 'Specialization' },
      { key: 'experience', label: 'Experience' },
      { key: 'featured', label: 'Featured', type: 'boolean' },
      { key: 'isActive', label: 'Status', type: 'boolean' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'designation', label: 'Designation', type: 'text' },
      { name: 'specialization', label: 'Specialization', type: 'text', required: true },
      { name: 'experience', label: 'Experience (e.g. 12+ years)', type: 'text' },
      { name: 'qualifications', label: 'Qualifications (comma separated)', type: 'text', help: 'e.g. MBBS, MS Orthopaedics', colSpan: 2 },
      { name: 'photo', label: 'Photo URL', type: 'image', colSpan: 2 },
      { name: 'consultationTimings', label: 'Consultation Timings', type: 'text' },
      { name: 'available247', label: 'Available 24/7', type: 'checkbox' },
      { name: 'featured', label: 'Featured on Home', type: 'checkbox' },
      { name: 'branches', label: 'Branches', type: 'multiselect', ref: 'branches', colSpan: 2 },
      { name: 'about', label: 'About the Doctor', type: 'textarea', textareaRows: 5, colSpan: 2 },
      { name: 'order', label: 'Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  services: {
    key: 'services',
    label: 'Services',
    singular: 'Service',
    description: 'Manage the medical services displayed on the website.',
    icon: Briefcase,
    category: 'content',
    statusField: 'isActive',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'shortDescription', label: 'Short Description' },
      { key: 'featured', label: 'Featured', type: 'boolean' },
      { key: 'isActive', label: 'Status', type: 'boolean' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'icon', label: 'Icon', type: 'icon', options: ICON_OPTIONS },
      { name: 'shortDescription', label: 'Short Description', type: 'textarea', textareaRows: 3, colSpan: 2 },
      { name: 'description', label: 'Full Description', type: 'textarea', textareaRows: 8, colSpan: 2 },
      { name: 'image', label: 'Image URL', type: 'image', colSpan: 2 },
      { name: 'featured', label: 'Featured', type: 'checkbox' },
      { name: 'order', label: 'Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  departments: {
    key: 'departments',
    label: 'Departments',
    singular: 'Department',
    description: 'Manage hospital departments.',
    icon: Layers,
    category: 'content',
    statusField: 'isActive',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'shortDescription', label: 'Description' },
      { key: 'isActive', label: 'Status', type: 'boolean' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'icon', label: 'Icon', type: 'icon', options: ICON_OPTIONS },
      { name: 'shortDescription', label: 'Short Description', type: 'textarea', textareaRows: 3, colSpan: 2 },
      { name: 'description', label: 'Full Description', type: 'textarea', textareaRows: 6, colSpan: 2 },
      { name: 'order', label: 'Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  branches: {
    key: 'branches',
    label: 'Branches',
    singular: 'Branch',
    description: 'Manage hospital branch locations, contact details and maps.',
    icon: Building2,
    category: 'content',
    statusField: 'isActive',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'area', label: 'Area' },
      { key: 'city', label: 'City' },
      { key: 'phone', label: 'Phone' },
      { key: 'isActive', label: 'Status', type: 'boolean' },
    ],
    fields: [
      { name: 'name', label: 'Branch Name', type: 'text', required: true },
      { name: 'code', label: 'Branch Code', type: 'text' },
      { name: 'area', label: 'Area / Locality', type: 'text', required: true },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'address', label: 'Full Address', type: 'textarea', textareaRows: 3, colSpan: 2 },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'whatsapp', label: 'WhatsApp', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'emergencyPhone', label: 'Emergency Phone (24/7)', type: 'text' },
      { name: 'workingHours', label: 'Working Hours', type: 'text', colSpan: 2 },
      { name: 'googleMapsEmbed', label: 'Google Maps Embed URL', type: 'text', colSpan: 2 },
      { name: 'googleMapsLink', label: 'Google Maps Link', type: 'text', colSpan: 2 },
      { name: 'description', label: 'Description / Facilities', type: 'textarea', textareaRows: 4, colSpan: 2 },
      { name: 'order', label: 'Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  gallery: {
    key: 'gallery',
    label: 'Gallery',
    singular: 'Gallery Item',
    description: 'Manage photos and videos shown in the gallery.',
    icon: ImageIcon,
    category: 'content',
    statusField: 'isActive',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category' },
      { key: 'type', label: 'Type', type: 'badge' },
      { key: 'isActive', label: 'Status', type: 'boolean' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'text' },
      { name: 'type', label: 'Type', type: 'select', options: GALLERY_TYPES },
      { name: 'branch', label: 'Branch', type: 'select', ref: 'branches' },
      { name: 'image', label: 'Image URL', type: 'image', colSpan: 2 },
      { name: 'videoUrl', label: 'Video URL', type: 'text', colSpan: 2 },
      { name: 'order', label: 'Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  testimonials: {
    key: 'testimonials',
    label: 'Testimonials',
    singular: 'Testimonial',
    description: 'Manage patient reviews shown on the website.',
    icon: Star,
    category: 'content',
    statusField: 'isActive',
    columns: [
      { key: 'patientName', label: 'Patient' },
      { key: 'treatment', label: 'Treatment' },
      { key: 'rating', label: 'Rating', type: 'badge' },
      { key: 'isActive', label: 'Status', type: 'boolean' },
    ],
    fields: [
      { name: 'patientName', label: 'Patient Name', type: 'text', required: true },
      { name: 'role', label: 'Role / Location', type: 'text' },
      { name: 'treatment', label: 'Treatment / Department', type: 'text' },
      { name: 'rating', label: 'Rating (1-5)', type: 'number' },
      { name: 'message', label: 'Review', type: 'textarea', textareaRows: 5, required: true, colSpan: 2 },
      { name: 'photo', label: 'Photo URL', type: 'image', colSpan: 2 },
      { name: 'featured', label: 'Featured', type: 'checkbox' },
      { name: 'order', label: 'Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  blog: {
    key: 'blog',
    label: 'Blog Posts',
    singular: 'Blog Post',
    description: 'Write and publish health articles.',
    icon: FileText,
    category: 'content',
    statusField: 'isActive',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'author', label: 'Author' },
      { key: 'publishedAt', label: 'Published', type: 'date' },
      { key: 'isActive', label: 'Status', type: 'boolean' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, colSpan: 2 },
      { name: 'author', label: 'Author', type: 'text' },
      { name: 'publishedAt', label: 'Publish Date', type: 'date' },
      { name: 'tags', label: 'Tags (comma separated)', type: 'text', help: 'e.g. spine, orthopaedics', colSpan: 2 },
      { name: 'image', label: 'Cover Image URL', type: 'image', colSpan: 2 },
      { name: 'excerpt', label: 'Excerpt', type: 'textarea', textareaRows: 3, colSpan: 2 },
      { name: 'content', label: 'Content', type: 'textarea', textareaRows: 14, required: true, colSpan: 2 },
      { name: 'isActive', label: 'Published', type: 'checkbox' },
    ],
  },
  'about-images': {
    key: 'about-images',
    label: 'About Images',
    singular: 'About Image',
    description: 'Manage the rotating image slider on the About page.',
    icon: Landmark,
    category: 'content',
    statusField: 'isActive',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'caption', label: 'Caption' },
      { key: 'order', label: 'Order', type: 'text' },
      { key: 'isActive', label: 'Status', type: 'boolean' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', colSpan: 1 },
      { name: 'caption', label: 'Caption', type: 'text', colSpan: 1 },
      { name: 'image', label: 'Image URL', type: 'image', colSpan: 2 },
      { name: 'order', label: 'Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },
  appointments: {
    key: 'appointments',
    label: 'Appointments',
    singular: 'Appointment',
    description: 'View and manage appointment requests.',
    icon: CalendarCheck,
    category: 'appointments',
    statusField: 'status',
    columns: [
      { key: 'name', label: 'Patient' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'branch', label: 'Branch', type: 'reference' },
      { key: 'doctor', label: 'Doctor', type: 'reference' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'time', label: 'Time' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'name', label: 'Patient Name', type: 'text', required: true },
      { name: 'mobile', label: 'Mobile', type: 'text', required: true },
      { name: 'branch', label: 'Branch', type: 'select', ref: 'branches' },
      { name: 'doctor', label: 'Doctor', type: 'select', ref: 'doctors' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'time', label: 'Time', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: APPOINTMENT_STATUS },
      { name: 'notes', label: 'Notes', type: 'textarea', textareaRows: 3, colSpan: 2 },
    ],
  },
  'op-registrations': {
    key: 'op-registrations',
    label: 'OP Registrations',
    singular: 'OP Registration',
    description: 'View and manage out-patient registrations.',
    icon: Ticket,
    category: 'op',
    statusField: 'status',
    columns: [
      { key: 'opdNumber', label: 'OP No.', type: 'badge' },
      { key: 'name', label: 'Patient' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'branch', label: 'Branch', type: 'reference' },
      { key: 'department', label: 'Department', type: 'reference' },
      { key: 'age', label: 'Age' },
      { key: 'total', label: 'Amount (₹)', type: 'text' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'name', label: 'Patient Name', type: 'text', required: true },
      { name: 'mobile', label: 'Mobile', type: 'text', required: true },
      { name: 'branch', label: 'Branch', type: 'select', ref: 'branches' },
      { name: 'department', label: 'Department', type: 'select', ref: 'departments' },
      { name: 'age', label: 'Age', type: 'number' },
      { name: 'gender', label: 'Gender', type: 'select', options: [{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }] },
      { name: 'opdNumber', label: 'OP Number', type: 'text' },
      { name: 'preferredDate', label: 'Preferred Date', type: 'date' },
      { name: 'address', label: 'Address', type: 'textarea', textareaRows: 2, colSpan: 2 },
      { name: 'concern', label: 'Concern / Symptoms', type: 'textarea', textareaRows: 3, colSpan: 2 },
      { name: 'total', label: 'Total Amount (₹)', type: 'number' },
      { name: 'paymentMethod', label: 'Payment Method', type: 'select', options: [
        { value: 'cash', label: 'Cash' },
        { value: 'card', label: 'Card' },
        { value: 'upi', label: 'UPI' },
        { value: 'insurance', label: 'Insurance' },
        { value: 'other', label: 'Other' },
        { value: 'pending', label: 'Pending' },
      ] },
      { name: 'billingStatus', label: 'Billing Status', type: 'select', options: [
        { value: 'unbilled', label: 'Unbilled' },
        { value: 'billed', label: 'Billed' },
        { value: 'paid', label: 'Paid' },
      ] },
      { name: 'status', label: 'Status', type: 'select', options: OP_STATUS },
    ],
  },
  invoices: {
    key: 'invoices',
    label: 'Invoices',
    singular: 'Invoice',
    description: 'View and manage generated patient invoices.',
    icon: Receipt,
    category: 'op',
    statusField: 'status',
    columns: [
      { key: 'invoiceNumber', label: 'Invoice No.', type: 'badge' },
      { key: 'patientName', label: 'Patient' },
      { key: 'patientMobile', label: 'Mobile' },
      { key: 'branch', label: 'Branch', type: 'reference' },
      { key: 'total', label: 'Total (₹)', type: 'text' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'patientName', label: 'Patient Name', type: 'text', required: true },
      { name: 'patientMobile', label: 'Mobile', type: 'text' },
      { name: 'branch', label: 'Branch', type: 'select', ref: 'branches' },
      { name: 'paymentMethod', label: 'Payment Method', type: 'select', options: [
        { value: 'cash', label: 'Cash' },
        { value: 'card', label: 'Card' },
        { value: 'upi', label: 'UPI' },
        { value: 'insurance', label: 'Insurance' },
        { value: 'other', label: 'Other' },
        { value: 'pending', label: 'Pending' },
      ] },
      { name: 'subtotal', label: 'Subtotal (₹)', type: 'number' },
      { name: 'discount', label: 'Discount (₹)', type: 'number' },
      { name: 'tax', label: 'Tax (₹)', type: 'number' },
      { name: 'total', label: 'Total (₹)', type: 'number' },
      { name: 'amountPaid', label: 'Amount Paid (₹)', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: [
        { value: 'draft', label: 'Draft' },
        { value: 'issued', label: 'Issued' },
        { value: 'paid', label: 'Paid' },
        { value: 'cancelled', label: 'Cancelled' },
      ] },
      { name: 'notes', label: 'Notes', type: 'textarea', textareaRows: 3, colSpan: 2 },
    ],
  },
};

export const NAV_GROUPS: { label: string; items: ModuleConfig[] }[] = [
  {
    label: 'Overview',
    items: [
      {
        key: 'dashboard', label: 'Dashboard', singular: '', description: '', icon: LayoutDashboard,
        category: 'dashboard', statusField: null, columns: [], fields: [],
      } as ModuleConfig,
    ],
  },
  {
    label: 'Appointments & OP',
    items: [
      MODULES.appointments, MODULES['op-registrations'],
      {
        key: 'patients', label: 'Patients', singular: 'Patient', description: 'Search, filter and export all OP patients.', icon: Users,
        category: 'op', statusField: null, columns: [], fields: [],
      } as ModuleConfig,
      MODULES.invoices,
    ],
  },
  {
    label: 'Content Management',
    items: [
      MODULES.heroes, MODULES.doctors, MODULES.services, MODULES.departments,
      MODULES.branches, MODULES.gallery, MODULES.testimonials, MODULES.blog,
      MODULES['about-images'],
    ],
  },
  {
    label: 'System',
    items: [
      { key: 'users', label: 'Users & Roles', singular: '', description: '', icon: UserCog, category: 'users', statusField: null, columns: [], fields: [] } as ModuleConfig,
      { key: 'activity', label: 'Activity Logs', singular: '', description: '', icon: ActivityIcon, category: 'activity', statusField: null, columns: [], fields: [] } as ModuleConfig,
      { key: 'settings', label: 'Settings', singular: '', description: '', icon: SettingsIcon, category: 'settings', statusField: null, columns: [], fields: [] } as ModuleConfig,
    ],
  },
];

export const HOME_QUICK_ACTIONS: ModuleConfig[] = [
  MODULES.appointments,
  MODULES['op-registrations'],
  MODULES.heroes,
  MODULES.blog,
];
