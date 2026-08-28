import type { Metadata } from 'next';
import PageBanner from '@/components/site/PageBanner';
import SectionHeading from '@/components/site/SectionHeading';
import ServiceCard from '@/components/site/ServiceCard';
import Reveal from '@/components/site/Reveal';
import CTABanner from '@/components/site/CTABanner';
import { getServices, getHomeData, emergencyPhone } from '@/lib/site-data';

export const metadata: Metadata = {
  title: 'Our Services',
  description:
    'Explore the full range of medical services at Urmila Raj Hospital — emergency, diagnostics, surgery, pharmacy and more.',
};

export const revalidate = 60;

export default async function ServicesPage() {
  const services = await getServices();
  const data = await getHomeData();

  return (
    <>
      <PageBanner
        title="Our Services"
        eyebrow="Complete Care"
        breadcrumb={[{ label: 'Services' }]}
      />

      <section className="py-16 sm:py-20">
        <div className="container-site">
          <Reveal>
            <SectionHeading
              eyebrow="What We Offer"
              title="Every Service You Need, Under One Roof"
              description="From 24/7 emergency care to day-care surgeries and diagnostics, our services cover every stage of your healthcare journey."
            />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {services.map((s, i) => (
              <Reveal key={s._id} delay={(i % 4) * 0.06}>
                <ServiceCard service={s} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CTABanner emergency={emergencyPhone(data)} />
    </>
  );
}
