import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Phone,
  CalendarCheck,
  MapPin,
  Clock3,
  BriefcaseMedical,
  ArrowLeft,
  Stethoscope,
  GraduationCap,
} from 'lucide-react';
import { getDoctor, getHomeData, emergencyPhone } from '@/lib/site-data';
import CTABanner from '@/components/site/CTABanner';
import { initials } from '@/lib/utils';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doctor = await getDoctor(slug);
  if (!doctor) return { title: 'Doctor Not Found' };
  return {
    title: `Dr. ${doctor.name} — ${doctor.specialization}`,
    description: doctor.about?.slice(0, 160) || `Book a consultation with Dr. ${doctor.name}.`,
  };
}

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doctor = await getDoctor(slug);
  const data = await getHomeData();

  if (!doctor) notFound();

  const qualification = doctor.qualifications?.join(', ') || doctor.designation || '';
  const color = doctor.photo ? 'transparent' : '#0e5abf';

  return (
    <>
      <section className="relative overflow-hidden bg-navy-950 py-16 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 15% 10%, rgb(14 90 191 / 0.5), transparent 55%), radial-gradient(ellipse at 90% 90%, rgb(22 163 74 / 0.2), transparent 45%)',
          }}
        />
        <div className="container-site relative">
          <Link
            href="/doctors"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> All Doctors
          </Link>
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[320px_1fr]">
            <div className="relative h-80 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-navy-950">
              {doctor.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doctor.photo} alt={doctor.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span
                    className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/20 text-4xl font-bold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {initials(doctor.name)}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/40 to-transparent" />
            </div>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-300 backdrop-blur">
                <Stethoscope className="h-4 w-4" /> {doctor.specialization}
              </span>
              <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {doctor.name}
              </h1>
              <p className="mt-2 text-brand-200">{doctor.designation || doctor.specialization}</p>
              {qualification && (
                <p className="mt-2 flex items-center gap-2 text-sm text-brand-200">
                  <GraduationCap className="h-5 w-5" /> {qualification}
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/book-appointment"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-med-600 to-med-500 px-6 py-3 text-sm font-semibold text-white hover:from-med-700 hover:to-med-600"
                >
                  <CalendarCheck className="h-4 w-4" /> Book Consultation
                </Link>
                <a
                  href={`tel:${emergencyPhone(data)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  <Phone className="h-4 w-4" /> {emergencyPhone(data)}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-site grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <h2 className="font-display text-2xl font-bold text-navy-900">About the Doctor</h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              {doctor.about ||
                `${doctor.name} is a specialist in ${doctor.specialization} (${doctor.experience || 'experienced'}) providing expert and compassionate care at Urmila Raj Hospital.`}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <BriefcaseMedical className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm text-slate-500">Experience</p>
                <p className="font-semibold text-navy-900">{doctor.experience || '—'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-med-50 text-med-700">
                  <Clock3 className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm text-slate-500">OPD Timings</p>
                <p className="font-semibold text-navy-900">{doctor.consultationTimings || (doctor.available247 ? '24/7 Available' : '9:00 AM – 8:00 PM')}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <CalendarCheck className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm text-slate-500">Consultation</p>
                <p className="font-semibold text-navy-900">Ask Front Desk</p>
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <h3 className="font-display text-lg font-semibold text-navy-900">Available At</h3>
            <p className="mt-1 text-xs text-slate-500">
              Consult at the following Urmila Raj Hospital branches
            </p>
            <div className="mt-5 space-y-3">
              {doctor.branches?.map((b) => (
                <Link
                  key={b._id}
                  href={`/branches/${b.slug}`}
                  className="group flex items-start gap-3 rounded-2xl border border-slate-100 p-3 transition-all hover:border-brand-200 hover:bg-brand-50/50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-navy-900 group-hover:text-brand-700">
                      {b.name}
                    </span>
                    <span className="block text-xs text-slate-500">{b.area}</span>
                  </span>
                </Link>
              ))}
              {(!doctor.branches || doctor.branches.length === 0) && (
                <p className="text-sm text-slate-500">Branch details coming soon.</p>
              )}
            </div>
            <Link
              href="/book-appointment"
              className="mt-6 flex items-center justify-center gap-2 rounded-full bg-brand-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
            >
              <CalendarCheck className="h-4 w-4" /> Book Appointment
            </Link>
          </aside>
        </div>
      </section>

      <CTABanner emergency={emergencyPhone(data)} />
    </>
  );
}
