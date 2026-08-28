import type { Metadata } from 'next';
import PageBanner from '@/components/site/PageBanner';
import SectionHeading from '@/components/site/SectionHeading';
import Reveal from '@/components/site/Reveal';
import CTABanner from '@/components/site/CTABanner';
import { getDepartments, getHomeData, emergencyPhone } from '@/lib/site-data';
import { iconMap } from '@/lib/icon-map';

export const metadata: Metadata = {
  title: 'Departments',
  description:
    'Explore the specialised departments at Urmila Raj Hospital — from general medicine to orthopaedics and beyond.',
};

export const revalidate = 60;

export default async function DepartmentsPage() {
  const departments = await getDepartments();
  const data = await getHomeData();

  return (
    <>
      <PageBanner
        title="Our Departments"
        eyebrow="Specialised Care"
        breadcrumb={[{ label: 'Departments' }]}
      />

      <section className="py-16 sm:py-20">
        <div className="container-site">
          <Reveal>
            <SectionHeading
              eyebrow="Multi-Speciality"
              title="Departments Built Around Your Needs"
              description="Each department is led by experienced specialists supported by modern equipment and trained staff."
            />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((d, i) => {
              const Icon = iconMap[d.icon || 'Stethoscope'] || iconMap.Stethoscope;
              return (
                <Reveal key={d._id} delay={(i % 3) * 0.08}>
                  <div className="group h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-card-hover">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 transition-all group-hover:from-brand-700 group-hover:to-brand-600 group-hover:text-white">
                      <Icon className="h-7 w-7" />
                    </span>
                    <h3 className="mt-5 font-display text-lg font-semibold text-navy-900">{d.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{d.description}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <CTABanner emergency={emergencyPhone(data)} />
    </>
  );
}
