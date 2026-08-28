import Link from 'next/link';
import { Metadata } from 'next';
import {
  Phone,
  CalendarCheck,
  Ticket,
  Ambulance,
  ShieldCheck,
  HeartPulse,
  Users,
  Building2,
  Award,
  Stethoscope,
  ArrowRight,
} from 'lucide-react';
import { getHomeData, emergencyPhone } from '@/lib/site-data';
import HeroSlider from '@/components/site/HeroSlider';
import SectionHeading from '@/components/site/SectionHeading';
import ServiceCard from '@/components/site/ServiceCard';
import DoctorCard from '@/components/site/DoctorCard';
import BranchCard from '@/components/site/BranchCard';
import Reveal from '@/components/site/Reveal';
import StatCounter from '@/components/site/StatCounter';
import CTABanner from '@/components/site/CTABanner';
import { GalleryThumb } from '@/components/site/GalleryGrid';

export const metadata: Metadata = {
  title: 'Urmila Raj Hospital | Multi-Speciality Care, Hyderabad',
  description:
    'Trusted multi-speciality hospital across Hyderabad with 24/7 emergency, modern diagnostics, experienced doctors and compassionate care.',
};

export const revalidate = 60;

const WHY_US = [
  {
    icon: Ambulance,
    title: '24/7 Emergency',
    text: 'Round-the-clock emergency and trauma care with ambulances and critical response teams.',
  },
  {
    icon: ShieldCheck,
    title: 'Experienced Doctors',
    text: 'Senior specialists across 12+ departments delivering evidence-based, compassionate care.',
  },
  {
    icon: HeartPulse,
    title: 'Advanced Diagnostics',
    text: 'In-house pathology, radiology and lab services for faster, accurate reports.',
  },
  {
    icon: Users,
    title: 'Patient-First Care',
    text: 'Transparent billing, friendly staff and personal attention at every step of your visit.',
  },
];

const PROCESS = [
  { step: '01', title: 'Choose a Branch', text: 'Pick from 7 convenient locations across Hyderabad.' },
  { step: '02', title: 'Book or Walk In', text: 'Book online or simply walk into the front desk.' },
  { step: '03', title: 'Meet Your Doctor', text: 'Consult a specialist in a comfortable, clean environment.' },
  { step: '04', title: 'Get Well Soon', text: 'Follow-up care, pharmacy and diagnostics under one roof.' },
];

