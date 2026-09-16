import React, { useState, useMemo, useEffect } from 'react';
import ContestUpsolverView, { UpsolverProblemCard } from '../components/shared/ContestUpsolverView';
import AddToLadderModal from '../components/shared/AddToLadderModal';
import { CodeChefIcon } from '../components/ui/PlatformIcon';
import { useCodeChefData, fetchCodeChefSubmissions } from '../hooks/useContestData';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useStarred } from '../context/StarredContext';

const PROBLEM_COLUMNS = ['P1 (A)', 'P2 (B)', 'P3 (C)', 'P4 (D)', 'P5 (E)', 'P6 (F)', 'P7 (G)', 'P8+'];

const CATEGORIES = [
  { id: 'ALL', label: 'All' },
  { id: 'DIV1', label: 'Division 1', filter: (c) => c.division?.includes('Division 1') || c.contest?.endsWith('A') },
  { id: 'DIV2', label: 'Division 2', filter: (c) => c.division?.includes('Division 2') || c.contest?.endsWith('B') },
  { id: 'DIV3', label: 'Division 3', filter: (c) => c.division?.includes('Division 3') || c.contest?.endsWith('C') },
  { id: 'DIV4', label: 'Division 4', filter: (c) => c.division?.includes('Division 4') || c.contest?.endsWith('D') },
  { id: 'STARTERS', label: 'Starters', filter: (c) => c.contest?.startsWith('START') },
  { id: 'COOKOFF', label: 'Cook-Off', filter: (c) => c.contest?.startsWith('COOK') },
  { id: 'LUNCHTIME', label: 'Lunchtime', filter: (c) => c.contest?.startsWith('LTIME') },
];

// Official CodeChef rating tiers and colors from exact color schema
export function getCodeChefRatingStyle(rating) {
  if (!rating || rating <= 0 || rating === 9999) {
    return {
      text: '#8b949e',
      bg: '#21262d',
      border: '#30363d',
      badgeBg: '#30363d',
      badgeText: '#ffffff',
      stars: 0,
      label: 'Unrated',
      ratingText: 'Unrated',
    };
  }
  if (rating <= 1399) {
    return {
      text: '#8b949e',
      bg: '#5A5A5A',
      border: '#5A5A5A',
      badgeBg: '#5A5A5A',
      badgeText: '#ffffff',
      stars: 1,
      label: '1★',
      ratingText: String(rating),
    };
  }
  if (rating <= 1599) {
    return {
      text: '#3fb950',
      bg: '#2E7D32',
      border: '#2E7D32',
      badgeBg: '#2E7D32',
      badgeText: '#ffffff',
      stars: 2,
      label: '2★',
      ratingText: String(rating),
    };
  }
  if (rating <= 1799) {
    return {
      text: '#58a6ff',
      bg: '#1976D2',
      border: '#1976D2',
      badgeBg: '#1976D2',
      badgeText: '#ffffff',
      stars: 3,
      label: '3★',
      ratingText: String(rating),
    };
  }
  if (rating <= 1999) {
    return {
      text: '#bc8cff',
      bg: '#683A83',
      border: '#683A83',
      badgeBg: '#683A83',
      badgeText: '#ffffff',
      stars: 4,
      label: '4★',
      ratingText: String(rating),
    };
  }
  if (rating <= 2199) {
    return {
      text: '#e5a910',
      bg: '#E5A910',
      border: '#E5A910',
      badgeBg: '#E5A910',
      badgeText: '#ffffff',
      stars: 5,
      label: '5★',
      ratingText: String(rating),
    };
  }
  if (rating <= 2499) {
    return {
      text: '#f0883e',
      bg: '#E65100',
      border: '#E65100',
      badgeBg: '#E65100',
      badgeText: '#ffffff',
      stars: 6,
      label: '6★',
      ratingText: String(rating),
    };
  }
  return {
    text: '#f85149',
    bg: '#C62828',
    border: '#C62828',
    badgeBg: '#C62828',
    badgeText: '#ffffff',
    stars: 7,
    label: '7★',
    ratingText: String(rating),
  };
}

