interface FormToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function FormToggle({ label, checked, onChange }: FormToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <span className="text-sm font-medium text-gray-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
          checked ? "bg-blue-600" : "bg-gray-600"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}
