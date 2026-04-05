import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGeoipUpdateLogs,
  useGeoipTaskStatus,
  useGeoipTrigger,
  useGeoipTaskProgress,
} from "../../../hooks/useAdminApi";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    running: "bg-blue-500/20 text-blue-400 animate-pulse",
    completed: "bg-green-500/20 text-green-400",
    failed: "bg-red-500/20 text-red-400",
    success: "bg-green-500/20 text-green-400",
  };
  const labels: Record<string, string> = {
    pending: "Pending",
    running: "Running...",
    completed: "Completed",
    failed: "Failed",
    success: "Success",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-500/20 text-gray-400"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function GeoDataTab() {
  const [logLimit, setLogLimit] = useState(10);
  const qc = useQueryClient();

  const { data: taskStatus } = useGeoipTaskStatus();
  const { data: logsData, isLoading: logsLoading } = useGeoipUpdateLogs({ limit: logLimit });
  const triggerMutation = useGeoipTrigger();

  const isActive = taskStatus?.status === "pending" || taskStatus?.status === "running";
  const activeRunId = isActive ? taskStatus?.id ?? null : null;

  const { data: progressLines } = useGeoipTaskProgress(activeRunId);

  // Auto-refresh logs when a task completes
  const prevStatus = useRef(taskStatus?.status);
  useEffect(() => {
    if (
      (prevStatus.current === "running" || prevStatus.current === "pending") &&
      (taskStatus?.status === "completed" || taskStatus?.status === "failed")
    ) {
      qc.invalidateQueries({ queryKey: ["admin-geoip-logs"] });
    }
    prevStatus.current = taskStatus?.status;
  }, [taskStatus?.status, qc]);

  // Auto-scroll progress panel
  const progressEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    progressEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [progressLines]);

  return (
    <div className="space-y-6">
      {/* Trigger Section */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => triggerMutation.mutate()}
              disabled={isActive || triggerMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
            >
              {triggerMutation.isPending ? "Triggering..." : "Run GeoIP Update"}
            </button>
            {taskStatus && (
              <div className="flex items-center gap-2">
                <StatusBadge status={taskStatus.status} />
                {taskStatus.status === "completed" && taskStatus.completed_at && (
                  <span className="text-xs text-gray-400">
                    {formatDate(taskStatus.completed_at)}
                  </span>
                )}
                {taskStatus.status === "failed" && taskStatus.error_message && (
                  <span className="text-xs text-red-400 max-w-md truncate">
                    {taskStatus.error_message}
                  </span>
                )}
              </div>
            )}
            {!taskStatus && (
              <span className="text-sm text-gray-400">No previous runs</span>
            )}
          </div>
        </div>
      </div>

      {/* Live Progress Panel */}
      {(isActive || (taskStatus?.status === "completed" && progressLines && progressLines.length > 0) || (taskStatus?.status === "failed" && progressLines && progressLines.length > 0)) && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Task Output</span>
            {isActive && (
              <span className="flex items-center gap-1.5 text-xs text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div className="p-4 max-h-80 overflow-y-auto font-mono text-xs">
            {progressLines && progressLines.length > 0 ? (
              progressLines.map((line) => (
                <div
                  key={line.id}
                  className={`py-0.5 ${
                    line.level === "error" ? "text-red-400" : "text-gray-300"
                  }`}
                >
                  <span className="text-gray-500 mr-2">
                    {new Date(line.logged_at).toLocaleTimeString()}
                  </span>
                  {line.message}
                </div>
              ))
            ) : isActive ? (
              <div className="text-gray-500">Waiting for output...</div>
            ) : null}
            <div ref={progressEndRef} />
          </div>
        </div>
      )}

      {/* Update History */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Update History</h2>
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {logsLoading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : !logsData?.logs.length ? (
            <div className="p-8 text-center text-gray-400">No update history</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Networks</th>
                      <th className="px-4 py-3 font-medium text-right">Locations</th>
                      <th className="px-4 py-3 font-medium text-right">Duration</th>
                      <th className="px-4 py-3 font-medium">Last-Modified</th>
                      <th className="px-4 py-3 font-medium text-right">Run</th>
                      <th className="px-4 py-3 font-medium">Last Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsData.logs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-700/50 text-gray-300">
                        <td className="px-4 py-2 whitespace-nowrap">{formatDate(log.updated_at)}</td>
                        <td className="px-4 py-2"><StatusBadge status={log.status} /></td>
                        <td className="px-4 py-2 text-right tabular-nums">{log.network_rows.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{log.location_rows.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatDuration(log.duration_ms)}</td>
                        <td className="px-4 py-2 text-xs text-gray-400 max-w-48 truncate">{log.last_modified}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{log.run_id ?? <span className="text-gray-500">&mdash;</span>}</td>
                        <td className="px-4 py-2 text-xs text-gray-400 max-w-64 truncate" title={log.last_message ?? undefined}>{log.last_message ?? <span className="text-gray-500">&mdash;</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logsData.total > logLimit && (
                <div className="px-4 py-3 border-t border-gray-700">
                  <button
                    onClick={() => setLogLimit((prev) => prev + 10)}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Load more ({logsData.total - logLimit} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
