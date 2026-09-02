'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Lock, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useStaffAuth } from '@/lib/staff-auth';
import { STAFF_ROLES } from '@/lib/staff-auth';

export default function StaffLoginPage() {
  const router = useRouter();
  const { token, user, setAuth } = useStaffAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && user && STAFF_ROLES.includes(user.role)) router.replace('/staff');
  }, [token, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error('Please enter your username and password');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.message || 'Invalid username or password');
      const u = payload.data.user;
      if (!STAFF_ROLES.includes(u.role)) {
        toast.error('This account does not have staff access');
        return;
      }
      setAuth(payload.data.token, u);
      toast.success(`Welcome, ${u.name.split(' ')[0]}`);
      router.replace('/staff');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-teal-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-sky-600/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xl font-extrabold text-teal-600 shadow-lg">
            UR
          </div>
          <h1 className="text-2xl font-bold text-white">Staff Portal</h1>
          <p className="mt-1 text-sm text-slate-400">Urmila Raj Hospital — OP &amp; Billing</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur"
        >
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Username</label>
          <div className="relative mb-4">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              className="w-full rounded-lg border border-white/10 bg-white/10 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          <label className="mb-1.5 block text-sm font-medium text-slate-300">PIN / Password</label>
          <div className="relative mb-6">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••"
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/10 bg-white/10 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/30 transition-colors hover:bg-teal-500 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in to Staff Portal'}
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 block text-center text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline"
        >
          ← Back to website
        </Link>
      </div>
    </div>
  );
}
