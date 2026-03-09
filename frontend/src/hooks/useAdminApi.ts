import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { showToast } from "../components/admin/Toast";
import type {
  ResumeEntryCreate,
  ResumeSectionCreate,
  PerformanceReviewCreate,
} from "../types";

function onMutationError(error: Error) {
  showToast(error.message || "An error occurred", "error");
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
    mutationFn: (id: number) => api.admin.resume.deleteEntry(id),
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

export function useAdminUpsertPerformanceReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PerformanceReviewCreate) => api.admin.resume.upsertReview(data),
    onSuccess: () => {
      showToast("Review saved", "success");
      qc.invalidateQueries({ queryKey: ["admin-resume"] });
      qc.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: onMutationError,
  });
}

export function useAdminDeletePerformanceReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.admin.resume.deleteReview(id),
    onSuccess: () => {
      showToast("Review deleted", "success");
      qc.invalidateQueries({ queryKey: ["admin-resume"] });
      qc.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: onMutationError,
  });
}
