import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useAdminBlogPost, useAdminUpsertBlogPost, useAdminDeleteBlogPost } from "../../hooks/useAdminApi";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import FormInput from "../../components/admin/FormInput";
import FormTextarea from "../../components/admin/FormTextarea";
import FormToggle from "../../components/admin/FormToggle";
import TagInput from "../../components/admin/TagInput";
import SaveBar from "../../components/admin/SaveBar";
import ConfirmModal from "../../components/admin/ConfirmModal";
import MarkdownRenderer from "../../components/MarkdownRenderer";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function BlogEditForm() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isNew = !slug;

  const { data: existing } = useAdminBlogPost(slug ?? "");
  const upsert = useAdminUpsertBlogPost();
  const deleteMutation = useAdminDeleteBlogPost();

  const [title, setTitle] = useState("");
  const [postSlug, setPostSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [dirty, setDirty] = useState(false);
  const loaded = useRef(false);

  useUnsavedChanges(dirty);

  useEffect(() => {
    if (existing && !isNew) {
      setTitle(existing.title);
      setPostSlug(existing.slug);
      setExcerpt(existing.excerpt ?? "");
      setContent(existing.content);
      setTags(existing.tags);
      setPublished(existing.published);
      setSlugManuallyEdited(true);
      loaded.current = true;
    }
  }, [existing, isNew]);

  useEffect(() => {
    if (!slugManuallyEdited) {
      setPostSlug(slugify(title));
    }
  }, [title, slugManuallyEdited]);

  // Mark dirty after initial load
  useEffect(() => {
    if (isNew && title) setDirty(true);
    if (!isNew && loaded.current) setDirty(true);
  }, [title, postSlug, excerpt, content, tags, published, isNew]);

  function handleSave() {
    upsert.mutate(
      {
        slug: postSlug,
        title,
        excerpt: excerpt || null,
        content,
        tags,
        published,
      },
      {
        onSuccess: () => {
          setDirty(false);
          navigate("/admin/blog");
        },
      },
    );
  }

  function handleDelete() {
    if (!slug) return;
    deleteMutation.mutate(slug, {
      onSuccess: () => navigate("/admin/blog"),
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">
        {isNew ? "New Blog Post" : "Edit Blog Post"}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          <FormInput
            label="Title"
            value={title}
            onChange={setTitle}
            required
          />
          <FormInput
            label="Slug"
            value={postSlug}
            onChange={(v) => {
              setPostSlug(v);
              setSlugManuallyEdited(true);
            }}
            required
          />
          <FormInput
            label="Excerpt"
            value={excerpt}
            onChange={setExcerpt}
            placeholder="Brief summary..."
          />
          <FormTextarea
            label="Content (Markdown)"
            value={content}
            onChange={setContent}
            rows={20}
            required
          />
          <TagInput label="Tags" value={tags} onChange={setTags} />
          <FormToggle
            label="Published"
            checked={published}
            onChange={setPublished}
          />
        </div>

        {/* Preview */}
        <div className="bg-gray-700/30 rounded-lg p-6 overflow-y-auto max-h-[80vh]">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Preview</p>
          {content ? (
            <MarkdownRenderer content={content} />
          ) : (
            <p className="text-gray-500 italic">Start typing to see preview...</p>
          )}
        </div>
      </div>

      <SaveBar
        onSave={handleSave}
        onCancel={() => navigate("/admin/blog")}
        onDelete={!isNew ? () => setShowDelete(true) : undefined}
        saving={upsert.isPending}
        disabled={!title || !postSlug || !content}
      />

      <ConfirmModal
        open={showDelete}
        title="Delete Blog Post"
        message={`Are you sure you want to delete "${title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
