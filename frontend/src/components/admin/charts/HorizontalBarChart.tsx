import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface HorizontalBarChartProps {
  data: { name: string; value: number }[];
  color?: string;
  height?: number;
}

export default function HorizontalBarChart({ data, color = "#3b82f6", height = 300 }: HorizontalBarChartProps) {
  if (data.length === 0) return <p className="text-gray-500 text-sm text-center py-8">No data</p>;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
        <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 12 }} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} tickLine={false} width={75} />
        <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "0.5rem", color: "#d1d5db" }} />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
