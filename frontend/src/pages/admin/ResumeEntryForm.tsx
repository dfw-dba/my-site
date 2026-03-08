import { useState, useEffect } from "react";
import type { ProfessionalEntry, PerformanceReview, PerformanceReviewCreate } from "../../types";
import FormInput from "../../components/admin/FormInput";
import FormTextarea from "../../components/admin/FormTextarea";
import FormSelect from "../../components/admin/FormSelect";
import TagInput from "../../components/admin/TagInput";
import ListInput from "../../components/admin/ListInput";
import ConfirmModal from "../../components/admin/ConfirmModal";

const ENTRY_TYPE_OPTIONS = [
  { value: "work", label: "Work" },
  { value: "education", label: "Education" },
  { value: "certification", label: "Certification" },
  { value: "award", label: "Award" },
];

interface ResumeEntryFormProps {
  entry: ProfessionalEntry | null;
  onSave: (data: {
    id?: number;
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
  onSaveReview?: (data: PerformanceReviewCreate) => void;
  onDeleteReview?: (id: number) => void;
  reviewSaving?: boolean;
}

function ReviewEditor({
  reviews,
  entryId,
  onSave,
  onDelete,
  saving,
}: {
  reviews: PerformanceReview[];
  entryId: number;
  onSave: (data: PerformanceReviewCreate) => void;
  onDelete: (id: number) => void;
  saving?: boolean;
}) {
  const [editingReview, setEditingReview] = useState<PerformanceReview | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PerformanceReview | null>(null);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerTitle, setReviewerTitle] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewSortOrder, setReviewSortOrder] = useState("0");

  function openReviewForm(review: PerformanceReview | "new") {
    setEditingReview(review);
    if (review === "new") {
      setReviewerName("");
      setReviewerTitle("");
      setReviewDate("");
      setReviewText("");
      setReviewSortOrder(String(reviews.length));
    } else {
      setReviewerName(review.reviewer_name);
      setReviewerTitle(review.reviewer_title ?? "");
      setReviewDate(review.review_date ?? "");
      setReviewText(review.text);
      setReviewSortOrder(String(review.id));
    }
  }

  function handleSaveReview() {
    onSave({
      id: editingReview !== "new" ? editingReview?.id ?? undefined : undefined,
      entry_id: entryId,
      reviewer_name: reviewerName,
      reviewer_title: reviewerTitle || null,
      review_date: reviewDate || null,
      review_text: reviewText,
      sort_order: parseInt(reviewSortOrder) || 0,
    });
    setEditingReview(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-300">
          Performance Reviews ({reviews.length})
        </span>
        <button
          type="button"
          onClick={() => openReviewForm("new")}
          className="px-2.5 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
        >
          Add Review
        </button>
      </div>

      {reviews.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="flex items-center gap-2 bg-gray-700 rounded px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {review.reviewer_name}
                  {review.reviewer_title && (
                    <span className="text-gray-400"> — {review.reviewer_title}</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 truncate">{review.text}</p>
              </div>
              <button
                type="button"
                onClick={() => openReviewForm(review)}
                className="text-blue-400 hover:text-blue-300 text-xs shrink-0"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(review)}
                className="text-red-400 hover:text-red-300 text-xs shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {editingReview !== null && (
        <div className="bg-gray-700/50 rounded-lg p-4 mt-2 space-y-3">
          <h4 className="text-sm font-semibold text-white">
            {editingReview === "new" ? "New Review" : "Edit Review"}
          </h4>
          <FormInput
            label="Reviewer Name"
            value={reviewerName}
            onChange={setReviewerName}
            required
          />
          <FormInput
            label="Reviewer Title"
            value={reviewerTitle}
            onChange={setReviewerTitle}
          />
          <FormInput
            label="Review Date"
            value={reviewDate}
            onChange={setReviewDate}
            type="date"
          />
          <FormTextarea
            label="Review Text"
            value={reviewText}
            onChange={setReviewText}
            rows={3}
          />
          <FormInput
            label="Sort Order"
            value={reviewSortOrder}
            onChange={setReviewSortOrder}
            type="number"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingReview(null)}
              className="px-3 py-1.5 text-xs text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveReview}
              disabled={saving || !reviewerName || !reviewText}
              className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Review"}
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Review"
        message={`Delete review by "${deleteTarget?.reviewer_name}"? This cannot be undone.`}
        onConfirm={() => {
          if (deleteTarget) {
            onDelete(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default function ResumeEntryForm({
  entry,
  onSave,
  onCancel,
  saving,
  onSaveReview,
  onDeleteReview,
  reviewSaving,
}: ResumeEntryFormProps) {
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
      setEntryType(entry.entry_type ?? "work");
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

          {entry && onSaveReview && onDeleteReview && (
            <ReviewEditor
              reviews={entry.performance_reviews ?? []}
              entryId={entry.id}
              onSave={onSaveReview}
              onDelete={onDeleteReview}
              saving={reviewSaving}
            />
          )}
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
