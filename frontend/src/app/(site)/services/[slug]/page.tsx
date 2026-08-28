import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CalendarCheck, Phone, Clock3, ChevronRight } from 'lucide-react';
import { getService, getServices, getHomeData, emergencyPhone } from '@/lib/site-data';
import { iconMap } from '@/lib/icon-map';
import CTABanner from '@/components/site/CTABanner';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return { title: 'Service Not Found' };
  return {
    title: service.name,
    description: service.shortDescription,
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await getService(slug);
  const services = await getServices();
  const data = await getHomeData();

  if (!service) notFound();

  const Icon = iconMap[service.icon || 'Stethoscope'] || iconMap.Stethoscope;
  const others = services.filter((s) => s._id !== service._id).slice(0, 4);

  return (
    <>
      <section className="relative overflow-hidden bg-navy-950 py-16 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 15% 0%, rgb(14 90 191 / 0.5), transparent 55%), radial-gradient(ellipse at 90% 100%, rgb(22 163 74 / 0.2), transparent 45%)',
          }}
        />
        <div className="container-site relative">
          <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight className="h-3 w-3 text-brand-400" />
            <Link href="/services" className="hover:text-white">Services</Link>
            <ChevronRight className="h-3 w-3 text-brand-400" />
            <span className="text-brand-300">{service.name}</span>
          </nav>
          <div className="mt-8 flex items-start gap-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-brand-300 backdrop-blur">
              <Icon className="h-8 w-8" />
            </span>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {service.name}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-slate-300">{service.shortDescription}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-site grid gap-10 lg:grid-cols-[1fr_340px]">
          <article>
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
              <h2 className="font-display text-2xl font-bold text-navy-900">About this Service</h2>
              <div className="prose-cms mt-4">{service.description}</div>
            </div>
          </article>

          <aside className="space-y-5">
            <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white shadow-soft">
              <h3 className="font-display text-lg font-semibold">Need this service?</h3>
              <p className="mt-1.5 text-sm text-brand-100">
                Book an appointment or call us — we are happy to help.
              </p>
              <div className="mt-5 space-y-2.5">
                <Link
                  href="/book-appointment"
                  className="flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
                >
                  <CalendarCheck className="h-4 w-4" /> Book Appointment
                </Link>
                <a
                  href={`tel:${emergencyPhone(data)}`}
                  className="flex items-center justify-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <Phone className="h-4 w-4" /> {emergencyPhone(data)}
                </a>
              </div>
              <div className="mt-5 border-t border-white/15 pt-4 text-xs text-brand-100">
                <span className="flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5" /> OPD: Mon – Sat, 9:00 AM – 8:00 PM
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
              <h3 className="font-display text-lg font-semibold text-navy-900">Other Services</h3>
              <div className="mt-4 space-y-1">
                {others.map((s) => (
                  <Link
                    key={s._id}
                    href={`/services/${s.slug}`}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                  >
                    <ChevronRight className="h-4 w-4 text-brand-400" /> {s.name}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <CTABanner emergency={emergencyPhone(data)} />
    </>
  );
}
