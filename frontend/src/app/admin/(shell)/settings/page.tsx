'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/admin-auth';

interface SettingRow {
  _id: string;
  key: string;
  label?: string;
  value: unknown;
  group?: string;
  isPublic?: boolean;
}

interface SettingList {
  data: SettingRow[];
  total: number;
}

export default function AdminSettingsPage() {
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedTick, setSavedTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch<{ data: SettingList }>('/api/admin/content/settings?limit=500&sort=group');
      setRows(res.data.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const serialize = (v: unknown) => {
    if (typeof v === 'string') return v;
    return JSON.stringify(v ?? '', null, 2);
  };

  const groups = useMemo(() => {
    const map = new Map<string, SettingRow[]>();
    for (const r of rows) {
      const g = r.group || 'general';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r);
    }
    return Array.from(map.entries());
  }, [rows]);

  const isObjectValue = (v: unknown) => typeof v === 'object' && v !== null;

  const handleSave = async (row: SettingRow) => {
    const raw = drafts[row._id] ?? serialize(row.value);
    let value: unknown = raw;
    if (isObjectValue(row.value)) {
      try {
        value = JSON.parse(raw);
      } catch {
        toast.error('Invalid JSON');
        return;
      }
    }
    setSaving(row._id);
    try {
      await adminFetch(`/api/admin/content/settings/${row._id}`, {
        method: 'PUT',
        body: { value },
      });
      setRows((prev) => prev.map((r) => (r._id === row._id ? { ...r, value } : r)));
      toast.success(`${row.key} updated`);
      setSavedTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(null);
    }
  };

  const input =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Site-wide configuration values. Changes apply immediately to the public website.
        </p>
        {savedTick > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <Check className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([group, items]) => (
            <div key={group} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-bold capitalize text-slate-900">{group.replace(/_/g, ' ')}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {items.map((row) => {
                  const dirty = (drafts[row._id] ?? serialize(row.value)) !== serialize(row.value);
                  return (
                    <div key={row._id} className="px-5 py-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{row.label || row.key}</p>
                          <p className="font-mono text-xs text-slate-400">{row.key}</p>
                        </div>
                        <button
                          onClick={() => void handleSave(row)}
                          disabled={!dirty || saving === row._id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                          {saving === row._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : dirty ? (
                            <Save className="h-3.5 w-3.5" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          {dirty ? 'Save' : 'Saved'}
                        </button>
                      </div>
                      {isObjectValue(row.value) ? (
                        <textarea
                          value={drafts[row._id] ?? serialize(row.value)}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [row._id]: e.target.value }))}
                          rows={4}
                          className={`${input} resize-y`}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            value={drafts[row._id] ?? serialize(row.value)}
                            onChange={(e) => setDrafts((prev) => ({ ...prev, [row._id]: e.target.value }))}
                            className={input}
                          />
                          {dirty && (
                            <button
                              onClick={() => setDrafts((prev) => {
                                const next = { ...prev };
                                delete next[row._id];
                                return next;
                              })}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                              aria-label="Reset"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center text-sm text-slate-400">
              No settings found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
