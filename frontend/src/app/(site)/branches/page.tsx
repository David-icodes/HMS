import type { Metadata } from 'next';
import PageBanner from '@/components/site/PageBanner';
import SectionHeading from '@/components/site/SectionHeading';
import BranchCard from '@/components/site/BranchCard';
import Reveal from '@/components/site/Reveal';
import CTABanner from '@/components/site/CTABanner';
import { getBranches, getHomeData, emergencyPhone } from '@/lib/site-data';

export const metadata: Metadata = {
  title: 'Our Branches',
  description:
    'Find a Urmila Raj Hospital branch near you — 7 locations across Hyderabad with addresses, phone numbers and facilities.',
};

export const revalidate = 60;

export default async function BranchesPage() {
  const branches = await getBranches();
  const data = await getHomeData();

  return (
    <>
      <PageBanner
        title="Our Branches"
        eyebrow="7 Locations Across Hyderabad"
        breadcrumb={[{ label: 'Branches' }]}
      />

      <section className="py-16 sm:py-20">
        <div className="container-site">
          <Reveal>
            <SectionHeading
              eyebrow="Find Us Nearby"
              title="Quality Care, Close to Home"
              description="Seven convenient locations across the city — each with emergency care, OPD, diagnostics and pharmacy."
            />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((b, i) => (
              <Reveal key={b._id} delay={(i % 3) * 0.08}>
                <BranchCard branch={b} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CTABanner emergency={emergencyPhone(data)} />
    </>
  );
}
