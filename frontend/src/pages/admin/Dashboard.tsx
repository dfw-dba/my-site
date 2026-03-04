import { Link } from "react-router";
import { useAdminBlogPosts, useAdminShowcaseItems, useAdminAlbums } from "../../hooks/useAdminApi";
import StatCard from "../../components/admin/StatCard";

export default function Dashboard() {
  const blog = useAdminBlogPosts();
  const showcase = useAdminShowcaseItems();
  const albums = useAdminAlbums();

  const allPosts = blog.data?.posts ?? [];
  const publishedCount = allPosts.filter((p) => p.published).length;
  const draftCount = allPosts.filter((p) => !p.published).length;
  const drafts = allPosts.filter((p) => !p.published);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Blog group */}
        <div className="bg-gray-700/30 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Blog</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Posts" count={publishedCount} loading={blog.isLoading} />
            <StatCard label="Drafts" count={draftCount} loading={blog.isLoading} />
          </div>
        </div>

        <StatCard label="Showcase Items" count={showcase.data?.length} loading={showcase.isLoading} />
        <StatCard label="Albums" count={albums.data?.length} loading={albums.isLoading} />
      </div>

      {draftCount > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Unpublished Drafts</h2>
          <div className="space-y-2">
            {drafts.map((post) => (
              <Link
                key={post.id}
                to={`/admin/blog/${post.slug}`}
                className="flex items-center justify-between bg-gray-700/50 hover:bg-gray-700 rounded-lg px-4 py-3 transition-colors group"
              >
                <div>
                  <span className="text-white font-medium group-hover:text-blue-300 transition-colors">
                    {post.title}
                  </span>
                  <span className="ml-3 text-xs text-yellow-400 bg-yellow-600/20 px-2 py-0.5 rounded">
                    Draft
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {post.updated_at
                    ? `Updated ${new Date(post.updated_at).toLocaleDateString()}`
                    : `Created ${new Date(post.created_at).toLocaleDateString()}`}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-white mb-3">Quick Actions</h2>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/admin/blog/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
        >
          New Blog Post
        </Link>
        <Link
          to="/admin/showcase/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
        >
          New Showcase Item
        </Link>
        <Link
          to="/admin/media"
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
        >
          Manage Media
        </Link>
      </div>
    </div>
  );
}
