'use client';

import { useEffect, useState } from 'react';
import type { Branch, Doctor, Department } from '@/types';

export function useReferenceData() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [b, d, dept] = await Promise.all([
          fetch('/api/site/branches?limit=50').then((r) => r.json()),
          fetch('/api/site/doctors?limit=100').then((r) => r.json()),
          fetch('/api/site/departments').then((r) => r.json()),
        ]);
        if (!mounted) return;
        setBranches(b.data ?? []);
        setDoctors(d.data ?? []);
        setDepartments(dept.data ?? []);
      } catch {
        /* leave empty */
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { branches, doctors, departments, loading };
}

export const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '02:00 PM', '02:30 PM', '03:00 PM',
  '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM',
  '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM',
];

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function minDatePlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
