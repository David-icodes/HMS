import type { Metadata } from 'next';
import { CalendarCheck, Phone, Clock3, ShieldCheck, UserRound, BellRing } from 'lucide-react';
import PageBanner from '@/components/site/PageBanner';
import SectionHeading from '@/components/site/SectionHeading';
import Reveal from '@/components/site/Reveal';
import AppointmentForm from '@/components/site/AppointmentForm';
import { getHomeData, emergencyPhone } from '@/lib/site-data';

export const metadata: Metadata = {
  title: 'Book an Appointment',
  description:
    'Book an appointment online at Urmila Raj Hospital. Choose your branch, doctor and preferred time — we will confirm by phone.',
};

export const revalidate = 60;

const STEPS = [
  { icon: CalendarCheck, title: 'Fill the Form', text: 'Tell us your name, branch and preferred slot.' },
  { icon: BellRing, title: 'Get a Call Back', text: 'Our team confirms your appointment over the phone.' },
  { icon: UserRound, title: 'Meet Your Doctor', text: 'Visit the branch at your confirmed time.' },
];

export default async function AppointmentPage() {
  const data = await getHomeData();

  return (
    <>
      <PageBanner
        title="Book an Appointment"
        eyebrow="Easy Online Booking"
        breadcrumb={[{ label: 'Book Appointment' }]}
      />

      <section className="py-16 sm:py-20">
        <div className="container-site grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <Reveal>
              <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-card sm:p-9">
                <SectionHeading
                  eyebrow="Appointment Request"
                  title="Book Your Visit"
                  description="Fill in your details and we'll confirm your slot shortly."
                  align="left"
                />
                <div className="mt-8">
                  <AppointmentForm />
                </div>
              </div>
            </Reveal>
          </div>

          <aside className="space-y-5">
            <Reveal delay={0.1}>
              <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-7 text-white shadow-soft">
                <h3 className="font-display text-xl font-bold">Prefer to call?</h3>
                <p className="mt-2 text-sm text-brand-100">
                  Book directly over the phone — our front desk will help you instantly.
                </p>
                <a
                  href={`tel:${emergencyPhone(data)}`}
                  className="mt-5 flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
                >
                  <Phone className="h-4 w-4" /> {emergencyPhone(data)}
                </a>
                <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white/10 p-3 text-xs text-brand-100">
                  <Clock3 className="h-4 w-4 shrink-0" /> OPD: Mon – Sat, 9:00 AM – 8:00 PM
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-card">
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-navy-900">
                  <ShieldCheck className="h-5 w-5 text-med-600" /> What happens next?
                </h3>
                <div className="mt-5 space-y-4">
                  {STEPS.map((s, i) => (
                    <div key={s.title} className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                        <s.icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-navy-900">
                          <span className="mr-1 text-brand-700">Step {i + 1}.</span>
                          {s.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{s.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </aside>
        </div>
      </section>
    </>
  );
}
