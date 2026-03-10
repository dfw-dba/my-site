import type {
  ContactInfo,
  ResumeData,
  ProfessionalEntry,
  ResumeEntryCreate,
  ResumeSectionCreate,
  PerformanceReviewCreate,
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
    contact: () => request<ContactInfo>("/api/resume/contact"),
    timeline: () => request<ProfessionalEntry[]>("/api/resume/timeline"),
  },

  admin: {
    resume: {
      get: () => request<ResumeData>("/api/resume/"),
      upsertEntry: (data: ResumeEntryCreate) =>
        request<ApiSuccess>("/api/admin/resume/entry", {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify(data),
        }),
      deleteEntry: (id: number) =>
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
  },
};
