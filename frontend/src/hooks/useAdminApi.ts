import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { showToast } from "../components/admin/Toast";
import type {
  ResumeEntryCreate,
  ResumeSummaryCreate,
  ResumeContactCreate,
  ResumeRecommendationsReplace,
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

export function useAdminUpsertResumeSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ResumeSummaryCreate) => api.admin.resume.upsertSummary(data),
    onSuccess: () => {
      showToast("Summary saved", "success");
      qc.invalidateQueries({ queryKey: ["admin-resume"] });
      qc.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: onMutationError,
  });
}

export function useAdminUpsertResumeContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ResumeContactCreate) => api.admin.resume.upsertContact(data),
    onSuccess: () => {
      showToast("Contact saved", "success");
      qc.invalidateQueries({ queryKey: ["admin-resume"] });
      qc.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: onMutationError,
  });
}

export function useAdminReplaceRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ResumeRecommendationsReplace) => api.admin.resume.replaceRecommendations(data),
    onSuccess: () => {
      showToast("Recommendations saved", "success");
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
