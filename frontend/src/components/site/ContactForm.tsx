'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Please enter your name'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  subject: z.string().min(1, 'Select a subject'),
  message: z.string().min(10, 'Message should be at least 10 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function ContactForm() {
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { subject: 'General Enquiry' } });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    console.log('Contact message (demo):', values);
    setSent(true);
    setSubmitting(false);
    reset();
    toast.success('Message sent! We will get back to you soon.');
  };

  const field = (key: keyof FormValues) =>
    cn(errors[key] && 'border-red-400 focus-visible:border-red-400 focus-visible:ring-red-200');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cname">Your Name *</Label>
          <Input id="cname" placeholder="Full name" {...register('name')} className={field('name')} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cphone">Mobile Number *</Label>
          <Input id="cphone" maxLength={10} inputMode="numeric" placeholder="10-digit mobile" {...register('phone')} className={field('phone')} />
          {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cemail">Email (optional)</Label>
          <Input id="cemail" type="email" placeholder="you@example.com" {...register('email')} className={field('email')} />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="csubject">Subject *</Label>
          <Select id="csubject" {...register('subject')}>
            {['General Enquiry', 'Appointment', 'OP Registration', 'Insurance / Billing', 'Feedback', 'Other'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cmessage">Message *</Label>
        <Textarea id="cmessage" rows={5} placeholder="How can we help you?" {...register('message')} className={field('message')} />
        {errors.message && <p className="text-xs text-red-500">{errors.message.message}</p>}
      </div>
      <Button type="submit" variant="gradient" size="lg" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : sent ? <CheckCircle2 className="h-5 w-5" /> : <Send className="h-5 w-5" />}
        {submitting ? 'Sending…' : 'Send Message'}
      </Button>
    </form>
  );
}
