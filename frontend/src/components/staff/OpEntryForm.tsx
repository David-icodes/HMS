'use client';

import { useEffect, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { staffFetch } from '@/lib/staff-auth';
import type { Branch, Department } from '@/types';

const GENDERS = ['Male', 'Female', 'Other'];
const PAYMENT_METHODS = [
  { value: 'pending', label: 'Pending' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

export default function OpEntryForm({
  onRegistered,
}: {
  onRegistered: (op: { _id: string; name: string; opdNumber: string }) => void;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    age: '',
    gender: 'Male',
    branch: '',
    department: '',
    address: '',
    concern: '',
    amount: '',
    paymentMethod: 'cash',
  });

  useEffect(() => {
    Promise.all([fetch('/api/site/branches').then((r) => r.json()), fetch('/api/site/departments').then((r) => r.json())])
      .then(([b, d]) => {
        setBranches(b.data || []);
        setDepartments(d.data || []);
      })
      .catch(() => {});
  }, []);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.mobile.trim()) {
      toast.error('Patient name and mobile are required');
      return;
    }
    setSaving(true);
    try {
      const res = await staffFetch<{ data: { op: { _id: string; name: string; opdNumber: string } } }>(
        '/api/staff/op-registrations',
        {
          method: 'POST',
          body: {
            name: form.name.trim(),
            mobile: form.mobile.trim(),
            age: form.age ? Number(form.age) : undefined,
            gender: form.gender,
            branch: form.branch || undefined,
            department: form.department || undefined,
            address: form.address.trim() || undefined,
            concern: form.concern.trim() || undefined,
            amount: form.amount ? Number(form.amount) : 0,
            paymentMethod: form.paymentMethod,
          },
        },
      );
      toast.success(`Patient registered: ${res.data.op.opdNumber}`);
      onRegistered(res.data.op);
      setForm({
        name: '',
        mobile: '',
        age: '',
        gender: 'Male',
        branch: '',
        department: '',
        address: '',
        concern: '',
        amount: '',
        paymentMethod: 'cash',
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register patient');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20';

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
        <UserPlus className="h-5 w-5 text-teal-600" /> New OP Registration
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Patient name *</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="Full name" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Mobile *</label>
          <input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} className={inputCls} placeholder="10-digit mobile" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Age</label>
          <input value={form.age} onChange={(e) => set('age', e.target.value)} type="number" min={0} max={130} className={inputCls} placeholder="Age" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Gender</label>
          <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className={inputCls}>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Branch</label>
          <select value={form.branch} onChange={(e) => set('branch', e.target.value)} className={inputCls}>
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Department</label>
          <select value={form.department} onChange={(e) => set('department', e.target.value)} className={inputCls}>
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">Concern / Symptoms</label>
          <textarea value={form.concern} onChange={(e) => set('concern', e.target.value)} className={inputCls} rows={2} placeholder="Reason for visit" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Address</label>
          <input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputCls} placeholder="Address" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Payment method</label>
          <select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)} className={inputCls}>
            {PAYMENT_METHODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Amount (₹)</label>
          <input value={form.amount} onChange={(e) => set('amount', e.target.value)} type="number" min={0} className={inputCls} placeholder="0" />
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60 sm:w-auto"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        {saving ? 'Registering…' : 'Register Patient'}
      </button>
    </form>
  );
}
