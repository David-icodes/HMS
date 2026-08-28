'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Maximize2, ImageIcon, PlayCircle } from 'lucide-react';
import type { GalleryItem } from '@/types';
import { cn } from '@/lib/utils';

export function GalleryThumb({ item, onClick }: { item: GalleryItem; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-left shadow-card transition-all duration-300 hover:border-brand-300 hover:shadow-card-hover"
    >
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-600 to-brand-900">
          {item.videoUrl ? (
            <PlayCircle className="h-12 w-12 text-white/70" />
          ) : (
            <ImageIcon className="h-10 w-10 text-white/50" />
          )}
        </div>
      )}
      {item.videoUrl && (
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-navy-950/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
          <PlayCircle className="h-3.5 w-3.5" /> Video
        </span>
      )}
      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-navy-950/80 via-navy-950/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="flex w-full items-center justify-between gap-2 p-4">
          <span className="line-clamp-1 text-sm font-semibold text-white">{item.title}</span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <Maximize2 className="h-4 w-4 text-white" />
          </span>
        </div>
      </div>
    </button>
  );
}

export default function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [active, setActive] = React.useState<number | null>(null);

  const close = React.useCallback(() => setActive(null), []);
  const step = React.useCallback(
    (dir: number) => {
      setActive((cur) => (cur === null ? cur : (cur + dir + items.length) % items.length));
    },
    [items.length],
  );

  React.useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, close, step]);

  const item = active !== null ? items[active] : null;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((it, i) => (
          <GalleryThumb key={it._id} item={it} onClick={() => setActive(i)} />
        ))}
      </div>

      <AnimatePresence>
        {item && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/90 p-4 backdrop-blur-sm"
            onClick={close}
          >
            <button
              onClick={close}
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-8"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-8"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <motion.div
              key={item._id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="max-h-full w-full max-w-4xl overflow-hidden rounded-2xl bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.title} className="max-h-[70vh] w-full object-contain bg-slate-100" />
              ) : item.videoUrl ? (
                <div className="flex h-[55vh] w-full items-center justify-center bg-navy-950">
                  <PlayCircle className="h-16 w-16 text-white/50" />
                  <p className="sr-only">Video preview unavailable</p>
                </div>
              ) : (
                <div className="flex h-[55vh] w-full items-center justify-center bg-gradient-to-br from-brand-600 to-brand-900">
                  <ImageIcon className="h-20 w-20 text-white/40" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-navy-900">{item.title}</h3>
                    {item.category && (
                      <p className="mt-1 text-sm text-slate-600">{item.category}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700">
                    {item.type || 'photo'}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
