'use client';

import { Menu } from 'lucide-react';
import { useAuth } from '@/lib/admin-auth';

export default function AppHeader({ title, onMenu }: { title: string; onMenu: () => void }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-900">{user?.name || 'Admin'}</p>
          <p className="text-xs capitalize text-slate-500">{user?.role || ''}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-sm font-bold uppercase text-white">
          {user?.name?.charAt(0) || 'A'}
        </div>
      </div>
    </header>
  );
}
