'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Pencil, Printer, Receipt, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/admin-auth';
import type { Patient, Visit } from '@/types';

export default function AdminPatientView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch<{ data: { patient: Patient; visits: Visit[] } }>(
        `/api/admin/patients/${params.id}`,
      );
      setPatient(res.data.patient);
      setVisits(Array.isArray(res.data.visits) ? res.data.visits : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load patient');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async () => {
    if (!patient) return;
    if (!window.confirm(`Are you sure you want to delete this patient?\n\n${patient.name} (${patient.mobile})`)) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/admin/patients/${patient._id}`, { method: 'DELETE' });
      toast.success('Patient deleted');
      router.push('/admin/patients');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete patient');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  if (!patient) {
    return <p className="py-16 text-center text-slate-400">Patient not found.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/admin/patients" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-sky-700">
          <ArrowLeft className="h-4 w-4" /> Back to patients
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/patients"
            onClick={(e) => {
              e.preventDefault();
              void load();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Receipt className="h-4 w-4" /> Invoice
          </Link>
          <Link
            href={`/staff/patients/${patient._id}/invoice`}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            <Printer className="h-4 w-4" /> Generate Invoice
          </Link>
          <button
            onClick={() => void remove()}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>
        </div>
      </div>

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
              <span className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Link
        href="/admin/patients"
        onClick={(e) => {
          e.preventDefault();
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
      >
        <Pencil className="h-4 w-4" /> Edit on list page
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