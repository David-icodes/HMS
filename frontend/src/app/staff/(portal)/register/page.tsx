'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt } from 'lucide-react';
import RegistrationForm, { type RegisteredResult } from '@/components/staff/RegistrationForm';

export default function StaffRegisterPage() {
  const router = useRouter();
  const [last, setLast] = useState<RegisteredResult | null>(null);

  const handleRegistered = (result: RegisteredResult) => {
    setLast(result);
    router.push(`/staff/visits/${result.visit._id}/invoice`);
  };

  return (
    <div className="space-y-5">
      <RegistrationForm onRegistered={handleRegistered} />

      {last && (
        <div className="flex items-center justify-between rounded-2xl border border-teal-200 bg-teal-50 p-5">
          <div className="text-sm text-teal-800">
            <p className="font-semibold">
              {last.patient.name} ({last.patient.uhid})
            </p>
            <p className="text-xs text-teal-700">
              Visit saved · Total {`₹${(last.visit.charges?.total || 0).toLocaleString('en-IN')}`} · OP {last.visit.opNumber}
            </p>
          </div>
          <button
            onClick={() => router.push(`/staff/visits/${last.visit._id}/invoice`)}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <Receipt className="h-4 w-4" /> Go to Invoice
          </button>
        </div>
      )}
    </div>
  );
}
