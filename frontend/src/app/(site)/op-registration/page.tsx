import type { Metadata } from 'next';
import { Ticket, Phone, Clock3, MapPin, Info } from 'lucide-react';
import PageBanner from '@/components/site/PageBanner';
import SectionHeading from '@/components/site/SectionHeading';
import Reveal from '@/components/site/Reveal';
import OpRegistrationForm from '@/components/site/OpRegistrationForm';
import { getHomeData, emergencyPhone } from '@/lib/site-data';

export const metadata: Metadata = {
  title: 'OP Registration',
  description:
    'Register for an OP (out-patient) consultation online at Urmila Raj Hospital and reduce your wait time at the front desk.',
};

export const revalidate = 60;

export default async function OpRegistrationPage() {
  const data = await getHomeData();

  return (
    <>
      <PageBanner
        title="OP Registration"
        eyebrow="Out-Patient Registration"
        breadcrumb={[{ label: 'OP Registration' }]}
      />

      <section className="py-16 sm:py-20">
        <div className="container-site grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <Reveal>
              <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-card sm:p-9">
                <SectionHeading
                  eyebrow="New Patient?"
                  title="Register for Consultation"
                  description="Register online and we'll issue your OP number instantly — walk in and skip the queue."
                  align="left"
                />
                <div className="mt-8">
                  <OpRegistrationForm />
                </div>
              </div>
            </Reveal>
          </div>

          <aside className="space-y-5">
            <Reveal delay={0.1}>
              <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-7 text-white shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                    <Ticket className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-bold">OP Number</h3>
                    <p className="text-xs text-brand-200">Issued instantly on registration</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-brand-100">
                  Your OP number helps our front desk and doctors serve you faster. Keep your mobile
                  number handy — it links to your record.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-card">
                <h3 className="font-display text-lg font-semibold text-navy-900">Before you visit</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <p className="flex items-start gap-2.5 text-slate-600">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                    Carry a valid photo ID (Aadhaar / Driving Licence).
                  </p>
                  <p className="flex items-start gap-2.5 text-slate-600">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                    Arrive 15 minutes before your preferred time.
                  </p>
                  <p className="flex items-start gap-2.5 text-slate-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                    Pick the branch nearest to you.
                  </p>
                </div>
                <a
                  href={`tel:${emergencyPhone(data)}`}
                  className="mt-5 flex items-center justify-center gap-2 rounded-full bg-brand-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                >
                  <Phone className="h-4 w-4" /> Need help? Call us
                </a>
              </div>
            </Reveal>
          </aside>
        </div>
      </section>
    </>
  );
}
