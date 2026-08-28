import type { Metadata } from 'next';
import PageBanner from '@/components/site/PageBanner';
import SectionHeading from '@/components/site/SectionHeading';
import Reveal from '@/components/site/Reveal';
import GalleryGrid from '@/components/site/GalleryGrid';
import { getGallery, getBranches } from '@/lib/site-data';

export const metadata: Metadata = {
  title: 'Gallery',
  description:
    'Take a look inside Urmila Raj Hospital — modern facilities, comfortable wards, advanced operation theatres and more.',
};

export const revalidate = 60;

export default async function GalleryPage() {
  const gallery = await getGallery();
  const branches = await getBranches();

  const categories = ['All', ...new Set(gallery.map((g) => g.category || 'Other').filter(Boolean))];

  return (
    <>
      <PageBanner
        title="Gallery"
        eyebrow="Inside Our Hospital"
        breadcrumb={[{ label: 'Gallery' }]}
      />

      <section className="py-16 sm:py-20">
        <div className="container-site">
          <Reveal>
            <SectionHeading
              eyebrow="Our Facilities"
              title="A Peek Inside Urmila Raj Hospital"
              description="Clean wards, modern equipment and comforting spaces — designed for your safety and peace of mind."
            />
          </Reveal>
          <div className="mt-12">
            <GalleryGrid items={gallery} />
          </div>
          {branches.length > 1 && (
            <Reveal className="mt-12">
              <p className="text-center text-sm text-slate-500">
                Photos from our {branches.length} branches across Hyderabad — filter by branch and
                category coming soon.
              </p>
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}
