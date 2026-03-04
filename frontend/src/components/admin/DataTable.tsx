import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyFn: (row: T) => string;
  actions?: (row: T) => ReactNode;
  emptyMessage?: string;
}

export default function DataTable<T>({
  columns,
  data,
  keyFn,
  actions,
  emptyMessage = "No items found.",
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">{emptyMessage}</div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3 ${col.className ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
              {actions && (
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {data.map((row) => (
              <tr key={keyFn(row)} className="hover:bg-gray-700/30 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-sm text-gray-300 ${col.className ?? ""}`}>
                    {col.render(row)}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-sm text-right">
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {data.map((row) => (
          <div key={keyFn(row)} className="bg-gray-700/50 rounded-lg p-4 space-y-2">
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between items-start gap-2">
                <span className="text-xs text-gray-400 uppercase">{col.header}</span>
                <span className="text-sm text-gray-300 text-right">{col.render(row)}</span>
              </div>
            ))}
            {actions && (
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-600">
                {actions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
