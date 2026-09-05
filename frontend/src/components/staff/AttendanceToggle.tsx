'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, LogIn, LogOut as LogOutIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { staffFetch } from '@/lib/staff-auth';
import { useStaffAttendance } from '@/hooks/use-staff-attendance';

interface Attendance {
  _id: string;
  date: string;
  inTime?: string;
  outTime?: string;
}

export default function AttendanceToggle() {
  const { status, refresh } = useStaffAttendance();
  const [busy, setBusy] = useState<'in' | 'out' | null>(null);

  const markIn = async () => {
    setBusy('in');
    try {
      await staffFetch('/api/staff/attendance/in', { method: 'POST', body: {} });
      toast.success('Marked IN');
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark IN');
    } finally {
      setBusy(null);
    }
  };

  const markOut = async () => {
    setBusy('out');
    try {
      await staffFetch('/api/staff/attendance/out', { method: 'POST', body: {} });
      toast.success('Marked OUT');
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark OUT');
    } finally {
      setBusy(null);
    }
  };

  if (status === 'in') {
    return (
      <button
        onClick={() => void markOut()}
        disabled={busy !== null}
        title="Mark your OUT for today"
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
      >
        {busy === 'out' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOutIcon className="h-4 w-4" />}
        OUT
      </button>
    );
  }

  if (status === 'out') {
    return (
      <span
        title="Marked OUT for today"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500"
      >
        <Clock className="h-4 w-4" /> OUT
      </span>
    );
  }

  return (
    <button
      onClick={() => void markIn()}
      disabled={busy !== null}
      title="Mark your IN for today"
      className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60"
    >
      {busy === 'in' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
      IN
    </button>
  );
}