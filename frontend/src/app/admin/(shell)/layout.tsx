'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth, fetchMe } from '@/lib/admin-auth';
import { MODULES } from '@/lib/admin-modules';
import AppSidebar from '@/components/admin/AppSidebar';
import AppHeader from '@/components/admin/AppHeader';

function titleFor(pathname: string) {
  if (pathname === '/admin') return 'Dashboard';
  if (pathname === '/admin/users') return 'Users & Roles';
  if (pathname === '/admin/activity') return 'Activity Logs';
  if (pathname === '/admin/settings') return 'Settings';
  if (pathname === '/admin/patients') return 'Patients';
  const match = pathname.match(/^\/admin\/([^/]+)/);
  if (match && MODULES[match[1]]) return MODULES[match[1]].label;
  return 'Admin';
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { token, user, setUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    let active = true;
    fetchMe()
      .then((me) => {
        if (!active) return;
        if (me) setUser(me);
        setVerified(true);
      })
      .catch(() => {
        if (active) router.replace('/admin/login');
      });
    return () => {
      active = false;
    };
  }, [token, router, setUser]);

  if (!token || !verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
          <p className="text-sm">Loading admin panel…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72">
        <AppHeader title={titleFor(pathname)} onMenu={() => setSidebarOpen(true)} />
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
