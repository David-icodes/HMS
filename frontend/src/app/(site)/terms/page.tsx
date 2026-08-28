import type { Metadata } from 'next';
import PageBanner from '@/components/site/PageBanner';
import Reveal from '@/components/site/Reveal';
import { getHomeData, emergencyPhone } from '@/lib/site-data';
import CTABanner from '@/components/site/CTABanner';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms and conditions for using the Urmila Raj Hospital website and online services.',
};

export const revalidate = 300;

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using the Urmila Raj Hospital website and online services, you agree to be bound by these Terms of Service. If you do not agree, please do not use this website.',
  },
  {
    title: '2. Use of Online Services',
    body: 'Online appointment booking and OP registration are provided for your convenience. Submitting a request does not guarantee a specific doctor or time slot — confirmation is provided by our team. Please provide accurate information so we can serve you correctly.',
  },
  {
    title: '3. Medical Information',
    body: 'Content on this website, including blog articles and service descriptions, is for general information only and is not a substitute for professional medical advice, diagnosis or treatment. Always consult a qualified doctor regarding any medical condition.',
  },
  {
    title: '4. Emergency Situations',
    body: 'This website is not intended for emergency situations. In an emergency, call our 24/7 emergency number or visit the nearest hospital immediately.',
  },
  {
    title: '5. Intellectual Property',
    body: 'All content, branding, logos and materials on this website are the property of Urmila Raj Hospital and may not be reproduced without permission.',
  },
  {
    title: '6. Limitation of Liability',
    body: 'While we strive for accuracy, Urmila Raj Hospital is not liable for any loss arising from the use of, or reliance on, information on this website. Availability of doctors, services and timings may change without prior notice.',
  },
  {
    title: '7. Third-Party Links',
    body: 'Our website may link to external sites (e.g. maps, WhatsApp). We are not responsible for the content or privacy practices of such third parties.',
  },
  {
    title: '8. Changes to Terms',
    body: 'We may update these terms from time to time. Continued use of the website after changes constitutes acceptance of the revised terms.',
  },
];

export default async function TermsPage() {
  const data = await getHomeData();

  return (
    <>
      <PageBanner
        title="Terms of Service"
        eyebrow="Please Read Carefully"
        breadcrumb={[{ label: 'Terms of Service' }]}
      />
      <section className="py-16">
        <div className="container-site max-w-4xl">
          <Reveal>
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card sm:p-10">
              <p className="text-sm text-slate-500">Last updated: July 2026</p>
              <p className="mt-4 leading-relaxed text-slate-600">
                These terms govern your use of the Urmila Raj Hospital website and its online
                services. Please review them carefully.
              </p>
              <div className="mt-8 space-y-6">
                {SECTIONS.map((s) => (
                  <div key={s.title}>
                    <h2 className="font-display text-lg font-semibold text-navy-900">{s.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">{s.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
      <CTABanner emergency={emergencyPhone(data)} />
    </>
  );
}
