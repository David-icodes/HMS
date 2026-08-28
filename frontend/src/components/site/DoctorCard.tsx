import Link from 'next/link';
import { ArrowRight, BadgeCheck, CalendarCheck } from 'lucide-react';
import type { Doctor } from '@/types';
import { initials, cn } from '@/lib/utils';

export default function DoctorCard({ doctor, featured = false }: { doctor: Doctor; featured?: boolean }) {
  const qualification = doctor.qualifications?.join(', ') || '';
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-700/5">
      <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-navy-900 via-brand-800 to-brand-700">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(22,163,74,0.4), transparent 45%)' }} />
        {doctor.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doctor.photo}
            alt={doctor.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white/15 font-display text-3xl font-bold text-white ring-4 ring-white/20 backdrop-blur">
            {initials(doctor.name)}
          </div>
        )}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          <BadgeCheck className="h-3.5 w-3.5" /> {doctor.specialization}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-bold leading-snug text-navy-900">
            {doctor.name}
          </h3>
          {doctor.experience && (
            <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">
              {doctor.experience}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm font-medium text-brand-700">
          {doctor.designation || doctor.specialization}
        </p>
        {qualification && (
          <p className="mt-1 line-clamp-1 text-xs text-slate-500">{qualification}</p>
        )}
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-600">
          {doctor.about || 'Expert care across multiple Urmila Raj Hospital branches.'}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Link
            href={`/doctors/${doctor.slug}`}
            className={cn(
              'inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors',
              featured
                ? 'bg-brand-700 text-white hover:bg-brand-800'
                : 'border border-brand-200 text-brand-700 hover:bg-brand-50',
            )}
          >
            View Profile <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/book-appointment"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-med-50 text-med-700 transition-colors hover:bg-med-600 hover:text-white"
            aria-label={`Book appointment with ${doctor.name}`}
          >
            <CalendarCheck className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
