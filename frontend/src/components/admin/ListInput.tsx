import { useState } from "react";

interface ListInputProps {
  label: string;
  value: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

export default function ListInput({ label, value, onChange, placeholder = "Add item..." }: ListInputProps) {
  const [input, setInput] = useState("");

  function addItem() {
    const item = input.trim();
    if (item) {
      onChange([...value, item]);
      setInput("");
    }
  }

  function removeItem(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  }

  return (
    <div>
      <span className="text-sm font-medium text-gray-300">{label}</span>
      <div className="mt-1 space-y-1.5">
        {value.map((item, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-700 rounded px-3 py-1.5">
            <span className="text-gray-400 text-xs w-5">{i + 1}.</span>
            <span className="flex-1 text-sm text-white">{item}</span>
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="text-gray-400 hover:text-red-400 text-sm"
            >
              &times;
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 rounded bg-gray-700 border border-gray-600 text-white px-3 py-1.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!input.trim()}
            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
