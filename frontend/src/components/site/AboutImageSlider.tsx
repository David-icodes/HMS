'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import type { AboutImage } from '@/types';
import { cn } from '@/lib/utils';

export default function AboutImageSlider({ images }: { images: AboutImage[] }) {
  const [index, setIndex] = React.useState(0);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = images.length;

  const goTo = React.useCallback(
    (next: number) => {
      setIndex((((next % count) + count) % count));
    },
    [count],
  );

  React.useEffect(() => {
    if (count <= 1) return;
    timer.current = setTimeout(() => goTo(index + 1), 5000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [index, count, goTo]);

  if (count === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-3xl border border-slate-200 bg-brand-50/60 text-slate-400">
        <div className="text-center">
          <ImageIcon className="mx-auto h-10 w-10" />
          <p className="mt-2 text-sm">No images yet — add via Admin &gt; About Images</p>
        </div>
      </div>
    );
  }

  const current = images[index];

  return (
    <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-slate-200 bg-navy-950 shadow-card">
      <AnimatePresence initial={false}>
        <motion.div
          key={current._id || index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          {current.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.image} alt={current.title || 'Hospital facility'} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-brand-600 via-brand-700 to-navy-950">
              <div className="flex h-full items-center justify-center">
                <ImageIcon className="h-16 w-16 text-white/40" />
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/10 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {(current.title || current.caption) && (
        <AnimatePresence mode="wait">
          <motion.div
            key={current._id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 bottom-0 p-6"
          >
            {current.title && (
              <h3 className="font-display text-xl font-semibold text-white sm:text-2xl">{current.title}</h3>
            )}
            {current.caption && <p className="mt-1 text-sm text-white/80">{current.caption}</p>}
          </motion.div>
        </AnimatePresence>
      )}

      {count > 1 && (
        <>
          <button
            onClick={() => goTo(index - 1)}
            className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 hover:bg-white/20"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => goTo(index + 1)}
            className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 hover:bg-white/20"
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
            {images.map((img, i) => (
              <button
                key={img._id || i}
                onClick={() => goTo(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === index ? 'w-7 bg-med-500' : 'w-3 bg-white/40 hover:bg-white/70',
                )}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
