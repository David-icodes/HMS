import Link from 'next/link';
import { Phone, CalendarCheck, ArrowRight } from 'lucide-react';

export default function CTABanner({
  title = 'Need Medical Attention?',
  subtitle = 'Book an appointment or walk into your nearest Urmila Raj Hospital branch. Our team is ready to help, 24/7.',
  emergency = '9390098723',
}: {
  title?: string;
  subtitle?: string;
  emergency?: string;
}) {
  return (
    <section className="py-16 sm:py-20">
      <div className="container-site">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-700 to-brand-900 px-6 py-12 text-center shadow-soft sm:px-12 sm:py-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 85% 20%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 10% 90%, rgba(22,163,74,0.5), transparent 45%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-base text-brand-100 sm:text-lg">{subtitle}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/book-appointment"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-base font-semibold text-brand-800 shadow-lg transition-colors hover:bg-brand-50"
              >
                <CalendarCheck className="h-5 w-5" /> Book Appointment
              </Link>
              <a
                href={`tel:+91${emergency}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-white/40 px-7 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Phone className="h-5 w-5" /> {emergency}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
