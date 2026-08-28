'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { ModuleConfig } from '@/lib/admin-modules';
import { adminFetch } from '@/lib/admin-auth';
import DataTable from './DataTable';
import StatusBadge from './StatusBadge';
import ModuleFormDialog, { type RefItem } from './ModuleFormDialog';

interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Row {
  _id: string;
  [key: string]: unknown;
}

export default function ModuleManager({ module }: { module: ModuleConfig }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [references, setReferences] = useState<{ branches: RefItem[]; doctors: RefItem[]; departments: RefItem[] }>({
    branches: [],
    doctors: [],
    departments: [],
  });
  const [dialog, setDialog] = useState<{ open: boolean; item: Row | null }>({ open: false, item: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (sort) params.set('sort', sort.dir === 'desc' ? `-${sort.key}` : sort.key);
      const res = await adminFetch<{ data: ListResponse<Row> }>(`/api/admin/content/${module.key}?${params}`);
      setRows(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [module.key, page, search, status, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    Promise.all(
      ['branches', 'doctors', 'departments'].map((key) =>
        fetch(`/api/site/${key}`).then((r) => r.json()),
      ),
    ).then(([b, d, dept]) => {
      if (!active) return;
      setReferences({
        branches: b.data || [],
        doctors: d.data || [],
        departments: dept.data || [],
      });
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );
    setPage(1);
  };

  const handleToggle = async (row: Row) => {
    try {
      const res = await adminFetch<{ data: { item: Row } }>(
        `/api/admin/content/${module.key}/${row._id}/toggle`,
        { method: 'PATCH', body: { isActive: !row.isActive } },
      );
      setRows((prev) => prev.map((r) => (r._id === row._id ? res.data.item : r)));
      toast.success('Status updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleDelete = async (row: Row) => {
    const label = String(row.name || row.title || row.key || row._id);
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    try {
      await adminFetch(`/api/admin/content/${module.key}/${row._id}`, { method: 'DELETE' });
      toast.success('Deleted');
      setPage(1);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
          {module.statusField && (
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          )}
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
        <button
          onClick={() => setDialog({ open: true, item: null })}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          Add {module.singular}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          columns={module.columns}
          rows={rows}
          rowKey={(r) => r._id}
          sortField={sort?.key}
          sortDir={sort?.dir}
          onSort={handleSort}
          onEdit={(r) => setDialog({ open: true, item: r })}
          onToggle={module.statusField === 'isActive' ? handleToggle : undefined}
          onDelete={(r) => void handleDelete(r)}
        />
        {loading && (
          <div className="flex items-center justify-center gap-2 border-t border-slate-100 py-3 text-xs text-slate-400">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">
            {total} record{total === 1 ? '' : 's'}
            {module.statusField && (
              <span className="ml-2 inline-block align-middle">
                <StatusBadge value={status || 'all'} />
              </span>
            )}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-medium text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {dialog.open && (
        <ModuleFormDialog
          module={module}
          initial={dialog.item}
          references={references}
          onClose={() => setDialog({ open: false, item: null })}
          onSaved={() => void load()}
        />
      )}
    </div>
  );
}
