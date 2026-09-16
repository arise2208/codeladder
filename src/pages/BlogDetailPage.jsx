import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import api, { getErrorMessage } from '../lib/api';
import {
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
  Share2,
  Calendar,
  Clock,
  Eye,
  Trash2,
  Edit,
  MessageSquare,
  Send,
  User,
  ShieldCheck,
  AlertCircle,
  ListTree,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import Button from '../components/ui/Button';
import NotionRenderer from '../components/shared/NotionRenderer';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

export default function BlogDetailPage() {
  const { blogId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [commentVoting, setCommentVoting] = useState({});
  const [tocOpen, setTocOpen] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchBlog = async () => {
    try {
      const { data } = await api.get(`/blogs/${blogId}`);
      setBlog(data.blog);
    } catch (err) {
      console.error('Failed to load blog', err);
      toast.error(getErrorMessage(err, 'Failed to load blog'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlog();
  }, [blogId]);

  const headings = useMemo(() => {
    if (!blog?.content) return [];
    const lines = blog.content.split('\n');
    const list = [];
    lines.forEach((line) => {
      const h1Match = line.match(/^#\s+(.+)$/);
      const h2Match = line.match(/^##\s+(.+)$/);
      const h3Match = line.match(/^###\s+(.+)$/);
      if (h1Match) {
        const text = h1Match[1].trim();
        list.push({ level: 1, text, id: text.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
      } else if (h2Match) {
        const text = h2Match[1].trim();
        list.push({ level: 2, text, id: text.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
      } else if (h3Match) {
        const text = h3Match[1].trim();
        list.push({ level: 3, text, id: text.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
      }
    });
    return list;
  }, [blog?.content]);

  const handleVote = async (voteType) => {
    if (!user) {
      toast.error('Please sign in to vote on blogs');
      return;
    }
    try {
      setVoting(true);
      const { data } = await api.post(`/blogs/${blogId}/vote`, { vote: voteType });
      setBlog((prev) => ({
        ...prev,
        upvotesCount: data.upvotesCount,
        downvotesCount: data.downvotesCount,
        score: data.score,
        userVote: data.userVote
      }));
      toast.success(
        data.userVote === voteType
          ? `${voteType === 'UPVOTE' ? 'Upvoted' : 'Downvoted'} blog!`
          : 'Vote removed'
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update vote'));
    } finally {
      setVoting(false);
    }
  };

  const handleVoteComment = async (commentId, voteType) => {
    if (!user) {
      toast.error('Please sign in to vote on comments');
      return;
    }
    try {
      setCommentVoting((prev) => ({ ...prev, [commentId]: true }));
      const { data } = await api.post(`/blogs/${blogId}/comments/${commentId}/vote`, { vote: voteType });
      setBlog((prev) => {
        if (!prev) return prev;
        const updatedComments = (prev.comments || []).map((c) => {
          if (c._id !== commentId) return c;
          return {
            ...c,
            upvotesCount: data.upvotesCount,
            downvotesCount: data.downvotesCount,
            score: data.score,
            userVote: data.userVote
          };
        });
        return { ...prev, comments: updatedComments };
      });
      toast.success(
        data.userVote === voteType
          ? `${voteType === 'UPVOTE' ? 'Upvoted' : 'Downvoted'} comment!`
          : 'Vote removed'
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update vote on comment'));
    } finally {
      setCommentVoting((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Article link copied to clipboard!');
  };

  const handleDeleteBlog = async () => {
    try {
      setDeleting(true);
      await api.delete(`/blogs/${blogId}`);
      toast.success('Blog deleted');
      navigate('/blogs');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete blog'));
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      setSubmittingComment(true);
      const { data } = await api.post(`/blogs/${blogId}/comments`, { content: commentText.trim() });
      setBlog((prev) => ({
        ...prev,
        comments: [...(prev.comments || []), data.comment],
        commentsCount: (prev.commentsCount || 0) + 1
      }));
      setCommentText('');
      toast.success('Comment posted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to post comment'));
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/blogs/${blogId}/comments/${commentId}`);
      setBlog((prev) => ({
        ...prev,
        comments: (prev.comments || []).filter((c) => c._id !== commentId),
        commentsCount: Math.max(0, (prev.commentsCount || 1) - 1)
      }));
      toast.success('Comment removed');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete comment'));
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-xs text-gray-400">
        Loading article...
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle size={40} className="mx-auto text-rose-500" />
        <h2 className="text-xl font-bold text-[#eff2f6]">Blog Post Not Found</h2>
        <p className="text-xs text-gray-400">This blog may have been deleted or the link is incorrect.</p>
        <Link to="/blogs">
          <Button variant="primary" size="sm" className="bg-[#ffa116] hover:bg-[#e59114] text-[#1a1a1a] font-bold">
            ← Return to Blogs
          </Button>
        </Link>
      </div>
    );
  }

  const isAuthor = user && (String(blog.authorId) === String(user.id || user._id) || user.username === blog.authorUsername);
  const isAdmin = user && user.role === 'ADMIN';
  const canEdit = isAuthor || isAdmin;

  const readTimeMin = Math.max(1, Math.ceil((blog.content || '').length / 1200));
  const publishedDateStr = blog.createdAt ? format(new Date(blog.createdAt), 'MMMM d, yyyy') : '';
  const relativeTime = blog.createdAt ? formatDistanceToNow(new Date(blog.createdAt), { addSuffix: true }) : '';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-20">
      {/* 1. Back Nav & Top Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/blogs"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-[#ffa116] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Blogs</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="text-xs flex items-center gap-1.5 border-[#383838] text-gray-300 hover:bg-[#282828] hover:text-[#eff2f6]"
          >
            <Share2 size={13} />
            <span>Share</span>
          </Button>

          {canEdit && (
            <>
              <Link to={`/blogs/${blog._id}/edit`}>
                <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5 text-[#ffa116] border-[#ffa116]/40 hover:bg-[#ffa116]/10">
                  <Edit size={13} />
                  <span>Edit</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalOpen(true)}
                className="text-xs flex items-center gap-1.5 text-rose-400 border-rose-900/50 hover:bg-rose-950/30"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. Article Header Card */}
      <div className="bg-[#282828] rounded-3xl border border-[#383838] p-6 sm:p-10 shadow-xs space-y-6">
        {/* Category Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {blog.tags.map((t) => (
              <span
                key={t}
                className="px-2.5 py-1 rounded-md bg-[#ffa116]/10 text-[#ffa116] border border-[#ffa116]/30 text-xs font-bold uppercase tracking-wider"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl font-black text-[#eff2f6] tracking-tight leading-tight">
          {blog.title}
        </h1>

        {/* Author & Meta Line */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#383838] text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <Link
              to={`/profile/${blog.authorUsername}`}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#ffa116] to-[#ffbe5b] text-[#1a1a1a] font-bold flex items-center justify-center text-sm shadow-xs hover:opacity-90"
            >
              {blog.authorUsername.charAt(0).toUpperCase()}
            </Link>
            <div>
              <Link
                to={`/profile/${blog.authorUsername}`}
                className="font-bold text-[#eff2f6] hover:text-[#ffa116] hover:underline"
              >
                @{blog.authorUsername}
              </Link>
              <div className="text-[11px] text-gray-500">
                Published {publishedDateStr} ({relativeTime})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-gray-500 text-xs">
            <span className="flex items-center gap-1">
              <Clock size={13} /> {readTimeMin} min read
            </span>
            <span className="flex items-center gap-1">
              <Eye size={13} /> {blog.viewsCount || 1} views
            </span>
          </div>
        </div>

        {/* Floating/Integrated Upvote & Downvote Widget */}
        <div className="flex items-center justify-between p-3.5 bg-[#1a1a1a] rounded-2xl border border-[#383838]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-300">Was this article helpful?</span>
          </div>

          <div className="inline-flex items-center bg-[#282828] p-1 rounded-xl border border-[#383838] shadow-2xs">
            <button
              type="button"
              onClick={() => handleVote('UPVOTE')}
              disabled={voting}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                blog.userVote === 'UPVOTE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-300 hover:text-emerald-400 hover:bg-[#383838]'
              }`}
              title={blog.userVote === 'UPVOTE' ? 'Remove Upvote' : 'Upvote this blog'}
            >
              <ThumbsUp size={13} className={blog.userVote === 'UPVOTE' ? 'fill-white' : ''} />
              <span>Upvote</span>
            </button>

            {/* Score display */}
            <span className="px-2.5 text-xs font-black text-[#eff2f6]">
              {blog.score > 0 ? `+${blog.score}` : blog.score}
            </span>

            <button
              type="button"
              onClick={() => handleVote('DOWNVOTE')}
              disabled={voting}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                blog.userVote === 'DOWNVOTE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-gray-300 hover:text-rose-400 hover:bg-[#383838]'
              }`}
              title={blog.userVote === 'DOWNVOTE' ? 'Remove Downvote' : 'Downvote this blog'}
            >
              <ThumbsDown size={13} className={blog.userVote === 'DOWNVOTE' ? 'fill-white' : ''} />
              <span>Downvote</span>
            </button>
          </div>
        </div>

        {/* Table of Contents (if >= 2 headings) */}
        {headings.length >= 2 && (
          <div className="bg-[#1a1a1a] border border-[#383838] rounded-2xl p-4 sm:p-5">
            <button
              type="button"
              onClick={() => setTocOpen(!tocOpen)}
              className="flex items-center justify-between w-full text-left font-bold text-xs sm:text-sm text-gray-300 hover:text-[#ffa116] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ListTree size={16} className="text-[#ffa116]" />
                <span>Table of Contents</span>
                <span className="text-[11px] font-mono text-gray-500">({headings.length} sections)</span>
              </div>
              {tocOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>

            {tocOpen && (
              <nav className="mt-3 pt-3 border-t border-[#383838] space-y-1.5 text-xs">
                {headings.map((h, i) => (
                  <a
                    key={i}
                    href={`#${h.id}`}
                    className={`block text-gray-400 hover:text-[#ffa116] hover:underline transition-colors py-0.5 ${
                      h.level === 1 ? 'font-bold text-[#eff2f6]' : h.level === 2 ? 'pl-4 font-medium text-gray-300' : 'pl-7 text-gray-500'
                    }`}
                  >
                    {h.text}
                  </a>
                ))}
              </nav>
            )}
          </div>
        )}

        {/* 3. Article Content (Rendered via NotionRenderer) */}
        <div className="pt-4 border-t border-[#383838]">
          <NotionRenderer content={blog.content} />
        </div>
      </div>

      {/* 4. Author Signature Card */}
      <div className="bg-[#282828] rounded-2xl border border-[#383838] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#ffa116]/15 text-[#ffa116] flex items-center justify-center font-bold text-lg shrink-0">
            {blog.authorUsername.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#eff2f6]">Written by @{blog.authorUsername}</h4>
            <p className="text-xs text-gray-400">
              Community contributor on CodeLadder.
            </p>
          </div>
        </div>

        <Link to={`/profile/${blog.authorUsername}`}>
          <Button variant="outline" size="sm" className="text-xs border-[#383838] text-gray-300 hover:bg-[#383838]">
            View Profile →
          </Button>
        </Link>
      </div>

      {/* 5. Complete Comments Section */}
      <div className="bg-[#282828] rounded-2xl border border-[#383838] p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#383838] pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-[#ffa116]" />
            <h3 className="text-base font-bold text-[#eff2f6]">
              Discussion ({blog.comments ? blog.comments.length : 0})
            </h3>
          </div>
        </div>

        {/* Post Comment Form */}
        {user ? (
          <form onSubmit={handleAddComment} className="space-y-3">
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts, ask questions, or contribute additional context..."
              className="w-full text-xs sm:text-sm p-3 border border-[#383838] bg-[#1a1a1a] rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#ffa116] text-[#eff2f6] placeholder:text-gray-500"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={submittingComment || !commentText.trim()}
                className="bg-[#ffa116] hover:bg-[#e59114] text-[#1a1a1a] font-bold text-xs flex items-center gap-1.5"
              >
                <Send size={12} />
                <span>{submittingComment ? 'Posting...' : 'Post Comment'}</span>
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-4 rounded-xl bg-[#1a1a1a] border border-[#383838] text-center space-y-2">
            <p className="text-xs text-gray-400">Sign in to participate in the discussion and leave a comment.</p>
            <Link to="/login" className="inline-block">
              <Button size="sm" variant="primary" className="text-xs bg-[#ffa116] hover:bg-[#e59114] text-[#1a1a1a] font-bold">
                Sign In
              </Button>
            </Link>
          </div>
        )}

        {/* Comments List */}
        <div className="divide-y divide-[#383838] space-y-3">
          {(!blog.comments || blog.comments.length === 0) ? (
            <p className="text-xs text-gray-500 text-center py-6">
              No comments yet. Start the conversation!
            </p>
          ) : (
            blog.comments.map((c) => {
              const commentTime = c.createdAt
                ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })
                : '';
              const canDeleteComment =
                user &&
                (String(c.authorId) === String(user.id || user._id) ||
                  isAuthor ||
                  isAdmin);

              return (
                <div key={c._id} className="pt-4 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <Link
                        to={`/profile/${c.authorUsername}`}
                        className="font-bold text-[#ffa116] hover:underline"
                      >
                        @{c.authorUsername}
                      </Link>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500 text-[11px]">{commentTime}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Comment Upvote / Downvote */}
                      <div className="inline-flex items-center bg-[#1a1a1a] border border-[#383838] rounded-lg text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => handleVoteComment(c._id, 'UPVOTE')}
                          disabled={commentVoting[c._id]}
                          className={`px-1.5 py-0.5 rounded-l-md transition-colors cursor-pointer ${
                            c.userVote === 'UPVOTE'
                              ? 'bg-emerald-600 text-white'
                              : 'text-gray-400 hover:text-emerald-400 hover:bg-[#282828]'
                          }`}
                          title={c.userVote === 'UPVOTE' ? 'Remove Upvote' : 'Upvote comment'}
                        >
                          <ThumbsUp size={11} className={c.userVote === 'UPVOTE' ? 'fill-white' : ''} />
                        </button>
                        <span className="px-1 text-[11px] font-semibold text-[#eff2f6]">
                          {c.score > 0 ? `+${c.score}` : c.score ?? 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleVoteComment(c._id, 'DOWNVOTE')}
                          disabled={commentVoting[c._id]}
                          className={`px-1.5 py-0.5 rounded-r-md transition-colors cursor-pointer ${
                            c.userVote === 'DOWNVOTE'
                              ? 'bg-rose-600 text-white'
                              : 'text-gray-400 hover:text-rose-400 hover:bg-[#282828]'
                          }`}
                          title={c.userVote === 'DOWNVOTE' ? 'Remove Downvote' : 'Downvote comment'}
                        >
                          <ThumbsDown size={11} className={c.userVote === 'DOWNVOTE' ? 'fill-white' : ''} />
                        </button>
                      </div>

                      {canDeleteComment && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c._id)}
                          className="text-gray-500 hover:text-rose-400 p-1 rounded-md transition-colors cursor-pointer"
                          title="Delete comment"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed pl-1 whitespace-pre-wrap">
                    {c.content}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-[#282828] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#383838] space-y-4">
            <h3 className="text-base font-bold text-[#eff2f6]">Delete Blog Post?</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Are you sure you want to permanently delete <strong>"{blog.title}"</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalOpen(false)}
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
