import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import api, { getErrorMessage } from '../lib/api';
import toast from 'react-hot-toast';
import {
  BookOpen,
  PenTool,
  Search,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Eye,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  Flame,
  Globe,
  HelpCircle,
  X,
  User,
  Edit,
  Trash2
} from 'lucide-react';
import Button from '../components/ui/Button';
import RecentActionsWidget from '../components/shared/RecentActionsWidget';
import { formatDistanceToNow } from 'date-fns';

const POPULAR_TAGS = [
  'All',
  'Editorial',
  'Tutorial',
  'Dynamic Programming',
  'Graphs',
  'Math',
  'Data Structures',
  'Interviews',
  'Announcements'
];

export default function BlogsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trending'); // 'trending' | 'recent' | 'my'
  const [selectedTag, setSelectedTag] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [quota, setQuota] = useState(null);
  const [deleteModalBlog, setDeleteModalBlog] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch blogs
  useEffect(() => {
    let isMounted = true;
    const fetchBlogs = async () => {
      setLoading(true);
      try {
        const params = {
          sort: activeTab === 'my' ? 'recent' : activeTab,
          ...(activeTab === 'my' && user ? { author: user.username } : {}),
          ...(selectedTag !== 'All' ? { tag: selectedTag.toLowerCase() } : {}),
          ...(searchQuery.trim() ? { search: searchQuery.trim() } : {})
        };
        const { data } = await api.get('/blogs', { params });
        if (isMounted) {
          setBlogs(data.blogs || []);
        }
      } catch (err) {
        console.error('Failed to load blogs', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBlogs();
    return () => { isMounted = false; };
  }, [activeTab, selectedTag, searchQuery, user]);

  // Fetch user quota if authenticated
  useEffect(() => {
    if (user) {
      api.get('/blogs/me/quota')
        .then(({ data }) => setQuota(data))
        .catch(() => {});
    }
  }, [user]);

  const handleCreateBlogClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/blogs/create');
  };

  const handleDeleteBlog = async () => {
    if (!deleteModalBlog) return;
    try {
      setDeleting(true);
      await api.delete(`/blogs/${deleteModalBlog._id}`);
      setBlogs((prev) => prev.filter((b) => b._id !== deleteModalBlog._id));
      if (quota) {
        setQuota((q) => ({ ...q, count: Math.max(0, q.count - 1) }));
      }
      toast.success('Blog deleted successfully');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete blog'));
    } finally {
      setDeleting(false);
      setDeleteModalBlog(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-16">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#181920] via-[#232532] to-[#181920] text-white p-7 sm:p-10 border border-gray-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffa116]/10 border border-[#ffa116]/30 text-[#ffa116] text-xs font-semibold">
            <BookOpen size={14} className="text-[#ffa116]" />
            <span>Community Knowledge & Editorials</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Codeforces-Style Community Blogs
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
            Read and publish competitive programming tutorials, contest editorials, algorithm deep-dives, and interview prep guides.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <Button
            size="lg"
            onClick={handleCreateBlogClick}
            className="bg-[#ffa116] hover:bg-[#e59114] text-[#1a1a1a] font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#ffa116]/20"
          >
            <PenTool size={16} />
            <span>Write a Blog</span>
          </Button>

          {user && quota && (
            <div className="text-center sm:text-left bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-xs">
              <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Your Quota</div>
              <div className="font-bold text-gray-200">
                <span className={quota.count >= 5 ? 'text-rose-400' : 'text-emerald-400'}>
                  {quota.count}
                </span> / {quota.max} Blogs
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Controls & Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs: Trending vs Recent vs My Blogs */}
          <div className="inline-flex p-1 rounded-xl bg-[#282828] border border-[#383838] self-start">
            <button
              type="button"
              onClick={() => setActiveTab('trending')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'trending'
                  ? 'bg-[#383838] text-[#ffa116] shadow-xs'
                  : 'text-gray-400 hover:text-[#eff2f6]'
              }`}
            >
              <Flame size={14} className={activeTab === 'trending' ? 'text-[#ffa116]' : ''} />
              <span>Trending</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recent')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'recent'
                  ? 'bg-[#383838] text-[#ffa116] shadow-xs'
                  : 'text-gray-400 hover:text-[#eff2f6]'
              }`}
            >
              <Clock size={14} className={activeTab === 'recent' ? 'text-[#ffa116]' : ''} />
              <span>Recent</span>
            </button>
            {user && (
              <button
                type="button"
                onClick={() => setActiveTab('my')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'my'
                    ? 'bg-[#383838] text-[#ffa116] shadow-xs'
                    : 'text-gray-400 hover:text-[#eff2f6]'
                }`}
              >
                <User size={14} className={activeTab === 'my' ? 'text-[#ffa116]' : ''} />
                <span>My Blogs {quota ? `(${quota.count}/5)` : ''}</span>
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search blogs, topics, author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-8 py-2.5 bg-[#1a1a1a] border border-[#383838] rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#ffa116] text-[#eff2f6] placeholder:text-gray-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 p-1"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Category Tag Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {POPULAR_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTag(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                selectedTag === t
                  ? 'bg-[#ffa116] text-[#1a1a1a] shadow-xs font-bold'
                  : 'bg-[#282828] border border-[#383838] text-gray-400 hover:text-[#eff2f6] hover:bg-[#383838]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Grid: Blogs List (Left) + Recent Actions Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Blog Feed */}
        <div className="lg:col-span-8 space-y-4">
          {/* My Blogs Banner if on 'my' tab */}
          {activeTab === 'my' && (
            <div className="bg-[#ffa116]/5 border border-[#ffa116]/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[#eff2f6] flex items-center gap-2">
                  <User size={16} className="text-[#ffa116]" />
                  <span>My Published Articles ({blogs.length} / 5 Slots)</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Manage your authored blogs and monitor community feedback and upvotes.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleCreateBlogClick}
                disabled={quota && quota.count >= 5}
                className="bg-[#ffa116] hover:bg-[#e59114] text-[#1a1a1a] font-bold text-xs flex items-center gap-1.5 shrink-0"
              >
                <PenTool size={13} />
                <span>{quota && quota.count >= 5 ? 'Quota Reached (5/5)' : 'Write New Blog'}</span>
              </Button>
            </div>
          )}

          {loading ? (
            <div className="bg-[#282828] rounded-2xl border border-[#383838] p-12 text-center text-xs text-gray-400">
              Loading community blogs...
            </div>
          ) : blogs.length === 0 ? (
            <div className="bg-[#282828] rounded-2xl border border-dashed border-[#383838] p-12 text-center space-y-3">
              <BookOpen size={36} className="mx-auto text-gray-500" />
              <h3 className="text-base font-bold text-[#eff2f6]">
                {activeTab === 'my' ? "You haven't written any blogs yet" : 'No blogs found'}
              </h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {activeTab === 'my'
                  ? 'Share your algorithmic insights, contest write-ups, or problem tutorials with the community (up to 5 blogs per user).'
                  : searchQuery || selectedTag !== 'All'
                  ? 'No blogs matched your search filters. Try clearing the filter or searching for another topic.'
                  : 'No blogs have been published yet. Be the pioneer and share your knowledge with the community!'}
              </p>
              <div className="pt-2">
                <Button size="sm" onClick={handleCreateBlogClick} className="bg-[#ffa116] hover:bg-[#e59114] text-[#1a1a1a] font-bold text-xs">
                  Write First Blog
                </Button>
              </div>
            </div>
          ) : (
            blogs.map((blog) => {
              const timeAgo = blog.createdAt
                ? formatDistanceToNow(new Date(blog.createdAt), { addSuffix: true })
                : '';
              const canManage = user && (blog.authorUsername === user.username || user.role === 'ADMIN');

              return (
                <div
                  key={blog._id}
                  className="bg-[#282828] rounded-2xl border border-[#383838] hover:border-[#ffa116]/50 hover:shadow-md transition-all p-5 sm:p-6 space-y-3 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      {/* Author & Timestamp */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <Link
                          to={`/profile/${blog.authorUsername}`}
                          className="font-bold text-[#ffa116] hover:underline"
                        >
                          @{blog.authorUsername}
                        </Link>
                        <span>•</span>
                        <span>{timeAgo}</span>
                        {blog.viewsCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Eye size={12} /> {blog.viewsCount} views
                            </span>
                          </>
                        )}
                      </div>

                      {/* Title */}
                      <Link to={`/blog/${blog._id}`} className="block">
                        <h2 className="text-lg sm:text-xl font-bold text-[#eff2f6] group-hover:text-[#ffa116] transition-colors line-clamp-2">
                          {blog.title}
                        </h2>
                      </Link>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canManage && (
                        <div className="flex items-center gap-1 bg-[#1a1a1a] p-1 rounded-xl border border-[#383838]">
                          <Link
                            to={`/blogs/${blog._id}/edit`}
                            className="p-1 rounded-lg text-gray-400 hover:text-[#ffa116] hover:bg-[#282828] transition-colors"
                            title="Edit Blog"
                          >
                            <Edit size={13} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteModalBlog(blog)}
                            className="p-1 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-[#282828] transition-colors cursor-pointer"
                            title="Delete Blog"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}

                      {/* Net Score Pill */}
                      <div className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1 ${
                        blog.score > 0
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                          : blog.score < 0
                          ? 'bg-rose-950/40 text-rose-400 border-rose-800/50'
                          : 'bg-[#1a1a1a] text-gray-400 border-[#383838]'
                      }`}>
                        <ThumbsUp size={11} className={blog.score > 0 ? 'fill-emerald-400' : ''} />
                        <span>{blog.score > 0 ? `+${blog.score}` : blog.score}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  {blog.summary && (
                    <p className="text-xs sm:text-sm text-gray-300 line-clamp-2 leading-relaxed">
                      {blog.summary}
                    </p>
                  )}

                  {/* Tags & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#383838] text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {blog.tags.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTag(t)}
                          className="px-2 py-0.5 rounded-md bg-[#1a1a1a] border border-[#383838] hover:border-[#ffa116]/50 hover:text-[#ffa116] text-[11px] font-semibold text-gray-400 transition-colors"
                        >
                          #{t}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-gray-400">
                      <span className="flex items-center gap-1 text-[11px]">
                        <MessageSquare size={13} />
                        <strong>{blog.commentsCount}</strong> comments
                      </span>

                      <Link
                        to={`/blog/${blog._id}`}
                        className="font-bold text-[#ffa116] hover:underline inline-flex items-center gap-1"
                      >
                        Read Article <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Codeforces "Recent Actions" Feed & Community Info */}
        <div className="lg:col-span-4 space-y-6">
          {/* Codeforces-style Recent Actions Widget */}
          <RecentActionsWidget maxItems={12} />

          {/* Blogging Guidelines & Limits */}
          <div className="bg-[#282828] rounded-2xl border border-[#383838] p-5 space-y-3 text-xs text-gray-400 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-[#eff2f6] text-sm">
              <Sparkles size={16} className="text-[#ffa116]" />
              <span>CodeLadder Blogs</span>
            </div>
            <ul className="space-y-2 list-disc pl-4 text-[12px] leading-relaxed">
              <li>
                <strong>Limit:</strong> Up to 5 blogs per user to maintain high content quality.
              </li>
              <li>
                <strong>Size Limit:</strong> Max 50,000 characters per blog (~10,000 words).
              </li>
              <li>
                <strong>Notion & Math:</strong> Supports LaTeX math (<code className="text-[#ffa116]">$O(N)$</code>), code blocks, and markdown callouts.
              </li>
              <li>
                <strong>Upvote Rule:</strong> Votes lock 2 minutes after casting.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalBlog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-[#282828] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#383838] space-y-4">
            <h3 className="text-base font-bold text-[#eff2f6]">Delete Blog Post?</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Are you sure you want to permanently delete <strong>"{deleteModalBlog.title}"</strong>? This will free up 1 slot in your 5-blog quota. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalBlog(null)}
                className="text-xs border-[#383838] text-gray-300 hover:bg-[#383838]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteBlog}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {deleting ? 'Deleting...' : 'Delete Blog'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
