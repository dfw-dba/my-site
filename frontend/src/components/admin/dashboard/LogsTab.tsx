import { useState } from "react";
import { useAdminLogs, useAdminLogStats, useAdminPurgeLogs, useAdminThreatDetections } from "../../../hooks/useAdminApi";
import type { AppLog, ThreatDay, ThreatDetail, ThreatDetectionResponse } from "../../../types";
import StatCard from "./StatCard";

const LEVEL_COLORS: Record<string, string> = {
  ERROR: "bg-red-600 text-white",
  WARNING: "bg-yellow-500 text-black",
  INFO: "bg-blue-600 text-white",
  DEBUG: "bg-gray-600 text-white",
};

const PAGE_SIZE = 50;

function LogDetailRow({ log, onIpClick }: { log: AppLog; onIpClick: (ip: string) => void }) {
  return (
    <tr>
      <td colSpan={7} className="px-4 py-3 bg-gray-900/50">
        <div className="space-y-2 text-sm">
          {log.client_ip && (
            <div>
              <span className="text-gray-400">Client IP: </span>
              <button
                onClick={(e) => { e.stopPropagation(); onIpClick(log.client_ip!); }}
                className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer font-mono"
              >
                {log.client_ip}
              </button>
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

const THREAT_COLORS: Record<string, { badge: string; text: string }> = {
  vulnerability_scan: { badge: "bg-yellow-500/20 text-yellow-400", text: "text-yellow-400" },
  path_traversal: { badge: "bg-orange-500/20 text-orange-400", text: "text-orange-400" },
  sql_injection: { badge: "bg-red-500/20 text-red-400", text: "text-red-400" },
  brute_force: { badge: "bg-purple-500/20 text-purple-400", text: "text-purple-400" },
};

const THREAT_LABELS: Record<string, string> = {
  vulnerability_scan: "Vuln Scan",
  path_traversal: "Path Traversal",
  sql_injection: "SQL Injection",
  brute_force: "Brute Force",
};

function ThreatBadge({ type, count }: { type: string; count: number }) {
  if (count === 0) return null;
  const colors = THREAT_COLORS[type] ?? { badge: "bg-gray-600/20 text-gray-400", text: "text-gray-400" };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.badge}`}>
      {THREAT_LABELS[type] ?? type}: {count}
    </span>
  );
}

function ThreatDetailRow({ detail, onIpClick }: { detail: ThreatDetail; onIpClick: (ip: string) => void }) {
  const colors = THREAT_COLORS[detail.threat_type] ?? { badge: "bg-gray-600/20 text-gray-400", text: "text-gray-400" };
  return (
    <tr className="border-b border-gray-700/30 text-gray-400 text-xs">
      <td className="px-4 py-1.5 whitespace-nowrap">
        {new Date(detail.created_at).toLocaleTimeString()}
      </td>
      <td className="px-4 py-1.5">
        <span className={`px-1.5 py-0.5 rounded text-xs ${colors.badge}`}>
          {THREAT_LABELS[detail.threat_type] ?? detail.threat_type}
        </span>
      </td>
      <td className="px-4 py-1.5 font-mono">{detail.request_method}</td>
      <td className="px-4 py-1.5 font-mono max-w-xs truncate">{detail.request_path}</td>
      <td className="px-4 py-1.5">
        {detail.status_code && (
          <span className={detail.status_code >= 500 ? "text-red-400" : detail.status_code >= 400 ? "text-yellow-400" : "text-green-400"}>
            {detail.status_code}
          </span>
        )}
      </td>
      <td className="px-4 py-1.5 font-mono">
        {detail.client_ip && (
          <button
            onClick={(e) => { e.stopPropagation(); onIpClick(detail.client_ip!); }}
            className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
          >
            {detail.client_ip}
          </button>
        )}
      </td>
    </tr>
  );
}

function TopThreatsByIp({ data, isLoading, topN, onIpClick }: { data: ThreatDetectionResponse | undefined; isLoading: boolean; topN: number; onIpClick: (ip: string) => void }) {
  const ipCounts = (() => {
    if (!data) return [];
    const counts = new Map<string, number>();
    for (const day of data.days) {
      for (const hr of day.hours) {
        for (const detail of hr.details) {
          if (detail.client_ip) {
            counts.set(detail.client_ip, (counts.get(detail.client_ip) ?? 0) + 1);
          }
        }
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);
  })();

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-fit">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
        </svg>
        Top IPs by Threats
      </h3>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: topN }).map((_, i) => (
            <div key={i} className="h-6 bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      ) : ipCounts.length === 0 ? (
        <p className="text-gray-500 text-sm">No threats detected.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 text-xs">
              <th className="pb-2 font-medium">IP Address</th>
              <th className="pb-2 font-medium text-right">Count</th>
            </tr>
          </thead>
          <tbody>
            {ipCounts.map(([ip, count]) => (
              <tr key={ip} className="border-t border-gray-700/50">
                <td className="py-1.5">
                  <button
                    onClick={() => onIpClick(ip)}
                    className="font-mono text-blue-400 hover:text-blue-300 hover:underline cursor-pointer text-xs"
                  >
                    {ip}
                  </button>
                </td>
                <td className="py-1.5 text-right text-gray-300 font-mono">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ThreatDetectionSection({ data, isLoading, threatDays, setThreatDays, clientIpFilter, onIpClick, onClearIpFilter }: { data: ThreatDetectionResponse | undefined; isLoading: boolean; threatDays: number; setThreatDays: (d: number) => void; clientIpFilter: string | null; onIpClick: (ip: string) => void; onClearIpFilter: () => void }) {
  const [open, setOpen] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedHours, setExpandedHours] = useState<Set<string>>(new Set());

  const toggleDay = (dayKey: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) next.delete(dayKey); else next.add(dayKey);
      return next;
    });
  };

  const toggleHour = (hourKey: string) => {
    setExpandedHours((prev) => {
      const next = new Set(prev);
      if (next.has(hourKey)) next.delete(hourKey); else next.add(hourKey);
      return next;
    });
  };

  const expandAll = () => {
    if (!data) return;
    const allDays = new Set(data.days.map((d) => d.date));
    const allHours = new Set(data.days.flatMap((d) => d.hours.map((h) => `${d.date}-${h.hour}`)));
    setExpandedDays(allDays);
    setExpandedHours(allHours);
  };

  const collapseAll = () => {
    setExpandedDays(new Set());
    setExpandedHours(new Set());
  };
  const totalThreats = data?.total_threats ?? 0;

  return (
    <div>
      {/* Section header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3 hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span className="text-white font-semibold">Threat Detection</span>
          {totalThreats > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">{totalThreats}</span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-600 text-gray-300">0</span>
          )}
          {clientIpFilter && (
            <span
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-blue-900/40 border border-blue-700/50 text-blue-300"
            >
              IP: <span className="font-mono font-semibold">{clientIpFilter}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onClearIpFilter(); }}
                className="ml-0.5 text-gray-400 hover:text-white"
                aria-label="Clear IP filter"
              >
                &times;
              </button>
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="bg-gray-800 rounded-b-lg border-t border-gray-700 px-4 py-3 -mt-1">
          {/* Time range selector */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-400">Range:</span>
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => { setThreatDays(d); collapseAll(); }}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  threatDays === d ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {d}d
              </button>
            ))}
            {data && data.days.length > 0 && (
              <>
                <span className="mx-1 text-gray-600">|</span>
                <button
                  onClick={expandAll}
                  className="px-3 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  className="px-3 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600"
                >
                  Collapse All
                </button>
              </>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          ) : !data || data.days.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">No threats detected in the last {threatDays} days.</p>
          ) : (
            <div className="space-y-1">
              {data.days.map((day: ThreatDay) => {
                const dayKey = day.date;
                const isDayExpanded = expandedDays.has(dayKey);
                return (
                  <div key={dayKey}>
                    {/* Day row */}
                    <button
                      onClick={() => toggleDay(dayKey)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-700/40 transition-colors text-sm"
                    >
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isDayExpanded ? "rotate-90" : ""}`}
                        fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                      <span className="text-gray-300 font-mono w-24 text-left">{day.date}</span>
                      <span className="text-white font-semibold w-20">{day.total_threats} threats</span>
                      <div className="flex flex-wrap gap-1.5">
                        <ThreatBadge type="vulnerability_scan" count={day.vulnerability_scan} />
                        <ThreatBadge type="path_traversal" count={day.path_traversal} />
                        <ThreatBadge type="sql_injection" count={day.sql_injection} />
                        <ThreatBadge type="brute_force" count={day.brute_force} />
                      </div>
                      <span className="text-gray-500 text-xs ml-auto">{day.unique_ips} IP{day.unique_ips !== 1 ? "s" : ""}</span>
                    </button>

                    {/* Hour rows */}
                    {isDayExpanded && (
                      <div className="ml-6 border-l border-gray-700 pl-3 space-y-0.5">
                        {day.hours.map((hr) => {
                          const hourKey = `${dayKey}-${hr.hour}`;
                          const isHourExpanded = expandedHours.has(hourKey);
                          return (
                            <div key={hourKey}>
                              <button
                                onClick={() => toggleHour(hourKey)}
                                className="w-full flex items-center gap-3 px-3 py-1.5 rounded hover:bg-gray-700/30 transition-colors text-sm"
                              >
                                <svg
                                  className={`w-3 h-3 text-gray-500 transition-transform flex-shrink-0 ${isHourExpanded ? "rotate-90" : ""}`}
                                  fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                </svg>
                                <span className="text-gray-400 font-mono">
                                  {String(hr.hour).padStart(2, "0")}:00
                                </span>
                                <span className="text-gray-300">{hr.total_threats} threat{hr.total_threats !== 1 ? "s" : ""}</span>
                              </button>

                              {/* Detail rows */}
                              {isHourExpanded && (
                                <div className="ml-6 mt-1 mb-2">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="text-left text-gray-500 text-xs">
                                        <th className="px-4 py-1 font-medium">Time</th>
                                        <th className="px-4 py-1 font-medium">Type</th>
                                        <th className="px-4 py-1 font-medium">Method</th>
                                        <th className="px-4 py-1 font-medium">Path</th>
                                        <th className="px-4 py-1 font-medium">Status</th>
                                        <th className="px-4 py-1 font-medium">IP</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {hr.details.map((detail: ThreatDetail) => (
                                        <ThreatDetailRow key={detail.id} detail={detail} onIpClick={onIpClick} />
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LogsTab() {
  const [level, setLevel] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [clientIpFilter, setClientIpFilter] = useState<string | null>(null);
  const [threatDays, setThreatDays] = useState(7);

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

  const handleIpClick = (ip: string) => {
    setClientIpFilter(ip);
    setPage(0);
  };

  const clearIpFilter = () => {
    setClientIpFilter(null);
    setPage(0);
  };

  const filters = {
    ...(level ? { level } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(clientIpFilter ? { client_ip: clientIpFilter } : {}),
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const { data: threatData, isLoading: threatLoading } = useAdminThreatDetections({ days: threatDays, ...(clientIpFilter ? { client_ip: clientIpFilter } : {}) });
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
      {/* Purge button */}
      <div className="flex justify-end mb-4">
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

      {/* Threat Detection + Top IPs */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 mb-6">
        <ThreatDetectionSection data={threatData} isLoading={threatLoading} threatDays={threatDays} setThreatDays={setThreatDays} clientIpFilter={clientIpFilter} onIpClick={handleIpClick} onClearIpFilter={clearIpFilter} />
        <TopThreatsByIp data={threatData} isLoading={threatLoading} topN={5} onIpClick={handleIpClick} />
      </div>

      {/* Log Detail heading */}
      <h2 className="text-lg font-semibold text-white mb-3">Log Detail</h2>

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
                        {log.duration_ms !== null ? `${log.duration_ms}ms` : "\u2014"}
                      </td>
                      <td className="px-4 py-2 max-w-sm truncate">{log.message}</td>
                    </tr>
                    {expandedId === log.id && <LogDetailRow key={`${log.id}-detail`} log={log} onIpClick={handleIpClick} />}
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
