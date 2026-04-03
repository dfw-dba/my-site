import { useState } from "react";
import {
  useAnalyticsSummary,
  useAnalyticsVisitors,
  useAnalyticsGeo,
  useAnalyticsTimeseries,
} from "../../../hooks/useAdminApi";
import StatCard from "./StatCard";
import TimeSeriesChart from "../charts/TimeSeriesChart";
import DonutChart from "../charts/DonutChart";
import HorizontalBarChart from "../charts/HorizontalBarChart";

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
}

export default function VisitorAnalyticsTab() {
  const defaults = defaultDateRange();
  const [startDate, setStartDate] = useState(defaults.start_date);
  const [endDate, setEndDate] = useState(defaults.end_date);

  const params = { start_date: startDate, end_date: endDate };

  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary(params);
  const { data: visitors } = useAnalyticsVisitors(params);
  const { data: geo } = useAnalyticsGeo(params);
  const { data: timeseries } = useAnalyticsTimeseries(params);

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">From</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        />
        <label className="text-sm text-gray-400">To</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-20 mb-2" />
              <div className="h-8 bg-gray-700 rounded w-16" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Total Page Views" value={summary?.total_page_views?.toLocaleString() ?? 0} />
            <StatCard label="Unique Visitors" value={summary?.unique_visitors?.toLocaleString() ?? 0} />
            <StatCard label="Unique Sessions" value={summary?.unique_sessions?.toLocaleString() ?? 0} />
            <StatCard
              label="Avg Pages/Session"
              value={visitors?.avg_pages_per_session != null ? Number(visitors.avg_pages_per_session).toFixed(1) : "—"}
            />
          </>
        )}
      </div>

      {/* Time series chart */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Page Views Over Time</h2>
        <div className="bg-gray-800 rounded-lg p-4">
          <TimeSeriesChart
            data={(timeseries?.daily ?? []).map((d) => ({ date: d.date, value: d.views }))}
            color="#3b82f6"
            label="Page Views"
          />
        </div>
      </div>

      {/* Top Pages + Top Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Top Pages</h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="px-4 py-3 font-medium">Page</th>
                    <th className="px-4 py-3 font-medium text-right">Views</th>
                    <th className="px-4 py-3 font-medium text-right">Unique</th>
                  </tr>
                </thead>
                <tbody>
                  {!summary || summary.top_pages.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No page data</td></tr>
                  ) : (
                    summary.top_pages.map((p) => (
                      <tr key={p.page_path} className="border-b border-gray-700/50 text-gray-300">
                        <td className="px-4 py-2 font-mono text-xs">{p.page_path}</td>
                        <td className="px-4 py-2 text-right">{p.views.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">{p.unique_visitors.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Top Referrers</h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="px-4 py-3 font-medium">Referrer</th>
                    <th className="px-4 py-3 font-medium text-right">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {!summary || summary.top_referrers.length === 0 ? (
                    <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-500">No referrer data</td></tr>
                  ) : (
                    summary.top_referrers.map((r) => (
                      <tr key={r.referrer} className="border-b border-gray-700/50 text-gray-300">
                        <td className="px-4 py-2 text-xs truncate max-w-xs">{r.referrer}</td>
                        <td className="px-4 py-2 text-right">{r.views.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Device type donut + Browser/OS bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Device Types</h2>
          <div className="bg-gray-800 rounded-lg p-4">
            <DonutChart
              data={(summary?.devices ?? []).map((d) => ({ name: d.device_type, value: d.count }))}
            />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Browsers</h2>
          <div className="bg-gray-800 rounded-lg p-4">
            <HorizontalBarChart
              data={(summary?.browsers ?? []).map((b) => ({ name: b.browser, value: b.count }))}
              color="#10b981"
              height={Math.max(150, (summary?.browsers?.length ?? 0) * 35)}
            />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Operating Systems</h2>
          <div className="bg-gray-800 rounded-lg p-4">
            <HorizontalBarChart
              data={(summary?.os_breakdown ?? []).map((o) => ({ name: o.os, value: o.count }))}
              color="#8b5cf6"
              height={Math.max(150, (summary?.os_breakdown?.length ?? 0) * 35)}
            />
          </div>
        </div>
      </div>

      {/* Geographic data */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Geographic Breakdown</h2>
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="px-4 py-3 font-medium">Country</th>
                  <th className="px-4 py-3 font-medium text-right">Views</th>
                  <th className="px-4 py-3 font-medium text-right">Unique Visitors</th>
                </tr>
              </thead>
              <tbody>
                {!geo || geo.countries.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No geographic data</td></tr>
                ) : (
                  geo.countries.map((c) => (
                    <tr key={c.country_code} className="border-b border-gray-700/50 text-gray-300">
                      <td className="px-4 py-2">{c.country_name} <span className="text-gray-500 text-xs">({c.country_code})</span></td>
                      <td className="px-4 py-2 text-right">{c.views.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">{c.unique_visitors.toLocaleString()}</td>
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
