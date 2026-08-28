import { cn } from '@/lib/utils';

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  light = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'center' | 'left';
  light?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className,
      )}
    >
      {eyebrow && (
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest',
            light ? 'bg-white/10 text-brand-300' : 'bg-brand-50 text-brand-700',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', light ? 'bg-brand-300' : 'bg-brand-700')} />
          {eyebrow}
        </span>
      )}
      <h2
        className={cn(
          'mt-4 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl',
          light ? 'text-white' : 'text-navy-900',
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            'mt-4 text-base leading-relaxed sm:text-lg',
            light ? 'text-slate-300' : 'text-slate-600',
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
