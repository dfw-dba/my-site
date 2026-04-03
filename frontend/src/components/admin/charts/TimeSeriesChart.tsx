import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TimeSeriesChartProps {
  data: { date: string; value: number }[];
  color?: string;
  label?: string;
  height?: number;
}

export default function TimeSeriesChart({ data, color = "#3b82f6", label = "Value", height = 300 }: TimeSeriesChartProps) {
  if (data.length === 0) return <p className="text-gray-500 text-sm text-center py-8">No data</p>;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} tickLine={false} />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "0.5rem", color: "#d1d5db" }} />
        <Area type="monotone" dataKey="value" name={label} stroke={color} fill={`url(#gradient-${label})`} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