export default async function HomePage() {
  const data = await getHomeData();
  const slides = data?.hero?.slides ?? [];
  const services = data?.services ?? [];
  const doctors = data?.doctors ?? [];
  const branches = data?.branches ?? [];
  const gallery = data?.gallery ?? [];
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
      <HeroSlider slides={slides} />

      {/* Quick actions strip */}
      <section className="relative z-10 -mt-14">
        <div className="container-site">
          <Reveal>
            <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-soft sm:grid-cols-3">
              <Link
                href="/book-appointment"
                className="group flex items-center gap-4 rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-4 text-white transition-all hover:shadow-glow"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                  <CalendarCheck className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-sm font-bold">Book Appointment</span>
                  <span className="block text-xs text-brand-100">Online in under 2 minutes</span>
                </span>
              </Link>
              <Link
                href="/op-registration"
                className="group flex items-center gap-4 rounded-2xl bg-white p-4 text-navy-900 shadow-sm transition-all hover:bg-brand-50"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-med-50 text-med-700">
                  <Ticket className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-sm font-bold">OP Registration</span>
                  <span className="block text-xs text-slate-500">Skip the queue at front desk</span>
                </span>
              </Link>
              <a
                href={`tel:${emergencyPhone(data)}`}
                className="group flex items-center gap-4 rounded-2xl bg-white p-4 text-navy-900 shadow-sm transition-all hover:bg-red-50"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Phone className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-sm font-bold">24/7 Emergency</span>
                  <span className="block text-xs text-slate-500">{emergencyPhone(data)}</span>
                </span>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* About intro + stats */}
      <section className="py-16 sm:py-24">
        <div className="container-site grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <SectionHeading
                eyebrow="Welcome to Urmila Raj Hospital"
                title="Healthcare You Can Trust, Right in Your Neighbourhood"
                align="left"
              />
              <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-600">
                <p>
                  Urmila Raj Hospital is a growing chain of multi-speciality hospitals across
                  Hyderabad, committed to bringing quality healthcare closer to your doorstep. From
                  emergency and trauma care to routine check-ups, surgeries and wellness, we provide
                  complete care under one roof.
                </p>
                <p>
                  With experienced doctors, modern operation theatres, in-house diagnostics and a
                  dedicated 24/7 pharmacy, every branch is designed to make your visit smooth,
                  affordable and reassuring.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                >
                  More About Us <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/doctors"
                  className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-6 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                >
                  <Stethoscope className="h-4 w-4" /> Meet Our Doctors
                </Link>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:shadow-card-hover">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Users className="h-6 w-6" />
                </span>
                <p className="mt-4 font-display text-3xl font-bold text-navy-900">
                  <StatCounter value={stats.patients} suffix="+" />
                </p>
                <p className="mt-1 text-sm text-slate-500">Patients Treated</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:shadow-card-hover">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-med-50 text-med-700">
                  <Stethoscope className="h-6 w-6" />
                </span>
                <p className="mt-4 font-display text-3xl font-bold text-navy-900">
                  <StatCounter value={stats.doctors} suffix="+" />
                </p>
                <p className="mt-1 text-sm text-slate-500">Expert Doctors</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:shadow-card-hover">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Building2 className="h-6 w-6" />
                </span>
                <p className="mt-4 font-display text-3xl font-bold text-navy-900">
                  <StatCounter value={stats.branches} />
                </p>
                <p className="mt-1 text-sm text-slate-500">Branches Across City</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:shadow-card-hover">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Award className="h-6 w-6" />
                </span>
                <p className="mt-4 font-display text-3xl font-bold text-navy-900">
                  <StatCounter value={stats.years} suffix="+" />
                </p>
                <p className="mt-1 text-sm text-slate-500">Years of Care</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Services */}
      {services.length > 0 && (
        <section className="bg-white py-16 sm:py-24">
          <div className="container-site">
            <Reveal>
              <SectionHeading
                eyebrow="Our Services"
                title="Complete Medical Care Under One Roof"
                description="From emergency care to everyday wellness, explore the specialised services available at every Urmila Raj Hospital branch."
              />
            </Reveal>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {services.slice(0, 8).map((s, i) => (
                <Reveal key={s._id} delay={(i % 4) * 0.08}>
                  <ServiceCard service={s} />
                </Reveal>
              ))}
            </div>
            <Reveal className="mt-10 text-center">
              <Link
                href="/services"
                className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-7 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
              >
                View All Services <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* Why choose us */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-med-50" />
        <div className="container-site relative">
          <Reveal>
            <SectionHeading
              eyebrow="Why Choose Us"
              title="The Urmila Raj Difference"
              description="We combine clinical excellence with genuine warmth — because healthcare is about people, not just patients."
            />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_US.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <div className="group h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-card-hover">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 transition-all group-hover:from-brand-700 group-hover:to-brand-600 group-hover:text-white">
                    <f.icon className="h-7 w-7" />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold text-navy-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors */}
      {doctors.length > 0 && (
        <section className="bg-white py-16 sm:py-24">
          <div className="container-site">
            <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
              <Reveal>
                <SectionHeading
                  eyebrow="Our Specialists"
                  title="Meet the Doctors"
                  description="Experienced and approachable — our specialists are here to guide you with clarity and care."
                  align="left"
                />
              </Reveal>
              <Reveal delay={0.1}>
                <Link
                  href="/doctors"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-brand-200 bg-white px-6 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                >
                  View All Doctors <ArrowRight className="h-4 w-4" />
                </Link>
              </Reveal>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {doctors.slice(0, 8).map((d, i) => (
                <Reveal key={d._id} delay={(i % 4) * 0.08}>
                  <DoctorCard doctor={d} featured={i === 0} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Branches — homepage highlight */}
      {branches.length > 0 && (
        <section className="relative overflow-hidden py-16 sm:py-24">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 20% 0%, rgb(14 90 191 / 0.08), transparent 55%), radial-gradient(ellipse at 90% 100%, rgb(22 163 74 / 0.1), transparent 50%)',
            }}
          />
          <div className="container-site relative">
            <Reveal>
              <SectionHeading
                eyebrow="Our Branches"
                title="Find the Nearest Urmila Raj Hospital"
                description={`Seven branches across Hyderabad — always close to you, always ready to help. Choose your nearest location.`}
              />
            </Reveal>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {branches.map((b, i) => (
                <Reveal key={b._id} delay={(i % 3) * 0.08}>
                  <BranchCard branch={b} />
                </Reveal>
              ))}
            </div>
            <Reveal className="mt-10 text-center">
              <Link
                href="/branches"
                className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-7 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
              >
                View All Branches <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* Process */}
      <section className="bg-white py-16 sm:py-24">
        <div className="container-site">
          <Reveal>
            <SectionHeading
              eyebrow="Simple & Easy"
              title="Your Visit, Made Simple"
              description="Four easy steps from booking to recovery."
            />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((p, i) => (
              <Reveal key={p.step} delay={i * 0.08}>
                <div className="relative h-full rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-brand-50/50 p-6">
                  <span className="font-display text-4xl font-bold text-brand-100">{p.step}</span>
                  <h3 className="mt-3 font-display text-lg font-semibold text-navy-900">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery preview */}
      {gallery.length > 0 && (
        <section className="py-16 sm:py-24">
          <div className="container-site">
            <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
              <Reveal>
                <SectionHeading eyebrow="Our Facilities" title="Inside Urmila Raj Hospital" align="left" />
              </Reveal>
              <Reveal delay={0.1}>
                <Link
                  href="/gallery"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-brand-200 bg-white px-6 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                >
                  View Gallery <ArrowRight className="h-4 w-4" />
                </Link>
              </Reveal>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {gallery.slice(0, 8).map((g) => (
                <GalleryThumb key={g._id} item={g} />
              ))}
            </div>
          </div>
        </section>
      )}

      <CTABanner emergency={emergencyPhone(data)} />
    </>
  );
}
