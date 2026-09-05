'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/admin-auth';
import type { Branch, Department, Doctor, PaymentMethod } from '@/types';

export function useAdminReference() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [b, dept, doc, pm] = await Promise.all([
          adminFetch<{ data: Branch[] }>('/api/site/branches?limit=50'),
          adminFetch<{ data: Department[] }>('/api/site/departments'),
          adminFetch<{ data: Doctor[] }>('/api/site/doctors?limit=100'),
          adminFetch<{ data: PaymentMethod[] }>('/api/admin/payment-methods'),
        ]);
        if (!mounted) return;
        setBranches(b.data ?? []);
        setDepartments(dept.data ?? []);
        setDoctors(doc.data ?? []);
        setPaymentMethods(pm.data ?? []);
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

  const doctorsForDepartment = useCallback(
    (departmentId: string) => {
      if (!departmentId) return doctors;
      const matched = doctors.filter((d) => {
        const dep = d.department;
        if (dep && typeof dep === 'object') return dep._id === departmentId;
        if (dep && typeof dep === 'string') return dep === departmentId;
        return false;
      });
      return matched.length > 0 ? matched : doctors;
    },
    [doctors],
  );

  return { branches, departments, doctors, paymentMethods, loading, doctorsForDepartment };
}