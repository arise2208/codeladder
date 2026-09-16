import React, { useState, useMemo, useEffect } from 'react';
import ContestUpsolverView, { UpsolverProblemCard } from '../components/shared/ContestUpsolverView';
import AddToLadderModal from '../components/shared/AddToLadderModal';
import { useCodeforcesData, fetchCodeforcesSubmissions } from '../hooks/useContestData';
import toast from 'react-hot-toast';
import { CodeforcesIcon } from '../components/ui/PlatformIcon';
import api from '../lib/api';
import { useStarred } from '../context/StarredContext';

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H+'];

const CATEGORIES = [
  { id: 'ALL', label: 'All' },
  { id: 'DIV1', label: 'Div. 1', pattern: /div\.\s*1\b/i },
  { id: 'DIV2', label: 'Div. 2', pattern: /div\.\s*2\b/i },
  { id: 'DIV3', label: 'Div. 3', pattern: /div\.\s*3\b/i },
  { id: 'DIV4', label: 'Div. 4', pattern: /div\.\s*4\b/i },
  { id: 'EDU', label: 'Educational', pattern: /educational/i },
  { id: 'GLOBAL', label: 'Global', pattern: /global/i },
  { id: 'OTHER', label: 'Other' },
];

export function getCfRatingStyle(rating) {
  if (!rating || rating <= 0) {
    return {
      text: '#8b949e',
      bg: '#21262d',
      border: '#30363d',
      dot: '#8b949e',
      label: 'Unrated',
    };
  }
  if (rating < 1200) {
    return {
      text: '#808080',
      bg: '#21262d',
      border: '#30363d',
      dot: '#808080',
      label: 'Newbie',
    };
  }
  if (rating < 1400) {
    return {
      text: '#3fb950',
      bg: '#0d2818',
      border: '#238636',
      dot: '#3fb950',
      label: 'Pupil',
    };
  }
  if (rating < 1600) {
    return {
      text: '#39d2c0',
      bg: '#0c2d2a',
      border: '#1b7a6e',
      dot: '#39d2c0',
      label: 'Specialist',
    };
  }
  if (rating < 1900) {
    return {
      text: '#58a6ff',
      bg: '#0d1d3a',
      border: '#1f6feb',
      dot: '#58a6ff',
      label: 'Expert',
    };
  }
  if (rating < 2100) {
    return {
      text: '#d2a8ff',
      bg: '#1e0d36',
      border: '#8b5cf6',
      dot: '#d2a8ff',
      label: 'Candidate Master',
    };
  }
  if (rating < 2400) {
    return {
      text: '#f0883e',
      bg: '#2a1a04',
      border: '#d47616',
      dot: '#f0883e',
      label: 'Master',
    };
  }
  if (rating < 2600) {
    return {
      text: '#f85149',
      bg: '#2d0e0e',
      border: '#da3633',
      dot: '#f85149',
      label: 'Grandmaster',
    };
  }
  return {
    text: '#ff7b72',
    bg: '#2d0e0e',
    border: '#f85149',
    dot: '#ff7b72',
    label: 'Legendary Grandmaster',
  };
}

