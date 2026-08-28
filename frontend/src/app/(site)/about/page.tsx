import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Target,
  Eye,
  HeartHandshake,
  Award,
  Users,
  Building2,
  ShieldCheck,
  ArrowRight,
  HeartPulse,
  Stethoscope,
  Microscope,
  Ambulance,
} from 'lucide-react';
import PageBanner from '@/components/site/PageBanner';
import SectionHeading from '@/components/site/SectionHeading';
import Reveal from '@/components/site/Reveal';
import StatCounter from '@/components/site/StatCounter';
import CTABanner from '@/components/site/CTABanner';
import AboutImageSlider from '@/components/site/AboutImageSlider';
import { getHomeData, getAboutImages, emergencyPhone } from '@/lib/site-data';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Learn about Urmila Raj Hospital — our mission, values and commitment to quality multi-speciality healthcare across Hyderabad.',
};

export const revalidate = 60;

const VALUES = [
  { icon: HeartHandshake, title: 'Compassion', text: 'We treat every patient like family, with empathy and respect.' },
  { icon: ShieldCheck, title: 'Integrity', text: 'Honest advice, transparent billing and ethical medical practice.' },
  { icon: Award, title: 'Excellence', text: 'Continuous investment in skills, technology and quality standards.' },
  { icon: Users, title: 'Accessibility', text: 'Quality care close to home, at affordable, transparent costs.' },
];

const HIGHLIGHTS = [
  { icon: Ambulance, title: '24/7 Emergency', text: 'Round-the-clock emergency care, ambulance support and trauma services at key branches.' },
  { icon: Microscope, title: 'In-House Diagnostics', text: 'Pathology, lab and imaging services that give you fast, reliable reports.' },
  { icon: HeartPulse, title: 'Modern Operation Theatres', text: 'Safe, sterile and fully equipped OT suites for planned and emergency surgeries.' },
  { icon: Stethoscope, title: 'Multi-Speciality OPD', text: 'Consultations across 12+ specialities with experienced senior doctors.' },
];

export default async function AboutPage() {
  const [data, aboutImages] = await Promise.all([getHomeData(), getAboutImages()]);
  const statsSetting = (data?.settings?.['stats'] ?? {}) as {
    patients?: number;
    doctors?: number;
    branches?: number;
    years?: number;
  };
  const stats = {
    patients: Number(statsSetting.patients) || 50000,
    doctors: Number(statsSetting.doctors) || 7,
    branches: Number(statsSetting.branches) || 7,
    years: Number(statsSetting.years) || 10,
  };

  return (
    <>
      <PageBanner
        title="About Urmila Raj Hospital"
        eyebrow="Who We Are"
        breadcrumb={[{ label: 'About Us' }]}
      />

      <section className="py-16 sm:py-20">
        <div className="container-site grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="space-y-6">
              <AboutImageSlider images={aboutImages} />
              <div className="relative">
                <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-navy-950 p-1">
                  <div className="rounded-[22px] bg-navy-950 px-6 py-6 text-white">
                    <p className="font-display text-lg font-semibold leading-snug">
                      “Healthcare is a human service. When patients trust us with their lives, we owe
                      them our very best — every single day.”
                    </p>
                    <p className="mt-3 text-sm font-semibold text-brand-300">The Urmila Raj Team</p>
                  </div>
                </div>
                <div className="absolute -bottom-5 -right-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft sm:-right-4">
                  <p className="font-display text-2xl font-bold text-brand-700">
                    <StatCounter value={stats.years} suffix="+" />
                  </p>
                  <p className="text-[11px] font-medium text-slate-500">Years of Care</p>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div>
              <SectionHeading
                eyebrow="Our Story"
                title="Bringing Quality Healthcare Closer to Home"
                align="left"
              />
              <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-600">
                <p>
                  Urmila Raj Hospital began with a simple belief: world-class healthcare should not
                  require long travel or expensive bills. Today, with seven branches across
                  Hyderabad, we serve thousands of families with emergency care, everyday medicine,
                  advanced diagnostics and surgery.
                </p>
                <p>
                  Each branch is built around the same promise — experienced doctors, clean and
                  comforting spaces, transparent pricing and staff who genuinely care. Whether it is
                  a routine check-up or a critical emergency, we are here, close to home.
                </p>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
                  <div className="flex items-center gap-2 font-semibold text-brand-800">
                    <Target className="h-5 w-5" /> Our Mission
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    To deliver safe, affordable and accessible multi-speciality healthcare that
                    every family can rely on.
                  </p>
                </div>
                <div className="rounded-2xl border border-med-100 bg-med-50/60 p-5">
                  <div className="flex items-center gap-2 font-semibold text-med-700">
                    <Eye className="h-5 w-5" /> Our Vision
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    To be the most trusted neighbourhood hospital chain in Hyderabad, one family at a
                    time.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="container-site">
          <Reveal>
            <SectionHeading
              eyebrow="Our Values"
              title="What We Stand For"
              description="Four values guide every decision we make and every patient we serve."
            />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.08}>
                <div className="group h-full rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-brand-50/40 p-6 text-center transition-all hover:-translate-y-1 hover:shadow-card-hover">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 transition-all group-hover:from-brand-700 group-hover:to-brand-600 group-hover:text-white">
                    <v.icon className="h-7 w-7" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold text-navy-900">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{v.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-50/60 py-16 sm:py-20">
        <div className="container-site">
          <Reveal>
            <SectionHeading
              eyebrow="What Sets Us Apart"
              title="Complete Care, Every Step of the Way"
            />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {HIGHLIGHTS.map((h, i) => (
              <Reveal key={h.title} delay={i * 0.07}>
                <div className="flex h-full gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:border-brand-200 hover:shadow-card-hover">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <h.icon className="h-7 w-7" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-navy-900">{h.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{h.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-12 text-center">
            <div className="grid gap-6 rounded-3xl border border-brand-100 bg-white p-8 sm:grid-cols-4">
              <div>
                <p className="font-display text-4xl font-bold text-brand-700"><StatCounter value={stats.patients} suffix="+" /></p>
                <p className="mt-1 text-sm text-slate-500">Patients Treated</p>
              </div>
              <div>
                <p className="font-display text-4xl font-bold text-brand-700"><StatCounter value={stats.doctors} suffix="+" /></p>
                <p className="mt-1 text-sm text-slate-500">Expert Doctors</p>
              </div>
              <div>
                <p className="font-display text-4xl font-bold text-brand-700"><StatCounter value={stats.branches} /></p>
                <p className="mt-1 text-sm text-slate-500">Branches</p>
              </div>
              <div>
                <p className="font-display text-4xl font-bold text-brand-700"><StatCounter value={stats.years} suffix="+" /></p>
                <p className="mt-1 text-sm text-slate-500">Years of Care</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CTABanner emergency={emergencyPhone(data)} />
    </>
  );
}
