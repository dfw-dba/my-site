import { useState } from "react";
import LogsTab from "../../components/admin/dashboard/LogsTab";
import DbPerformanceTab from "../../components/admin/dashboard/DbPerformanceTab";
import VisitorAnalyticsTab from "../../components/admin/dashboard/VisitorAnalyticsTab";

type DashboardTab = "logs" | "db-performance" | "visitor-analytics";

const TAB_LABELS: Record<DashboardTab, string> = {
  logs: "Logs",
  "db-performance": "DB Performance",
  "visitor-analytics": "Visitor Analytics",
};

export default function Dashboard() {
  const [tab, setTab] = useState<DashboardTab>("logs");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-700">
        {(["logs", "db-performance", "visitor-analytics"] as DashboardTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "logs" && <LogsTab />}
      {tab === "db-performance" && <DbPerformanceTab />}
      {tab === "visitor-analytics" && <VisitorAnalyticsTab />}
    </div>
  );
}
