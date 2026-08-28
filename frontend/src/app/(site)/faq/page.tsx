import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown, Phone, CalendarCheck } from 'lucide-react';
import PageBanner from '@/components/site/PageBanner';
import SectionHeading from '@/components/site/SectionHeading';
import Reveal from '@/components/site/Reveal';
import { getHomeData, emergencyPhone } from '@/lib/site-data';

export const metadata: Metadata = {
  title: 'FAQs',
  description:
    'Frequently asked questions about appointments, OP registration, billing, insurance and more at Urmila Raj Hospital.',
};

export const revalidate = 60;

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How do I book an appointment?',
    a: 'You can book online through the "Book Appointment" page on this website, call us directly, or walk into any Urmila Raj Hospital branch. Our team confirms every online request by phone.',
  },
  {
    q: 'What is OP registration and why do I need it?',
    a: 'OP (Out-Patient) registration is the process of creating your patient record at the hospital. It gives you an OP number which is used for consultations, prescriptions and diagnostics. You can pre-register online to reduce waiting time.',
  },
  {
    q: 'Which branches are open 24/7 for emergencies?',
    a: 'All key branches offer 24/7 emergency and trauma care. You can call our emergency number anytime — our ambulance and team will guide you to the nearest open branch.',
  },
  {
    q: 'Do you have a pharmacy at the hospital?',
    a: 'Yes, every Urmila Raj Hospital branch has a dedicated pharmacy. In-patients get medicines dispensed conveniently, and walk-in customers are also welcome.',
  },
  {
    q: 'Are diagnostic tests available in-house?',
    a: 'Yes. Our branches have in-house pathology and radiology services so you can get blood tests, scans and other diagnostics done at the hospital with fast, reliable reports.',
  },
  {
    q: 'What insurance or payment options do you accept?',
    a: 'We accept cash, UPI, card payments and major health insurance / cashless tie-ups. Please contact the billing desk at your branch for details specific to your insurer.',
  },
  {
    q: 'Can I choose a specific doctor for my appointment?',
    a: 'Absolutely. When booking, you can select your preferred doctor. If a doctor is fully booked, our team will suggest the nearest available specialist.',
  },
  {
    q: 'What should I carry for my first visit?',
    a: 'Carry a valid photo ID (Aadhaar / Driving Licence) and any previous medical records or prescriptions. If you are visiting for a follow-up, bring your earlier reports too.',
  },
];

export default async function FaqPage() {
  const data = await getHomeData();

  return (
    <>
      <PageBanner
        title="Frequently Asked Questions"
        eyebrow="Have a Question?"
        breadcrumb={[{ label: 'FAQs' }]}
      />

      <section className="py-16 sm:py-20">
        <div className="container-site max-w-4xl">
          <Reveal>
            <SectionHeading
              eyebrow="Quick Answers"
              title="Everything You Need to Know"
              description="Can't find your answer? Call or message us — we're happy to help."
            />
          </Reveal>
          <div className="mt-12 space-y-4">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={(i % 5) * 0.05}>
                <details className="group rounded-2xl border border-slate-200 bg-white shadow-card open:shadow-card-hover">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-display text-base font-semibold text-navy-900 sm:text-lg [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-brand-700 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600 sm:text-base">
                    {f.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12">
            <div className="flex flex-col items-center justify-between gap-5 rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-center sm:flex-row sm:text-left">
              <div>
                <h3 className="font-display text-xl font-bold text-white">Still have questions?</h3>
                <p className="mt-1 text-sm text-brand-100">
                  Our front desk team is available during OPD hours.
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <a
                  href={`tel:${emergencyPhone(data)}`}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
                >
                  <Phone className="h-4 w-4" /> Call Us
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <CalendarCheck className="h-4 w-4" /> Contact Page
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
