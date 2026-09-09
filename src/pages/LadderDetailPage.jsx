import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../lib/api';
import useLadder from '../hooks/useLadder';
import useLadderMembers from '../hooks/useLadderMembers';
import PageHeader from '../components/layout/PageHeader';
import { Button, Input, LoadingSpinner, Tabs } from '../components/ui';
import MemberRow from '../components/shared/MemberRow';
import AddQuestionsModal from '../components/shared/AddQuestionsModal';
import { getCfRatingStyle } from '../lib/ratingStyles';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  Star,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  Play,
  RotateCcw,
  HelpCircle,
  Eye,
  EyeOff,
  Tag,
  Search,
  ArrowUpDown,
  ExternalLink,
  Target,
  BookOpen,
  Globe,
  Share2,
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  Trash2
} from 'lucide-react';

const PLATFORMS = [
  { id: 'ALL', name: 'All' },
  { id: 'CODEFORCES', name: 'Codeforces', color: '#3B82F6' },
  { id: 'LEETCODE', name: 'LeetCode', color: '#F59E0B' },
  { id: 'CODECHEF', name: 'CodeChef', color: '#EA580C' },
  { id: 'ATCODER', name: 'AtCoder', color: '#10B981' }
];

export default function LadderDetailPage() {
  const { ladderId } = useParams();
  const {
    ladder,
    questions,
    role,
    loading,
    error,
    addQuestions,
    removeQuestion,
    reorderQuestions,
    practiseQuestion,
    unpractiseQuestion,
    clearPractice,
    publishLadder,
    voteLadder,
    deleteLadder,
    refetch
  } = useLadder(ladderId);

  const { members, addMember, updateRole, removeMember } = useLadderMembers(ladderId);
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const handleVote = async (voteType) => {
    try {
      await voteLadder(voteType);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update vote'));
    }
  };

  const handleDeleteLadder = async () => {
    const isPublic = ladder?.isPublic;
    const msg = isPublic
      ? 'Are you sure you want to delete this ladder? It is currently listed in Community Ladders and will be permanently removed.'
      : 'Are you sure you want to delete this ladder? This action cannot be undone.';

    if (window.confirm(msg)) {
      try {
        setDeleting(true);
        await deleteLadder();
        toast.success('Ladder deleted');
        navigate('/ladders');
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to delete ladder'));
        setDeleting(false);
      }
    }
  };

  const [activeTab, setActiveTab] = useState('questions');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('READ');

  // Practice Mode state (Blind Solving)
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Publish to Community Ladders state
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishClaim, setPublishClaim] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Filters and controls
  const [selectedPlatform, setSelectedPlatform] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, SOLVED, UNSOLVED, STARRED
  const [sortBy, setSortBy] = useState('DEFAULT'); // DEFAULT, RATING_ASC, RATING_DESC, TITLE, PLATFORM
  const [showRatings, setShowRatings] = useState(true);
  const [showTags, setShowTags] = useState(true);

  const handlePublishLadder = async () => {
    if (!publishClaim.trim()) {
      toast.error('Please state what you claim for this ladder');
      return;
    }
    try {
      setPublishing(true);
      await publishLadder(publishClaim.trim());
      toast.success('Published to Community Ladders!', { icon: '🚀' });
      setPublishModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to publish ladder'));
    } finally {
      setPublishing(false);
    }
  };

  const handleReorder = async (index, direction) => {
    const newQuestions = [...questions];
    if (direction === 'up' && index > 0) {
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
    } else if (direction === 'down' && index < newQuestions.length - 1) {
      [newQuestions[index + 1], newQuestions[index]] = [newQuestions[index], newQuestions[index + 1]];
    } else return;

    try {
      await reorderQuestions(newQuestions.map((q, i) => ({ questionId: q._id || q.questionId || q.id, order: i + 1 })));
      toast.success('Questions reordered');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to reorder'));
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await addMember(newMemberName, newMemberRole);
      setNewMemberName('');
      toast.success('Member added');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add member'));
    }
  };

  const existingQuestionIds = useMemo(() => {
    return questions.map(q => q._id || q.questionId || q.id);
  }, [questions]);

  const handleBatchAddQuestions = async (questionIds) => {
    try {
      const res = await addQuestions(questionIds);
      toast.success(res?.message || `Added ${questionIds.length} questions to ladder`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add questions'));
      throw err;
    }
  };

  const handleRemoveQuestion = async (qId) => {
    try {
      await removeQuestion(qId);
      toast.success('Question removed');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to remove question'));
    }
  };

  const toggleStar = async (qId, isStarred) => {
    try {
      if (isStarred) await api.delete(`/questions/${qId}/star`);
      else await api.put(`/questions/${qId}/star`, { starred: true });
      refetch();
    } catch {
      toast.error('Failed to update star');
    }
  };

  const toggleSolve = async (qId, isSolved) => {
    try {
      if (isSolved) await api.post(`/questions/${qId}/unsolve`);
      else await api.post(`/questions/${qId}/solve`);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update solved state'));
    }
  };

  // Practice mode session actions
  const handleStartPracticeClick = () => {
    setPracticeModalOpen(true);
  };

  const handleContinueSession = () => {
    setIsPracticeMode(true);
    setPracticeModalOpen(false);
    toast.success('Resumed practice session');
  };

  const handleStartFreshSession = async () => {
    try {
      setActionLoading(true);
      await clearPractice();
      setIsPracticeMode(true);
      setPracticeModalOpen(false);
      toast.success('Started fresh practice session! All marks reset to blind (?)');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to reset practice session'));
    } finally {
      setActionLoading(false);
    }
  };

  // Blind practice mark: clicking ? marks BOTH practised and solved
  const handleBlindPracticeSolve = async (qId, isCurrentlyPractised) => {
    try {
      if (isCurrentlyPractised) {
        await unpractiseQuestion(qId);
        toast('Reset to unrevealed (?)', { icon: '🔄' });
      } else {
        await practiseQuestion(qId);
        toast.success('Solved & Practised!', { icon: '🎉' });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update question'));
    }
  };

  // Stats calculation
  const totalQuestions = questions.length;
  const solvedQuestionsCount = questions.filter(q => q.state?.solved ?? q.isSolved).length;
  const practisedQuestionsCount = questions.filter(q => q.practice?.practised ?? q.isPractised).length;
  const solvedPercent = totalQuestions > 0 ? Math.round((solvedQuestionsCount / totalQuestions) * 100) : 0;
  const practicePercent = totalQuestions > 0 ? Math.round((practisedQuestionsCount / totalQuestions) * 100) : 0;

  // Filtered & Sorted Questions
  const displayedQuestions = useMemo(() => {
    let list = [...questions];

    // Platform filter
    if (selectedPlatform !== 'ALL') {
      list = list.filter(q => q.platform?.toUpperCase() === selectedPlatform);
    }

    // Status filter (only active in normal mode)
    if (!isPracticeMode && statusFilter !== 'ALL') {
      if (statusFilter === 'SOLVED') {
        list = list.filter(q => q.state?.solved ?? q.isSolved);
      } else if (statusFilter === 'UNSOLVED') {
        list = list.filter(q => !(q.state?.solved ?? q.isSolved));
      } else if (statusFilter === 'STARRED') {
        list = list.filter(q => q.state?.starred ?? q.isStarred);
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase().trim();
      list = list.filter(q => {
        const titleMatch = q.title?.toLowerCase().includes(qLower);
        const tagMatch = Array.isArray(q.tags) && q.tags.some(t => t.toLowerCase().includes(qLower));
        const platformMatch = q.platform?.toLowerCase().includes(qLower);
        return titleMatch || tagMatch || platformMatch;
      });
    }

    // Sorting
    if (sortBy === 'RATING_ASC') {
      list.sort((a, b) => {
        const rA = a.metadata?.rating || (a.difficulty === 'HARD' ? 2000 : a.difficulty === 'MEDIUM' ? 1400 : 900);
        const rB = b.metadata?.rating || (b.difficulty === 'HARD' ? 2000 : b.difficulty === 'MEDIUM' ? 1400 : 900);
        return rA - rB;
      });
    } else if (sortBy === 'RATING_DESC') {
      list.sort((a, b) => {
        const rA = a.metadata?.rating || (a.difficulty === 'HARD' ? 2000 : a.difficulty === 'MEDIUM' ? 1400 : 900);
        const rB = b.metadata?.rating || (b.difficulty === 'HARD' ? 2000 : b.difficulty === 'MEDIUM' ? 1400 : 900);
        return rB - rA;
      });
    } else if (sortBy === 'TITLE') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'PLATFORM') {
      list.sort((a, b) => (a.platform || '').localeCompare(b.platform || ''));
    }

    return list;
  }, [questions, selectedPlatform, statusFilter, searchQuery, sortBy, isPracticeMode]);

  if (loading) return <LoadingSpinner />;
  if (error || !ladder) return <div className="text-red-500">{error || 'Ladder not found'}</div>;

  const renderQuestionDifficultyOrRating = (q) => {
    if (!showRatings) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-400">
          Hidden
        </span>
      );
    }

    const rating = q.metadata?.rating;
    if (q.platform === 'CODEFORCES' && rating) {
      const style = getCfRatingStyle(rating);
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
          style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
          title={`Codeforces Rating: ${rating} (${style.label})`}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: style.dot }} />
          {rating}
        </span>
      );
    }
    if (q.platform === 'CODECHEF' && rating) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200">
          ★ {rating}
        </span>
      );
    }
    if (q.difficulty) {
      const diff = q.difficulty.toUpperCase();
      const color = diff === 'EASY'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : diff === 'HARD'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
          {diff.charAt(0) + diff.slice(1).toLowerCase()}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
        Unrated
      </span>
    );
  };

  const isOwner = role === 'OWNER';
  const canWrite = role === 'OWNER' || role === 'WRITE';
  const canReorder = canWrite && sortBy === 'DEFAULT' && selectedPlatform === 'ALL' && !searchQuery.trim() && !isPracticeMode;

  return (
    <div className="space-y-6">
      <PageHeader
        title={ladder.title}
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Ladders', path: '/ladders' },
          { label: ladder.title }
        ]}
      />

      {/* Ladder Overview Banner */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs p-5 space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {ladder.isPublic && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Globe size={12} /> Community Ladder
              </span>
            )}
            {ladder.ownerUsername && (
              <span className="text-xs text-gray-500 flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
                <span>By</span>
                <Link
                  to={`/profile/${ladder.ownerUsername}`}
                  className="font-semibold text-gray-800 hover:text-[#6C5CE7] hover:underline font-mono"
                  title={`View @${ladder.ownerUsername}'s profile and community contributions`}
                >
                  @{ladder.ownerUsername}
                </Link>
              </span>
            )}
            <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
              {members.length} {members.length === 1 ? 'Member' : 'Members'}
            </span>
            <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
              {totalQuestions} {totalQuestions === 1 ? 'Problem' : 'Problems'}
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
              <CheckCircle size={12} /> {solvedQuestionsCount} Solved ({solvedPercent}%)
            </span>

          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
            {/* Prominent Upvotes & Downvotes Pill */}
            <div className="inline-flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 shadow-2xs">
              <button
                type="button"
                onClick={() => handleVote('UPVOTE')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  ladder.userVote === 'UPVOTE' || ladder.userVote === 'LIKE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-700 hover:text-emerald-700 hover:bg-white'
                }`}
                title={ladder.userVote === 'UPVOTE' || ladder.userVote === 'LIKE' ? 'Remove Upvote' : 'Upvote this ladder'}
              >
                <ThumbsUp size={13} className={ladder.userVote === 'UPVOTE' || ladder.userVote === 'LIKE' ? 'fill-white' : ''} />
                <span>{ladder.upvotesCount ?? ladder.likesCount ?? 0}</span>
                <span className="font-semibold text-[11px] opacity-90">Upvotes</span>
              </button>

              <div className="w-px h-3.5 bg-gray-300 mx-0.5" />

              <button
                type="button"
                onClick={() => handleVote('DOWNVOTE')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  ladder.userVote === 'DOWNVOTE' || ladder.userVote === 'DISLIKE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-gray-700 hover:text-rose-700 hover:bg-white'
                }`}
                title={ladder.userVote === 'DOWNVOTE' || ladder.userVote === 'DISLIKE' ? 'Remove Downvote' : 'Downvote this ladder'}
              >
                <ThumbsDown size={13} className={ladder.userVote === 'DOWNVOTE' || ladder.userVote === 'DISLIKE' ? 'fill-white' : ''} />
                <span>{ladder.downvotesCount ?? ladder.dislikesCount ?? 0}</span>
                <span className="font-semibold text-[11px] opacity-90">Downvotes</span>
              </button>
            </div>

            {/* Publish to Community Ladders Button */}
            {isOwner && !ladder.isPublic && (
              <button
                type="button"
                onClick={() => setPublishModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#6C5CE7]/10 hover:bg-[#6C5CE7]/20 text-[#6C5CE7] border border-[#6C5CE7]/20 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Share2 size={13} />
                <span>Publish to Community Ladders</span>
              </button>
            )}

            {/* Practice Mode Trigger */}
            {!isPracticeMode ? (
              <button
                type="button"
                onClick={handleStartPracticeClick}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-[#6C5CE7] to-[#8C7AE6] hover:from-[#5A4AD1] hover:to-[#7B68EE] text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Target size={14} />
                <span>Practice Blind</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsPracticeMode(false)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                <X size={14} />
                <span>Exit Practice</span>
              </button>
            )}

            {canWrite && (
              <Button
                onClick={() => setIsAddModalOpen(true)}
                variant="primary"
                size="sm"
                className="flex items-center gap-1.5 shadow-sm text-xs font-semibold"
              >
                <Plus size={15} /> Add Questions
              </Button>
            )}

            {/* Delete Ladder Button (Owner Only) */}
            {isOwner && (
              <button
                type="button"
                onClick={handleDeleteLadder}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                title="Delete this ladder"
              >
                <Trash2 size={13} />
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Author Claim if present */}
        {ladder.description && (
          <div className="pt-2.5 border-t border-gray-100 flex items-start gap-2 text-xs text-gray-600">
            <span className="font-bold text-gray-800 shrink-0">Claim for this table:</span>
            <span className="italic bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
              “{ladder.description}”
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'questions', label: `Problems (${totalQuestions})` },
          ...(isOwner || role === 'WRITE' ? [{ id: 'members', label: `Members (${members.length})` }] : [])
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* Active Practice Mode Alert Banner */}
          {isPracticeMode && (
            <div className="bg-gradient-to-r from-[#1E1F25] to-[#2B2D42] text-white rounded-xl p-4 shadow-sm border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#6C5CE7] flex items-center justify-center shrink-0">
                  <Target size={18} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">Practice Mode Active (Blind Solving)</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Blind
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Problem statuses are hidden. Click the <span className="inline-block px-1.5 py-0.2 bg-gray-700 rounded font-bold text-amber-300">?</span> button when you solve to mark as both <strong>Practised & Solved</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-white">
                    {practisedQuestionsCount} / {totalQuestions}
                  </div>
                  <div className="text-[10px] text-gray-400">practiced ({practicePercent}%)</div>
                </div>
                <button
                  type="button"
                  onClick={handleStartPracticeClick}
                  className="px-2.5 py-1 text-xs text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Reset / Options
                </button>
              </div>
            </div>
          )}

          {/* Filtering & Customization Toolbar */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Platform Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                {PLATFORMS.map((plat) => {
                  const isActive = selectedPlatform === plat.id;
                  const count = plat.id === 'ALL'
                    ? totalQuestions
                    : questions.filter(q => q.platform?.toUpperCase() === plat.id).length;

                  return (
                    <button
                      key={plat.id}
                      type="button"
                      onClick={() => setSelectedPlatform(plat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#1E1F25] text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {plat.color && (
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: plat.color }} />
                      )}
                      <span>{plat.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[200px] lg:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search problem or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#6C5CE7] text-gray-800 placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Second Control Row: Toggles and Sorting */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#F3F4F6]">
              <div className="flex flex-wrap items-center gap-2">
                {/* Status filter (in normal mode) */}
                {!isPracticeMode && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs font-medium border border-gray-200 rounded-md px-2.5 py-1 text-gray-700 bg-white hover:border-gray-300 focus:outline-hidden focus:ring-1 focus:ring-[#6C5CE7] cursor-pointer"
                  >
                    <option value="ALL">All Status</option>
                    <option value="UNSOLVED">Unsolved Only</option>
                    <option value="SOLVED">Solved Only</option>
                    <option value="STARRED">Starred Only</option>
                  </select>
                )}

                {/* Sort dropdown */}
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <ArrowUpDown size={13} className="text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-xs font-medium border border-gray-200 rounded-md px-2.5 py-1 text-gray-700 bg-white hover:border-gray-300 focus:outline-hidden focus:ring-1 focus:ring-[#6C5CE7] cursor-pointer"
                  >
                    <option value="DEFAULT">Ladder Order (Default)</option>
                    <option value="RATING_ASC">Rating: Low to High</option>
                    <option value="RATING_DESC">Rating: High to Low</option>
                    <option value="TITLE">Title (A-Z)</option>
                    <option value="PLATFORM">Platform</option>
                  </select>
                </div>
              </div>

              {/* View Toggles: Show/Hide Ratings & Tags */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRatings(!showRatings)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                    showRatings
                      ? 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}
                  title={showRatings ? 'Hide rating & difficulty labels' : 'Show rating & difficulty labels'}
                >
                  {showRatings ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span>{showRatings ? 'Ratings: Visible' : 'Ratings: Hidden'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowTags(!showTags)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                    showTags
                      ? 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      : 'bg-gray-100 border-gray-200 text-gray-400'
                  }`}
                  title={showTags ? 'Hide problem tags' : 'Show problem tags'}
                >
                  <Tag size={12} />
                  <span>{showTags ? 'Tags: On' : 'Tags: Off'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1E1F25] text-white text-xs font-semibold uppercase tracking-wider">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Problem</th>
                    <th className="p-3 w-28">Platform</th>
                    <th className="p-3 w-36">{showRatings ? 'Difficulty / Rating' : 'Rating'}</th>
                    <th className="p-3 w-36 text-center">
                      {isPracticeMode ? 'Blind Status' : 'Status'}
                    </th>
                    <th className="p-3 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs">
                  {displayedQuestions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-10 text-center text-gray-500">
                        <BookOpen size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm font-medium text-gray-700">No matching problems found</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {questions.length === 0
                            ? 'Add questions from the problemset to begin building this ladder.'
                            : 'Try adjusting your search query or filters.'}
                        </p>
                        {questions.length === 0 && canWrite && (
                          <div className="mt-3">
                            <Button
                              onClick={() => setIsAddModalOpen(true)}
                              variant="primary"
                              size="sm"
                              className="inline-flex items-center gap-1.5"
                            >
                              <Plus size={15} /> Add Questions from Problemset
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    displayedQuestions.map((q, idx) => {
                      const qId = q._id || q.questionId || q.id;
                      const isSolved = q.state?.solved ?? q.isSolved ?? false;
                      const isStarred = q.state?.starred ?? q.isStarred ?? false;
                      const isPractised = q.practice?.practised ?? q.isPractised ?? false;
                      const tagsList = Array.isArray(q.tags) ? q.tags : [];

                      return (
                        <tr
                          key={qId || idx}
                          className="hover:bg-[#F8F9FB] transition-colors group"
                        >
                          {/* Order Index */}
                          <td className="p-3 text-center font-mono text-gray-400 font-medium">
                            {q.order || idx + 1}
                          </td>

                          {/* Problem Title & Tags */}
                          <td className="p-3">
                            <div className="space-y-1">
                              <a
                                href={q.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-[#1E1F25] hover:text-[#6C5CE7] hover:underline flex items-center gap-1.5 group-hover:text-[#6C5CE7] transition-colors"
                              >
                                <span>{q.title}</span>
                                <ExternalLink size={11} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </a>

                              {/* Tags Pills */}
                              {showTags && tagsList.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                  {tagsList.slice(0, 5).map((t, tIdx) => (
                                    <span
                                      key={tIdx}
                                      className="inline-block text-[10px] px-1.5 py-0.2 rounded-md bg-gray-100 text-gray-600 font-mono border border-gray-200"
                                    >
                                      #{t}
                                    </span>
                                  ))}
                                  {tagsList.length > 5 && (
                                    <span className="text-[10px] text-gray-400 font-mono">
                                      +{tagsList.length - 5}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Platform Badge */}
                          <td className="p-3">
                            <span className="inline-block text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700 uppercase border border-gray-200">
                              {q.platform || 'CP'}
                            </span>
                          </td>

                          {/* Difficulty / Rating */}
                          <td className="p-3">
                            {renderQuestionDifficultyOrRating(q)}
                          </td>

                          {/* Status Column */}
                          <td className="p-3 text-center">
                            {isPracticeMode ? (
                              /* Blind Practice Mode Status */
                              <div className="flex items-center justify-center">
                                {isPractised ? (
                                  <button
                                    type="button"
                                    onClick={() => handleBlindPracticeSolve(qId, true)}
                                    title="Marked as Practised & Solved! Click to reset to ?"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-all cursor-pointer shadow-xs"
                                  >
                                    <CheckCircle size={13} className="text-emerald-600" />
                                    <span>Practised & Solved</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleBlindPracticeSolve(qId, false)}
                                    title="Click when solved to mark as both Practised and Solved"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 hover:bg-emerald-600 hover:text-white text-amber-900 border border-amber-300 hover:border-emerald-600 transition-all duration-150 cursor-pointer group/btn shadow-xs"
                                  >
                                    <HelpCircle size={13} className="text-amber-700 group-hover/btn:text-white" />
                                    <span>? Mark Solved</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              /* Normal Mode Status (Solved checkmark + Star only, no practice button) */
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  type="button"
                                  title={isSolved ? 'Mark as unsolved' : 'Mark as solved'}
                                  onClick={() => toggleSolve(qId, isSolved)}
                                  className="hover:scale-110 transition-transform cursor-pointer p-0.5"
                                >
                                  <CheckCircle
                                    className={isSolved ? 'text-[#00B894]' : 'text-gray-300 hover:text-gray-400'}
                                    size={19}
                                  />
                                </button>
                                <button
                                  type="button"
                                  title={isStarred ? 'Unstar' : 'Star'}
                                  onClick={() => toggleStar(qId, isStarred)}
                                  className="hover:scale-110 transition-transform cursor-pointer p-0.5"
                                >
                                  <Star
                                    className={isStarred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-gray-400'}
                                    size={18}
                                  />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Actions Column */}
                          <td className="p-3 text-right">
                            {canReorder ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  title="Move up"
                                  disabled={idx === 0}
                                  onClick={() => handleReorder(idx, 'up')}
                                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-gray-500"
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  title="Move down"
                                  disabled={idx === displayedQuestions.length - 1}
                                  onClick={() => handleReorder(idx, 'down')}
                                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-gray-500"
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  type="button"
                                  title="Remove question from ladder"
                                  onClick={() => handleRemoveQuestion(qId)}
                                  className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors cursor-pointer ml-1"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : canWrite ? (
                              <button
                                type="button"
                                title="Remove question from ladder"
                                onClick={() => handleRemoveQuestion(qId)}
                                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-6">
          {isOwner && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs p-4">
              <h4 className="text-xs font-bold text-[#1E1F25] uppercase tracking-wider mb-3">Add Member to Ladder</h4>
              <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Username</label>
                  <Input value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="CodeLadder username" required />
                </div>
                <div className="w-full sm:w-36">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                  <select
                    value={newMemberRole}
                    onChange={e => setNewMemberRole(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-2 text-xs text-gray-800 bg-white"
                  >
                    <option value="READ">Viewer (Read)</option>
                    <option value="WRITE">Editor (Write)</option>
                  </select>
                </div>
                <Button type="submit" className="bg-[#6C5CE7] hover:bg-[#5A4AD1] text-white text-xs font-semibold">
                  Add Member
                </Button>
              </form>
            </div>
          )}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            {members.map(member => (
              <MemberRow
                key={member.username}
                member={member}
                isOwner={isOwner}
                onRoleChange={(r) => updateRole(member.username, r)}
                onRemove={() => removeMember(member.username)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Practice Mode Setup Modal */}
      {practiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#6C5CE7]/10 text-[#6C5CE7] flex items-center justify-center">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E1F25]">Practice Session</h3>
                  <p className="text-xs text-gray-500">Solve blindly without knowing past status</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPracticeModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              In <strong>Practice Mode</strong>, all problems are masked with a <strong className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded">?</strong> badge. When you solve a problem, clicking the badge marks it as both <strong>Practised</strong> and <strong>Solved</strong>.
            </p>

            <div className="space-y-3 pt-1">
              {/* Option 1: Continue Last Session */}
              <button
                type="button"
                onClick={handleContinueSession}
                disabled={actionLoading}
                className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-[#6C5CE7] hover:bg-[#6C5CE7]/5 transition-all cursor-pointer group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-[#6C5CE7] text-gray-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                  <Play size={15} />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-[#1E1F25] group-hover:text-[#6C5CE7] flex items-center justify-between">
                    <span>Continue Last Session</span>
                    <span className="text-[10px] font-mono text-gray-400">
                      {practisedQuestionsCount}/{totalQuestions} done
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Keep your existing practice marks in this ladder and resume where you left off.
                  </p>
                </div>
              </button>

              {/* Option 2: Start Fresh */}
              <button
                type="button"
                onClick={handleStartFreshSession}
                disabled={actionLoading}
                className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all cursor-pointer group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-amber-500 text-gray-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                  <RotateCcw size={15} />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-[#1E1F25] group-hover:text-amber-700 flex items-center justify-between">
                    <span>Start Fresh Session</span>
                    <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">
                      Reset
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Clear all practice marks for this ladder so every problem is masked with ? blindly.
                  </p>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPracticeModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Publish to Community Ladders Modal */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-[#1E1F25]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#6C5CE7]/10 text-[#6C5CE7] flex items-center justify-center">
                  <Globe size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E1F25]">Publish to Community Ladders</h3>
                  <p className="text-xs text-gray-500">Make this ladder public for all users</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPublishModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Permanent Warning */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert size={14} className="text-amber-700" />
                <span>Permanent Community Listing</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Once publicly listed, <strong>this ladder cannot be reverted back to private</strong>. You can still delete the ladder at any time to remove it.
              </p>
            </div>

            {/* Author Claim Textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                What do you claim for this ladder? <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-gray-500">
                State what makes this problem collection special (e.g. topic mastery, difficulty curve, interview prep).
              </p>
              <textarea
                rows={3}
                value={publishClaim}
                onChange={(e) => setPublishClaim(e.target.value)}
                placeholder="e.g. The definitive 40 questions to master dynamic programming from beginner to Codeforces Div 2 level..."
                className="w-full text-xs p-3 border border-gray-300 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#6C5CE7] text-gray-800 placeholder:text-gray-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPublishModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handlePublishLadder}
                disabled={publishing || !publishClaim.trim()}
                className="bg-[#6C5CE7] hover:bg-[#5A4AD1] text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {publishing ? 'Publishing...' : 'Publish to Community Ladders'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {canWrite && (
        <AddQuestionsModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddQuestions={handleBatchAddQuestions}
          existingQuestionIds={existingQuestionIds}
        />
      )}
    </div>
  );
}
