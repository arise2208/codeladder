import React, { useState, useEffect, useMemo } from 'react';
import ContestUpsolverView, { UpsolverProblemCard } from '../components/shared/ContestUpsolverView';
import AddToLadderModal from '../components/shared/AddToLadderModal';
import toast from 'react-hot-toast';
import { useLeetCodeData } from '../hooks/useContestData';
import { fetchLeetCodeUserSolved } from '../lib/leetcodeSync';
import { LeetCodeIcon } from '../components/ui/PlatformIcon';
import api from '../lib/api';
import { useStarred } from '../context/StarredContext';

function parseContestInfo(url) {
  if (!url) return { title: 'LeetCode Contest', type: 'other', num: 0, slug: '' };
  const slug = url.replace(/\/$/, '').split('/').pop() || '';
  const match = slug.match(/^(weekly|biweekly)-contest-(\d+)$/i);
  if (match) {
    const type = match[1].toLowerCase();
    const num = parseInt(match[2], 10);
    const title = `${type === 'weekly' ? 'Weekly' : 'Biweekly'} Contest ${num}`;
    return { title, type, num, slug };
  }
  const title = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return { title, type: 'other', num: 0, slug };
}

function formatProblemTitle(url) {
  if (!url) return 'Problem';
  const slug = url.replace(/\/$/, '').split('/').pop() || '';
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getProblemSlug(url) {
  if (!url) return '';
  return url.replace(/\/$/, '').split('/').pop() || '';
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Contests' },
  { id: 'WEEKLY', label: 'Weekly Contests' },
  { id: 'BIWEEKLY', label: 'Biweekly Contests' },
];

const COLUMNS = ['Q1', 'Q2', 'Q3', 'Q4'];

export const DIFFICULTY_LEVELS = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
};

export function getLeetCodeDifficulty(prob) {
  if (prob?.difficulty) {
    const d = String(prob.difficulty).toUpperCase();
    if (d.includes('EASY')) return 'EASY';
    if (d.includes('HARD')) return 'HARD';
    if (d.includes('MED')) return 'MEDIUM';
  }
  const rating = Number(prob?.rating);
  if (rating && rating > 0) {
    if (rating < 1550) return 'EASY';
    if (rating < 2000) return 'MEDIUM';
    return 'HARD';
  }
  const points = Number(prob?.points);
  if (points && points > 0) {
    if (points <= 3) return 'EASY';
    if (points <= 5) return 'MEDIUM';
    return 'HARD';
  }
  const col = String(prob?.index || prob?.colKey || '').toUpperCase();
  if (col.includes('1') || col === 'Q1') return 'EASY';
  if (col.includes('4') || col === 'Q4') return 'HARD';
  return 'MEDIUM';
}

export function getLeetCodeDifficultyStyle(difficulty) {
  const d = String(difficulty || '').toUpperCase();
  if (d === 'EASY') {
    return { label: 'Easy', color: '#00B8A3', bg: 'rgba(0, 184, 163, 0.1)' };
  }
  if (d === 'HARD') {
    return { label: 'Hard', color: '#EF4743', bg: 'rgba(239, 71, 67, 0.1)' };
  }
  return { label: 'Medium', color: '#FFC01E', bg: 'rgba(255, 192, 30, 0.1)' };
}

