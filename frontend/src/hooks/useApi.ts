import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

export function useResume() {
  return useQuery({
    queryKey: ["resume"],
    queryFn: api.resume.get,
  });
}

export function useTimeline() {
  return useQuery({
    queryKey: ["timeline"],
    queryFn: api.resume.timeline,
  });
}

export function useBlogPosts(params?: { tag?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["blog-posts", params],
    queryFn: () => api.blog.list(params),
  });
}

export function useBlogPost(slug: string) {
  return useQuery({
    queryKey: ["blog-post", slug],
    queryFn: () => api.blog.get(slug),
    enabled: !!slug,
  });
}

export function useShowcaseItems(category?: string) {
  return useQuery({
    queryKey: ["showcase-items", category],
    queryFn: () => api.showcase.list(category),
  });
}

export function useShowcaseItem(slug: string) {
  return useQuery({
    queryKey: ["showcase-item", slug],
    queryFn: () => api.showcase.get(slug),
    enabled: !!slug,
  });
}

export function useAlbums(category?: string) {
  return useQuery({
    queryKey: ["albums", category],
    queryFn: () => api.albums.list(category),
  });
}

export function useAlbum(slug: string) {
  return useQuery({
    queryKey: ["album", slug],
    queryFn: () => api.albums.get(slug),
    enabled: !!slug,
  });
}
