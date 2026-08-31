'use client';

import { useEffect, useState, useCallback } from 'react';
import { staffFetch } from '@/lib/staff-auth';
import type { Branch, Department, Doctor, PaymentMethod } from '@/types';

export function useStaffReference() {
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
          staffFetch<{ data: Branch[] }>('/api/site/branches?limit=50'),
          staffFetch<{ data: Department[] }>('/api/site/departments'),
          staffFetch<{ data: Doctor[] }>('/api/site/doctors?limit=100'),
          staffFetch<{ data: PaymentMethod[] }>('/api/staff/payment-methods'),
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
      return doctors.filter((d) => {
        const dep = d.department;
        if (dep && typeof dep === 'object') return dep._id === departmentId;
        if (dep && typeof dep === 'string') return dep === departmentId;
        return false;
      });
    },
    [doctors],
  );

  return { branches, departments, doctors, paymentMethods, loading, doctorsForDepartment };
}
