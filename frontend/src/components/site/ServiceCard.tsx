import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { iconMap } from '@/lib/icon-map';
import type { Service } from '@/types';

export default function ServiceCard({ service }: { service: Service }) {
  const Icon = iconMap[service.icon || 'Stethoscope'] || iconMap.Stethoscope;
  return (
    <Link
      href={`/services/${service.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-700/5"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition-all duration-300 group-hover:bg-brand-700 group-hover:text-white">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold text-navy-900">{service.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
        {service.shortDescription}
      </p>
      <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
        Learn more
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
