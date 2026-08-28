'use client';

import { useParams } from 'next/navigation';
import { MODULES } from '@/lib/admin-modules';
import ModuleManager from '@/components/admin/ModuleManager';

export default function AdminModulePage() {
  const params = useParams<{ module: string }>();
  const module = MODULES[params.module];

  if (!module) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h2 className="text-lg font-bold text-slate-900">Module not found</h2>
        <p className="mt-1 text-sm text-slate-500">The requested content module does not exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
          <module.icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{module.label}</h2>
          <p className="text-sm text-slate-500">{module.description}</p>
        </div>
      </div>
      <ModuleManager module={module} />
    </div>
  );
}
