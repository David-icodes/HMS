'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface StaffAuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useStaffAuth = create<StaffAuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'urmila-staff-auth' },
  ),
);

export class StaffApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'StaffApiError';
    this.status = status;
  }
}

export async function staffFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { token } = useStaffAuth.getState();
  const res = await fetch(path, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    useStaffAuth.getState().logout();
    window.location.href = '/staff/login';
    throw new StaffApiError(401, 'Session expired. Please sign in again.');
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new StaffApiError(res.status, payload?.message || `Request failed (${res.status})`);
  }
  return payload as T;
}

export async function fetchStaffMe(): Promise<User | null> {
  try {
    const res = await staffFetch<{ data: User }>('/api/auth/me');
    return res.data;
  } catch {
    return null;
  }
}

export const STAFF_ROLES = ['receptionist', 'admin', 'superAdmin'];
