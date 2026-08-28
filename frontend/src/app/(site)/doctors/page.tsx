import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Phone, CalendarCheck } from 'lucide-react';
import PageBanner from '@/components/site/PageBanner';
import SectionHeading from '@/components/site/SectionHeading';
import DoctorCard from '@/components/site/DoctorCard';
import Reveal from '@/components/site/Reveal';
import { getDoctors, getHomeData, emergencyPhone } from '@/lib/site-data';

export const metadata: Metadata = {
  title: 'Our Doctors',
  description:
    'Meet the experienced doctors and specialists at Urmila Raj Hospital across Hyderabad.',
};

export const revalidate = 60;

export default async function DoctorsPage() {
  const doctors = await getDoctors();
  const data = await getHomeData();

  const specializations = [...new Set(doctors.map((d) => d.specialization))];

  return (
    <>
      <PageBanner
        title="Our Doctors"
        eyebrow="Meet the Specialists"
        breadcrumb={[{ label: 'Doctors' }]}
      />

      <section className="py-16 sm:py-20">
        <div className="container-site">
          <Reveal>
            <SectionHeading
              eyebrow="Our Specialists"
              title="Experienced Doctors, Trusted Care"
              description="Browse our specialists and book a consultation at the branch nearest to you."
            />
          </Reveal>

          {specializations.length > 0 && (
            <Reveal className="mt-10">
              <div className="flex flex-wrap justify-center gap-2">
                {specializations.map((s) => (
                  <a
                    key={s}
                    href={`#${s.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    className="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-700 hover:text-white"
                  >
                    {s}
                  </a>
                ))}
              </div>
            </Reveal>
          )}

          {specializations.map((spec) => {
            const list = doctors.filter((d) => d.specialization === spec);
            if (list.length === 0) return null;
            return (
              <div key={spec} id={spec.toLowerCase().replace(/[^a-z0-9]+/g, '-')} className="mt-16 scroll-mt-28">
                <Reveal>
                  <div className="mb-7 flex items-center gap-4">
                    <span className="h-8 w-1.5 rounded-full bg-brand-700" />
                    <h2 className="font-display text-2xl font-bold text-navy-900">{spec}</h2>
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                      {list.length} doctor{list.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </Reveal>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((d, i) => (
                    <Reveal key={d._id} delay={(i % 3) * 0.08}>
                      <DoctorCard doctor={d} />
                    </Reveal>
                  ))}
                </div>
              </div>
            );
          })}

          {doctors.length === 0 && (
            <div className="mt-16 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-slate-500">No doctors listed yet.</p>
            </div>
          )}
        </div>
      </section>

      <section className="bg-navy-950 py-14">
        <div className="container-site flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Need to see a doctor today?</h2>
            <p className="mt-1 text-slate-400">Walk into your nearest branch or book online.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/book-appointment"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-med-600 to-med-500 px-6 py-3 text-sm font-semibold text-white hover:from-med-700 hover:to-med-600"
            >
              <CalendarCheck className="h-4 w-4" /> Book Appointment
            </Link>
            <a
              href={`tel:${emergencyPhone(data)}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              <Phone className="h-4 w-4" /> Call Us
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
