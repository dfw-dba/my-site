import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminResume,
  useAdminUpsertResumeEntry,
  useAdminDeleteResumeEntry,
  useAdminUpsertResumeTitle,
  useAdminUpsertResumeSummary,
  useAdminUpsertResumeContact,
  useAdminReplaceRecommendations,
  useAdminUpsertPerformanceReview,
  useAdminDeletePerformanceReview,
} from "../../hooks/useAdminApi";
import FormInput from "../../components/admin/FormInput";
import DataTable from "../../components/admin/DataTable";
import ConfirmModal from "../../components/admin/ConfirmModal";
import FormTextarea from "../../components/admin/FormTextarea";
import ResumeEntryForm from "./ResumeEntryForm";
import type { ProfessionalEntry, ResumeRecommendationItem } from "../../types";
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
  const upsertTitle = useAdminUpsertResumeTitle();
  const upsertSummary = useAdminUpsertResumeSummary();
  const upsertContact = useAdminUpsertResumeContact();
  const replaceRecommendations = useAdminReplaceRecommendations();
  const upsertReview = useAdminUpsertPerformanceReview();
  const deleteReview = useAdminDeletePerformanceReview();

  const [tab, setTab] = useState<Tab>("entries");
  const [editingEntryId, setEditingEntryId] = useState<number | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfessionalEntry | null>(null);

  // Title form state
  const [titleText, setTitleText] = useState("");
  const [titleDirty, setTitleDirty] = useState(false);

  // Summary form state
  const [summaryHeadline, setSummaryHeadline] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [summaryDirty, setSummaryDirty] = useState(false);

  // Contact form state
  const [contactLinkedin, setContactLinkedin] = useState("");
  const [contactGithub, setContactGithub] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactDirty, setContactDirty] = useState(false);

  // Recommendations form state
  const [recsItems, setRecsItems] = useState<ResumeRecommendationItem[]>([]);
  const [recsDirty, setRecsDirty] = useState(false);

  const allEntries = resume
    ? Object.values(resume.entries).flat()
    : [];

  // Derive editing entry from query data so it stays fresh after refetch
  const editingEntry =
    editingEntryId !== null && editingEntryId !== "new"
      ? allEntries.find((e) => e.id === editingEntryId) ?? null
      : editingEntryId;

  // Sync form state when resume data loads or tab switches
  const titleSection = resume?.sections?.title as { title?: string } | undefined;
  const summarySection = resume?.sections?.summary as { headline?: string; text?: string } | undefined;
  const contactSection = resume?.sections?.contact as { linkedin?: string; github?: string; email?: string } | undefined;
  const recsSection = resume?.sections?.recommendations as { items?: { author: string; title: string; text: string }[] } | undefined;

  // Reset form state from server data when switching to sections tab
  function resetSectionForms() {
    setTitleText(titleSection?.title ?? "");
    setTitleDirty(false);
    setSummaryHeadline(summarySection?.headline ?? "");
    setSummaryText(summarySection?.text ?? "");
    setSummaryDirty(false);
    setContactLinkedin(contactSection?.linkedin ?? "");
    setContactGithub(contactSection?.github ?? "");
    setContactEmail(contactSection?.email ?? "");
    setContactDirty(false);
    setRecsItems(recsSection?.items ? recsSection.items.map((i) => ({ ...i })) : []);
    setRecsDirty(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Resume Editor</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-700">
        {(["entries", "sections"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === "sections") resetSectionForms();
            }}
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
        <div className="space-y-6">
          {/* Title */}
          <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white">Title</h3>
            <FormInput
              label="Title"
              value={titleText}
              onChange={(v) => { setTitleText(v); setTitleDirty(true); }}
              placeholder="Displayed in the browser tab"
            />
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  await upsertTitle.mutateAsync({ title: titleText });
                  setTitleDirty(false);
                }}
                disabled={!titleDirty || upsertTitle.isPending}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
              >
                {upsertTitle.isPending ? "Saving..." : "Save Title"}
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white">Summary</h3>
            <FormInput
              label="Headline"
              value={summaryHeadline}
              onChange={(v) => { setSummaryHeadline(v); setSummaryDirty(true); }}
              placeholder="Optional headline above the summary"
            />
            <FormTextarea
              label="Text"
              value={summaryText}
              onChange={(v) => { setSummaryText(v); setSummaryDirty(true); }}
              rows={5}
            />
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  await upsertSummary.mutateAsync({ headline: summaryHeadline || null, text: summaryText });
                  setSummaryDirty(false);
                }}
                disabled={!summaryDirty || upsertSummary.isPending}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
              >
                {upsertSummary.isPending ? "Saving..." : "Save Summary"}
              </button>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white">Contact</h3>
            <FormInput
              label="LinkedIn"
              value={contactLinkedin}
              onChange={(v) => { setContactLinkedin(v); setContactDirty(true); }}
              placeholder="https://www.linkedin.com/in/..."
            />
            <FormInput
              label="GitHub"
              value={contactGithub}
              onChange={(v) => { setContactGithub(v); setContactDirty(true); }}
              placeholder="https://github.com/..."
            />
            <FormInput
              label="Email"
              value={contactEmail}
              onChange={(v) => { setContactEmail(v); setContactDirty(true); }}
              placeholder="email@example.com"
            />
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  await upsertContact.mutateAsync({
                    linkedin: contactLinkedin || null,
                    github: contactGithub || null,
                    email: contactEmail || null,
                  });
                  setContactDirty(false);
                }}
                disabled={!contactDirty || upsertContact.isPending}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
              >
                {upsertContact.isPending ? "Saving..." : "Save Contact"}
              </button>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Recommendations</h3>
              <button
                onClick={() => {
                  setRecsItems([...recsItems, { author: "", title: "", text: "" }]);
                  setRecsDirty(true);
                }}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                + Add
              </button>
            </div>
            {recsItems.map((item, idx) => (
              <div key={idx} className="border border-gray-600 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">#{idx + 1}</span>
                  <button
                    onClick={() => {
                      setRecsItems(recsItems.filter((_, i) => i !== idx));
                      setRecsDirty(true);
                    }}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
                <FormInput
                  label="Author"
                  value={item.author}
                  onChange={(v) => {
                    setRecsItems(recsItems.map((r, i) => i === idx ? { ...r, author: v } : r));
                    setRecsDirty(true);
                  }}
                  required
                />
                <FormInput
                  label="Title"
                  value={item.title}
                  onChange={(v) => {
                    setRecsItems(recsItems.map((r, i) => i === idx ? { ...r, title: v } : r));
                    setRecsDirty(true);
                  }}
                  required
                />
                <FormTextarea
                  label="Text"
                  value={item.text}
                  onChange={(v) => {
                    setRecsItems(recsItems.map((r, i) => i === idx ? { ...r, text: v } : r));
                    setRecsDirty(true);
                  }}
                  rows={3}
                />
              </div>
            ))}
            {recsItems.length === 0 && (
              <p className="text-sm text-gray-400">No recommendations yet.</p>
            )}
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  await replaceRecommendations.mutateAsync({ items: recsItems });
                  setRecsDirty(false);
                }}
                disabled={!recsDirty || replaceRecommendations.isPending}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
              >
                {replaceRecommendations.isPending ? "Saving..." : "Save Recommendations"}
              </button>
            </div>
          </div>
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
