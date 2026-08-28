import Link from 'next/link';
import { MapPin, Phone, Clock3, Navigation, ArrowRight } from 'lucide-react';
import type { Branch } from '@/types';
import { initials } from '@/lib/utils';

export default function BranchCard({ branch }: { branch: Branch }) {
  const is24 = !!branch.emergencyPhone;
  const directions =
    branch.googleMapsLink ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${branch.name} ${branch.address}`,
    )}`;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-700/5">
      <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-brand-700 via-brand-700 to-brand-900">
        <div className="pointer-events-none absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <span className="relative font-display text-2xl font-bold text-white">
          {initials(branch.name.replace(/Urmila Raj Hospital|Hospital/i, '').trim() || branch.name)}
        </span>
        {is24 && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            24/7
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-display text-lg font-bold text-navy-900">{branch.name}</h3>
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-brand-700">
          <MapPin className="h-4 w-4" /> {branch.area}
        </p>

        <div className="mt-4 flex-1 space-y-2.5 text-sm text-slate-600">
          <p className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span className="line-clamp-2">{branch.address}</span>
          </p>
          {branch.phone && (
            <a href={`tel:+91${branch.phone}`} className="flex items-center gap-2.5 hover:text-brand-700">
              <Phone className="h-4 w-4 shrink-0 text-brand-600" />
              {branch.phone}
            </a>
          )}
          <p className="flex items-center gap-2.5">
            <Clock3 className="h-4 w-4 shrink-0 text-brand-600" />
            <span>{branch.workingHours || 'Mon – Sat: 9:00 AM – 9:00 PM'}</span>
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Link
            href={`/branches/${branch.slug}`}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-700 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            View Branch <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={directions}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-200 bg-white text-brand-700 transition-colors hover:bg-brand-50"
            aria-label={`Get directions to ${branch.name}`}
          >
            <Navigation className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
