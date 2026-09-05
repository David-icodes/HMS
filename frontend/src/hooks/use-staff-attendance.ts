'use client';

import { useCallback, useEffect, useState } from 'react';
import { staffFetch } from '@/lib/staff-auth';

interface Attendance {
  _id: string;
  date: string;
  inTime?: string;
  outTime?: string;
}

export function useStaffAttendance() {
  const [status, setStatus] = useState<'none' | 'in' | 'out'>('none');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await staffFetch<{ data: Attendance | null }>('/api/staff/attendance/me');
      const att = res.data;
      if (att) {
        setStatus(att.outTime ? 'out' : 'in');
      } else {
        setStatus('none');
      }
    } catch {
      setStatus('none');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, loading, refresh };
}