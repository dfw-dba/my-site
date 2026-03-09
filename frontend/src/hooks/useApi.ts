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
