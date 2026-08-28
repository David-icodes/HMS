import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Phone,
  Mail,
  Clock3,
  Ambulance,
  Navigation,
  ArrowLeft,
  CalendarCheck,
  ChevronRight,
  CheckCircle2,
  Stethoscope,
} from 'lucide-react';
import { getBranch, getHomeData, emergencyPhone } from '@/lib/site-data';
import DoctorCard from '@/components/site/DoctorCard';
import CTABanner from '@/components/site/CTABanner';
import Reveal from '@/components/site/Reveal';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const branch = await getBranch(slug);
  if (!branch) return { title: 'Branch Not Found' };
  return {
    title: `${branch.name} — ${branch.area}`,
    description: `Visit ${branch.name} at ${branch.address}. OPD, emergency and diagnostics at your nearest Urmila Raj Hospital branch.`,
  };
}

export default async function BranchDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const branch = await getBranch(slug);
  const data = await getHomeData();

  if (!branch) notFound();

  const phone = branch.phone || emergencyPhone(data);

  return (
    <>
      <section className="relative overflow-hidden bg-navy-950 py-14">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 10% 0%, rgb(14 90 191 / 0.5), transparent 55%), radial-gradient(ellipse at 90% 100%, rgb(22 163 74 / 0.2), transparent 45%)',
          }}
        />
        <div className="container-site relative">
          <Link
            href="/branches"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> All Branches
          </Link>
          <nav className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight className="h-3 w-3 text-brand-400" />
            <Link href="/branches" className="hover:text-white">Branches</Link>
            <ChevronRight className="h-3 w-3 text-brand-400" />
            <span className="text-brand-300">{branch.name}</span>
          </nav>
          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {branch.name}
                </h1>
                {branch.emergencyPhone && (
                  <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-400">
                    <Ambulance className="h-3.5 w-3.5" /> 24/7
                  </span>
                )}
              </div>
              <p className="mt-2 flex items-center gap-2 text-brand-200">
                <MapPin className="h-4 w-4" /> {branch.area}, {branch.city}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={`tel:+91${phone}`}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-med-600 to-med-500 px-6 py-3 text-sm font-semibold text-white hover:from-med-700 hover:to-med-600"
              >
                <Phone className="h-4 w-4" /> {phone}
              </a>
              <Link
                href="/book-appointment"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                <CalendarCheck className="h-4 w-4" /> Book at this Branch
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container-site grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-8">
            {branch.description && (
              <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-card">
                <h2 className="font-display text-xl font-bold text-navy-900">About this Branch</h2>
                <p className="mt-3 leading-relaxed text-slate-600">{branch.description}</p>
              </div>
            )}

            {branch.doctors && branch.doctors.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-bold text-navy-900">Doctors at this Branch</h2>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  {branch.doctors.map((d, i) => (
                    <Reveal key={d._id} delay={i * 0.05}>
                      <DoctorCard doctor={d} />
                    </Reveal>
                  ))}
                </div>
              </div>
            )}

            {branch.description && (
              <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-card">
                <h2 className="font-display text-xl font-bold text-navy-900">Facilities & Amenities</h2>
                <p className="mt-3 leading-relaxed text-slate-600">{branch.description}</p>
              </div>
            )}
          </div>

          <aside className="h-fit space-y-5">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
              <div className="border-b border-slate-100 bg-brand-50/60 p-5">
                <h3 className="font-display text-lg font-semibold text-navy-900">Branch Information</h3>
              </div>
              <div className="space-y-4 p-5 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                  <div>
                    <p className="font-semibold text-navy-900">Address</p>
                    <p className="mt-0.5 text-slate-600">{branch.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                  <div>
                    <p className="font-semibold text-navy-900">Phone</p>
                    <p className="mt-0.5 text-slate-600">{branch.phone}</p>
                    {branch.whatsapp && <p className="text-slate-600">{branch.whatsapp}</p>}
                  </div>
                </div>
                {branch.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                    <div>
                      <p className="font-semibold text-navy-900">Email</p>
                      <p className="mt-0.5 text-slate-600">{branch.email}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                  <div>
                    <p className="font-semibold text-navy-900">OPD Timings</p>
                    <p className="mt-0.5 text-slate-600">{branch.workingHours || 'Mon – Sat: 9:00 AM – 9:00 PM'}</p>
                  </div>
                </div>
                {branch.emergencyPhone && (
                  <div className="flex items-start gap-3">
                    <Ambulance className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                      <p className="font-semibold text-navy-900">Emergency</p>
                      <p className="mt-0.5 text-slate-600">24 / 7 Emergency & Trauma Care</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-100 p-4">
                <a
                  href={branch.googleMapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${branch.name} ${branch.address}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full bg-brand-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                >
                  <Navigation className="h-4 w-4" /> Get Directions
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {(branch.googleMapsEmbed || branch.googleMapsLink) && (
        <section className="pb-16">
          <div className="container-site">
            <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-card">
              <iframe
                src={branch.googleMapsEmbed || `https://maps.google.com/?q=${encodeURIComponent(`${branch.name} ${branch.address}`)}&output=embed`}
                title={`Map of ${branch.name}`}
                className="h-[380px] w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>
      )}

      <CTABanner emergency={emergencyPhone(data)} />
    </>
  );
}