export default function LeetCodeContestPage() {
  const { contests, loading, error } = useLeetCodeData();
  const [handle, setHandle] = useState(() => localStorage.getItem('lc_handle') || '');
  const [solvedSet, setSolvedSet] = useState(new Set());
  const [isFetching, setIsFetching] = useState(false);
  const [userStats, setUserStats] = useState(null);

  // Centralized global backend starring
  const { isStarred: checkStarred, toggleStar } = useStarred();

  const [ladderModal, setLadderModal] = useState({ isOpen: false, question: null });

  // Filter controls
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [minDifficulty, setMinDifficulty] = useState('EASY');
  const [maxDifficulty, setMaxDifficulty] = useState('HARD');
  const [page, setPage] = useState(1);
  const limit = 25;

  const handleMinDifficultyChange = (newMin) => {
    setMinDifficulty(newMin);
    if ((DIFFICULTY_LEVELS[newMin] || 1) > (DIFFICULTY_LEVELS[maxDifficulty] || 3)) {
      setMaxDifficulty(newMin);
    }
    setPage(1);
  };

  const handleMaxDifficultyChange = (newMax) => {
    setMaxDifficulty(newMax);
    if ((DIFFICULTY_LEVELS[newMax] || 3) < (DIFFICULTY_LEVELS[minDifficulty] || 1)) {
      setMinDifficulty(newMax);
    }
    setPage(1);
  };

  const handlePresetSelect = (preset) => {
    if (preset === 'ALL') {
      setMinDifficulty('EASY');
      setMaxDifficulty('HARD');
    } else if (preset === 'EASY_MEDIUM') {
      setMinDifficulty('EASY');
      setMaxDifficulty('MEDIUM');
    } else if (preset === 'MEDIUM_HARD') {
      setMinDifficulty('MEDIUM');
      setMaxDifficulty('HARD');
    }
    setPage(1);
  };

  // Load saved handle
  useEffect(() => {
    const savedHandle = localStorage.getItem('lc_handle');
    if (savedHandle) {
      setHandle(savedHandle);
      if (solvedSet.size === 0) {
        handleSync(savedHandle, true);
      }
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        const lcAcc = res.data?.user?.platformAccounts?.find((a) => a.platform === 'leetcode');
        if (lcAcc?.handle) {
          setHandle(lcAcc.handle);
          localStorage.setItem('lc_handle', lcAcc.handle);
          if (solvedSet.size === 0) {
            handleSync(lcAcc.handle, true);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Save handle change
  const handleHandleChange = (val) => {
    setHandle(val);
    localStorage.setItem('lc_handle', val);
  };

  // Load solved problems from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lc_solved_problems');
      if (saved) {
        setSolvedSet(new Set(JSON.parse(saved)));
      }
    } catch {
      // ignore JSON parse error
    }
  }, []);

  // Toggle solve state manually
  const toggleSolved = (slug) => {
    if (!slug) return;
    const s = slug.toLowerCase();
    setSolvedSet((prev) => {
      const next = new Set(prev);
      if (next.has(s)) {
        next.delete(s);
      } else {
        next.add(s);
      }
      localStorage.setItem('lc_solved_problems', JSON.stringify([...next]));
      return next;
    });
  };

  // Sync LeetCode submissions & contest history
  const handleSync = async (targetHandle = handle, silent = false) => {
    const clean = targetHandle?.trim();
    if (!clean) {
      if (!silent) toast.error('Please enter a LeetCode username to sync');
      return;
    }

    setIsFetching(true);
    const toastId = !silent ? toast.loading(`Syncing LeetCode submissions for @${clean}...`) : null;
    try {
      const res = await fetchLeetCodeUserSolved(clean);
      const newSolved = new Set((res.solvedSlugs || []).map((s) => s.toLowerCase()));
      setSolvedSet(newSolved);
      setUserStats({
        rating: res.userRating,
        ranking: res.globalRanking,
        badge: res.badge,
        count: newSolved.size,
        attended: res.attendedContests,
      });
      localStorage.setItem('lc_handle', clean);
      localStorage.setItem('lc_solved_problems', JSON.stringify([...newSolved]));

      if (!silent) {
        toast.success(
          `Synced ${res.solvedSlugs?.length || 0} solved problems for @${clean}!`,
          { id: toastId }
        );
      }
    } catch (err) {
      if (!silent) toast.error(err.message || 'Failed to sync LeetCode submissions.', { id: toastId });
    } finally {
      setIsFetching(false);
    }
  };

  // Transform and filter contest rows
  const matrixRows = useMemo(() => {
    if (!contests || !contests.length) return [];

    const rows = [];

    contests.forEach((c, idx) => {
      const contestUrl = c.url || c.contestUrl || '';
      const info = parseContestInfo(contestUrl);
      const problemsList = c.problems || [];

      // Category filter
      if (category === 'WEEKLY' && info.type !== 'weekly') return;
      if (category === 'BIWEEKLY' && info.type !== 'biweekly') return;

      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const matchesName = info.title.toLowerCase().includes(q) || info.slug.includes(q);
        const matchesProblem = problemsList.some((p) => {
          const pName = p.title || formatProblemTitle(p.link || p.url || '');
          const pSlug = getProblemSlug(p.link || p.url || '');
          return pName.toLowerCase().includes(q) || pSlug.toLowerCase().includes(q);
        });
        if (!matchesName && !matchesProblem) return;
      }

      const minLevel = DIFFICULTY_LEVELS[minDifficulty] || 1;
      const maxLevel = DIFFICULTY_LEVELS[maxDifficulty] || 3;
      const isDiffFiltered = minLevel > 1 || maxLevel < 3;

      // Build column mappings
      const columns = { Q1: null, Q2: null, Q3: null, Q4: null };
      let solvedCount = 0;

      problemsList.forEach((p, pIdx) => {
        const pUrl = p.link || p.url || '';
        const slug = getProblemSlug(pUrl).toLowerCase();
        const title = p.title || formatProblemTitle(pUrl);
        const colKey = COLUMNS[pIdx] || `Q${pIdx + 1}`;
        const isSolved = solvedSet.has(slug);

        if (isSolved) solvedCount++;

        const diff = getLeetCodeDifficulty(p);
        const diffLevel = DIFFICULTY_LEVELS[diff] || 2;

        if (isDiffFiltered && (diffLevel < minLevel || diffLevel > maxLevel)) {
          return;
        }

        const probObj = {
          ...p,
          url: pUrl,
          slug,
          title,
          isSolved,
          points: p.points || '',
          rating: p.rating || null,
          difficulty: diff,
        };

        if (columns[colKey] !== undefined) {
          columns[colKey] = probObj;
        }
      });

      const totalProblems = problemsList.length || 4;
      const isCompleted = totalProblems > 0 && solvedCount === totalProblems;

      if (hideCompleted && isCompleted) return;
      if (isDiffFiltered && Object.values(columns).filter(Boolean).length === 0) return;

      rows.push({
        id: info.slug || `lc-${idx}`,
        title: info.title,
        type: info.type,
        num: info.num,
        url: contestUrl,
        columns,
        totalProblems,
        solvedCount,
        isCompleted,
      });
    });

    return rows;
  }, [contests, category, search, hideCompleted, solvedSet, minDifficulty, maxDifficulty]);

  const totalPages = Math.ceil(matrixRows.length / limit);
  const paginatedRows = useMemo(() => {
    return matrixRows.slice((page - 1) * limit, page * limit);
  }, [matrixRows, page, limit]);

  return (
    <>
      <ContestUpsolverView
      title={
        <span className="flex items-center gap-2.5">
          <LeetCodeIcon size={26} />
          <span>LeetCode Contest Upsolver</span>
        </span>
      }
      breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'LeetCode Upsolver' }]}
      handle={handle}
      onHandleChange={handleHandleChange}
      onSync={() => handleSync()}
      isSyncing={isFetching}
      handleLabel="LeetCode Handle"
      handlePlaceholder="e.g. your_leetcode_username"
      syncButtonText="Sync Solved"
      trackingText={
        handle
          ? userStats?.rating
            ? `Tracking: @${handle} · ${userStats.rating} ${userStats.badge ? `(${userStats.badge})` : ''}`
            : `Tracking: @${handle}`
          : null
      }
      solvedCount={solvedSet.size}
      search={search}
      onSearchChange={(val) => {
        setSearch(val);
        setPage(1);
      }}
      searchPlaceholder="Search contest (e.g. 456, Weekly) or problem..."
      showRatingFilter={false}
      showDifficultyFilter={true}
      minDifficulty={minDifficulty}
      maxDifficulty={maxDifficulty}
      onMinDifficultyChange={handleMinDifficultyChange}
      onMaxDifficultyChange={handleMaxDifficultyChange}
      onPresetSelect={handlePresetSelect}
      hideCompleted={hideCompleted}
      onHideCompletedChange={(val) => {
        setHideCompleted(val);
        setPage(1);
      }}
      categories={CATEGORIES}
      selectedCategory={category}
      onCategoryChange={(cat) => {
        setCategory(cat);
        setPage(1);
      }}
      columns={COLUMNS}
      contests={paginatedRows}
      totalContests={matrixRows.length}
      loading={loading}
      loadingText="Loading LeetCode contests and problems..."
      error={error}
      emptyMessage="No contests matched the selected filters."
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      renderContestInfo={(contest) => (
        <div className="flex flex-col gap-1">
          <a
            href={contest.url}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-[#e6edf3] hover:text-[#58a6ff] hover:underline transition-colors leading-tight"
          >
            {contest.title}
          </a>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                contest.type === 'weekly'
                  ? 'bg-[#58a6ff]/10 text-[#58a6ff]'
                  : 'bg-[#a371f7]/10 text-[#a371f7]'
              }`}
            >
              {contest.type === 'weekly' ? 'Weekly' : 'Biweekly'}
            </span>
            <span className="text-[10px] text-[#8b949e]">
              {contest.solvedCount}/{contest.totalProblems} solved
            </span>
            {contest.isCompleted && (
              <span className="inline-flex items-center text-[10px] text-[#3fb950] font-bold">
                All Solved
              </span>
            )}
          </div>
        </div>
      )}
      renderProblemCell={(prob) => {
        const diff = getLeetCodeDifficulty(prob);
        const diffStyle = getLeetCodeDifficultyStyle(diff);
        const cleanTags = (prob.tags || []).filter((t) => !t.startsWith('rating-')).join(', ');
        const questionObj = {
          _id: prob.questionId || undefined,
          platform: 'LEETCODE',
          code: prob.slug,
          externalId: prob.externalId || prob.slug,
          title: prob.title,
          url: prob.url,
          rating: prob.rating,
          difficulty: diff,
          tags: prob.tags || [],
        };
        const isStarred = checkStarred(questionObj);
        return (
          <UpsolverProblemCard
            key={prob.slug || prob.url}
            title={prob.title}
            url={prob.url}
            isSolved={prob.isSolved}
            isStarred={isStarred}
            onStar={() => toggleStar(questionObj)}
            onBookmark={() =>
              setLadderModal({
                isOpen: true,
                question: questionObj,
              })
            }
            titleColor={diffStyle.color}
            cardBg={diffStyle.bg}
            badgeTitle={`LeetCode ${diffStyle.label}${cleanTags ? ` · ${cleanTags}` : ''}${prob.rating ? ` · Rating: ${prob.rating}` : prob.points ? ` · ${prob.points} pts` : ''}`}
          />
        );
      }}
    />
    <AddToLadderModal
      isOpen={ladderModal.isOpen}
      onClose={() => setLadderModal({ isOpen: false, question: null })}
      question={ladderModal.question}
    />
    </>
  );
}
