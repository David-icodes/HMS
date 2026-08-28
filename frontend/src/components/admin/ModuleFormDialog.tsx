'use client';

import { useMemo, useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ModuleConfig } from '@/lib/admin-modules';
import { adminFetch } from '@/lib/admin-auth';
import UploadButton from './UploadButton';

export interface RefItem {
  _id: string;
  name: string;
}

const ARRAY_FIELDS = ['qualifications', 'tags'];

interface DialogProps {
  module: ModuleConfig;
  initial: Record<string, unknown> | null;
  references: { branches: RefItem[]; doctors: RefItem[]; departments: RefItem[] };
  onClose: () => void;
  onSaved: () => void;
}

function FieldInput({
  field,
  value,
  onChange,
  refs,
  moduleKey,
}: {
  field: ModuleConfig['fields'][number];
  value: unknown;
  onChange: (v: unknown) => void;
  refs: DialogProps['references'];
  moduleKey: string;
}) {
  const base =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20';

  const options = field.ref
    ? refs[field.ref].map((r) => ({ value: r._id, label: r.name }))
    : field.options || [];

  if (field.type === 'image') {
    return (
      <UploadButton
        value={String(value || '')}
        onChange={(url) => onChange(url)}
        folder={moduleKey || 'misc'}
      />
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        value={String(value || '')}
        rows={field.textareaRows || 4}
        onChange={(e) => onChange(e.target.value)}
        className={base}
      />
    );
  }

  if (field.type === 'number') {
    return (
      <input
        type="number"
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className={base}
      />
    );
  }

  if (field.type === 'checkbox') {
    return (
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? 'bg-sky-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    );
  }

  if (field.type === 'multiselect') {
    if (options.length > 0) {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const active = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(
                    active
                      ? selected.filter((v) => v !== opt.value)
                      : [...selected, opt.value],
                  );
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                  active
                    ? 'bg-sky-600 text-white ring-sky-600'
                    : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }
    return (
      <input
        type="text"
        value={Array.isArray(value) ? value.join(', ') : String(value || '')}
        placeholder="Comma separated values"
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        className={base}
      />
    );
  }

  if (field.type === 'select' || field.type === 'icon') {
    return (
      <select
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
        className={base}
      >
        <option value="">— Select —</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={field.type === 'date' ? 'date' : 'text'}
      value={value === null || value === undefined ? '' : String(value)}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={base}
    />
  );
}

export default function ModuleFormDialog({ module, initial, references, onClose, onSaved }: DialogProps) {
  const isEdit = !!initial;

  const [form, setForm] = useState<Record<string, unknown>>(() => {
    const base: Record<string, unknown> = {};
    for (const f of module.fields) {
      if (initial && initial[f.name] !== undefined) base[f.name] = initial[f.name];
      else if (f.type === 'checkbox') base[f.name] = false;
      else base[f.name] = '';
    }
    return base;
  });
  const [saving, setSaving] = useState(false);

  const requiredMissing = useMemo(() => {
    return module.fields.some((f) => {
      if (!f.required) return false;
      const v = form[f.name];
      if (typeof v === 'string') return v.trim() === '';
      if (Array.isArray(v)) return v.length === 0;
      return v === null || v === undefined || v === '';
    });
  }, [form, module.fields]);

  const set = (name: string, value: unknown) => setForm((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requiredMissing) {
      toast.error('Please fill in all required fields');
      return;
    }

    const payload: Record<string, unknown> = {};
    for (const f of module.fields) {
      let v = form[f.name];
      if (ARRAY_FIELDS.includes(f.name) && typeof v === 'string') {
        v = v.split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (v !== '' && v !== undefined && v !== null) payload[f.name] = v;
      else if (f.type === 'checkbox') payload[f.name] = !!v;
    }

    setSaving(true);
    try {
      if (isEdit && initial) {
        await adminFetch(`/api/admin/content/${module.key}/${initial._id}`, {
          method: 'PUT',
          body: payload,
        });
        toast.success(`${module.singular} updated`);
      } else {
        await adminFetch(`/api/admin/content/${module.key}`, {
          method: 'POST',
          body: payload,
        });
        toast.success(`${module.singular} created`);
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEdit ? `Edit ${module.singular}` : `Add ${module.singular}`}
            </h2>
            <p className="text-xs text-slate-500">{module.description}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {module.fields.map((f) => (
              <div key={f.name} className={f.colSpan === 2 ? 'sm:col-span-2' : ''}>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {f.label}
                  {f.required && <span className="ml-0.5 text-rose-500">*</span>}
                </label>
                <FieldInput
                  field={f}
                  value={form[f.name]}
                  onChange={(v) => set(f.name, v)}
                  refs={references}
                  moduleKey={module.key}
                />
                {f.help && <p className="mt-1 text-[11px] text-slate-400">{f.help}</p>}
              </div>
            ))}
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Save changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