function getColumnForIndex(index) {
  if (!index) return 'H+';
  const clean = index.trim().toUpperCase();
  const firstChar = clean.charAt(0);
  if (['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(firstChar)) {
    return firstChar;
  }
  return 'H+';
}

export default function CodeforcesContestPage() {
  const { contests, loading, error } = useCodeforcesData();
  const [handle, setHandle] = useState(() => localStorage.getItem('cf_handle') || '');
  const [solvedSet, setSolvedSet] = useState(() => {
    try {
      const saved = localStorage.getItem('cf_solved_problems');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Toggle solve state manually
  const toggleSolved = (problemKey) => {
    if (!problemKey) return;
    setSolvedSet((prev) => {
      const next = new Set(prev);
      if (next.has(problemKey)) {
        next.delete(problemKey);
      } else {
        next.add(problemKey);
      }
      localStorage.setItem('cf_solved_problems', JSON.stringify([...next]));
      return next;
    });
  };

  // Centralized global backend starring
  const { isStarred: checkStarred, toggleStar } = useStarred();

  const [ladderModal, setLadderModal] = useState({ isOpen: false, question: null });
  const [isFetching, setIsFetching] = useState(false);

  // Filter controls
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const handleFetch = async (targetHandle = handle, silent = false) => {
    const clean = targetHandle?.trim();
    if (!clean) {
      if (!silent) toast.error('Please enter a Codeforces handle');
      return;
    }
    setIsFetching(true);
    try {
      const subs = await fetchCodeforcesSubmissions(clean);
      const newSolved = new Set();
      subs.forEach((s) => {
        if (s.verdict === 'OK' && s.problem?.contestId && s.problem?.index) {
          newSolved.add(`${s.problem.contestId}-${s.problem.index}`);
        }
      });
      setSolvedSet(newSolved);
      localStorage.setItem('cf_handle', clean);
      localStorage.setItem('cf_solved_problems', JSON.stringify([...newSolved]));

      // Persist to backend database
      let matchedCount = 0;
      try {
        const syncRes = await api.post('/platform-accounts/sync-solved', {
          codeforces: [...newSolved].slice(0, 2000)
        });
        matchedCount = syncRes.data?.matchedCount || 0;
      } catch (postErr) {
        console.warn('Backend sync-solved error in Codeforces page:', postErr);
      }

      if (!silent) {
        toast.success(`Fetched ${newSolved.size} solved submissions for ${clean} (${matchedCount} catalog matches)!`);
      }
    } catch (err) {
      if (!silent) toast.error(err.message || 'Failed to fetch submissions');
    } finally {
      setIsFetching(false);
    }
  };

  // Auto-fill connected handle from platform accounts & auto-fetch if empty
  useEffect(() => {
    const saved = localStorage.getItem('cf_handle');
    if (saved) {
      setHandle(saved);
      if (solvedSet.size === 0) {
        handleFetch(saved, true);
      }
      return;
    }
    api
      .get('/platform-accounts')
      .then(({ data }) => {
        const cf = (data.accounts || []).find((a) => a.platform === 'CODEFORCES');
        if (cf?.handle) {
          setHandle(cf.handle);
          localStorage.setItem('cf_handle', cf.handle);
          if (solvedSet.size === 0) {
            handleFetch(cf.handle, true);
          }
        }
      })
      .catch(() => {});
  }, []);

  const matrixContests = useMemo(() => {
    if (!contests || !contests.length) return [];

    let result = [];
    for (const c of contests) {
      const contestId = c.contestId || c.id;
      const contestName = c.name || `Codeforces Round ${contestId}`;
      const contestProblems = c.problems || [];

      // Search filter
      if (search) {
        const s = search.toLowerCase();
        const matchesName = contestName.toLowerCase().includes(s);
        const matchesId = String(contestId).includes(s);
        if (!matchesName && !matchesId) continue;
      }

      // Category filter
      if (category !== 'ALL') {
        if (c.category && c.category === category) {
          // matched directly
        } else {
          const catObj = CATEGORIES.find((cat) => cat.id === category);
          if (catObj?.pattern) {
            if (!catObj.pattern.test(contestName)) continue;
          } else if (category === 'OTHER') {
            const isStandard = CATEGORIES.slice(1, -1).some((cat) => cat.pattern?.test(contestName));
            if (isStandard) continue;
          }
        }
      }

      // Group problems by column letter (A, B, C, D, E, F, G, H+)
      const columnGroups = {};
      COLUMNS.forEach((col) => {
        columnGroups[col] = [];
      });

      let totalContestProblems = 0;
      let solvedInContest = 0;

      contestProblems.forEach((p) => {
        // Rating filter
        if (minRating && p.rating && p.rating < Number(minRating)) return;
        if (maxRating && p.rating && p.rating > Number(maxRating)) return;

        totalContestProblems++;
        const isSolved = solvedSet.has(`${contestId}-${p.index}`);
        if (isSolved) solvedInContest++;

        const col = getColumnForIndex(p.index);
        columnGroups[col].push({
          ...p,
          contestId: Number(contestId) || contestId
        });
      });

      // Sort problems inside each column by index (e.g. A1 before A2)
      COLUMNS.forEach((col) => {
        columnGroups[col].sort((a, b) => a.index.localeCompare(b.index, undefined, { numeric: true }));
      });

      const isCompleted = totalContestProblems > 0 && solvedInContest === totalContestProblems;

      // Hide completed toggle
      if (hideCompleted && isCompleted) continue;

      if (totalContestProblems > 0) {
        result.push({
          id: contestId,
          name: contestName,
          columns: columnGroups,
          totalProblems: totalContestProblems,
          solvedProblems: solvedInContest,
          isCompleted,
        });
      }
    }

    return result;
  }, [contests, search, category, hideCompleted, minRating, maxRating, solvedSet]);

  const totalPages = Math.ceil(matrixContests.length / limit);
  const paginatedContests = useMemo(() => {
    return matrixContests.slice((page - 1) * limit, page * limit);
  }, [matrixContests, page, limit]);

  return (
    <>
      <ContestUpsolverView
      title={
        <span className="flex items-center gap-2.5">
          <CodeforcesIcon size={26} />
          <span>Codeforces Contest Upsolver</span>
        </span>
      }
      breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Codeforces Upsolver' }]}
      handle={handle}
      onSync={() => handleFetch()}
      isSyncing={isFetching}
      handleLabel="Codeforces Handle"
      syncButtonText="Fetch Submissions"
      solvedCount={solvedSet.size}
      search={search}
      onSearchChange={(val) => {
        setSearch(val);
        setPage(1);
      }}
      searchPlaceholder="Search contest or problem..."
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
      categories={CATEGORIES}
      selectedCategory={category}
      onCategoryChange={(cat) => {
        setCategory(cat);
        setPage(1);
      }}
      columns={COLUMNS}
      contests={paginatedContests}
      totalContests={matrixContests.length}
      loading={loading}
      loadingText="Loading Codeforces problemset and contests..."
      error={error}
      emptyMessage="No contests matched the selected filters."
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      renderContestInfo={(contest) => (
        <div className="flex flex-col gap-1">
          <a
            href={`https://codeforces.com/contest/${contest.id}`}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-[#e6edf3] hover:text-[#58a6ff] hover:underline transition-colors leading-tight line-clamp-2"
            title={contest.name}
          >
            {contest.name}
          </a>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-[11px] text-[#58a6ff] font-semibold">
              CF {contest.id}
            </span>
            <span className="text-[10px] text-[#8b949e]">
              {contest.solvedProblems}/{contest.totalProblems} solved
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
        const problemKey = `${p.contestId}-${p.index}`;
        const externalId = p.externalId || `${p.contestId}${p.index}`;
        const isSolved = solvedSet.has(problemKey);
        const questionObj = {
          _id: p.questionId || undefined,
          platform: 'CODEFORCES',
          externalId,
          code: problemKey,
          title: `${p.index}. ${p.title || p.name}`,
          url: p.url || `https://codeforces.com/contest/${p.contestId}/problem/${p.index}`,
          rating: p.rating,
        };
        const isStarred = checkStarred(questionObj);
        const colorStyle = getCfRatingStyle(p.rating);
        const title = `${p.index}. ${p.title || p.name}`;
        const url = p.url || `https://codeforces.com/contest/${p.contestId}/problem/${p.index}`;
        return (
          <UpsolverProblemCard
            key={p.index}
            title={title}
            url={url}
            isSolved={isSolved}
            isStarred={isStarred}
            onStar={() => toggleStar(questionObj)}
            onBookmark={() =>
              setLadderModal({
                isOpen: true,
                question: questionObj,
              })
            }
            titleColor={colorStyle.text}
            badgeTitle={p.rating ? `Codeforces Rating: ${p.rating} (${colorStyle.label})` : 'Unrated'}
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