export function getCodeChefProblemStyle(problem) {
  const rating = problem?.rating || (typeof problem === 'number' ? problem : null);
  if (rating && rating > 0 && rating !== 9999) {
    return getCodeChefRatingStyle(rating);
  }
  return getCodeChefRatingStyle(null);
}

export function matchesRatingFilter(p, minRating, maxRating) {
  if (!minRating && !maxRating) return true;
  const rating = p?.rating;
  if (!rating || rating === 9999) return false;
  if (minRating && rating < Number(minRating)) return false;
  if (maxRating && rating > Number(maxRating)) return false;
  return true;
}

export default function CodeChefContestPage() {
  const { contests, loading, error } = useCodeChefData();
  const [handle, setHandle] = useState(() => localStorage.getItem('cc_handle') || '');
  const [isFetching, setIsFetching] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [mergeDivisions, setMergeDivisions] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');
  const [userStats, setUserStats] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Centralized global backend starring
  const { isStarred: checkStarred, toggleStar } = useStarred();

  // Modal to add problem to any ladder
  const [ladderModal, setLadderModal] = useState({ isOpen: false, question: null });

  // Track locally checked/solved problems persisted in localStorage
  const [solvedCodes, setSolvedCodes] = useState(() => {
    try {
      const saved = localStorage.getItem('cc_solved_problems');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Toggle solve state manually
  const toggleSolved = (code) => {
    if (!code) return;
    const c = code.toUpperCase();
    setSolvedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(c)) {
        next.delete(c);
      } else {
        next.add(c);
      }
      localStorage.setItem('cc_solved_problems', JSON.stringify([...next]));
      return next;
    });
  };

  // Load connected CodeChef handle if exists
  useEffect(() => {
    const saved = localStorage.getItem('cc_handle');
    if (saved) {
      setHandle(saved);
      if (solvedCodes.size === 0) {
        handleSync(saved, true);
      }
      return;
    }
    api
      .get('/platform-accounts')
      .then(({ data }) => {
        const cc = (data.accounts || []).find((a) => a.platform === 'CODECHEF');
        if (cc?.handle) {
          setHandle(cc.handle);
          localStorage.setItem('cc_handle', cc.handle);
          if (solvedCodes.size === 0) {
            handleSync(cc.handle, true);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSync = async (targetHandle = handle, silent = false) => {
    const clean = targetHandle?.trim();
    if (!clean) {
      if (!silent) toast.error('Please enter a CodeChef username to sync');
      return;
    }

    setIsFetching(true);
    const toastId = !silent ? toast.loading(`Syncing CodeChef submissions for @${clean}...`) : null;
    try {
      const res = await fetchCodeChefSubmissions(clean);
      const newSolved = new Set((res.solvedCodes || []).map((c) => c.toUpperCase()));
      setSolvedCodes(newSolved);
      setUserStats({
        rating: res.userRating,
        stars: res.stars,
        count: newSolved.size
      });
      localStorage.setItem('cc_handle', clean);
      localStorage.setItem('cc_solved_problems', JSON.stringify([...newSolved]));

      // Persist to backend database
      let matchedCount = 0;
      try {
        const syncRes = await api.post('/platform-accounts/sync-solved', {
          codechef: [...newSolved].slice(0, 2000)
        });
        matchedCount = syncRes.data?.matchedCount || 0;
      } catch (postErr) {
        console.warn('Backend sync-solved error in CodeChef page:', postErr);
      }

      if (!silent) {
        toast.success(
          `Synced ${res.solvedCodes?.length || 0} solved problems for @${clean} (${matchedCount} catalog matches)!`,
          { id: toastId }
        );
      }
    } catch (err) {
      if (!silent) {
        toast.error(err.message || 'Failed to sync CodeChef submissions.', { id: toastId });
      }
    } finally {
      setIsFetching(false);
    }
  };

  // Prepare table data
  const matrixRows = useMemo(() => {
    if (!contests || !contests.length) return [];

    const filtered = contests.filter((c) => {
      const name = c.contest || c.code || '';
      const div = c.division || '';

      if (search) {
        const s = search.toLowerCase();
        const matchesName = name.toLowerCase().includes(s);
        const matchesDiv = div.toLowerCase().includes(s);
        const matchesProblem = c.problems?.some(
          (p) => p.name?.toLowerCase().includes(s) || p.code?.toLowerCase().includes(s)
        );
        if (!matchesName && !matchesDiv && !matchesProblem) return false;
      }

      if (category !== 'ALL') {
        const catObj = CATEGORIES.find((item) => item.id === category);
        if (catObj?.filter && !catObj.filter(c)) return false;
      }

      return true;
    });

    let result = [];

    if (mergeDivisions) {
      // Group by root contest code (e.g. START192 from START192A, START192B, etc.)
      const roundMap = new Map();
      filtered.forEach((c) => {
        const rawCode = c.contest || c.code || '';
        const rootCode = rawCode.replace(/[A-D]$/i, '');

        if (!roundMap.has(rootCode)) {
          roundMap.set(rootCode, {
            id: rootCode,
            title: rootCode,
            subtitles: new Set([c.division].filter(Boolean)),
            problemsByCol: {},
          });
          PROBLEM_COLUMNS.forEach((col) => {
            roundMap.get(rootCode).problemsByCol[col] = [];
          });
        }

        const roundObj = roundMap.get(rootCode);
        if (c.division) roundObj.subtitles.add(c.division.replace('Scorable Problems for ', ''));

        (c.problems || []).forEach((p, idx) => {
          if (!matchesRatingFilter(p, minRating, maxRating)) return;
          const colIndex = Math.min(idx, PROBLEM_COLUMNS.length - 1);
          const colName = PROBLEM_COLUMNS[colIndex];
          // Avoid duplicate problems in same cell if already added from another division
          if (!roundObj.problemsByCol[colName].some((existing) => existing.code === p.code)) {
            roundObj.problemsByCol[colName].push({ ...p, division: c.division });
          }
        });
      });

      result = Array.from(roundMap.values()).map((r) => {
        const allProbs = Object.values(r.problemsByCol).flat();
        const totalProblems = allProbs.length;
        const solvedCount = allProbs.filter((p) => solvedCodes.has(p.code?.toUpperCase())).length;
        const isCompleted = totalProblems > 0 && solvedCount === totalProblems;
        return {
          id: r.id,
          title: r.title,
          subtitle: Array.from(r.subtitles).join(' · '),
          columns: r.problemsByCol,
          totalProblems,
          solvedCount,
          isCompleted,
        };
      });
    } else {
      // Standard unmerged: each contest division is its own row
      result = filtered.map((c) => {
        const colMap = {};
        PROBLEM_COLUMNS.forEach((col) => {
          colMap[col] = [];
        });

        (c.problems || []).forEach((p, idx) => {
          if (!matchesRatingFilter(p, minRating, maxRating)) return;
          const colIndex = Math.min(idx, PROBLEM_COLUMNS.length - 1);
          const colName = PROBLEM_COLUMNS[colIndex];
          colMap[colName].push({ ...p, division: c.division });
        });

        const contestCode = c.contest || c.code || 'Contest';
        const rootRound = contestCode.replace(/[A-D]$/i, '');
        const allProbs = Object.values(colMap).flat();
        const totalProblems = allProbs.length;
        const solvedCount = allProbs.filter((p) => solvedCodes.has(p.code?.toUpperCase())).length;
        const isCompleted = totalProblems > 0 && solvedCount === totalProblems;

        return {
          id: contestCode,
          title: contestCode,
          rootRound,
          subtitle: c.division?.replace('Scorable Problems for ', '') || '',
          columns: colMap,
          totalProblems,
          solvedCount,
          isCompleted,
        };
      });
    }

    if (minRating || maxRating) {
      result = result.filter((row) => row.totalProblems > 0);
    }

    if (hideCompleted) {
      result = result.filter((row) => !row.isCompleted);
    }

    return result;
  }, [contests, search, category, mergeDivisions, hideCompleted, solvedCodes, minRating, maxRating]);

  const totalPages = Math.ceil(matrixRows.length / limit);
  const paginatedRows = useMemo(() => {
    return matrixRows.slice((page - 1) * limit, page * limit);
  }, [matrixRows, page, limit]);

  return (
    <>
      <ContestUpsolverView
      title={
        <span className="flex items-center gap-2.5">
          <CodeChefIcon size={26} />
          <span>CodeChef Contest Upsolver</span>
        </span>
      }
      breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'CodeChef Upsolver' }]}
      handle={handle}
      onSync={() => handleSync()}
      isSyncing={isFetching}
      handleLabel="CodeChef Handle"
      syncButtonText="Sync Solved"
      solvedCount={solvedCodes.size}
      search={search}
      onSearchChange={(val) => {
        setSearch(val);
        setPage(1);
      }}
      searchPlaceholder="Search contest, division, or problem..."
      showRatingFilter={true}
      minRating={minRating}
      maxRating={maxRating}
      onMinRatingChange={(val) => {
        setMinRating(val);
        setPage(1);
      }}
      onMaxRatingChange={(val) => {
        setMaxRating(val);
        setPage(1);
      }}
      hideCompleted={hideCompleted}
      onHideCompletedChange={(val) => {
        setHideCompleted(val);
        setPage(1);
      }}
      mergeDivisionsToggle={{
        checked: mergeDivisions,
        onChange: (val) => {
          setMergeDivisions(val);
          setPage(1);
        },
      }}
      categories={CATEGORIES}
      selectedCategory={category}
      onCategoryChange={(cat) => {
        setCategory(cat);
        setPage(1);
      }}
      columns={PROBLEM_COLUMNS}
      contests={paginatedRows}
      totalContests={matrixRows.length}
      loading={loading}
      loadingText="Loading CodeChef contests dataset..."
      error={error}
      emptyMessage="No CodeChef contests matched your filters."
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      renderContestInfo={(contest) => (
        <div className="flex flex-col gap-1">
          <a
            href={`https://www.codechef.com/${contest.title || contest.id}`}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-[#e6edf3] hover:text-[#ffa116] hover:underline transition-colors leading-tight"
          >
            {contest.title || contest.id}
          </a>
          {contest.subtitle && (
            <span className="text-[11px] text-[#8b949e] line-clamp-1" title={contest.subtitle}>
              {contest.subtitle}
            </span>
          )}
          <div className="flex items-center gap-2 mt-0.5">
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
      renderProblemCell={(p) => {
        const isSolved = solvedCodes.has(p.code?.toUpperCase());
        const style = getCodeChefProblemStyle(p);
        const hasRating = p.rating && p.rating > 0 && p.rating !== 9999;
        const questionObj = {
          _id: p.questionId || undefined,
          platform: 'CODECHEF',
          code: p.code,
          externalId: p.code,
          title: p.name || p.code,
          url: p.url || `https://www.codechef.com/problems/${p.code}`,
          rating: p.rating,
        };
        const isStarred = checkStarred(questionObj);
        return (
          <UpsolverProblemCard
            key={p.code}
            title={p.name || p.code}
            url={p.url || `https://www.codechef.com/problems/${p.code}`}
            isSolved={isSolved}
            isStarred={isStarred}
            onStar={() => toggleStar(questionObj)}
            onBookmark={() =>
              setLadderModal({
                isOpen: true,
                question: questionObj,
              })
            }
            titleColor={style.text}
            badgeTitle={
              hasRating
                ? `CodeChef Rating: ${p.rating} (${style.label})`
                : 'Unrated'
            }
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
