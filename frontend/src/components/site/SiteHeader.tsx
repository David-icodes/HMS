'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LINKS: { label: string; href: string }[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Doctors', href: '/doctors' },
  { label: 'Services', href: '/services' },
  { label: 'Branches', href: '/branches' },
  { label: 'Contact', href: '/contact' },
];

function BrandLogo() {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm transition-transform duration-300 group-hover:scale-[1.03]">
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
          <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7V3z" fill="currentColor" />
        </svg>
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-display text-lg font-bold tracking-tight text-navy-900">
          Urmila Raj
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-600">
          Hospital
        </span>
      </span>
    </Link>
  );
}

function DesktopNav({ pathname }: { pathname: string }) {
  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
      {NAV_LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'relative rounded-lg px-3.5 py-2 text-[15px] font-medium text-navy-700 transition-colors hover:text-brand-600',
              active && 'text-brand-600',
            )}
          >
            {link.label}
            {active && (
              <span className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-brand-600" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav({
  open,
  pathname,
  onClose,
}: {
  open: boolean;
  pathname: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <BrandLogo />
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-navy-700 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 p-3" aria-label="Mobile">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  'block rounded-lg px-3.5 py-3 text-[15px] font-medium text-navy-800 transition-colors hover:bg-brand-50 hover:text-brand-600',
                  active && 'bg-brand-50 text-brand-600',
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/departments"
            onClick={onClose}
            className="block px-3.5 py-3 text-[15px] font-medium text-navy-600 hover:bg-brand-50 hover:text-brand-600"
          >
            Departments
          </Link>
          <Link
            href="/gallery"
            onClick={onClose}
            className="block px-3.5 py-3 text-[15px] font-medium text-navy-600 hover:bg-brand-50 hover:text-brand-600"
          >
            Gallery
          </Link>
        </nav>
        <div className="border-t border-slate-100 p-4">
          <Link
            href="/book-appointment"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <CalendarCheck className="h-4 w-4" /> Book Appointment
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b transition-all duration-300',
        scrolled
          ? 'border-slate-200 bg-white/95 shadow-sm backdrop-blur'
          : 'border-slate-100 bg-white',
      )}
    >
      <div className="container-site flex h-[72px] items-center justify-between gap-4">
        <BrandLogo />
        <DesktopNav pathname={pathname} />
        <div className="flex items-center gap-2">
          <Link
            href="/book-appointment"
            className="hidden items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 lg:inline-flex"
          >
            <CalendarCheck className="h-4 w-4" /> Book Appointment
          </Link>
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-navy-800 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      <MobileNav open={mobileOpen} pathname={pathname} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
