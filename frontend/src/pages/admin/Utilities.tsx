import { useState } from "react";
import GeoDataTab from "../../components/admin/utilities/GeoDataTab";

type UtilitiesTab = "geodata";

const TAB_LABELS: Record<UtilitiesTab, string> = {
  geodata: "GeoData",
};

export default function Utilities() {
  const [tab, setTab] = useState<UtilitiesTab>("geodata");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Utilities</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-700">
        {(["geodata"] as UtilitiesTab[]).map((t) => (
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
      {tab === "geodata" && <GeoDataTab />}
    </div>
  );
}
