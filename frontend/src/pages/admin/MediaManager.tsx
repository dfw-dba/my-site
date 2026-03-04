import { useState, useCallback } from "react";
import {
  useAdminMediaList,
  useAdminUploadUrl,
  useAdminRegisterMedia,
  useAdminAlbums,
  useAdminUpsertAlbum,
  useAdminDeleteAlbum,
} from "../../hooks/useAdminApi";
import DataTable from "../../components/admin/DataTable";
import ConfirmModal from "../../components/admin/ConfirmModal";
import FormInput from "../../components/admin/FormInput";
import FormTextarea from "../../components/admin/FormTextarea";
import FormSelect from "../../components/admin/FormSelect";
import type { AdminMediaItem, Album } from "../../types";
import type { Column } from "../../components/admin/DataTable";

type Tab = "media" | "albums";

const ALBUM_CATEGORY_OPTIONS = [
  { value: "family", label: "Family" },
  { value: "vacation", label: "Vacation" },
  { value: "professional", label: "Professional" },
  { value: "showcase", label: "Showcase" },
];

const mediaColumns: Column<AdminMediaItem>[] = [
  {
    key: "filename",
    header: "File",
    render: (row) => (
      <div className="flex items-center gap-3">
        {row.content_type.startsWith("image/") && (
          <div className="w-10 h-10 rounded bg-gray-600 overflow-hidden shrink-0">
            <img
              src={`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/media/${row.s3_key}`}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <span className="text-white text-sm truncate max-w-[200px]">{row.filename}</span>
      </div>
    ),
  },
  {
    key: "album",
    header: "Album",
    render: (row) => row.album_title ?? <span className="text-gray-500">—</span>,
  },
  {
    key: "size",
    header: "Size",
    render: (row) =>
      row.size_bytes ? `${(row.size_bytes / 1024).toFixed(0)} KB` : "—",
  },
  {
    key: "dimensions",
    header: "Dimensions",
    render: (row) =>
      row.width && row.height ? `${row.width}x${row.height}` : "—",
  },
  {
    key: "created_at",
    header: "Uploaded",
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

const albumColumns: Column<Album>[] = [
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
    key: "media_count",
    header: "Media",
    render: (row) => row.media_count,
  },
  {
    key: "sort_order",
    header: "Order",
    render: (row) => row.sort_order,
  },
];

export default function MediaManager() {
  const [tab, setTab] = useState<Tab>("media");
  const mediaQuery = useAdminMediaList();
  const albumsQuery = useAdminAlbums();
  const uploadUrl = useAdminUploadUrl();
  const registerMedia = useAdminRegisterMedia();
  const upsertAlbum = useAdminUpsertAlbum();
  const deleteAlbum = useAdminDeleteAlbum();

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleteAlbumTarget, setDeleteAlbumTarget] = useState<Album | null>(null);

  // Album form
  const [showAlbumForm, setShowAlbumForm] = useState(false);
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumSlug, setAlbumSlug] = useState("");
  const [albumDesc, setAlbumDesc] = useState("");
  const [albumCategory, setAlbumCategory] = useState("");
  const [albumSortOrder, setAlbumSortOrder] = useState("0");
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);

  function openAlbumForm(album?: Album) {
    if (album) {
      setEditingAlbum(album);
      setAlbumTitle(album.title);
      setAlbumSlug(album.slug);
      setAlbumDesc(album.description ?? "");
      setAlbumCategory(album.category);
      setAlbumSortOrder(String(album.sort_order));
    } else {
      setEditingAlbum(null);
      setAlbumTitle("");
      setAlbumSlug("");
      setAlbumDesc("");
      setAlbumCategory("");
      setAlbumSortOrder("0");
    }
    setShowAlbumForm(true);
  }

  function saveAlbum() {
    upsertAlbum.mutate(
      {
        slug: albumSlug,
        title: albumTitle,
        description: albumDesc || null,
        category: albumCategory,
        sort_order: parseInt(albumSortOrder) || 0,
      },
      { onSuccess: () => setShowAlbumForm(false) },
    );
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const { upload_url, s3_key } = await uploadUrl.mutateAsync({
        filename: file.name,
        content_type: file.type,
      });

      await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      let width: number | undefined;
      let height: number | undefined;
      if (file.type.startsWith("image/")) {
        try {
          const bitmap = await createImageBitmap(file);
          width = bitmap.width;
          height = bitmap.height;
          bitmap.close();
        } catch {
          // skip dimensions if createImageBitmap fails
        }
      }

      await registerMedia.mutateAsync({
        s3_key,
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
        width: width ?? null,
        height: height ?? null,
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      await uploadFile(file);
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Media Manager</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-700">
        {(["media", "albums"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {t === "media" ? "Media" : "Albums"}
          </button>
        ))}
      </div>

      {tab === "media" ? (
        <>
          {/* Upload zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors ${
              dragOver
                ? "border-blue-500 bg-blue-500/10"
                : "border-gray-600 hover:border-gray-500"
            }`}
          >
            <p className="text-gray-400 mb-2">
              {uploading ? "Uploading..." : "Drag & drop files here, or"}
            </p>
            {!uploading && (
              <label className="cursor-pointer inline-block px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors">
                Choose Files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
              </label>
            )}
          </div>

          {/* Media grid */}
          {mediaQuery.isLoading ? (
            <div className="text-gray-400">Loading...</div>
          ) : (
            <DataTable
              columns={mediaColumns}
              data={mediaQuery.data?.items ?? []}
              keyFn={(row) => row.id}
              emptyMessage="No media files uploaded yet."
            />
          )}
        </>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => openAlbumForm()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              New Album
            </button>
          </div>

          {albumsQuery.isLoading ? (
            <div className="text-gray-400">Loading...</div>
          ) : (
            <DataTable
              columns={albumColumns}
              data={albumsQuery.data ?? []}
              keyFn={(row) => row.id}
              emptyMessage="No albums yet."
              actions={(row) => (
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => openAlbumForm(row)}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteAlbumTarget(row)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
              )}
            />
          )}
        </>
      )}

      {/* Album form modal */}
      {showAlbumForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAlbumForm(false)} />
          <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingAlbum ? "Edit Album" : "New Album"}
            </h3>
            <div className="space-y-4">
              <FormInput label="Title" value={albumTitle} onChange={setAlbumTitle} required />
              <FormInput
                label="Slug"
                value={albumSlug}
                onChange={setAlbumSlug}
                required
                disabled={!!editingAlbum}
              />
              <FormTextarea label="Description" value={albumDesc} onChange={setAlbumDesc} rows={3} />
              <FormSelect
                label="Category"
                value={albumCategory}
                onChange={setAlbumCategory}
                options={ALBUM_CATEGORY_OPTIONS}
                required
              />
              <FormInput label="Sort Order" value={albumSortOrder} onChange={setAlbumSortOrder} type="number" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAlbumForm(false)}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveAlbum}
                disabled={upsertAlbum.isPending || !albumTitle || !albumSlug || !albumCategory}
                className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
              >
                {upsertAlbum.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete album confirm */}
      <ConfirmModal
        open={!!deleteAlbumTarget}
        title="Delete Album"
        message={`Are you sure you want to delete "${deleteAlbumTarget?.title}"? Media items will be unassigned but not deleted.`}
        onConfirm={() => {
          if (deleteAlbumTarget) {
            deleteAlbum.mutate(deleteAlbumTarget.slug, {
              onSuccess: () => setDeleteAlbumTarget(null),
            });
          }
        }}
        onCancel={() => setDeleteAlbumTarget(null)}
        loading={deleteAlbum.isPending}
      />
    </div>
  );
}
