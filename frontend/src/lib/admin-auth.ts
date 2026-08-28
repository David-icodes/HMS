'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'urmila-admin-auth' },
  ),
);

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

export async function adminFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { token } = useAuth.getState();
  const res = await fetch(path, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    useAuth.getState().logout();
    window.location.href = '/admin/login';
    throw new AdminApiError(401, 'Session expired. Please sign in again.');
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AdminApiError(
      res.status,
      payload?.message || `Request failed (${res.status})`,
    );
  }
  return payload as T;
}

export async function fetchMe(): Promise<User | null> {
  try {
    const res = await adminFetch<{ data: User }>('/api/auth/me');
    return res.data;
  } catch {
    return null;
  }
}
