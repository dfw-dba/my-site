interface StatCardProps {
  label: string;
  count: number | undefined;
  loading?: boolean;
}

export default function StatCard({ label, count, loading }: StatCardProps) {
  return (
    <div className="bg-gray-700/50 rounded-lg p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">
        {loading ? (
          <span className="inline-block w-10 h-8 bg-gray-600 rounded animate-pulse" />
        ) : (
          count ?? 0
        )}
      </p>
    </div>
  );
}
