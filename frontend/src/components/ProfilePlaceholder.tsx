export default function ProfilePlaceholder() {
  return (
    <div className="flex h-36 w-36 items-center justify-center rounded-full border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <svg
        className="h-16 w-16 text-gray-400 dark:text-gray-500"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        {/* Top ellipse */}
        <ellipse cx="32" cy="16" rx="18" ry="8" />
        {/* Bottom ellipse */}
        <ellipse cx="32" cy="48" rx="18" ry="8" />
        {/* Left side line */}
        <line x1="14" y1="16" x2="14" y2="48" />
        {/* Right side line */}
        <line x1="50" y1="16" x2="50" y2="48" />
        {/* Middle ring */}
        <ellipse cx="32" cy="32" rx="18" ry="8" strokeDasharray="4 3" />
      </svg>
    </div>
  );
}
