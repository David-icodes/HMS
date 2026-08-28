'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useReferenceData } from '@/hooks/use-reference-data';
import { GENDERS } from '@/lib/site-data';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Please enter the patient name'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  age: z.coerce.number().min(0).max(130, 'Enter a valid age'),
  gender: z.string().min(1, 'Select gender'),
  branch: z.string().min(1, 'Select a branch'),
  department: z.string().min(1, 'Select a department'),
  address: z.string().optional(),
  concern: z.string().optional(),
  preferredDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function OpRegistrationForm() {
  const { branches, departments, loading } = useReferenceData();
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState<{ name: string; opdNumber?: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { gender: '', preferredDate: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/site/op-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Registration failed');
      setDone({ name: values.name, opdNumber: payload.data?.registration?.opdNumber });
      reset({ name: '', mobile: '', age: undefined, gender: '', branch: '', department: '', address: '', concern: '', preferredDate: '' });
      toast.success('OP registration successful!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key: keyof FormValues) =>
    cn(errors[key] && 'border-red-400 focus-visible:border-red-400 focus-visible:ring-red-200');

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Patient Name *</Label>
          <Input id="name" placeholder="Full name of the patient" {...register('name')} className={field('name')} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="age">Age *</Label>
            <Input id="age" type="number" min={0} max={130} placeholder="35" {...register('age')} className={field('age')} />
            {errors.age && <p className="text-xs text-red-500">{errors.age.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gender">Gender *</Label>
            <Select id="gender" {...register('gender')} className={field('gender')}>
              <option value="">Select</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </Select>
            {errors.gender && <p className="text-xs text-red-500">{errors.gender.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mobile">Mobile Number *</Label>
          <Input id="mobile" placeholder="10-digit mobile" maxLength={10} inputMode="numeric" {...register('mobile')} className={field('mobile')} />
          {errors.mobile && <p className="text-xs text-red-500">{errors.mobile.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="branch">Branch *</Label>
          <Select id="branch" disabled={loading} {...register('branch')} className={field('branch')}>
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name} — {b.area}
              </option>
            ))}
          </Select>
          {errors.branch && <p className="text-xs text-red-500">{errors.branch.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="department">Department *</Label>
          <Select id="department" disabled={loading} {...register('department')} className={field('department')}>
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </Select>
          {errors.department && <p className="text-xs text-red-500">{errors.department.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="preferredDate">Preferred Date (optional)</Label>
          <Input id="preferredDate" type="date" {...register('preferredDate')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">Address (optional)</Label>
          <Input id="address" placeholder="Area / locality" {...register('address')} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="concern">Symptoms / Reason for visit</Label>
          <Textarea id="concern" placeholder="e.g. fever, headache, stomach pain…" {...register('concern')} />
        </div>

        <div className="sm:col-span-2">
          <Button type="submit" variant="gradient" size="lg" disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Ticket className="h-5 w-5" />}
            {submitting ? 'Registering…' : 'Register for OP Consultation'}
          </Button>
        </div>
      </form>

      <Dialog open={!!done} onOpenChange={(o) => !o && setDone(null)}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-med-100">
              <CheckCircle2 className="h-9 w-9 text-med-600" />
            </span>
            <DialogHeader>
              <DialogTitle className="mt-3 text-xl">OP Registered!</DialogTitle>
              <DialogDescription className="mt-2">
                <span className="font-semibold text-navy-900">{done?.name}</span> has been registered
                for consultation. {done?.opdNumber && <>Your OP number is <span className="font-semibold text-brand-700">{done.opdNumber}</span>.</>}{' '}
                Please visit the front desk at your selected branch with your mobile number.
              </DialogDescription>
            </DialogHeader>
            <Button className="mt-5 w-full" onClick={() => setDone(null)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
