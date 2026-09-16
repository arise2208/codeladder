import React, { useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../lib/api';
import useLadder from '../hooks/useLadder';
import useLadderMembers from '../hooks/useLadderMembers';
import PageHeader from '../components/layout/PageHeader';
import { Button, Input, LoadingSpinner, Tabs } from '../components/ui';
import MemberRow from '../components/shared/MemberRow';
import AddQuestionsModal from '../components/shared/AddQuestionsModal';
import BaseTable from '../components/shared/BaseTable';
import ProblemRow from '../components/shared/ProblemRow';
import SyncAllButton from '../components/shared/SyncAllButton';
import { useStarred } from '../context/StarredContext';
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

  const { members, addMember, updateRole, removeMember, refetch: refetchMembers } = useLadderMembers(ladderId);
  const { isStarred: checkStarred, toggleStar: toggleStarGlobal } = useStarred();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [transferUsername, setTransferUsername] = useState('');
  const [transferring, setTransferring] = useState(false);

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

  const handleTransferOwnership = async (e) => {
    e.preventDefault();
    const cleanTarget = transferUsername.trim();
    if (!cleanTarget) return;
    if (!window.confirm(`Are you sure you want to transfer ownership of this ladder to @${cleanTarget}? This cannot be undone.`)) {
      return;
    }
    setTransferring(true);
    try {
      await api.post(`/ladders/${ladderId}/transfer-ownership`, { newOwnerUsername: cleanTarget });
      toast.success(`Ownership successfully transferred to @${cleanTarget}!`);
      setTransferUsername('');
      if (refetch) await refetch();
      if (refetchMembers) await refetchMembers();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to transfer ownership'));
    } finally {
      setTransferring(false);
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

  // Blind practice mark: clicking ? marks as practised
  const handleBlindPracticeSolve = async (qId, isCurrentlyPractised) => {
    try {
      if (isCurrentlyPractised) {
        await unpractiseQuestion(qId);
        toast('Reset to unrevealed (?)', { icon: '🔄' });
      } else {
        await practiseQuestion(qId);
        toast.success('Marked as Practised!', { icon: '🎉' });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update question'));
    }
  };

  // Stats calculation
  const totalQuestions = questions.length;

  const isQuestionSolved = useCallback((q) => {
    if (q.state?.solved ?? q.isSolved) return true;
    try {
      const plat = (q.platform || '').toUpperCase();
      const extId = String(q.externalId || q.metadata?.index || '');
      if (plat === 'CODEFORCES') {
        const cf = JSON.parse(localStorage.getItem('cf_solved_problems') || '[]');
        if (cf.includes(extId) || cf.includes(extId.replace('-', ''))) return true;
        if (q.metadata?.contestId && q.metadata?.index) {
          if (cf.includes(`${q.metadata.contestId}-${q.metadata.index}`)) return true;
          if (cf.includes(`${q.metadata.contestId}${q.metadata.index}`)) return true;
        }
      } else if (plat === 'LEETCODE') {
        const lc = JSON.parse(localStorage.getItem('lc_solved_problems') || '[]');
        const lcLower = lc.map(s => String(s).toLowerCase());
        const qSlug = (q.slug || (q.url || '').replace(/\/+$/, '').split('/').pop() || '').toLowerCase();
        if (lcLower.includes(extId.toLowerCase())) return true;
        if (qSlug && lcLower.includes(qSlug)) return true;
      } else if (plat === 'CODECHEF') {
        const cc = JSON.parse(localStorage.getItem('cc_solved_problems') || '[]');
        const ccUpper = cc.map(c => String(c).toUpperCase());
        if (ccUpper.includes(extId.toUpperCase())) return true;
        if (q.code && ccUpper.includes(String(q.code).toUpperCase())) return true;
      }
    } catch {}
    return false;
  }, []);

  const isQuestionVerified = useCallback((q) => {
    return Boolean(q.state?.verified);
  }, []);

  const solvedQuestionsCount = questions.filter(isQuestionSolved).length;
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
        list = list.filter(isQuestionSolved);
      } else if (statusFilter === 'UNSOLVED') {
        list = list.filter(q => !isQuestionSolved(q));
      } else if (statusFilter === 'STARRED') {
        list = list.filter(q => checkStarred(q) || (q.state?.starred ?? q.isStarred));
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
        const rA = a.rating || a.metadata?.rating || (a.difficulty === 'HARD' ? 2000 : a.difficulty === 'MEDIUM' ? 1400 : 900);
        const rB = b.rating || b.metadata?.rating || (b.difficulty === 'HARD' ? 2000 : b.difficulty === 'MEDIUM' ? 1400 : 900);
        return rA - rB;
      });
    } else if (sortBy === 'RATING_DESC') {
      list.sort((a, b) => {
        const rA = a.rating || a.metadata?.rating || (a.difficulty === 'HARD' ? 2000 : a.difficulty === 'MEDIUM' ? 1400 : 900);
        const rB = b.rating || b.metadata?.rating || (b.difficulty === 'HARD' ? 2000 : b.difficulty === 'MEDIUM' ? 1400 : 900);
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
      <div className="bg-[#282828] rounded-xl border border-[#383838] shadow-xs p-5 space-y-3 text-[#eff2f6]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {ladder.isPublic && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-800/60">
                <Globe size={12} /> Community Ladder
              </span>
            )}
            {ladder.ownerUsername && (
              <span className="text-xs text-[#8b949e] flex items-center gap-1.5 bg-[#1e1e1e] px-2.5 py-1 rounded-md border border-[#383838]">
                <span>By</span>
                <Link
                  to={`/profile/${ladder.ownerUsername}`}
                  className="font-semibold text-[#eff2f6] hover:text-[#ffa116] hover:underline font-mono"
                  title={`View @${ladder.ownerUsername}'s profile and community contributions`}
                >
                  @{ladder.ownerUsername}
                </Link>
              </span>
            )}
            <span className="text-xs font-semibold text-[#8b949e] bg-[#1e1e1e] px-2.5 py-1 rounded-md border border-[#383838]">
              {members.length} {members.length === 1 ? 'Member' : 'Members'}
            </span>
            <span className="text-xs font-semibold text-[#8b949e] bg-[#1e1e1e] px-2.5 py-1 rounded-md border border-[#383838]">
              {totalQuestions} {totalQuestions === 1 ? 'Problem' : 'Problems'}
            </span>
            {!isPracticeMode ? (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-800/60 flex items-center gap-1">
                <CheckCircle size={12} /> {solvedQuestionsCount} Solved ({solvedPercent}%)
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-800/60 flex items-center gap-1">
                <Target size={12} /> {practisedQuestionsCount} Practised ({practicePercent}%)
              </span>
            )}

          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
            {/* Prominent Upvotes & Downvotes Pill */}
            <div className="inline-flex items-center bg-[#1e1e1e] p-0.5 rounded-lg border border-[#383838] shadow-2xs">
              <button
                type="button"
                onClick={() => handleVote('UPVOTE')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  ladder.userVote === 'UPVOTE' || ladder.userVote === 'LIKE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[#8b949e] hover:text-emerald-400 hover:bg-[#282828]'
                }`}
                title={ladder.userVote === 'UPVOTE' || ladder.userVote === 'LIKE' ? 'Remove Upvote' : 'Upvote this ladder'}
              >
                <ThumbsUp size={13} className={ladder.userVote === 'UPVOTE' || ladder.userVote === 'LIKE' ? 'fill-white' : ''} />
                <span>{ladder.upvotesCount ?? ladder.likesCount ?? 0}</span>
                <span className="font-semibold text-[11px] opacity-90">Upvotes</span>
              </button>

              <div className="w-px h-3.5 bg-[#383838] mx-0.5" />

              <button
                type="button"
                onClick={() => handleVote('DOWNVOTE')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  ladder.userVote === 'DOWNVOTE' || ladder.userVote === 'DISLIKE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-[#8b949e] hover:text-rose-400 hover:bg-[#282828]'
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
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1e1e1e] hover:bg-[#383838] text-[#eff2f6] border border-[#383838] text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                <X size={14} />
                <span>Exit Practice</span>
              </button>
            )}

            {/* Sync All Button with 1-min Cooldown */}
            <SyncAllButton onSyncComplete={refetch} />

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
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-950/30 hover:bg-red-950/50 text-red-400 border border-red-800/50 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
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
          <div className="pt-2.5 border-t border-[#383838] flex items-start gap-2 text-xs text-[#8b949e]">
            <span className="font-bold text-[#eff2f6] shrink-0">Claim for this table:</span>
            <span className="italic bg-[#1e1e1e] text-[#eff2f6] px-2 py-0.5 rounded border border-[#383838]">
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
                    Problem statuses are hidden. Click the <span className="inline-block px-1.5 py-0.2 bg-gray-700 rounded font-bold text-amber-300">?</span> button to mark as <strong>Practised</strong>.
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
          <div className="bg-[#282828] rounded-xl border border-[#383838] p-3.5 shadow-xs space-y-3">
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
                          ? 'bg-[#383838] text-[#eff2f6] shadow-xs'
                          : 'text-[#8b949e] hover:text-[#eff2f6] hover:bg-[#1e1e1e]'
                      }`}
                    >
                      {plat.color && (
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: plat.color }} />
                      )}
                      <span>{plat.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-[#1e1e1e] text-[#ffa116]' : 'bg-[#1e1e1e] text-[#8b949e]'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[200px] lg:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
                <input
                  type="text"
                  placeholder="Search problem or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-8 py-1.5 border border-[#383838] bg-[#1e1e1e] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#ffa116] text-[#eff2f6] placeholder:text-[#8b949e]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#eff2f6] cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Second Control Row: Toggles and Sorting */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#383838]">
              <div className="flex flex-wrap items-center gap-2">
                {/* Status filter (in normal mode) */}
                {!isPracticeMode && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs font-medium border border-[#383838] rounded-md px-2.5 py-1 text-[#eff2f6] bg-[#1e1e1e] hover:border-[#484848] focus:outline-hidden focus:ring-1 focus:ring-[#ffa116] cursor-pointer"
                  >
                    <option value="ALL">All Status</option>
                    <option value="UNSOLVED">Unsolved Only</option>
                    <option value="SOLVED">Solved Only</option>
                    <option value="STARRED">Starred Only</option>
                  </select>
                )}

                {/* Sort dropdown */}
                <div className="flex items-center gap-1 text-xs text-[#8b949e]">
                  <ArrowUpDown size={13} className="text-[#8b949e]" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-xs font-medium border border-[#383838] rounded-md px-2.5 py-1 text-[#eff2f6] bg-[#1e1e1e] hover:border-[#484848] focus:outline-hidden focus:ring-1 focus:ring-[#ffa116] cursor-pointer"
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
                      ? 'bg-[#1e1e1e] border-[#383838] text-[#eff2f6] hover:bg-[#333333]'
                      : 'bg-amber-950/40 border-amber-800/60 text-amber-400'
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
                      ? 'bg-[#1e1e1e] border-[#383838] text-[#eff2f6] hover:bg-[#333333]'
                      : 'bg-[#1e1e1e]/60 border-[#383838] text-[#8b949e]'
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
          <BaseTable
            variant="dark"
            className="bg-[#282828] rounded-xl border border-[#383838] shadow-xs"
            headerClassName="bg-[#1a1a1a] text-gray-300 border-b border-[#383838] text-xs font-semibold uppercase tracking-wider"
            bodyClassName="divide-y divide-[#383838] text-xs text-[#eff2f6]"
            headers={
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">#</th>
                <th className="px-4 py-3.5">Problem</th>
                <th className="px-4 py-3.5 w-28">Platform</th>
                <th className="px-4 py-3.5 w-36">{showRatings ? 'Difficulty / Rating' : 'Rating'}</th>
                <th className="px-4 py-3.5 w-40 text-center">
                  {isPracticeMode ? 'Practice' : 'Status'}
                </th>
                <th className="px-4 py-3.5 w-28 text-right">Actions</th>
              </tr>
            }
            emptyState={
              <div className="p-10 text-center text-[#8b949e]">
                <BookOpen size={32} className="mx-auto text-[#8b949e]/60 mb-2" />
                <p className="text-sm font-medium text-[#eff2f6]">No matching problems found</p>
                <p className="text-xs text-[#8b949e] mt-1">
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
              </div>
            }
          >
            {displayedQuestions.map((q, idx) => {
              const qId = q._id || q.questionId || q.id;
              const isSolved = isQuestionSolved(q);
              const isStarred = checkStarred(q) || (q.state?.starred ?? q.isStarred ?? false);
              const isPractised = q.practice?.practised ?? q.isPractised ?? false;

              return (
                <ProblemRow
                  key={qId || idx}
                  mode="ladder"
                  question={q}
                  index={idx}
                  isSolved={isSolved}
                  isVerified={isQuestionVerified(q)}
                  isStarred={isStarred}
                  isPractised={isPractised}
                  isPracticeMode={isPracticeMode}
                  showTags={showTags}
                  showRatings={showRatings}
                  canReorder={canReorder}
                  canDelete={canWrite}
                  isFirst={idx === 0}
                  isLast={idx === displayedQuestions.length - 1}
                  onStar={() => toggleStarGlobal(q)}
                  onBlindSolve={handleBlindPracticeSolve}
                  onReorder={handleReorder}
                  onDelete={handleRemoveQuestion}
                  onSelectTag={(t) => setSearchQuery(t)}
                />
              );
            })}
          </BaseTable>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-6">
          {isOwner && (
            <>
              <div className="bg-[#282828] rounded-xl border border-[#383838] shadow-xs p-4 text-[#eff2f6]">
                <h4 className="text-xs font-bold text-[#eff2f6] uppercase tracking-wider mb-3">Add Member to Ladder</h4>
                <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-[#8b949e] mb-1">Username</label>
                    <Input value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="CodeLadder username" required />
                  </div>
                  <div className="w-full sm:w-36">
                    <label className="block text-xs font-semibold text-[#8b949e] mb-1">Role</label>
                    <select
                      value={newMemberRole}
                      onChange={e => setNewMemberRole(e.target.value)}
                      className="w-full rounded-md border border-[#383838] p-2 text-xs text-[#eff2f6] bg-[#1e1e1e] focus:outline-hidden focus:ring-1 focus:ring-[#ffa116]"
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

              <div className="bg-[#282828] rounded-xl border border-amber-500/30 shadow-xs p-4 text-[#eff2f6]">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Transfer Ladder Ownership</h4>
                <p className="text-xs text-[#8b949e] mb-3">
                  Transfer full ownership of this ladder to another CodeLadder user. You will remain an Editor.
                </p>
                <form onSubmit={handleTransferOwnership} className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-[#8b949e] mb-1">New Owner Username</label>
                    <Input
                      value={transferUsername}
                      onChange={e => setTransferUsername(e.target.value)}
                      placeholder="Enter new owner's username"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={transferring}
                    className="bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs shrink-0"
                  >
                    {transferring ? 'Transferring...' : 'Transfer Ownership'}
                  </Button>
                </form>
              </div>
            </>
          )}
          <div className="bg-[#282828] rounded-xl border border-[#383838] shadow-xs overflow-hidden">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="bg-[#282828] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#383838] space-y-5 animate-in fade-in zoom-in-95 duration-150 text-[#eff2f6]">
            <div className="flex items-center justify-between border-b border-[#383838] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#6C5CE7]/10 text-[#6C5CE7] flex items-center justify-center">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#eff2f6]">Practice Session</h3>
                  <p className="text-xs text-[#8b949e]">Solve blindly without knowing past status</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPracticeModalOpen(false)}
                className="text-[#8b949e] hover:text-[#eff2f6] p-1 rounded-md cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-[#8b949e] leading-relaxed">
              In <strong>Practice Mode</strong>, all problems are masked with a <strong className="text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded">?</strong> badge. When you solve a problem, clicking the badge marks it as <strong>Practised</strong>.
            </p>

            <div className="space-y-3 pt-1">
              {/* Option 1: Continue Last Session */}
              <button
                type="button"
                onClick={handleContinueSession}
                disabled={actionLoading}
                className="w-full text-left p-4 rounded-xl border-2 border-[#383838] hover:border-[#6C5CE7] hover:bg-[#6C5CE7]/10 bg-[#1e1e1e] transition-all cursor-pointer group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-[#282828] group-hover:bg-[#6C5CE7] text-[#8b949e] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                  <Play size={15} />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-[#eff2f6] group-hover:text-[#6C5CE7] flex items-center justify-between">
                    <span>Continue Last Session</span>
                    <span className="text-[10px] font-mono text-[#8b949e]">
                      {practisedQuestionsCount}/{totalQuestions} done
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8b949e] mt-0.5">
                    Keep your existing practice marks in this ladder and resume where you left off.
                  </p>
                </div>
              </button>

              {/* Option 2: Start Fresh */}
              <button
                type="button"
                onClick={handleStartFreshSession}
                disabled={actionLoading}
                className="w-full text-left p-4 rounded-xl border-2 border-[#383838] hover:border-amber-500 hover:bg-amber-950/20 bg-[#1e1e1e] transition-all cursor-pointer group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-[#282828] group-hover:bg-amber-500 text-[#8b949e] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                  <RotateCcw size={15} />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-[#eff2f6] group-hover:text-amber-400 flex items-center justify-between">
                    <span>Start Fresh Session</span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.2 rounded">
                      Reset
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8b949e] mt-0.5">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="bg-[#282828] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#383838] space-y-4 animate-in fade-in zoom-in-95 duration-150 text-[#eff2f6]">
            <div className="flex items-center justify-between border-b border-[#383838] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#6C5CE7]/10 text-[#6C5CE7] flex items-center justify-center">
                  <Globe size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#eff2f6]">Publish to Community Ladders</h3>
                  <p className="text-xs text-[#8b949e]">Make this ladder public for all users</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPublishModalOpen(false)}
                className="text-[#8b949e] hover:text-[#eff2f6] p-1 rounded-md cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Permanent Warning */}
            <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-800/50 text-amber-300 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert size={14} className="text-amber-400" />
                <span>Permanent Community Listing</span>
              </div>
              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                Once publicly listed, <strong>this ladder cannot be reverted back to private</strong>. You can still delete the ladder at any time to remove it.
              </p>
            </div>

            {/* Author Claim Textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#eff2f6]">
                What do you claim for this ladder? <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-[#8b949e]">
                State what makes this problem collection special (e.g. topic mastery, difficulty curve, interview prep).
              </p>
              <textarea
                rows={3}
                value={publishClaim}
                onChange={(e) => setPublishClaim(e.target.value)}
                placeholder="e.g. The definitive 40 questions to master dynamic programming from beginner to Codeforces Div 2 level..."
                className="w-full text-xs p-3 border border-[#383838] bg-[#1e1e1e] rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#ffa116] text-[#eff2f6] placeholder:text-[#8b949e]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[#383838]">
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
