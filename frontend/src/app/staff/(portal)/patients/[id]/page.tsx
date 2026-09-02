'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Printer, Receipt } from 'lucide-react';
import { staffFetch } from '@/lib/staff-auth';
import type { Patient, Visit } from '@/types';

export default function StaffPatientView() {
  const params = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await staffFetch<{ data: { patient: Patient; visits: Visit[] } }>(
        `/api/staff/patients/${params.id}/visits`,
      );
      setPatient(res.data.patient);
      setVisits(Array.isArray(res.data.visits) ? res.data.visits : []);
    } catch {
      setError('Unable to load patient. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error || !patient) {
    return <p className="py-16 text-center text-slate-400">{error || 'Patient not found.'}</p>;
  }

  return (
    <div className="space-y-5">
      <Link href="/staff/patients" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-teal-700">
        <ArrowLeft className="h-4 w-4" /> Back to patients
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{patient.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>UHID: <span className="font-mono text-slate-700">{patient.uhid || '—'}</span></span>
              <span>Mobile: {patient.mobile || '—'}</span>
              <span>Age: {patient.age ?? '—'}</span>
              <span>Gender: {patient.gender || '—'}</span>
              <span>C/H: {patient.cH || '—'}</span>
              <span>F/N: {patient.fN || '—'}</span>
            </div>
            {patient.address && <p className="mt-2 text-sm text-slate-600">{patient.address}</p>}
          </div>
          <div className="flex items-center gap-2">
            {patient.visitCount !== undefined && (
              <span className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700">
                {patient.visitCount} visit{patient.visitCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900">Visit History</h3>
        </div>
        {visits.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">No visits found for this patient.</p>
        ) : (
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="bg-slate-50">
              <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5 font-semibold">Visit Date</th>
                <th className="px-4 py-2.5 font-semibold">OP No.</th>
                <th className="px-4 py-2.5 font-semibold">Type</th>
                <th className="px-4 py-2.5 font-semibold">Branch</th>
                <th className="px-4 py-2.5 font-semibold">Department</th>
                <th className="px-4 py-2.5 font-semibold">Doctor</th>
                <th className="px-4 py-2.5 font-semibold">Diagnosis</th>
                <th className="px-4 py-2.5 font-semibold">Treatment</th>
                <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                <th className="px-4 py-2.5 text-right font-semibold">Paid</th>
                <th className="px-4 py-2.5 text-right font-semibold">Due</th>
                <th className="px-4 py-2.5 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visits.map((v) => (
                <tr key={v._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{formatDate(v.visitDate || v.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{v.opNumber || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.visitType || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.branch?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.department?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.doctor?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.diagnosis || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.treatment || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{inr(v.charges?.total)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{inr(v.payment?.advanced)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-amber-600">{inr(v.payment?.due)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/staff/patients/${patient._id}/invoice`}
                      className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-teal-700"
                    >
                      <Printer className="h-3 w-3" /> Invoice
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Link
        href={`/staff/patients/${patient._id}/invoice`}
        className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
      >
        <Receipt className="h-4 w-4" /> Generate Invoice
      </Link>
    </div>
  );
}

function formatDate(s: string | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function inr(n: number | undefined): string {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}