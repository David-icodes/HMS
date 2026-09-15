'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, LogOut, LayoutDashboard, Users, Repeat, Menu, X } from 'lucide-react';
import { useStaffAuth, fetchStaffMe, STAFF_ROLES } from '@/lib/staff-auth';

function titleFor(pathname: string) {
  if (pathname === '/staff') return 'Dashboard';
  if (pathname.includes('/invoice')) return 'Invoice';
  if (pathname === '/staff/patients') return 'Patients';
  if (pathname.startsWith('/staff/follow-up')) return 'Follow-up';
  return 'Staff Portal';
}

export default function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const { token, user, setUser, logout } = useStaffAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [verified, setVerified] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace('/staff/login');
      return;
    }
    let active = true;
    fetchStaffMe()
      .then((me) => {
        if (!active) return;
        if (me && STAFF_ROLES.includes(me.role)) {
          setUser(me);
          setVerified(true);
        } else {
          logout();
          router.replace('/staff/login');
        }
      })
      .catch(() => {
        if (active) router.replace('/staff/login');
      });
    return () => {
      active = false;
    };
  }, [token, router, setUser, logout]);

  if (!token || !verified || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm">Loading staff portal…</p>
        </div>
      </div>
    );
  }

  const isActive = (href: string) =>
    href === '/staff' ? pathname === '/staff' : pathname.startsWith(href);
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-sm font-extrabold text-white">
              UR
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-slate-900">Staff Portal</p>
              <p className="text-[11px] text-slate-400">Urmila Raj Hospital</p>
            </div>
          </div>
          <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
            <Link
              href="/staff"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors ${pathname === '/staff' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
            <Link
              href="/staff/patients"
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 transition-colors ${isActive('/staff/patients') ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Users className="h-4 w-4" /> Patients
            </Link>
            <Link
              href="/staff/follow-up"
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 transition-colors ${isActive('/staff/follow-up') ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Repeat className="h-4 w-4" /> Follow-up
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">{user.name}</p>
              <p className="text-[11px] capitalize text-slate-400">{user.role.replace(/([A-Z])/g, ' $1')}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-red-600 md:inline-flex"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-[80%] max-w-xs flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-bold text-slate-900">Menu</p>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 p-3" aria-label="Mobile">
              <Link
                href="/staff"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium ${pathname === '/staff' ? 'bg-teal-50 text-teal-700' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
              <Link
                href="/staff/patients"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium ${isActive('/staff/patients') ? 'bg-teal-50 text-teal-700' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                <Users className="h-4 w-4" /> Patients
              </Link>
              <Link
                href="/staff/follow-up"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium ${isActive('/staff/follow-up') ? 'bg-teal-50 text-teal-700' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                <Repeat className="h-4 w-4" /> Follow-up
              </Link>
            </nav>
            <div className="border-t border-slate-100 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-800">{user.name}</p>
              <p className="mb-3 text-[11px] capitalize text-slate-400">{user.role.replace(/([A-Z])/g, ' $1')}</p>
              <button
                onClick={logout}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-5 text-xl font-bold text-slate-900">{titleFor(pathname)}</h1>
        {children}
      </main>
    </div>
  );
}
