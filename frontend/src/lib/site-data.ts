import type {
  Appointment,
  AboutImage,
  BlogPost,
  Branch,
  Department,
  Doctor,
  GalleryItem,
  HeroSlide,
  OpRegistration,
  Service,
  Testimonial,
} from '@/types';
import { siteFetch } from './api';

export interface HomeData {
  hero: { slides: HeroSlide[] };
  services: Service[];
  doctors: Doctor[];
  branches: Branch[];
  testimonials: Testimonial[];
  gallery: GalleryItem[];
  posts: BlogPost[];
  settings?: Record<string, unknown>;
  sections?: unknown[];
}

/** Normalize a raw phone-list value (array of strings or array of {label, number}) into strings. */
export function normalizePhones(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((p) => (typeof p === 'string' ? p : typeof p?.number === 'string' ? p.number : ''))
      .filter(Boolean);
  }
  return [];
}

export function emergencyPhone(data: { settings?: Record<string, unknown> } | null): string {
  const v = data?.settings?.['emergency.phone'];
  if (typeof v === 'string' && v) return v;
  return '9390098723';
}

export function contactPhones(data: { settings?: Record<string, unknown> } | null): string[] {
  const arr = normalizePhones(data?.settings?.['contact.phones']);
  if (arr.length > 0) return arr;
  return ['9390098723', '9294002293'];
}

export function contactEmail(data: { settings?: Record<string, unknown> } | null): string {
  const v = data?.settings?.['contact.email'];
  if (typeof v === 'string' && v) return v;
  return 'care@urmilarajhospital.com';
}

export function contactWhatsapp(data: { settings?: Record<string, unknown> } | null): string {
  const v = data?.settings?.['contact.whatsapp'];
  if (typeof v === 'string' && v) return v;
  return contactPhones(data)[0];
}

export async function getHomeData(): Promise<HomeData | null> {
  return siteFetch<HomeData>('/api/site/home', ['site', 'home']);
}

export async function getBranches(): Promise<Branch[]> {
  const data = await siteFetch<Branch[]>('/api/site/branches', ['branches']);
  return data ?? [];
}

export async function getBranch(slug: string): Promise<Branch | null> {
  return siteFetch<Branch>(`/api/site/branches/${slug}`, [`branch-${slug}`]);
}

export async function getDoctors(): Promise<Doctor[]> {
  const data = await siteFetch<Doctor[]>('/api/site/doctors', ['doctors']);
  return data ?? [];
}

export async function getDoctor(slug: string): Promise<Doctor | null> {
  return siteFetch<Doctor>(`/api/site/doctors/${slug}`, [`doctor-${slug}`]);
}

export async function getServices(): Promise<Service[]> {
  const data = await siteFetch<Service[]>('/api/site/services', ['services']);
  return data ?? [];
}

export async function getService(slug: string): Promise<Service | null> {
  return siteFetch<Service>(`/api/site/services/${slug}`, [`service-${slug}`]);
}

export async function getDepartments(): Promise<Department[]> {
  const data = await siteFetch<Department[]>('/api/site/departments', ['departments']);
  return data ?? [];
}

export async function getGallery(): Promise<GalleryItem[]> {
  const data = await siteFetch<GalleryItem[]>('/api/site/gallery', ['gallery']);
  return data ?? [];
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const data = await siteFetch<Testimonial[]>('/api/site/testimonials', ['testimonials']);
  return data ?? [];
}

export async function getPosts(): Promise<BlogPost[]> {
  const data = await siteFetch<BlogPost[]>('/api/site/blog', ['blog']);
  return data ?? [];
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  return siteFetch<BlogPost>(`/api/site/blog/${slug}`, [`post-${slug}`]);
}

export async function getAboutImages(): Promise<AboutImage[]> {
  const data = await siteFetch<AboutImage[]>('/api/site/about-images', ['about-images']);
  return data ?? [];
}

export type StatusOption = {
  value: string;
  label: string;
  color: string;
  bg: string;
};

export const APPOINTMENT_STATUS: StatusOption[] = [
  { value: 'pending', label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50' },
  { value: 'confirmed', label: 'Confirmed', color: 'text-brand-700', bg: 'bg-brand-50' },
  { value: 'completed', label: 'Completed', color: 'text-med-700', bg: 'bg-med-50' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50' },
];

export const OP_STATUS: StatusOption[] = [
  { value: 'registered', label: 'Registered', color: 'text-brand-700', bg: 'bg-brand-50' },
  { value: 'in-consultation', label: 'In Consultation', color: 'text-amber-700', bg: 'bg-amber-50' },
  { value: 'completed', label: 'Completed', color: 'text-med-700', bg: 'bg-med-50' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50' },
];

export function statusOption(list: StatusOption[], value: string): StatusOption {
  return list.find((o) => o.value === value) || list[0];
}

export function appointmentStatus(value: string) {
  return statusOption(APPOINTMENT_STATUS, value);
}
export function opStatus(value: string) {
  return statusOption(OP_STATUS, value);
}

export const ROLE_LABELS: Record<string, string> = {
  superAdmin: 'Super Admin',
  admin: 'Admin',
  receptionist: 'Receptionist',
  contentEditor: 'Content Editor',
};

export const PATIENT_TYPES = [
  { value: 'new', label: 'New Patient' },
  { value: 'existing', label: 'Existing Patient' },
];

export const GENDERS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

export const DEFAULT_SETTINGS = {
  siteName: 'Urmila Raj Hospital',
  tagline: 'Multi-Speciality Care, Close to Home',
  primaryPhone: '9390098723',
  secondaryPhone: '9294002293',
  whatsapp: '9390098723',
  emergencyNumber: '9390098723',
  email: 'care@urmilarajhospital.com',
  address: 'Hyderabad, Telangana, India',
  opdHours: 'Mon – Sat, 9:00 AM – 8:00 PM',
  emergencyTimings: '24 / 7',
  socialLinks: {},
};
