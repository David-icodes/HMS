'use client';

import { MessageCircle, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function WhatsAppFloat({ phone }: { phone: string }) {
  const [open, setOpen] = useState(false);

  const message = encodeURIComponent(
    'Hello Urmila Raj Hospital, I would like to know more about your services.',
  );

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      <div
        className={cn(
          'w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft transition-all duration-300',
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
        )}
      >
        <p className="text-sm font-semibold text-navy-900">Chat with us on WhatsApp</p>
        <p className="mt-1 text-xs text-slate-500">
          Quick replies during OPD hours. Share your name and concern.
        </p>
        <a
          href={`https://wa.me/91${phone}?text=${message}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-full bg-med-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-med-700"
        >
          <MessageCircle className="h-4 w-4" /> Start Chat
        </a>
      </div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all',
          open
            ? 'bg-navy-900 text-white'
            : 'bg-gradient-to-br from-med-500 to-med-700 text-white shadow-med-600/40',
        )}
        aria-label="WhatsApp support"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
