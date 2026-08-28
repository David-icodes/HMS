'use client';

import { ArrowDown, ArrowUp, Check, X } from 'lucide-react';
import type { ModuleColumn } from '@/lib/admin-modules';

function CellValue({
  col,
  value,
  refLabel,
}: {
  col: ModuleColumn;
  value: unknown;
  refLabel?: string;
}) {
  if (value === null || value === undefined || value === '') return <span className="text-slate-400">—</span>;

  switch (col.type) {
    case 'boolean':
      return value ? (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="h-3 w-3" />
        </span>
      ) : (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <X className="h-3 w-3" />
        </span>
      );
    case 'status':
      return <span className="text-xs font-semibold">{String(value)}</span>;
    case 'date':
      return <span className="text-sm">{String(value).slice(0, 10)}</span>;
    case 'datetime':
      return <span className="text-sm">{new Date(String(value)).toLocaleString()}</span>;
    case 'badge':
      return (
        <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/20">
          {String(value)}
        </span>
      );
    case 'reference':
      return <span className="text-sm">{refLabel || String(value)}</span>;
    default:
      return (
        <span className="block max-w-[260px] truncate text-sm" title={String(value)}>
          {String(value)}
        </span>
      );
  }
}

export default function DataTable<T extends { _id: string }>({
  columns,
  rows,
  rowKey,
  sortField,
  sortDir,
  onSort,
  onEdit,
  onToggle,
  onDelete,
}: {
  columns: ModuleColumn[];
  rows: T[];
  rowKey: (row: T) => string;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onEdit?: (row: T) => void;
  onToggle?: (row: T) => void;
  onDelete?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((col) => (
              <th key={col.key} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {onSort && col.type !== 'reference' ? (
                  <button
                    className="inline-flex items-center gap-1 hover:text-slate-800"
                    onClick={() => onSort(col.key)}
                  >
                    {col.label}
                    {sortField === col.key &&
                      (sortDir === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
            <th className="w-28 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const refs = row as unknown as Record<string, { name?: string }>;
            return (
              <tr
                key={rowKey(row)}
                className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/60"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <CellValue
                      col={col}
                      value={(row as unknown as Record<string, unknown>)[col.key]}
                      refLabel={
                        col.type === 'reference'
                          ? refs[col.key]?.name
                          : undefined
                      }
                    />
                  </td>
                ))}
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="rounded-md px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                      >
                        Edit
                      </button>
                    )}
                    {onToggle && (
                      <button
                        onClick={() => onToggle(row)}
                        className="rounded-md px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        {(row as unknown as Record<string, unknown>).isActive ? 'Disable' : 'Enable'}
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        className="rounded-md px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="py-14 text-center text-sm text-slate-400">No records found.</div>
      )}
    </div>
  );
}
