'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarCheck, Phone, ShieldCheck, Clock3, HeartPulse } from 'lucide-react';
import type { HeroSlide } from '@/types';
import { cn } from '@/lib/utils';

function SlideVisual({ index }: { index: number }) {
  const hues = [
    'from-brand-800 via-brand-700 to-navy-950',
    'from-[#0a3d7e] via-brand-700 to-brand-900',
    'from-navy-900 via-brand-800 to-brand-600',
  ];
  return (
    <div className={cn('absolute inset-0 bg-gradient-to-br', hues[index % hues.length])}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.18), transparent 45%), radial-gradient(ellipse at 10% 90%, rgba(22,163,74,0.35), transparent 45%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.09]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-med-500/20 blur-3xl" />
    </div>
  );
}

const FLOATERS = [
  { icon: ShieldCheck, label: '24/7 Emergency', className: 'top-[18%] left-[6%]' },
  { icon: HeartPulse, label: 'Advanced ICU', className: 'top-[26%] right-[7%]' },
  { icon: Clock3, label: 'Open All Days', className: 'bottom-[24%] left-[9%]' },
];

export default function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = slides.length;
  const goTo = React.useCallback(
    (next: number) => {
      setDirection(next > index ? 1 : -1);
      setIndex((next + count) % count);
    },
    [index, count],
  );

  React.useEffect(() => {
    if (count <= 1) return;
    timer.current = setTimeout(() => goTo(index + 1), 6500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [index, count, goTo]);

  const slide = slides[index] || ({} as HeroSlide);

  return (
    <section className="relative h-[86vh] min-h-[560px] w-full overflow-hidden bg-navy-950">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={slide._id || index}
          custom={direction}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <SlideVisual index={index} />
        </motion.div>
      </AnimatePresence>

      {FLOATERS.map((f) => (
        <motion.div
          key={f.label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className={cn('absolute z-10 hidden xl:block', f.className)}
        >
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
            <f.icon className="h-5 w-5 text-med-400" />
            <span className="text-sm font-semibold text-white">{f.label}</span>
          </div>
        </motion.div>
      ))}

      <div className="container-site relative z-20 flex h-full items-center">
        <div className="max-w-3xl pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide._id || index}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-100 backdrop-blur">
                <HeartPulse className="h-4 w-4 text-med-400" />
                {slide.subtitle || 'Multi-Speciality Care, Close to Home'}
              </span>
              <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight text-white text-balance sm:text-5xl lg:text-6xl">
                {slide.title || 'Caring for the Health of Your Family'}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-50/90 sm:text-lg">
                {slide.description ||
                  'Trusted doctors, modern diagnostics and compassionate care across Hyderabad.'}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={slide.ctaHref || '/book-appointment'}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-med-600 to-med-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-med-700/30 transition-all hover:scale-[1.02] hover:shadow-med-600/40"
                >
                  <CalendarCheck className="h-5 w-5" />
                  {slide.ctaLabel || 'Book Appointment'}
                </Link>
                <a
                  href="tel:+919390098723"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-full border-2 border-white/30 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
                >
                  <Phone className="h-5 w-5" /> 93900 98723
                </a>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 z-20 w-full">
        <div className="container-site flex items-center justify-between pb-8">
          <div className="flex items-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s._id || i}
                onClick={() => goTo(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-500',
                  i === index ? 'w-10 bg-med-500' : 'w-3 bg-white/30 hover:bg-white/60',
                )}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goTo(index - 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => goTo(index + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
              aria-label="Next slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 h-1 w-full bg-white/10">
        {count > 1 && (
          <motion.div
            key={index}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 6.5, ease: 'linear' }}
            className="h-full bg-gradient-to-r from-med-500 to-med-400"
          />
        )}
      </div>
    </section>
  );
}
