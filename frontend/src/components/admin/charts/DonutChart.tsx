import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const DEFAULT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

interface DonutChartProps {
  data: { name: string; value: number }[];
  colors?: string[];
  height?: number;
  onSegmentClick?: (name: string) => void;
  activeSegment?: string;
}

export default function DonutChart({ data, colors = DEFAULT_COLORS, height = 250, onSegmentClick, activeSegment }: DonutChartProps) {
  if (data.length === 0) return <p className="text-gray-500 text-sm text-center py-8">No data</p>;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          onClick={onSegmentClick ? (_, index) => onSegmentClick(data[index].name) : undefined}
          style={onSegmentClick ? { cursor: "pointer" } : undefined}
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={colors[i % colors.length]}
              stroke={entry.name === activeSegment ? "#fff" : "none"}
              strokeWidth={entry.name === activeSegment ? 2 : 0}
              opacity={activeSegment && entry.name !== activeSegment ? 0.4 : 1}
            />
          ))}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "0.5rem", color: "#d1d5db" }} />
        <Legend wrapperStyle={{ color: "#9ca3af", fontSize: "0.75rem" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
