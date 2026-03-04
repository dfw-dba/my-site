import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAdminBlogPosts, useAdminDeleteBlogPost } from "../../hooks/useAdminApi";
import DataTable from "../../components/admin/DataTable";
import ConfirmModal from "../../components/admin/ConfirmModal";
import type { AdminBlogPostListItem } from "../../types";
import type { Column } from "../../components/admin/DataTable";

const columns: Column<AdminBlogPostListItem>[] = [
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
    key: "published",
    header: "Status",
    render: (row) => (
      <span
        className={`inline-block px-2 py-0.5 text-xs rounded ${
          row.published
            ? "bg-green-600/30 text-green-300"
            : "bg-yellow-600/30 text-yellow-300"
        }`}
      >
        {row.published ? "Published" : "Draft"}
      </span>
    ),
  },
  {
    key: "tags",
    header: "Tags",
    render: (row) => (
      <div className="flex flex-wrap gap-1">
        {row.tags.map((t) => (
          <span key={t} className="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded">
            {t}
          </span>
        ))}
      </div>
    ),
  },
  {
    key: "updated_at",
    header: "Updated",
    render: (row) =>
      row.updated_at ? new Date(row.updated_at).toLocaleDateString() : "—",
  },
];

type Filter = "all" | "drafts" | "published";

export default function BlogEditor() {
  const { data, isLoading } = useAdminBlogPosts();
  const deleteMutation = useAdminDeleteBlogPost();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<AdminBlogPostListItem | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const allPosts = data?.posts ?? [];
  const filteredPosts =
    filter === "drafts"
      ? allPosts.filter((p) => !p.published)
      : filter === "published"
        ? allPosts.filter((p) => p.published)
        : allPosts;

  const draftCount = allPosts.filter((p) => !p.published).length;
  const publishedCount = allPosts.filter((p) => p.published).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Blog Posts</h1>
        <Link
          to="/admin/blog/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
        >
          New Post
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-700">
        {([
          { key: "all", label: "All", count: allPosts.length },
          { key: "drafts", label: "Drafts", count: draftCount },
          { key: "published", label: "Published", count: publishedCount },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === tab.key
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-gray-500">({tab.count})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredPosts}
          keyFn={(row) => row.id}
          emptyMessage={
            filter === "drafts"
              ? "No draft posts."
              : filter === "published"
                ? "No published posts."
                : "No blog posts yet. Create your first post!"
          }
          actions={(row) => (
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => navigate(`/admin/blog/${row.slug}`)}
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
        title="Delete Blog Post"
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
