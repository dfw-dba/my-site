import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { showToast } from "../components/admin/Toast";
import type {
  BlogPostCreate,
  ShowcaseItemCreate,
  ResumeEntryCreate,
  ResumeSectionCreate,
  MediaRegister,
  AlbumCreate,
} from "../types";

function onMutationError(error: Error) {
  showToast(error.message || "An error occurred", "error");
}

// ── Blog ─────────────────────────────────────────────────────────────────────

export function useAdminBlogPosts(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["admin-blog-posts", params],
    queryFn: () => api.admin.blog.list(params),
  });
}

export function useAdminBlogPost(slug: string) {
  return useQuery({
    queryKey: ["admin-blog-post", slug],
    queryFn: () => api.admin.blog.get(slug),
    enabled: !!slug,
  });
}

export function useAdminUpsertBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BlogPostCreate) => api.admin.blog.upsert(data),
    onSuccess: () => {
      showToast("Blog post saved", "success");
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
    },
    onError: onMutationError,
  });
}

export function useAdminDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.admin.blog.delete(slug),
    onSuccess: () => {
      showToast("Blog post deleted", "success");
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
    },
    onError: onMutationError,
  });
}

// ── Showcase ─────────────────────────────────────────────────────────────────

export function useAdminShowcaseItems(category?: string) {
  return useQuery({
    queryKey: ["admin-showcase-items", category],
    queryFn: () => api.admin.showcase.list(category),
  });
}

export function useAdminShowcaseItem(slug: string) {
  return useQuery({
    queryKey: ["admin-showcase-item", slug],
    queryFn: () => api.admin.showcase.get(slug),
    enabled: !!slug,
  });
}

export function useAdminUpsertShowcaseItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ShowcaseItemCreate) => api.admin.showcase.upsert(data),
    onSuccess: () => {
      showToast("Showcase item saved", "success");
      qc.invalidateQueries({ queryKey: ["admin-showcase-items"] });
      qc.invalidateQueries({ queryKey: ["showcase-items"] });
    },
    onError: onMutationError,
  });
}

export function useAdminDeleteShowcaseItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.admin.showcase.delete(slug),
    onSuccess: () => {
      showToast("Showcase item deleted", "success");
      qc.invalidateQueries({ queryKey: ["admin-showcase-items"] });
      qc.invalidateQueries({ queryKey: ["showcase-items"] });
    },
    onError: onMutationError,
  });
}

// ── Resume ───────────────────────────────────────────────────────────────────

export function useAdminResume() {
  return useQuery({
    queryKey: ["admin-resume"],
    queryFn: () => api.admin.resume.get(),
  });
}

export function useAdminUpsertResumeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ResumeEntryCreate) => api.admin.resume.upsertEntry(data),
    onSuccess: () => {
      showToast("Entry saved", "success");
      qc.invalidateQueries({ queryKey: ["admin-resume"] });
      qc.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: onMutationError,
  });
}

export function useAdminDeleteResumeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.admin.resume.deleteEntry(id),
    onSuccess: () => {
      showToast("Entry deleted", "success");
      qc.invalidateQueries({ queryKey: ["admin-resume"] });
      qc.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: onMutationError,
  });
}

export function useAdminUpsertResumeSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ResumeSectionCreate) => api.admin.resume.upsertSection(data),
    onSuccess: () => {
      showToast("Section saved", "success");
      qc.invalidateQueries({ queryKey: ["admin-resume"] });
      qc.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: onMutationError,
  });
}

// ── Media ────────────────────────────────────────────────────────────────────

export function useAdminMediaList(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["admin-media", params],
    queryFn: () => api.admin.media.list(params),
  });
}

export function useAdminUploadUrl() {
  return useMutation({
    mutationFn: (data: { filename: string; content_type: string }) =>
      api.admin.media.getUploadUrl(data),
    onError: onMutationError,
  });
}

export function useAdminRegisterMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MediaRegister) => api.admin.media.register(data),
    onSuccess: () => {
      showToast("Media registered", "success");
      qc.invalidateQueries({ queryKey: ["admin-media"] });
    },
    onError: onMutationError,
  });
}

// ── Albums ───────────────────────────────────────────────────────────────────

export function useAdminAlbums(category?: string) {
  return useQuery({
    queryKey: ["admin-albums", category],
    queryFn: () => api.admin.albums.list(category),
  });
}

export function useAdminUpsertAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AlbumCreate) => api.admin.albums.upsert(data),
    onSuccess: () => {
      showToast("Album saved", "success");
      qc.invalidateQueries({ queryKey: ["admin-albums"] });
      qc.invalidateQueries({ queryKey: ["albums"] });
    },
    onError: onMutationError,
  });
}

export function useAdminDeleteAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.admin.albums.delete(slug),
    onSuccess: () => {
      showToast("Album deleted", "success");
      qc.invalidateQueries({ queryKey: ["admin-albums"] });
      qc.invalidateQueries({ queryKey: ["albums"] });
    },
    onError: onMutationError,
  });
}
