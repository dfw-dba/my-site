import type {
  AlbumDetail,
  Album,
  BlogPost,
  BlogPostsResponse,
  ResumeData,
  ProfessionalEntry,
  ShowcaseItem,
  AdminBlogPostsResponse,
  AdminMediaResponse,
  BlogPostCreate,
  ShowcaseItemCreate,
  ResumeEntryCreate,
  ResumeSectionCreate,
  PerformanceReviewCreate,
  UploadUrlRequest,
  UploadUrlResponse,
  MediaRegister,
  AlbumCreate,
  ApiSuccess,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function adminHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Admin-Key": "local-dev-admin-key",
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  resume: {
    get: () => request<ResumeData>("/api/resume/"),
    timeline: () => request<ProfessionalEntry[]>("/api/resume/timeline"),
  },

  blog: {
    list: (params?: { tag?: string; limit?: number; offset?: number }) => {
      const search = new URLSearchParams();
      if (params?.tag) search.set("tag", params.tag);
      if (params?.limit) search.set("limit", String(params.limit));
      if (params?.offset) search.set("offset", String(params.offset));
      const qs = search.toString();
      return request<BlogPostsResponse>(`/api/blog/posts${qs ? `?${qs}` : ""}`);
    },
    get: (slug: string) => request<BlogPost>(`/api/blog/posts/${slug}`),
  },

  showcase: {
    list: (category?: string) => {
      const qs = category ? `?category=${encodeURIComponent(category)}` : "";
      return request<ShowcaseItem[]>(`/api/showcase/${qs}`);
    },
    get: (slug: string) => request<ShowcaseItem>(`/api/showcase/${slug}`),
  },

  albums: {
    list: (category?: string) => {
      const qs = category ? `?category=${encodeURIComponent(category)}` : "";
      return request<Album[]>(`/api/personal/albums${qs}`);
    },
    get: (slug: string) => request<AlbumDetail>(`/api/personal/albums/${slug}`),
  },

  admin: {
    blog: {
      list: (params?: { limit?: number; offset?: number }) => {
        const search = new URLSearchParams();
        if (params?.limit) search.set("limit", String(params.limit));
        if (params?.offset) search.set("offset", String(params.offset));
        const qs = search.toString();
        return request<AdminBlogPostsResponse>(
          `/api/admin/blog${qs ? `?${qs}` : ""}`,
          { headers: adminHeaders() },
        );
      },
      get: (slug: string) =>
        request<BlogPost>(`/api/admin/blog/${slug}`, {
          headers: adminHeaders(),
        }),
      upsert: (data: BlogPostCreate) =>
        request<ApiSuccess>("/api/admin/blog", {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify(data),
        }),
      delete: (slug: string) =>
        request<ApiSuccess>(`/api/admin/blog/${slug}`, {
          method: "DELETE",
          headers: adminHeaders(),
        }),
    },

    showcase: {
      list: (category?: string) => {
        const qs = category ? `?category=${encodeURIComponent(category)}` : "";
        return request<ShowcaseItem[]>(`/api/showcase/${qs}`);
      },
      get: (slug: string) =>
        request<ShowcaseItem>(`/api/showcase/${slug}`),
      upsert: (data: ShowcaseItemCreate) =>
        request<ApiSuccess>("/api/admin/showcase", {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify(data),
        }),
      delete: (slug: string) =>
        request<ApiSuccess>(`/api/admin/showcase/${slug}`, {
          method: "DELETE",
          headers: adminHeaders(),
        }),
    },

    resume: {
      get: () => request<ResumeData>("/api/resume/"),
      upsertEntry: (data: ResumeEntryCreate) =>
        request<ApiSuccess>("/api/admin/resume/entry", {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify(data),
        }),
      deleteEntry: (id: string) =>
        request<ApiSuccess>(`/api/admin/resume/entry/${id}`, {
          method: "DELETE",
          headers: adminHeaders(),
        }),
      upsertSection: (data: ResumeSectionCreate) =>
        request<ApiSuccess>("/api/admin/resume/section", {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify(data),
        }),
      upsertReview: (data: PerformanceReviewCreate) =>
        request<ApiSuccess>("/api/admin/resume/review", {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify(data),
        }),
      deleteReview: (id: number) =>
        request<ApiSuccess>(`/api/admin/resume/review/${id}`, {
          method: "DELETE",
          headers: adminHeaders(),
        }),
    },

    media: {
      list: (params?: { limit?: number; offset?: number }) => {
        const search = new URLSearchParams();
        if (params?.limit) search.set("limit", String(params.limit));
        if (params?.offset) search.set("offset", String(params.offset));
        const qs = search.toString();
        return request<AdminMediaResponse>(
          `/api/admin/media${qs ? `?${qs}` : ""}`,
          { headers: adminHeaders() },
        );
      },
      getUploadUrl: (data: UploadUrlRequest) =>
        request<UploadUrlResponse>("/api/admin/media/upload-url", {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify(data),
        }),
      register: (data: MediaRegister) =>
        request<ApiSuccess>("/api/admin/media/register", {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify(data),
        }),
    },

    albums: {
      list: (category?: string) => {
        const qs = category ? `?category=${encodeURIComponent(category)}` : "";
        return request<Album[]>(`/api/personal/albums${qs}`);
      },
      upsert: (data: AlbumCreate) =>
        request<ApiSuccess>("/api/admin/albums", {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify(data),
        }),
      delete: (slug: string) =>
        request<ApiSuccess>(`/api/admin/albums/${slug}`, {
          method: "DELETE",
          headers: adminHeaders(),
        }),
    },
  },
};
