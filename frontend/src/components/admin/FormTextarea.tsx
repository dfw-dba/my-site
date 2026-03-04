interface FormTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
}

export default function FormTextarea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
  required,
}: FormTextareaProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        required={required}
        className="mt-1 block w-full rounded bg-gray-700 border border-gray-600 text-white px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
      />
    </label>
  );
}
