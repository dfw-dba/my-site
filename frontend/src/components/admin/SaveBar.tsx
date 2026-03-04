interface SaveBarProps {
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  saving?: boolean;
  disabled?: boolean;
}

export default function SaveBar({ onSave, onCancel, onDelete, saving, disabled }: SaveBarProps) {
  return (
    <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-6 py-3 flex items-center justify-between -mx-6 -mb-6 mt-6">
      <div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || disabled}
          className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
