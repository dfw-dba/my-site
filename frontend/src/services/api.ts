import type {
  ContactInfo,
  ResumeData,
  ProfessionalEntry,
  ResumeEntryCreate,
  ResumeSectionCreate,
  PerformanceReviewCreate,
  ApiSuccess,
} from "../types";
import { getIdToken, isCognitoConfigured } from "./auth";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function adminHeaders(): Promise<HeadersInit> {
  if (isCognitoConfigured) {
    const token = await getIdToken();
    if (token) {
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
    }
  }

  // Fallback: API key for local dev without Cognito
  return {
    "Content-Type": "application/json",
    "X-Admin-Key": import.meta.env.VITE_ADMIN_API_KEY ?? "local-dev-admin-key",
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
      upsertEntry: async (data: ResumeEntryCreate) =>
        request<ApiSuccess>("/api/admin/resume/entry", {
          method: "POST",
          headers: await adminHeaders(),
          body: JSON.stringify(data),
        }),
      deleteEntry: async (id: number) =>
        request<ApiSuccess>(`/api/admin/resume/entry/${id}`, {
          method: "DELETE",
          headers: await adminHeaders(),
        }),
      upsertSection: async (data: ResumeSectionCreate) =>
        request<ApiSuccess>("/api/admin/resume/section", {
          method: "POST",
          headers: await adminHeaders(),
          body: JSON.stringify(data),
        }),
      upsertReview: async (data: PerformanceReviewCreate) =>
        request<ApiSuccess>("/api/admin/resume/review", {
          method: "POST",
          headers: await adminHeaders(),
          body: JSON.stringify(data),
        }),
      deleteReview: async (id: number) =>
        request<ApiSuccess>(`/api/admin/resume/review/${id}`, {
          method: "DELETE",
          headers: await adminHeaders(),
        }),
    },
  },
};
