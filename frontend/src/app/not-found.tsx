import Link from 'next/link';
import { Home, Phone, CalendarCheck } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-4 text-center">
      <p className="font-display text-8xl font-bold text-brand-500/40 sm:text-9xl">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">Page Not Found</h1>
      <p className="mt-3 max-w-md text-slate-400">
        The page you are looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on
        track.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-med-600 to-med-500 px-7 py-3 text-sm font-semibold text-white hover:from-med-700 hover:to-med-600"
        >
          <Home className="h-4 w-4" /> Back to Home
        </Link>
        <Link
          href="/book-appointment"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          <CalendarCheck className="h-4 w-4" /> Book Appointment
        </Link>
      </div>
      <a
        href="tel:+919390098723"
        className="mt-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <Phone className="h-4 w-4" /> Need help? Call 93900 98723
      </a>
    </div>
  );
}
