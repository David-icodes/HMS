import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Urmila Raj Hospital | Multi-Speciality Care, Hyderabad',
    template: '%s | Urmila Raj Hospital',
  },
  description:
    'Urmila Raj Hospital is a trusted multi-speciality hospital across Hyderabad with 24/7 emergency, modern diagnostics, experienced doctors and compassionate care at every branch.',
  keywords: [
    'hospital',
    'hyderabad',
    'multi-speciality',
    '24/7 emergency',
    'op registration',
    'book appointment',
    'Urmila Raj Hospital',
  ],
  openGraph: {
    title: 'Urmila Raj Hospital | Multi-Speciality Care, Hyderabad',
    description:
      'Trusted multi-speciality care across Hyderabad with 24/7 emergency and modern diagnostics.',
    type: 'website',
    locale: 'en_IN',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
