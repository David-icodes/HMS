'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CalendarCheck, CheckCircle2, Loader2 } from 'lucide-react';
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
import { useReferenceData, TIME_SLOTS, todayISO, minDatePlus } from '@/hooks/use-reference-data';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Please enter your full name'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  branch: z.string().min(1, 'Select a branch'),
  doctor: z.string().optional(),
  date: z.string().min(1, 'Select a date'),
  time: z.string().min(1, 'Select a time slot'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function AppointmentForm({ compact = false }: { compact?: boolean }) {
  const { branches, doctors, loading } = useReferenceData();
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState<FormValues | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { doctor: '' },
  });

  const selectedBranch = watch('branch');
  const branchDoctors = selectedBranch
    ? doctors.filter((d) => d.branches?.some((b) => b._id === selectedBranch))
    : doctors;

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/site/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Booking failed');
      setDone(values);
      reset({ name: '', mobile: '', branch: '', doctor: '', date: '', time: '', notes: '' });
      toast.success('Appointment request received!');
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
      <form onSubmit={handleSubmit(onSubmit)} className={cn('grid gap-5', compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3')}>
        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name *</Label>
          <Input id="name" placeholder="e.g. Ravi Kumar" {...register('name')} className={field('name')} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mobile">Mobile Number *</Label>
          <Input id="mobile" placeholder="10-digit mobile" maxLength={10} inputMode="numeric" {...register('mobile')} className={field('mobile')} />
          {errors.mobile && <p className="text-xs text-red-500">{errors.mobile.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="branch">Branch *</Label>
          <Select
            id="branch"
            disabled={loading}
            value={selectedBranch}
            onChange={(e) => {
              setValue('branch', e.target.value);
              setValue('doctor', '');
            }}
            className={field('branch')}
          >
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
          <Label htmlFor="date">Preferred Date *</Label>
          <Input id="date" type="date" min={todayISO()} max={minDatePlus(30)} {...register('date')} className={field('date')} />
          {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="time">Preferred Time *</Label>
          <Select id="time" {...register('time')} className={field('time')}>
            <option value="">Select time</option>
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          {errors.time && <p className="text-xs text-red-500">{errors.time.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="doctor">Doctor</Label>
          <Select id="doctor" {...register('doctor')}>
            <option value="">Any available doctor</option>
            {branchDoctors.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} — {d.specialization}
              </option>
            ))}
          </Select>
        </div>

        <div className={cn('space-y-1.5', compact ? 'sm:col-span-2' : 'lg:col-span-3')}>
          <Label htmlFor="notes">Reason / Notes (optional)</Label>
          <Textarea id="notes" placeholder="Briefly describe your concern (e.g. fever since 2 days, knee pain)…" {...register('notes')} />
        </div>

        <div className={cn('sm:col-span-2', !compact && 'lg:col-span-3')}>
          <Button type="submit" variant="gradient" size="lg" disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CalendarCheck className="h-5 w-5" />}
            {submitting ? 'Submitting…' : 'Request Appointment'}
          </Button>
          <p className="mt-3 text-center text-xs text-slate-500">
            Our team will call you to confirm your appointment slot.
          </p>
        </div>
      </form>

      <Dialog open={!!done} onOpenChange={(o) => !o && setDone(null)}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-med-100">
              <CheckCircle2 className="h-9 w-9 text-med-600" />
            </span>
            <DialogHeader>
              <DialogTitle className="mt-3 text-xl">Request Received!</DialogTitle>
              <DialogDescription className="mt-2">
                Thank you, <span className="font-semibold text-navy-900">{done?.name}</span>. We have
                noted your request for{' '}
                <span className="font-semibold text-navy-900">
                  {done?.date} at {done?.time}
                </span>
                . Our team will call you shortly on {done?.mobile} to confirm.
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
