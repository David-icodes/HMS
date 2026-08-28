import type { Metadata } from 'next';
import { siteFetch } from '@/lib/api';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import WhatsAppFloat from '@/components/site/WhatsAppFloat';

interface SettingsEntry {
  key: string;
  value: unknown;
}

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const entries = await siteFetch<SettingsEntry[]>('/api/site/settings', ['settings']);
  const settings: Record<string, unknown> = {};
  (entries || []).forEach((s) => {
    settings[s.key] = s.value;
  });

  const rawPhones = settings['contact.phones'];
  const phones = Array.isArray(rawPhones)
    ? rawPhones
        .map((p) =>
          typeof p === 'string' ? p : typeof (p as { number?: string })?.number === 'string' ? (p as { number: string }).number : '',
        )
        .filter(Boolean)
    : [];
  const resolvedPhones = phones.length > 0 ? phones : ['9390098723', '9294002293'];
  const whatsapp = (settings['contact.whatsapp'] as string) || resolvedPhones[0];
  const email = (settings['contact.email'] as string) || 'care@urmilarajhospital.com';
  const address = (settings['contact.address'] as string) || 'Hyderabad, Telangana';

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="sr-only">
        <a href="#main-content">Skip to main content</a>
      </div>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter
        phones={resolvedPhones}
        whatsapp={whatsapp}
        email={email}
        address={address}
      />
      <WhatsAppFloat phone={whatsapp} />
    </div>
  );
}
