import { useState, useEffect } from "react";
import type { ProfessionalEntry } from "../../types";
import FormInput from "../../components/admin/FormInput";
import FormTextarea from "../../components/admin/FormTextarea";
import FormSelect from "../../components/admin/FormSelect";
import TagInput from "../../components/admin/TagInput";
import ListInput from "../../components/admin/ListInput";

const ENTRY_TYPE_OPTIONS = [
  { value: "work", label: "Work" },
  { value: "education", label: "Education" },
  { value: "certification", label: "Certification" },
  { value: "award", label: "Award" },
];

interface ResumeEntryFormProps {
  entry: ProfessionalEntry | null;
  onSave: (data: {
    id?: string;
    entry_type: string;
    title: string;
    organization: string;
    location?: string | null;
    start_date: string;
    end_date?: string | null;
    description?: string | null;
    highlights?: string[];
    technologies?: string[];
    sort_order?: number;
  }) => void;
  onCancel: () => void;
  saving?: boolean;
}

export default function ResumeEntryForm({ entry, onSave, onCancel, saving }: ResumeEntryFormProps) {
  const [entryType, setEntryType] = useState("work");
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("0");

  useEffect(() => {
    if (entry) {
      setEntryType(entry.entry_type);
      setTitle(entry.title);
      setOrganization(entry.organization);
      setLocation(entry.location ?? "");
      setStartDate(entry.start_date);
      setEndDate(entry.end_date ?? "");
      setDescription(entry.description ?? "");
      setHighlights(entry.highlights);
      setTechnologies(entry.technologies);
      setSortOrder(String(entry.sort_order));
    }
  }, [entry]);

  function handleSubmit() {
    onSave({
      id: entry?.id,
      entry_type: entryType,
      title,
      organization,
      location: location || null,
      start_date: startDate,
      end_date: endDate || null,
      description: description || null,
      highlights,
      technologies,
      sort_order: parseInt(sortOrder) || 0,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {entry ? "Edit Entry" : "New Entry"}
        </h3>

        <div className="space-y-4">
          <FormSelect
            label="Entry Type"
            value={entryType}
            onChange={setEntryType}
            options={ENTRY_TYPE_OPTIONS}
            required
          />
          <FormInput label="Title" value={title} onChange={setTitle} required />
          <FormInput label="Organization" value={organization} onChange={setOrganization} required />
          <FormInput label="Location" value={location} onChange={setLocation} />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Start Date" value={startDate} onChange={setStartDate} type="date" required />
            <FormInput label="End Date" value={endDate} onChange={setEndDate} type="date" />
          </div>
          <FormTextarea label="Description" value={description} onChange={setDescription} rows={4} />
          <ListInput label="Highlights" value={highlights} onChange={setHighlights} placeholder="Add highlight..." />
          <TagInput label="Technologies" value={technologies} onChange={setTechnologies} placeholder="Add technology..." />
          <FormInput label="Sort Order" value={sortOrder} onChange={setSortOrder} type="number" />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title || !organization || !startDate}
            className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
