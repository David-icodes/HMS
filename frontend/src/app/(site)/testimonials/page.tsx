import type { Metadata } from 'next';
import Link from 'next/link';
import { Star, Quote, ArrowRight } from 'lucide-react';
import PageBanner from '@/components/site/PageBanner';
import SectionHeading from '@/components/site/SectionHeading';
import Reveal from '@/components/site/Reveal';
import { getTestimonials, getHomeData, emergencyPhone } from '@/lib/site-data';
import { initials } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Patient Testimonials',
  description:
    'Real stories and reviews from patients and families who trust Urmila Raj Hospital with their health.',
};

export const revalidate = 60;

export default async function TestimonialsPage() {
  const testimonials = await getTestimonials();
  const data = await getHomeData();

  const totalRatings = testimonials.length;
  const avgRating = testimonials.length
    ? (testimonials.reduce((a, t) => a + t.rating, 0) / testimonials.length).toFixed(1)
    : '5.0';

  return (
    <>
      <PageBanner
        title="Patient Testimonials"
        eyebrow="Real Stories, Real Care"
        breadcrumb={[{ label: 'Testimonials' }]}
      />

      <section className="py-16 sm:py-20">
        <div className="container-site">
          {testimonials.length > 0 && (
            <Reveal>
              <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card sm:flex-row sm:text-left">
                <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-white">
                  <span className="font-display text-2xl font-bold">{avgRating}</span>
                  <span className="flex text-[10px]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                  </span>
                </div>
                <div>
                  <p className="font-display text-lg font-semibold text-navy-900">
                    Trusted by families across Hyderabad
                  </p>
                  <p className="text-sm text-slate-500">
                    Rated {avgRating} out of 5 from {totalRatings} patient reviews.
                  </p>
                </div>
              </div>
            </Reveal>
          )}

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => {
              const name = t.patientName || 'Urmila Raj Patient';
              return (
                <Reveal key={t._id} delay={(i % 3) * 0.08}>
                  <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${s < t.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
                          />
                        ))}
                      </div>
                      <Quote className="h-6 w-6 text-brand-100" />
                    </div>
                    <p className="mt-4 flex-1 text-[15px] leading-relaxed text-slate-700">
                      “{t.message}”
                    </p>
                    <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-sm font-bold text-white">
                        {initials(name)}
                      </span>
                      <div>
                        <p className="font-semibold text-navy-900">{name}</p>
                        <p className="text-xs text-slate-500">
                          {t.treatment ? `${t.treatment} patient` : 'Patient'}
                          {t.role ? ` · ${t.role}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal className="mt-14">
            <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-10 text-center text-white">
              <h2 className="font-display text-2xl font-bold">Your experience matters to us</h2>
              <p className="mx-auto mt-2 max-w-xl text-brand-100">
                Share your story — or better yet, experience our care yourself at the branch nearest
                to you.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/book-appointment"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
                >
                  Book Appointment <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={`tel:${emergencyPhone(data)}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Call {emergencyPhone(data)}
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
