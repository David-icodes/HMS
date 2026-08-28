import Link from 'next/link';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';

const NAV = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Doctors', href: '/doctors' },
  { label: 'Services', href: '/services' },
  { label: 'Branches', href: '/branches' },
  { label: 'Contact', href: '/contact' },
];

export default function SiteFooter({
  phones,
  whatsapp,
  email,
  address,
}: {
  phones: string[];
  whatsapp: string;
  email: string;
  address: string;
}) {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="container-site py-12">
        <div className="flex flex-col items-center gap-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
                  <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7V3z" fill="currentColor" />
                </svg>
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-display text-lg font-bold tracking-tight text-navy-900">
                  Urmila Raj
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-700">
                  Hospital
                </span>
              </span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500">
              Multi-speciality hospital across Hyderabad — trusted doctors, modern diagnostics and
              compassionate care at every branch.
            </p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Footer">
            {NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-700"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-600">
            <a href={`tel:+91${phones[0]}`} className="flex items-center gap-2 hover:text-brand-700">
              <Phone className="h-4 w-4 text-brand-600" /> {phones[0]}
              {phones[1] ? ` · ${phones[1]}` : ''}
            </a>
            <a
              href={`https://wa.me/91${whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 hover:text-brand-700"
            >
              <MessageCircle className="h-4 w-4 text-brand-600" /> WhatsApp
            </a>
            <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-brand-700">
              <Mail className="h-4 w-4 text-brand-600" /> {email}
            </a>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-600" /> {address}
            </span>
          </div>

          <div className="flex flex-col items-center gap-4 border-t border-slate-200 pt-6 text-center">
            <div className="flex items-center gap-5 text-xs text-slate-500">
              <Link href="/privacy-policy" className="hover:text-brand-700">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-brand-700">
                Terms of Service
              </Link>
              <Link href="/admin/login" className="hover:text-brand-700">
                Staff Login
              </Link>
            </div>
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} Urmila Raj Hospital. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
