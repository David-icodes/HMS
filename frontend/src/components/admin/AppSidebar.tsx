'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Ticket,
  Receipt,
  Home,
  Stethoscope,
  Building2,
  Briefcase,
  Layers,
  Image as ImageIcon,
  Landmark,
  Sparkles,
  Quote,
  FileText,
  UserCog,
  Activity as ActivityIcon,
  Settings as SettingsIcon,
  ShieldCheck,
  LogOut,
  X,
  Server,
  IndianRupee,
  ChartColumn,
} from 'lucide-react';
import { useAuth } from '@/lib/admin-auth';

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  category: 'dashboard' | 'content' | 'appointments' | 'op' | 'analytics' | 'users' | 'activity' | 'settings';
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Main',
    items: [
      { key: 'dashboard', label: 'Dashboard', href: '/admin', icon: LayoutDashboard, category: 'dashboard' },
    ],
  },
  {
    heading: 'Patient Care',
    items: [
      { key: 'patients', label: 'Patients', href: '/admin/patients', icon: Users, category: 'op' },
      { key: 'appointments', label: 'Appointments', href: '/admin/appointments', icon: CalendarCheck, category: 'appointments' },
      { key: 'op-registrations', label: 'OP Registrations', href: '/admin/op-registrations', icon: Ticket, category: 'op' },
      { key: 'invoices', label: 'Invoices', href: '/admin/invoices', icon: Receipt, category: 'op' },
      { key: 'home-visits', label: 'Home Visits', href: '/admin/home-visits', icon: Home, category: 'op' },
    ],
  },
  {
    heading: 'Hospital Management',
    items: [
      { key: 'doctors', label: 'Doctors', href: '/admin/doctors', icon: Stethoscope, category: 'content' },
      { key: 'branches', label: 'Branches', href: '/admin/branches', icon: Building2, category: 'content' },
      { key: 'services', label: 'Services', href: '/admin/services', icon: Briefcase, category: 'content' },
      { key: 'departments', label: 'Departments', href: '/admin/departments', icon: Layers, category: 'content' },
    ],
  },
  {
    heading: 'Reports & Analytics',
    items: [
      { key: 'revenue', label: 'Revenue', href: '/admin/revenue', icon: IndianRupee, category: 'analytics' },
      { key: 'branch-reports', label: 'Branch Reports', href: '/admin/branch-reports', icon: ChartColumn, category: 'analytics' },
    ],
  },
  {
    heading: 'Content',
    items: [
      { key: 'heroes', label: 'Hero Slides', href: '/admin/heroes', icon: Sparkles, category: 'content' },
      { key: 'gallery', label: 'Gallery', href: '/admin/gallery', icon: ImageIcon, category: 'content' },
      { key: 'about-images', label: 'About Images', href: '/admin/about-images', icon: Landmark, category: 'content' },
      { key: 'testimonials', label: 'Testimonials', href: '/admin/testimonials', icon: Quote, category: 'content' },
      { key: 'blog', label: 'Blog Posts', href: '/admin/blog', icon: FileText, category: 'content' },
    ],
  },
  {
    heading: 'System',
    items: [
      { key: 'users', label: 'Users & Roles', href: '/admin/users', icon: UserCog, category: 'users' },
      { key: 'activity', label: 'Activity Logs', href: '/admin/activity', icon: ActivityIcon, category: 'activity' },
      { key: 'settings', label: 'Settings', href: '/admin/settings', icon: SettingsIcon, category: 'settings' },
    ],
  },
];

const ROLE_CATEGORIES: Record<string, string[]> = {
  superAdmin: ['content', 'appointments', 'op', 'analytics', 'settings', 'users', 'activity'],
  admin: ['content', 'appointments', 'op', 'analytics', 'settings', 'users', 'activity'],
  contentEditor: ['content'],
  receptionist: ['appointments', 'op'],
};

const ROLE_LABELS: Record<string, string> = {
  superAdmin: 'Administrator',
  admin: 'Administrator',
  contentEditor: 'Content Editor',
  receptionist: 'Receptionist',
};

export default function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role = user?.role || 'receptionist';
  const allowed = ROLE_CATEGORIES[role] || [];

  const isActive = (item: NavItem) =>
    item.key === 'dashboard' ? pathname === '/admin' : pathname === item.href;

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.category === 'dashboard' || allowed.includes(i.category)),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-navy-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white text-slate-800 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-sm font-extrabold text-white shadow-sm">
            UR
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold leading-tight text-navy-900">Urmila Raj Hospital</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-600">
              Admin CMS
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {groups.map((group) => (
            <div key={group.heading}>
              <p className="mb-1.5 flex items-center gap-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <Server className="h-3 w-3 text-teal-500" />
                {group.heading}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? 'bg-sky-50 text-navy-900 ring-1 ring-inset ring-sky-200'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-navy-900'
                        }`}
                      >
                        <item.icon
                          className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                            active ? 'text-sky-600' : 'text-slate-400 group-hover:text-sky-600'
                          }`}
                        />
                        <span className="flex-1">{item.label}</span>
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-xs font-bold uppercase text-teal-700">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy-900">{user?.name || 'Admin'}</p>
                <p className="flex items-center gap-1 text-[11px] text-slate-500">
                  <ShieldCheck className="h-3 w-3 text-teal-600" />
                  {ROLE_LABELS[user?.role || ''] || user?.role || 'Administrator'}
                </p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-500"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-400">Urmila Raj Hospital CMS v2</p>
        </div>
      </aside>
    </>
  );
}
