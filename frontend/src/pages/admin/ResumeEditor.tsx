import { useState } from "react";
import {
  useAdminResume,
  useAdminUpsertResumeEntry,
  useAdminDeleteResumeEntry,
  useAdminUpsertResumeSection,
} from "../../hooks/useAdminApi";
import DataTable from "../../components/admin/DataTable";
import ConfirmModal from "../../components/admin/ConfirmModal";
import FormTextarea from "../../components/admin/FormTextarea";
import ResumeEntryForm from "./ResumeEntryForm";
import type { ProfessionalEntry } from "../../types";
import type { Column } from "../../components/admin/DataTable";

const entryColumns: Column<ProfessionalEntry>[] = [
  {
    key: "title",
    header: "Title",
    render: (row) => <span className="font-medium text-white">{row.title}</span>,
  },
  {
    key: "organization",
    header: "Organization",
    render: (row) => row.organization,
  },
  {
    key: "entry_type",
    header: "Type",
    render: (row) => (
      <span className="inline-block px-2 py-0.5 text-xs rounded bg-blue-600/30 text-blue-300">
        {row.entry_type}
      </span>
    ),
  },
  {
    key: "dates",
    header: "Dates",
    render: (row) => (
      <span className="text-xs">
        {row.start_date} — {row.end_date ?? "Present"}
      </span>
    ),
  },
];

type Tab = "sections" | "entries";

export default function ResumeEditor() {
  const { data: resume, isLoading } = useAdminResume();
  const upsertEntry = useAdminUpsertResumeEntry();
  const deleteEntry = useAdminDeleteResumeEntry();
  const upsertSection = useAdminUpsertResumeSection();

  const [tab, setTab] = useState<Tab>("entries");
  const [editingEntry, setEditingEntry] = useState<ProfessionalEntry | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfessionalEntry | null>(null);

  // Section editing state
  const [editingSectionType, setEditingSectionType] = useState<string | null>(null);
  const [sectionContent, setSectionContent] = useState("");

  const allEntries = resume
    ? Object.values(resume.entries).flat()
    : [];

  function openSectionEditor(sectionType: string) {
    const content = resume?.sections[sectionType];
    setEditingSectionType(sectionType);
    setSectionContent(content ? JSON.stringify(content, null, 2) : "{}");
  }

  function saveSectionContent() {
    if (!editingSectionType) return;
    try {
      const parsed = JSON.parse(sectionContent);
      upsertSection.mutate(
        { section_type: editingSectionType, content: parsed },
        { onSuccess: () => setEditingSectionType(null) },
      );
    } catch {
      alert("Invalid JSON");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Resume Editor</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-700">
        {(["entries", "sections"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {t === "entries" ? "Professional Entries" : "Sections"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : tab === "entries" ? (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setEditingEntry("new")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              New Entry
            </button>
          </div>
          <DataTable
            columns={entryColumns}
            data={allEntries}
            keyFn={(row) => row.id}
            emptyMessage="No professional entries yet."
            actions={(row) => (
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditingEntry(row)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(row)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Delete
                </button>
              </div>
            )}
          />
        </>
      ) : (
        <div className="space-y-4">
          {["summary", "skills", "contact"].map((sType) => (
            <div key={sType} className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white capitalize">{sType}</h3>
                <button
                  onClick={() => openSectionEditor(sType)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Edit
                </button>
              </div>
              <pre className="text-xs text-gray-400 overflow-x-auto max-h-24">
                {resume?.sections[sType]
                  ? JSON.stringify(resume.sections[sType], null, 2)
                  : "Not configured"}
              </pre>
            </div>
          ))}

          {editingSectionType && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60" onClick={() => setEditingSectionType(null)} />
              <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 capitalize">
                  Edit {editingSectionType}
                </h3>
                <FormTextarea
                  label="Content (JSON)"
                  value={sectionContent}
                  onChange={setSectionContent}
                  rows={12}
                />
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={() => setEditingSectionType(null)}
                    className="px-4 py-2 text-sm text-gray-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveSectionContent}
                    disabled={upsertSection.isPending}
                    className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                  >
                    {upsertSection.isPending ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Entry form modal */}
      {editingEntry !== null && (
        <ResumeEntryForm
          entry={editingEntry === "new" ? null : editingEntry}
          onSave={(data) => {
            upsertEntry.mutate(data, {
              onSuccess: () => setEditingEntry(null),
            });
          }}
          onCancel={() => setEditingEntry(null)}
          saving={upsertEntry.isPending}
        />
      )}

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Entry"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={() => {
          if (deleteTarget) {
            deleteEntry.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteEntry.isPending}
      />
    </div>
  );
}
