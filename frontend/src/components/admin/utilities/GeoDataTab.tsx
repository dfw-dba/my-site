import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGeoipUpdateLogs,
  useGeoipTaskStatus,
  useGeoipTrigger,
  useGeoipTaskProgress,
  useGeoipSchedule,
  useUpdateGeoipSchedule,
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

function TriggerBadge({ triggeredBy }: { triggeredBy: string }) {
  const isManual = triggeredBy === "manual";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isManual ? "bg-purple-500/20 text-purple-400" : "bg-cyan-500/20 text-cyan-400"}`}>
      {isManual ? "Manual" : "Scheduled"}
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

const DAYS = [
  { key: "MON", label: "Mon" },
  { key: "TUE", label: "Tue" },
  { key: "WED", label: "Wed" },
  { key: "THU", label: "Thu" },
  { key: "FRI", label: "Fri" },
  { key: "SAT", label: "Sat" },
  { key: "SUN", label: "Sun" },
] as const;

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function parseCron(cron: string): { days: string[]; hour: number } {
  // Parse "cron(M H ? * DAYS *)" format
  const match = cron.match(/cron\(\d+\s+(\d+)\s+\?\s+\*\s+([\w,]+)\s+\*\)/);
  if (!match) return { days: ["WED", "SAT"], hour: 6 };
  return {
    hour: parseInt(match[1], 10),
    days: match[2].split(","),
  };
}

function buildCron(days: string[], hour: number): { cron_expression: string; description: string } {
  const dayStr = days.join(",");
  const dayLabels = days
    .map((d) => DAYS.find((day) => day.key === d)?.label ?? d)
    .join(", ");
  return {
    cron_expression: `cron(0 ${hour} ? * ${dayStr} *)`,
    description: `${dayLabels} at ${String(hour).padStart(2, "0")}:00 UTC`,
  };
}

function ScheduleEditor() {
  const { data: schedule, isLoading } = useGeoipSchedule();
  const updateMutation = useUpdateGeoipSchedule();

  const [selectedDays, setSelectedDays] = useState<string[]>(["WED", "SAT"]);
  const [selectedHour, setSelectedHour] = useState(6);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync state from server data
  useEffect(() => {
    if (schedule) {
      const parsed = parseCron(schedule.cron_expression);
      setSelectedDays(parsed.days);
      setSelectedHour(parsed.hour);
      setHasChanges(false);
    }
  }, [schedule]);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      if (next.length === 0) return prev; // Must have at least one day
      setHasChanges(true);
      return next;
    });
  };

  const changeHour = (hour: number) => {
    setSelectedHour(hour);
    setHasChanges(true);
  };

  const save = () => {
    const { cron_expression, description } = buildCron(selectedDays, selectedHour);
    updateMutation.mutate({ cron_expression, description });
    setHasChanges(false);
  };

  if (isLoading) return <div className="bg-gray-800 rounded-lg p-4 text-gray-400">Loading schedule...</div>;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-300">Refresh Schedule</h2>
        {schedule && (
          <span className="text-xs text-gray-500">
            Updated {formatDate(schedule.updated_at)} by {schedule.updated_by}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Day checkboxes */}
        <div className="flex gap-1">
          {DAYS.map((day) => (
            <button
              key={day.key}
              onClick={() => toggleDay(day.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                selectedDays.includes(day.key)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>

        {/* Hour selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">at</span>
          <select
            value={selectedHour}
            onChange={(e) => changeHour(parseInt(e.target.value, 10))}
            className="bg-gray-700 text-gray-200 text-sm rounded px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00 UTC
              </option>
            ))}
          </select>
        </div>

        {/* Save button */}
        {hasChanges && (
          <button
            onClick={save}
            disabled={updateMutation.isPending}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xs font-medium rounded transition-colors"
          >
            {updateMutation.isPending ? "Saving..." : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function GeoDataTab() {
  const [logLimit, setLogLimit] = useState(10);
  const qc = useQueryClient();

  const { data: taskStatus } = useGeoipTaskStatus();
  const { data: logsData, isLoading: logsLoading } = useGeoipUpdateLogs({ limit: logLimit });
  const triggerMutation = useGeoipTrigger();

  const isActive = taskStatus?.status === "pending" || taskStatus?.status === "running";
  const activeRunId = isActive ? taskStatus?.run_id ?? null : null;

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
      {/* Schedule Section */}
      <ScheduleEditor />

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
                <TriggerBadge triggeredBy={taskStatus.triggered_by} />
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
          ) : !logsData?.runs.length ? (
            <div className="p-8 text-center text-gray-400">No update history</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Trigger</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Networks</th>
                      <th className="px-4 py-3 font-medium text-right">Locations</th>
                      <th className="px-4 py-3 font-medium text-right">Duration</th>
                      <th className="px-4 py-3 font-medium">Last-Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsData.runs.map((run) => (
                      <tr key={run.run_id} className="border-b border-gray-700/50 text-gray-300">
                        <td className="px-4 py-2 whitespace-nowrap">{formatDate(run.updated_at)}</td>
                        <td className="px-4 py-2"><TriggerBadge triggeredBy={run.triggered_by} /></td>
                        <td className="px-4 py-2"><StatusBadge status={run.status} /></td>
                        <td className="px-4 py-2 text-right tabular-nums">{run.network_rows != null ? run.network_rows.toLocaleString() : <span className="text-gray-500">&mdash;</span>}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{run.location_rows != null ? run.location_rows.toLocaleString() : <span className="text-gray-500">&mdash;</span>}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{run.duration_ms != null ? formatDuration(run.duration_ms) : <span className="text-gray-500">&mdash;</span>}</td>
                        <td className="px-4 py-2 text-xs text-gray-400 max-w-48 truncate">{run.last_modified ?? <span className="text-gray-500">&mdash;</span>}</td>
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
