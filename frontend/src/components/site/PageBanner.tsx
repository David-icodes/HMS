import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export default function PageBanner({
  title,
  eyebrow,
  breadcrumb,
}: {
  title: string;
  eyebrow?: string;
  breadcrumb: { label: string; href?: string }[];
}) {
  return (
    <section className="relative overflow-hidden bg-navy-950 py-16 sm:py-20">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 10% 0%, rgb(14 90 191 / 0.45), transparent 55%), radial-gradient(ellipse at 90% 100%, rgb(22 163 74 / 0.2), transparent 50%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="container-site relative">
        <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <Link href="/" className="flex items-center gap-1.5 transition-colors hover:text-white">
            <Home className="h-3.5 w-3.5" /> Home
          </Link>
          {breadcrumb.map((c) => (
            <span key={c.label} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 text-brand-400" />
              {c.href ? (
                <Link href={c.href} className="transition-colors hover:text-white">
                  {c.label}
                </Link>
              ) : (
                <span className="text-brand-300">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        {eyebrow && (
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-brand-300">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl lg:text-5xl">
          {title}
        </h1>
      </div>
    </section>
  );
}
