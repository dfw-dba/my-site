import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminResume,
  useAdminUpsertResumeEntry,
  useAdminDeleteResumeEntry,
  useAdminUpsertResumeSection,
  useAdminUpsertPerformanceReview,
  useAdminDeletePerformanceReview,
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
  {
    key: "reviews",
    header: "Reviews",
    render: (row) => (
      <span className="inline-block px-2 py-0.5 text-xs rounded bg-purple-600/30 text-purple-300">
        {row.performance_reviews?.length ?? 0}
      </span>
    ),
  },
];

type Tab = "sections" | "entries";

export default function ResumeEditor() {
  const queryClient = useQueryClient();
  const { data: resume, isLoading } = useAdminResume();
  const upsertEntry = useAdminUpsertResumeEntry();
  const deleteEntry = useAdminDeleteResumeEntry();
  const upsertSection = useAdminUpsertResumeSection();
  const upsertReview = useAdminUpsertPerformanceReview();
  const deleteReview = useAdminDeletePerformanceReview();

  const [tab, setTab] = useState<Tab>("entries");
  const [editingEntryId, setEditingEntryId] = useState<number | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfessionalEntry | null>(null);

  // Section editing state
  const [editingSectionType, setEditingSectionType] = useState<string | null>(null);
  const [sectionContent, setSectionContent] = useState("");

  const allEntries = resume
    ? Object.values(resume.entries).flat()
    : [];

  // Derive editing entry from query data so it stays fresh after refetch
  const editingEntry =
    editingEntryId !== null && editingEntryId !== "new"
      ? allEntries.find((e) => e.id === editingEntryId) ?? null
      : editingEntryId;

  function openSectionEditor(sectionType: string) {
    const content = resume?.sections[sectionType];
    setEditingSectionType(sectionType);
    setSectionContent(content ? JSON.stringify(content, null, 2) : "{}");
  }

  async function saveSectionContent() {
    if (!editingSectionType) return;
    try {
      const parsed = JSON.parse(sectionContent);
      await upsertSection.mutateAsync(
        { section_type: editingSectionType, content: parsed },
      );
      await queryClient.invalidateQueries({ queryKey: ["admin-resume"] });
      setEditingSectionType(null);
    } catch (e) {
      if (e instanceof SyntaxError) {
        alert("Invalid JSON");
      }
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
              onClick={() => setEditingEntryId("new")}
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
                  onClick={() => setEditingEntryId(row.id)}
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
          {["summary", "contact"].map((sType) => (
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
          onSave={async (data) => {
            try {
              await upsertEntry.mutateAsync(data);
              await queryClient.invalidateQueries({ queryKey: ["admin-resume"] });
              setEditingEntryId(null);
            } catch {
              // Mutation errors handled by hook's onError
            }
          }}
          onCancel={() => setEditingEntryId(null)}
          saving={upsertEntry.isPending}
          onSaveReview={async (data) => {
            await upsertReview.mutateAsync(data);
            await queryClient.invalidateQueries({ queryKey: ["admin-resume"] });
          }}
          onDeleteReview={(id) => deleteReview.mutate(id)}
          reviewSaving={upsertReview.isPending}
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
