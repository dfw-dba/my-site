import { useState } from "react";
import { useAdminLogs, useAdminLogStats, useAdminPurgeLogs } from "../../hooks/useAdminApi";
import type { AppLog } from "../../types";

const LEVEL_COLORS: Record<string, string> = {
  ERROR: "bg-red-600 text-white",
  WARNING: "bg-yellow-500 text-black",
  INFO: "bg-blue-600 text-white",
  DEBUG: "bg-gray-600 text-white",
};

const PAGE_SIZE = 50;

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? "text-white"}`}>{value}</p>
    </div>
  );
}

function LogDetailRow({ log }: { log: AppLog }) {
  return (
    <tr>
      <td colSpan={7} className="px-4 py-3 bg-gray-900/50">
        <div className="space-y-2 text-sm">
          {log.client_ip && (
            <div>
              <span className="text-gray-400">Client IP: </span>
              <span className="text-gray-300">{log.client_ip}</span>
            </div>
          )}
          {log.extra && Object.keys(log.extra).length > 0 && (
            <div>
              <span className="text-gray-400">Extra: </span>
              <pre className="text-gray-300 mt-1 text-xs overflow-x-auto">{JSON.stringify(log.extra, null, 2)}</pre>
            </div>
          )}
          {log.error_detail && (
            <div>
              <span className="text-gray-400">Traceback:</span>
              <pre className="text-red-300 mt-1 text-xs overflow-x-auto whitespace-pre-wrap bg-gray-900 rounded p-2">{log.error_detail}</pre>
            </div>
          )}
          {!log.client_ip && !log.error_detail && (!log.extra || Object.keys(log.extra).length === 0) && (
            <p className="text-gray-500 italic">No additional details</p>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const [level, setLevel] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  // Debounce search input
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);
    }, 300);
    setSearchTimer(timer);
  };

  const filters = {
    ...(level ? { level } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const { data: logsData, isLoading: logsLoading } = useAdminLogs(filters);
  const { data: stats, isLoading: statsLoading } = useAdminLogStats();
  const purgeMutation = useAdminPurgeLogs();

  const logs = logsData?.logs ?? [];
  const total = logsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handlePurge = () => {
    purgeMutation.mutate(30);
    setShowPurgeConfirm(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-3">
          {showPurgeConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Purge logs older than 30 days?</span>
              <button
                onClick={handlePurge}
                disabled={purgeMutation.isPending}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowPurgeConfirm(false)}
                className="px-3 py-1.5 bg-gray-700 text-gray-300 text-sm rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPurgeConfirm(true)}
              className="px-3 py-1.5 bg-gray-700 text-gray-300 text-sm rounded hover:bg-gray-600"
            >
              Purge Old Logs
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-20 mb-2" />
              <div className="h-8 bg-gray-700 rounded w-16" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Requests (24h)" value={stats?.total_24h ?? 0} />
            <StatCard label="Errors (24h)" value={stats?.errors_24h ?? 0} accent={stats?.errors_24h ? "text-red-400" : "text-white"} />
            <StatCard label="Warnings (24h)" value={stats?.warnings_24h ?? 0} accent={stats?.warnings_24h ? "text-yellow-400" : "text-white"} />
            <StatCard label="Avg Response (ms)" value={stats?.avg_duration_ms ?? 0} />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={level}
          onChange={(e) => { setLevel(e.target.value); setPage(0); }}
          className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">All Levels</option>
          <option value="ERROR">ERROR</option>
          <option value="WARNING">WARNING</option>
          <option value="INFO">INFO</option>
          <option value="DEBUG">DEBUG</option>
        </select>
        <input
          type="text"
          placeholder="Search messages or paths..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-blue-500"
        />
        <span className="text-sm text-gray-500 ml-auto">
          {total} log{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Log Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Path</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No logs found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer text-gray-300"
                    >
                      <td className="px-4 py-2 whitespace-nowrap text-gray-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLORS[log.level] ?? "bg-gray-600 text-white"}`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono">{log.request_method}</td>
                      <td className="px-4 py-2 font-mono max-w-xs truncate">{log.request_path}</td>
                      <td className="px-4 py-2">
                        {log.status_code && (
                          <span className={log.status_code >= 500 ? "text-red-400" : log.status_code >= 400 ? "text-yellow-400" : "text-green-400"}>
                            {log.status_code}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-400">
                        {log.duration_ms !== null ? `${log.duration_ms}ms` : "—"}
                      </td>
                      <td className="px-4 py-2 max-w-sm truncate">{log.message}</td>
                    </tr>
                    {expandedId === log.id && <LogDetailRow key={`${log.id}-detail`} log={log} />}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 bg-gray-800 text-gray-300 text-sm rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 bg-gray-800 text-gray-300 text-sm rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
