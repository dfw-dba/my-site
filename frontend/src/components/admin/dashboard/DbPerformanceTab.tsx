import { useState } from "react";
import {
  useDbOverview,
  useSlowQueries,
  usePlanInstability,
  useTableStats,
  useIndexUsage,
  useFunctionStats,
  useCaptureMetrics,
} from "../../../hooks/useAdminApi";
import StatCard from "./StatCard";
import HorizontalBarChart from "../charts/HorizontalBarChart";

function fmt(n: number | undefined | null, decimals = 1): string {
  if (n == null) return "—";
  return Number(n).toFixed(decimals);
}

function fmtInt(n: number | undefined | null): string {
  if (n == null) return "—";
  return Number(n).toLocaleString();
}

export default function DbPerformanceTab() {
  const { data: overview, isLoading: overviewLoading } = useDbOverview();
  const [querySortBy, setQuerySortBy] = useState("total_exec_time");
  const { data: slowQueries } = useSlowQueries({ sort_by: querySortBy, limit: 20 });
  const { data: planInstability } = usePlanInstability({ limit: 20 });
  const { data: tableStats } = useTableStats();
  const { data: indexUsage } = useIndexUsage();
  const { data: functionStats } = useFunctionStats();
  const captureMutation = useCaptureMetrics();

  const unusedIndexes = indexUsage?.indexes.filter((i) => i.is_unused) ?? [];
  const topIndexes = indexUsage?.indexes.filter((i) => !i.is_unused).sort((a, b) => b.idx_scan - a.idx_scan).slice(0, 10) ?? [];

  return (
    <div className="space-y-6">
      {/* Overview cards + capture button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Overview</h2>
        <button
          onClick={() => captureMutation.mutate()}
          disabled={captureMutation.isPending}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {captureMutation.isPending ? "Capturing..." : "Capture Metrics"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-20 mb-2" />
              <div className="h-8 bg-gray-700 rounded w-16" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Cache Hit Ratio"
              value={`${fmt(overview?.cache_hit_ratio)}%`}
              accent={
                overview && overview.cache_hit_ratio >= 99 ? "text-green-400"
                  : overview && overview.cache_hit_ratio >= 95 ? "text-yellow-400"
                  : "text-red-400"
              }
            />
            <StatCard label="Active Connections" value={overview?.numbackends ?? 0} />
            <StatCard
              label="Transactions"
              value={fmtInt(overview?.xact_commit)}
            />
            <StatCard
              label="Deadlocks"
              value={overview?.deadlocks ?? 0}
              accent={overview && overview.deadlocks > 0 ? "text-red-400" : "text-white"}
            />
          </>
        )}
      </div>

      {/* Slow Queries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Slow Queries</h2>
          <select
            value={querySortBy}
            onChange={(e) => setQuerySortBy(e.target.value)}
            className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="total_exec_time">Total Time</option>
            <option value="mean_exec_time">Mean Time</option>
            <option value="calls">Calls</option>
          </select>
        </div>

        {slowQueries && slowQueries.queries.length > 0 && (
          <div className="mb-4">
            <HorizontalBarChart
              data={slowQueries.queries.slice(0, 10).map((q) => ({
                name: q.query.length > 40 ? q.query.slice(0, 40) + "..." : q.query,
                value: Math.round(q.total_exec_time),
              }))}
              color="#f59e0b"
              height={Math.max(200, slowQueries.queries.slice(0, 10).length * 35)}
            />
          </div>
        )}

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="px-4 py-3 font-medium">Query</th>
                  <th className="px-4 py-3 font-medium text-right">Total (ms)</th>
                  <th className="px-4 py-3 font-medium text-right">Mean (ms)</th>
                  <th className="px-4 py-3 font-medium text-right">Calls</th>
                  <th className="px-4 py-3 font-medium text-right">Rows</th>
                  <th className="px-4 py-3 font-medium text-right">Cache Hit %</th>
                </tr>
              </thead>
              <tbody>
                {!slowQueries || slowQueries.queries.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No slow queries captured</td></tr>
                ) : (
                  slowQueries.queries.map((q) => (
                    <tr key={q.queryid} className="border-b border-gray-700/50 text-gray-300">
                      <td className="px-4 py-2 max-w-sm truncate font-mono text-xs" title={q.query}>{q.query}</td>
                      <td className="px-4 py-2 text-right">{fmt(q.total_exec_time)}</td>
                      <td className="px-4 py-2 text-right">{fmt(q.mean_exec_time)}</td>
                      <td className="px-4 py-2 text-right">{fmtInt(q.calls)}</td>
                      <td className="px-4 py-2 text-right">{fmtInt(q.rows)}</td>
                      <td className="px-4 py-2 text-right">{fmt(q.cache_hit_ratio)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Plan Instability */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Plan Instability</h2>
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="px-4 py-3 font-medium">Query</th>
                  <th className="px-4 py-3 font-medium text-right">Calls</th>
                  <th className="px-4 py-3 font-medium text-right">Mean (ms)</th>
                  <th className="px-4 py-3 font-medium text-right">Stddev (ms)</th>
                  <th className="px-4 py-3 font-medium text-right">Instability</th>
                  <th className="px-4 py-3 font-medium text-right">Max/Mean</th>
                </tr>
              </thead>
              <tbody>
                {!planInstability || planInstability.unstable_queries.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No unstable queries detected</td></tr>
                ) : (
                  planInstability.unstable_queries.map((q) => (
                    <tr key={q.queryid} className="border-b border-gray-700/50 text-gray-300">
                      <td className="px-4 py-2 max-w-sm truncate font-mono text-xs" title={q.query}>{q.query}</td>
                      <td className="px-4 py-2 text-right">{fmtInt(q.calls)}</td>
                      <td className="px-4 py-2 text-right">{fmt(q.mean_exec_time)}</td>
                      <td className="px-4 py-2 text-right">{fmt(q.stddev_exec_time)}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          q.instability_ratio > 3 ? "bg-red-500/20 text-red-400"
                            : q.instability_ratio > 1 ? "bg-yellow-500/20 text-yellow-400"
                            : "text-gray-300"
                        }`}>
                          {fmt(q.instability_ratio, 2)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">{fmt(q.max_mean_ratio, 2)}x</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Table Stats */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Table Stats</h2>
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="px-4 py-3 font-medium">Table</th>
                  <th className="px-4 py-3 font-medium text-right">Seq Scans</th>
                  <th className="px-4 py-3 font-medium text-right">Idx Scans</th>
                  <th className="px-4 py-3 font-medium text-right">Dead Tuples</th>
                  <th className="px-4 py-3 font-medium">Last Vacuum</th>
                  <th className="px-4 py-3 font-medium">Last Analyze</th>
                </tr>
              </thead>
              <tbody>
                {!tableStats || tableStats.tables.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No table stats available</td></tr>
                ) : (
                  tableStats.tables.map((t) => (
                    <tr
                      key={`${t.schemaname}.${t.relname}`}
                      className={`border-b border-gray-700/50 text-gray-300 ${t.n_dead_tup > 1000 ? "bg-yellow-500/5" : ""}`}
                    >
                      <td className="px-4 py-2 font-mono text-xs">{t.schemaname}.{t.relname}</td>
                      <td className="px-4 py-2 text-right">{fmtInt(t.seq_scan)}</td>
                      <td className="px-4 py-2 text-right">{fmtInt(t.idx_scan)}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={t.n_dead_tup > 1000 ? "text-yellow-400 font-medium" : ""}>
                          {fmtInt(t.n_dead_tup)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-400 text-xs">
                        {t.last_vacuum ? new Date(t.last_vacuum).toLocaleString() : t.last_autovacuum ? new Date(t.last_autovacuum).toLocaleString() : "Never"}
                      </td>
                      <td className="px-4 py-2 text-gray-400 text-xs">
                        {t.last_analyze ? new Date(t.last_analyze).toLocaleString() : t.last_autoanalyze ? new Date(t.last_autoanalyze).toLocaleString() : "Never"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Index Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unused Indexes */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">
            Unused Indexes
            {unusedIndexes.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                {unusedIndexes.length}
              </span>
            )}
          </h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="px-4 py-3 font-medium">Table</th>
                    <th className="px-4 py-3 font-medium">Index</th>
                  </tr>
                </thead>
                <tbody>
                  {unusedIndexes.length === 0 ? (
                    <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-500">No unused indexes</td></tr>
                  ) : (
                    unusedIndexes.map((idx) => (
                      <tr key={`${idx.schemaname}.${idx.indexrelname}`} className="border-b border-gray-700/50 text-gray-300">
                        <td className="px-4 py-2 font-mono text-xs">{idx.schemaname}.{idx.relname}</td>
                        <td className="px-4 py-2 font-mono text-xs text-yellow-400">{idx.indexrelname}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Most Used Indexes */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Most Used Indexes</h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="px-4 py-3 font-medium">Index</th>
                    <th className="px-4 py-3 font-medium text-right">Scans</th>
                  </tr>
                </thead>
                <tbody>
                  {topIndexes.length === 0 ? (
                    <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-500">No index data</td></tr>
                  ) : (
                    topIndexes.map((idx) => (
                      <tr key={`${idx.schemaname}.${idx.indexrelname}`} className="border-b border-gray-700/50 text-gray-300">
                        <td className="px-4 py-2 font-mono text-xs">{idx.indexrelname}</td>
                        <td className="px-4 py-2 text-right">{fmtInt(idx.idx_scan)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Function Stats */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Function Stats</h2>
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="px-4 py-3 font-medium">Function</th>
                  <th className="px-4 py-3 font-medium">Schema</th>
                  <th className="px-4 py-3 font-medium text-right">Calls</th>
                  <th className="px-4 py-3 font-medium text-right">Total (ms)</th>
                  <th className="px-4 py-3 font-medium text-right">Self (ms)</th>
                </tr>
              </thead>
              <tbody>
                {!functionStats || functionStats.functions.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No function stats available</td></tr>
                ) : (
                  functionStats.functions.map((f) => (
                    <tr key={`${f.schemaname}.${f.funcname}`} className="border-b border-gray-700/50 text-gray-300">
                      <td className="px-4 py-2 font-mono text-xs">{f.funcname}</td>
                      <td className="px-4 py-2 text-gray-400">{f.schemaname}</td>
                      <td className="px-4 py-2 text-right">{fmtInt(f.calls)}</td>
                      <td className="px-4 py-2 text-right">{fmt(f.total_time)}</td>
                      <td className="px-4 py-2 text-right">{fmt(f.self_time)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
