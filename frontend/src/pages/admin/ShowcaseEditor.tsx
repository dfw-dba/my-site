import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAdminShowcaseItems, useAdminDeleteShowcaseItem } from "../../hooks/useAdminApi";
import DataTable from "../../components/admin/DataTable";
import ConfirmModal from "../../components/admin/ConfirmModal";
import type { ShowcaseItem } from "../../types";
import type { Column } from "../../components/admin/DataTable";

const columns: Column<ShowcaseItem>[] = [
  {
    key: "title",
    header: "Title",
    render: (row) => <span className="font-medium text-white">{row.title}</span>,
  },
  {
    key: "slug",
    header: "Slug",
    render: (row) => <span className="text-gray-400 font-mono text-xs">{row.slug}</span>,
  },
  {
    key: "category",
    header: "Category",
    render: (row) => (
      <span className="inline-block px-2 py-0.5 text-xs rounded bg-purple-600/30 text-purple-300">
        {row.category}
      </span>
    ),
  },
  {
    key: "technologies",
    header: "Technologies",
    render: (row) => (
      <div className="flex flex-wrap gap-1">
        {row.technologies.slice(0, 3).map((t) => (
          <span key={t} className="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded">
            {t}
          </span>
        ))}
        {row.technologies.length > 3 && (
          <span className="text-xs text-gray-400">+{row.technologies.length - 3}</span>
        )}
      </div>
    ),
  },
  {
    key: "sort_order",
    header: "Order",
    render: (row) => row.sort_order,
  },
];

export default function ShowcaseEditor() {
  const { data, isLoading } = useAdminShowcaseItems();
  const deleteMutation = useAdminDeleteShowcaseItem();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<ShowcaseItem | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Showcase Items</h1>
        <Link
          to="/admin/showcase/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
        >
          New Item
        </Link>
      </div>

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          keyFn={(row) => row.id}
          emptyMessage="No showcase items yet."
          actions={(row) => (
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => navigate(`/admin/showcase/${row.slug}`)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteTarget(row)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Delete
              </button>
            </div>
          )}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Showcase Item"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.slug, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
