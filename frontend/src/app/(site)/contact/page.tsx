import type { Metadata } from 'next';
import { Phone, Mail, MapPin, Clock3, MessageCircle, Ambulance, HeartPulse } from 'lucide-react';
import PageBanner from '@/components/site/PageBanner';
import SectionHeading from '@/components/site/SectionHeading';
import Reveal from '@/components/site/Reveal';
import ContactForm from '@/components/site/ContactForm';
import { getBranches, getHomeData, emergencyPhone, contactPhones, contactEmail, contactWhatsapp } from '@/lib/site-data';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with Urmila Raj Hospital — call, email or visit any of our 7 branches across Hyderabad.',
};

export const revalidate = 60;

export default async function ContactPage() {
  const branches = await getBranches();
  const data = await getHomeData();
  const emergency = emergencyPhone(data);
  const phones = contactPhones(data);
  const email = contactEmail(data);
  const whatsapp = contactWhatsapp(data);

  return (
    <>
      <PageBanner
        title="Contact Us"
        eyebrow="We're Here to Help"
        breadcrumb={[{ label: 'Contact' }]}
      />

      <section className="py-16 sm:py-20">
        <div className="container-site">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <Reveal>
                <SectionHeading
                  eyebrow="Send a Message"
                  title="We'd Love to Hear From You"
                  description="Have a question about our services, appointments or billing? Drop us a message and our team will get back to you."
                  align="left"
                />
              </Reveal>
              <Reveal delay={0.1}>
                <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-card">
                  <ContactForm />
                </div>
              </Reveal>
            </div>

            <div>
              <Reveal delay={0.1}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                      <Ambulance className="h-6 w-6" />
                    </span>
                    <p className="mt-4 text-xs font-bold uppercase tracking-widest text-brand-300">Emergency 24/7</p>
                    <a href={`tel:${emergency}`} className="mt-1 block font-display text-2xl font-bold">
                      {emergency}
                    </a>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <Phone className="h-6 w-6" />
                    </span>
                    <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">OPD Enquiries</p>
                    <a href={`tel:${phones[0]}`} className="mt-1 block font-display text-xl font-bold text-navy-900">
                      {phones[0]}
                    </a>
                    <a href={`tel:${phones[1]}`} className="block text-sm text-slate-500">
                      {phones[1]}
                    </a>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-med-50 text-med-700">
                      <MessageCircle className="h-6 w-6" />
                    </span>
                    <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">WhatsApp</p>
                    <a href={`https://wa.me/91${whatsapp}`} target="_blank" rel="noreferrer" className="mt-1 block font-display text-xl font-bold text-navy-900 hover:text-med-700">
                      Chat Now
                    </a>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <Mail className="h-6 w-6" />
                    </span>
                    <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">Email</p>
                    <a href={`mailto:${email}`} className="mt-1 block break-all font-display text-sm font-bold text-navy-900 hover:text-brand-700">
                      {email}
                    </a>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.15}>
                <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-5 w-5 text-brand-700" />
                    <h3 className="font-display font-semibold text-navy-900">Working Hours</h3>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                      <span className="text-slate-600">OPD</span>
                      <span className="font-semibold text-navy-900">Mon – Sat: 9:00 AM – 8:00 PM</span>
                    </div>
                    <div className="flex justify-between rounded-xl bg-red-50 px-4 py-2.5">
                      <span className="text-slate-600">Emergency</span>
                      <span className="font-semibold text-red-700">24 / 7 Available</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container-site">
          <Reveal>
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-brand-700" />
                <h3 className="font-display text-lg font-semibold text-navy-900">Our Branches</h3>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {branches.map((b) => (
                  <a
                    key={b._id}
                    href={`/branches/${b.slug}`}
                    className="group rounded-2xl border border-slate-100 p-4 transition-all hover:border-brand-200 hover:bg-brand-50/50"
                  >
                    <p className="font-semibold text-navy-900 group-hover:text-brand-700">{b.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{b.address}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                      <Phone className="h-3 w-3" /> {b.phone || 'Call branch'}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
