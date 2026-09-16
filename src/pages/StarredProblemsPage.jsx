import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStarred } from '../context/StarredContext';
import api from '../lib/api';
import PageHeader from '../components/layout/PageHeader';
import BaseTable from '../components/shared/BaseTable';
import QuestionRow from '../components/shared/QuestionRow';
import AddToLadderModal from '../components/shared/AddToLadderModal';
import SyncAllButton from '../components/shared/SyncAllButton';
import { Pagination, LoadingSpinner, EmptyState, Button, Input } from '../components/ui';
import {
  Star,
  Search,
  CheckCircle2,
  Filter,
  X,
  Shuffle,
  Clock,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function StarredProblemsPage() {
  const { user } = useAuth();
  const { starredList, starredMap, loading: starredLoading, toggleStar, refetchStarred } = useStarred();

  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, SOLVED, UNSOLVED
  const [difficulty, setDifficulty] = useState('ALL'); // ALL, EASY, MEDIUM, HARD
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');
  const [sortBy, setSortBy] = useState('RECENT'); // RECENT, RATING_ASC, RATING_DESC, TITLE_ASC
  const [page, setPage] = useState(1);
  const limit = 25;

  const [solvedMap, setSolvedMap] = useState({});
  const [syncTick, setSyncTick] = useState(0);
  const [ladderModal, setLadderModal] = useState({ isOpen: false, question: null });

  // Fetch solved question records
  const fetchSolvedData = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/me/questions/solved');
      const smap = {};
      const list = data?.questions || (Array.isArray(data) ? data : []);
      list.forEach((q) => {
        const key = q._id || q.questionId?._id || q.questionId;
        if (key) {
          smap[key] = {
            solved: Boolean(q.solved ?? q.state?.solved ?? true),
            verified: Boolean(q.verified ?? q.state?.verified ?? false),
          };
        }
      });
      setSolvedMap(smap);
    } catch {}
  }, [user]);

  useEffect(() => {
    fetchSolvedData();
  }, [fetchSolvedData]);

  // Listen to platform sync updates in localStorage
  useEffect(() => {
    const handleStorage = (e) => {
      if (
        e.key === 'cf_solved_problems' ||
        e.key === 'lc_solved_problems' ||
        e.key === 'cc_solved_problems' ||
        e.key === 'sync_all_last_at'
      ) {
        setSyncTick((t) => t + 1);
        fetchSolvedData();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [fetchSolvedData]);

  // Check if problem is solved via backend records or platform-synced handles
  const isQuestionSolved = useCallback(
    (q) => {
      if (!q) return false;
      const qId = q._id || q.questionId?._id || q.questionId;
      if (qId && solvedMap[qId]?.solved) return true;
      if (q.isSolved || q.state?.solved) return true;

      try {
        const plat = (q.platform || '').toUpperCase();
        const extId = String(q.externalId || q.metadata?.index || q.code || q.slug || '');
        if (plat === 'CODEFORCES') {
          const cf = JSON.parse(localStorage.getItem('cf_solved_problems') || '[]');
          if (cf.includes(extId) || cf.includes(extId.replace('-', ''))) return true;
          if (q.metadata?.contestId && q.metadata?.index) {
            if (cf.includes(`${q.metadata.contestId}-${q.metadata.index}`)) return true;
            if (cf.includes(`${q.metadata.contestId}${q.metadata.index}`)) return true;
          }
        } else if (plat === 'LEETCODE') {
          const lc = JSON.parse(localStorage.getItem('lc_solved_problems') || '[]');
          const lcLower = lc.map((s) => String(s).toLowerCase());
          const qSlug = (q.slug || (q.url || '').replace(/\/+$/, '').split('/').pop() || '').toLowerCase();
          if (lcLower.includes(extId.toLowerCase())) return true;
          if (qSlug && lcLower.includes(qSlug)) return true;
        } else if (plat === 'CODECHEF') {
          const cc = JSON.parse(localStorage.getItem('cc_solved_problems') || '[]');
          const ccUpper = cc.map((c) => String(c).toUpperCase());
          if (ccUpper.includes(extId.toUpperCase())) return true;
          if (q.code && ccUpper.includes(String(q.code).toUpperCase())) return true;
        }
      } catch {}
      return false;
    },
    [solvedMap, syncTick]
  );

  const isQuestionVerified = useCallback(
    (q) => {
      if (!q) return false;
      const qId = q._id || q.questionId?._id || q.questionId;
      if (qId && solvedMap[qId]?.verified !== undefined) {
        return Boolean(solvedMap[qId].verified);
      }
      return Boolean(q.state?.verified);
    },
    [solvedMap]
  );

  // Normalize raw questions from starredList
  const normalizedQuestions = useMemo(() => {
    if (!starredList || !starredList.length) return [];
    return starredList
      .map((item) => {
        if (!item) return null;
        const qObj = item.questionId && typeof item.questionId === 'object' ? item.questionId : item;
        const id = qObj._id || item._id || item.questionId;
        return {
          ...qObj,
          _id: id,
          title:
            qObj.title ||
            qObj.name ||
            (qObj.slug ? qObj.slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null) ||
            (qObj.code ? `#${qObj.code}` : 'Problem'),
          url:
            qObj.url && qObj.url !== '#'
              ? qObj.url
              : qObj.platform === 'CODECHEF' && qObj.code
              ? `https://www.codechef.com/problems/${qObj.code}`
              : qObj.platform === 'LEETCODE' && qObj.slug
              ? `https://leetcode.com/problems/${qObj.slug}/`
              : qObj.url || '#',
          platform: (qObj.platform || item.platform || 'OTHER').toUpperCase(),
          rating: qObj.rating ?? qObj.metadata?.rating ?? null,
          difficulty: qObj.difficulty || null,
          tags: Array.isArray(qObj.tags) ? qObj.tags : [],
          starredAt: item.starredAt || item.updatedAt || item.createdAt || null,
          state: qObj.state || item.state,
        };
      })
      .filter(Boolean);
  }, [starredList]);

  // Filter and sort questions
  const filteredQuestions = useMemo(() => {
    let list = [...normalizedQuestions];

    // 1. Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((p) => {
        const title = (p.title || '').toLowerCase();
        const extId = String(p.externalId || '').toLowerCase();
        const slug = (p.slug || '').toLowerCase();
        const code = (p.code || '').toLowerCase();
        return title.includes(q) || extId.includes(q) || slug.includes(q) || code.includes(q);
      });
    }

    // 2. Platform filter
    if (platform !== 'ALL') {
      list = list.filter((p) => p.platform === platform);
    }

    // 3. Status filter (Solved / Unsolved)
    if (statusFilter === 'SOLVED') {
      list = list.filter((p) => isQuestionSolved(p));
    } else if (statusFilter === 'UNSOLVED') {
      list = list.filter((p) => !isQuestionSolved(p));
    }

    // 4. Difficulty / Rating filter
    if (platform === 'LEETCODE' && difficulty !== 'ALL') {
      list = list.filter((p) => String(p.difficulty || '').toUpperCase() === difficulty);
    } else if (platform === 'CODEFORCES' || platform === 'CODECHEF') {
      if (minRating) {
        list = list.filter((p) => p.rating && p.rating >= Number(minRating));
      }
      if (maxRating) {
        list = list.filter((p) => p.rating && p.rating <= Number(maxRating));
      }
    }

    // 5. Sorting
    list.sort((a, b) => {
      if (sortBy === 'TITLE_ASC') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'RATING_ASC') {
        const rA = a.rating ?? 99999;
        const rB = b.rating ?? 99999;
        return rA - rB;
      }
      if (sortBy === 'RATING_DESC') {
        const rA = a.rating ?? -1;
        const rB = b.rating ?? -1;
        return rB - rA;
      }
      // Default: RECENT (newest first)
      if (a.starredAt && b.starredAt) {
        return new Date(b.starredAt).getTime() - new Date(a.starredAt).getTime();
      }
      return 0;
    });

    return list;
  }, [normalizedQuestions, search, platform, statusFilter, difficulty, minRating, maxRating, sortBy, isQuestionSolved]);

  // Pagination
  const totalPages = Math.ceil(filteredQuestions.length / limit) || 1;
  const paginatedQuestions = useMemo(() => {
    return filteredQuestions.slice((page - 1) * limit, page * limit);
  }, [filteredQuestions, page, limit]);

  // Solved count statistics
  const totalStarredCount = normalizedQuestions.length;
  const solvedStarredCount = useMemo(() => {
    return normalizedQuestions.filter((q) => isQuestionSolved(q)).length;
  }, [normalizedQuestions, isQuestionSolved]);

  const handleClearFilters = () => {
    setSearch('');
    setPlatform('ALL');
    setStatusFilter('ALL');
    setDifficulty('ALL');
    setMinRating('');
    setMaxRating('');
    setSortBy('RECENT');
    setPage(1);
  };

  const handlePickRandom = () => {
    if (filteredQuestions.length === 0) {
      toast.error('No starred problems matching current filters');
      return;
    }
    const chosen = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
    toast.success(`Picked: "${chosen.title}"!`);
    window.open(chosen.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title={
            <span className="flex items-center gap-2.5">
              <Star size={26} className="fill-amber-400 text-amber-400" />
              <span>Starred Problems</span>
            </span>
          }
          breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Starred Problems' }]}
        />

        {user && (
          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
            <SyncAllButton
              size="sm"
              onSyncComplete={() => {
                fetchSolvedData();
                setSyncTick((t) => t + 1);
                refetchStarred?.();
              }}
            />
            <div className="flex items-center gap-3 bg-[#161b22] px-3.5 py-1.5 rounded-xl border border-[#30363d] text-xs shadow-xs">
              <span className="flex items-center gap-1.5 font-semibold text-[#e3b341]">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                {totalStarredCount} Starred
              </span>
              <span className="text-[#30363d]">•</span>
              <span className="flex items-center gap-1.5 font-semibold text-[#3fb950]">
                <CheckCircle2 size={14} />
                {solvedStarredCount} Solved
              </span>
              {totalStarredCount > 0 && (
                <>
                  <span className="text-[#30363d]">•</span>
                  <span className="text-[#8b949e] font-medium">
                    {totalStarredCount - solvedStarredCount} Remaining
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#161b22] rounded-xl border border-[#30363d] shadow-sm p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Input
              placeholder="Search starred problems by title, slug, or ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              icon={<Search size={18} className="text-[#8b949e]" />}
              className="pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 cursor-pointer"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Controls: Platform, Difficulty/Rating, Status, Sort */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Platform Select */}
            <select
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
                setDifficulty('ALL');
                setMinRating('');
                setMaxRating('');
                setPage(1);
              }}
              className="rounded-lg border border-[#30363d] px-3 py-1.5 text-xs font-medium text-[#eff2f6] bg-[#0d1117] focus:border-[#ffa116] focus:outline-hidden cursor-pointer"
              aria-label="Filter by platform"
            >
              <option value="ALL">All Platforms</option>
              <option value="LEETCODE">LeetCode</option>
              <option value="CODEFORCES">Codeforces</option>
              <option value="CODECHEF">CodeChef</option>
              <option value="ATCODER">AtCoder</option>
            </select>

            {/* Platform-Specific Difficulty / Rating Filter */}
            {platform === 'LEETCODE' ? (
              <select
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-[#30363d] px-3 py-1.5 text-xs font-medium text-[#eff2f6] bg-[#0d1117] focus:border-[#ffa116] focus:outline-hidden cursor-pointer"
                aria-label="Filter by difficulty"
              >
                <option value="ALL">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            ) : platform === 'CODEFORCES' || platform === 'CODECHEF' ? (
              <div className="flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1">
                <span className="text-xs text-[#8b949e] font-medium">Rating:</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={minRating}
                  onChange={(e) => {
                    setMinRating(e.target.value);
                    setPage(1);
                  }}
                  className="w-16 px-1.5 py-0.5 text-xs rounded border border-[#30363d] bg-[#161b22] text-[#eff2f6] focus:outline-hidden focus:border-[#ffa116]"
                />
                <span className="text-[#8b949e] text-xs">–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxRating}
                  onChange={(e) => {
                    setMaxRating(e.target.value);
                    setPage(1);
                  }}
                  className="w-16 px-1.5 py-0.5 text-xs rounded border border-[#30363d] bg-[#161b22] text-[#eff2f6] focus:outline-hidden focus:border-[#ffa116]"
                />
              </div>
            ) : null}

            {/* Status Select: All, Unsolved, Solved */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-[#30363d] px-3 py-1.5 text-xs font-medium text-[#eff2f6] bg-[#0d1117] focus:border-[#ffa116] focus:outline-hidden cursor-pointer"
              aria-label="Filter by status"
            >
              <option value="ALL">All Status</option>
              <option value="UNSOLVED">Unsolved Only</option>
              <option value="SOLVED">Solved Only</option>
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-[#30363d] px-3 py-1.5 text-xs font-medium text-[#eff2f6] bg-[#0d1117] focus:border-[#ffa116] focus:outline-hidden cursor-pointer"
              aria-label="Sort starred problems"
            >
              <option value="RECENT">Recently Starred</option>
              <option value="TITLE_ASC">Title (A–Z)</option>
              <option value="RATING_ASC">Rating: Low to High</option>
              <option value="RATING_DESC">Rating: High to Low</option>
            </select>

            {/* Pick Random Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePickRandom}
              className="flex items-center gap-1.5 text-xs border-[#30363d] bg-[#0d1117] hover:bg-[#21262d]"
              title="Pick a random problem from current list"
            >
              <Shuffle size={13} />
              <span className="hidden sm:inline">Pick Random</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {starredLoading ? (
        <div className="bg-[#161b22] rounded-xl border border-[#30363d] shadow-sm py-20 flex justify-center">
          <LoadingSpinner text="Loading starred problems..." />
        </div>
      ) : totalStarredCount === 0 ? (
        <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#ffa116]/10 border border-[#ffa116]/30 flex items-center justify-center mx-auto text-amber-400">
            <Star size={32} className="fill-amber-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#eff2f6]">No Starred Problems Yet</h3>
            <p className="text-sm text-[#8b949e] max-w-md mx-auto">
              Star any problem using the star icon in the Problemset or Contest Upsolvers (LeetCode, Codeforces, CodeChef) to curate your personal practice list.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/problemset"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ffa116] hover:bg-[#ffb03a] text-[#1a1a1a] font-bold text-xs transition-colors"
            >
              <BookOpen size={15} />
              <span>Explore Problemset</span>
            </Link>
          </div>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-12 text-center space-y-4 shadow-sm">
          <EmptyState
            title="No matching starred problems"
            description="No starred problems match your active search and filters."
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="border-[#30363d] bg-[#0d1117] hover:bg-[#21262d] text-xs"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <BaseTable
          className="bg-[#161b22] border-[#30363d]"
          headerClassName="bg-[#161b22] text-[#8b949e] border-b border-[#30363d]"
          bodyClassName="divide-y divide-[#21262d]"
          headers={
            <tr>
              <th className="px-3 py-3.5 font-medium w-12 text-center" title="Starred">
                <Star size={14} className="inline fill-amber-400 text-amber-400" />
              </th>
              <th className="px-4 py-3.5 font-medium">Problem Title</th>
              <th className="px-4 py-3.5 font-medium w-32">Platform</th>
              <th className="px-4 py-3.5 font-medium w-32">
                {platform === 'CODEFORCES' || platform === 'CODECHEF'
                  ? 'Rating'
                  : platform === 'LEETCODE'
                  ? 'Difficulty'
                  : 'Difficulty / Rating'}
              </th>
              <th className="px-4 py-3.5 font-medium">Tags</th>
              <th className="px-4 py-3.5 font-medium text-right w-44">Actions</th>
            </tr>
          }
          footer={
            totalPages > 1 ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4">
                <span className="text-xs text-[#8b949e]">
                  Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({filteredQuestions.length} matching starred problems)
                </span>
                <Pagination
                  page={page}
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            ) : (
              <div className="p-3 text-xs text-[#8b949e] text-right">
                {filteredQuestions.length} starred problem{filteredQuestions.length === 1 ? '' : 's'}
              </div>
            )
          }
        >
          {paginatedQuestions.map((q) => (
            <QuestionRow
              key={q._id || q.url}
              question={q}
              isSolved={Boolean(isQuestionSolved(q))}
              isVerified={Boolean(isQuestionVerified(q))}
              isStarred={true}
              onStar={() => toggleStar(q)}
              onAddToLadder={user ? () => setLadderModal({ isOpen: true, question: q }) : null}
            />
          ))}
        </BaseTable>
      )}

      {/* Add to Ladder Modal */}
      {ladderModal.isOpen && (
        <AddToLadderModal
          isOpen={ladderModal.isOpen}
          onClose={() => setLadderModal({ isOpen: false, question: null })}
          question={ladderModal.question}
        />
      )}
    </div>
  );
}
