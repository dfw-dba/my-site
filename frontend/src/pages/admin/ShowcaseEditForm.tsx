import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useAdminShowcaseItem, useAdminUpsertShowcaseItem, useAdminDeleteShowcaseItem } from "../../hooks/useAdminApi";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import FormInput from "../../components/admin/FormInput";
import FormTextarea from "../../components/admin/FormTextarea";
import FormSelect from "../../components/admin/FormSelect";
import TagInput from "../../components/admin/TagInput";
import SaveBar from "../../components/admin/SaveBar";
import ConfirmModal from "../../components/admin/ConfirmModal";

const CATEGORY_OPTIONS = [
  { value: "data-engineering", label: "Data Engineering" },
  { value: "web", label: "Web" },
  { value: "devops", label: "DevOps" },
  { value: "ai-ml", label: "AI / ML" },
  { value: "other", label: "Other" },
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function ShowcaseEditForm() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isNew = !slug;

  const { data: existing } = useAdminShowcaseItem(slug ?? "");
  const upsert = useAdminUpsertShowcaseItem();
  const deleteMutation = useAdminDeleteShowcaseItem();

  const [title, setTitle] = useState("");
  const [itemSlug, setItemSlug] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [demoUrl, setDemoUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [dirty, setDirty] = useState(false);
  const loaded = useRef(false);

  useUnsavedChanges(dirty);

  useEffect(() => {
    if (existing && !isNew) {
      setTitle(existing.title);
      setItemSlug(existing.slug);
      setDescription(existing.description ?? "");
      setContent(existing.content ?? "");
      setCategory(existing.category);
      setTechnologies(existing.technologies);
      setDemoUrl(existing.demo_url ?? "");
      setRepoUrl(existing.repo_url ?? "");
      setSortOrder(String(existing.sort_order));
      setSlugManuallyEdited(true);
      loaded.current = true;
    }
  }, [existing, isNew]);

  useEffect(() => {
    if (!slugManuallyEdited) {
      setItemSlug(slugify(title));
    }
  }, [title, slugManuallyEdited]);

  useEffect(() => {
    if (isNew && title) setDirty(true);
    if (!isNew && loaded.current) setDirty(true);
  }, [title, itemSlug, description, content, category, technologies, demoUrl, repoUrl, sortOrder, isNew]);

  function handleSave() {
    upsert.mutate(
      {
        slug: itemSlug,
        title,
        description: description || null,
        content: content || null,
        category,
        technologies,
        demo_url: demoUrl || null,
        repo_url: repoUrl || null,
        sort_order: parseInt(sortOrder) || 0,
      },
      {
        onSuccess: () => {
          setDirty(false);
          navigate("/admin/showcase");
        },
      },
    );
  }

  function handleDelete() {
    if (!slug) return;
    deleteMutation.mutate(slug, {
      onSuccess: () => {
        setDirty(false);
        navigate("/admin/showcase");
      },
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">
        {isNew ? "New Showcase Item" : "Edit Showcase Item"}
      </h1>

      <div className="max-w-2xl space-y-4">
        <FormInput label="Title" value={title} onChange={setTitle} required />
        <FormInput
          label="Slug"
          value={itemSlug}
          onChange={(v) => {
            setItemSlug(v);
            setSlugManuallyEdited(true);
          }}
          required
        />
        <FormTextarea
          label="Description"
          value={description}
          onChange={setDescription}
          rows={3}
        />
        <FormTextarea
          label="Content (Markdown)"
          value={content}
          onChange={setContent}
          rows={12}
        />
        <FormSelect
          label="Category"
          value={category}
          onChange={setCategory}
          options={CATEGORY_OPTIONS}
          required
        />
        <TagInput
          label="Technologies"
          value={technologies}
          onChange={setTechnologies}
          placeholder="Add technology..."
        />
        <FormInput label="Demo URL" value={demoUrl} onChange={setDemoUrl} placeholder="https://..." />
        <FormInput label="Repo URL" value={repoUrl} onChange={setRepoUrl} placeholder="https://..." />
        <FormInput
          label="Sort Order"
          value={sortOrder}
          onChange={setSortOrder}
          type="number"
        />
      </div>

      <SaveBar
        onSave={handleSave}
        onCancel={() => navigate("/admin/showcase")}
        onDelete={!isNew ? () => setShowDelete(true) : undefined}
        saving={upsert.isPending}
        disabled={!title || !itemSlug || !category}
      />

      <ConfirmModal
        open={showDelete}
        title="Delete Showcase Item"
        message={`Are you sure you want to delete "${title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
