import type { Metadata } from 'next';
import PageBanner from '@/components/site/PageBanner';
import Reveal from '@/components/site/Reveal';
import { getHomeData, emergencyPhone } from '@/lib/site-data';
import CTABanner from '@/components/site/CTABanner';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Urmila Raj Hospital collects, uses and protects your personal and medical information.',
};

export const revalidate = 300;

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'We collect personal information you provide when booking appointments, registering for OP consultations, or contacting us — including your name, mobile number, email address and health-related details you choose to share. We may also collect basic usage data (such as pages visited) to improve our website.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'Your information is used to schedule appointments, manage patient records, provide medical care, send appointment confirmations, and respond to your enquiries. We may also use anonymised data for internal quality improvement.',
  },
  {
    title: '3. Medical Records & Confidentiality',
    body: 'Your medical records are strictly confidential and are only accessible to authorised medical and administrative staff involved in your care. We comply with applicable privacy laws and hospital standards.',
  },
  {
    title: '4. Data Sharing',
    body: 'We do not sell or rent your personal information. Information may be shared only when required by law, or with your consent for referral and continuity of care.',
  },
  {
    title: '5. Data Security',
    body: 'We use reasonable technical and organisational measures to protect your data against unauthorised access, alteration or disclosure.',
  },
  {
    title: '6. Your Rights',
    body: 'You may request access to, correction of, or deletion of your personal information by contacting us. We will respond to such requests within a reasonable timeframe.',
  },
  {
    title: '7. Cookies',
    body: 'Our website may use cookies to improve your browsing experience. You can disable cookies in your browser settings, though some features may not work as intended.',
  },
  {
    title: '8. Contact Us',
    body: 'For any privacy-related questions, please contact us through the Contact page or call our helpline.',
  },
];

export default async function PrivacyPage() {
  const data = await getHomeData();

  return (
    <>
      <PageBanner
        title="Privacy Policy"
        eyebrow="Your Privacy Matters"
        breadcrumb={[{ label: 'Privacy Policy' }]}
      />
      <section className="py-16">
        <div className="container-site max-w-4xl">
          <Reveal>
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card sm:p-10">
              <p className="text-sm text-slate-500">Last updated: July 2026</p>
              <p className="mt-4 leading-relaxed text-slate-600">
                At Urmila Raj Hospital, we are committed to protecting the privacy and security of
                our patients. This policy explains how we handle information collected through this
                website and during your interactions with our hospital.
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
