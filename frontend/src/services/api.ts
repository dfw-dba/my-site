import type {
  AlbumDetail,
  Album,
  BlogPost,
  BlogPostsResponse,
  ResumeData,
  ProfessionalEntry,
  ShowcaseItem,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

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
};
