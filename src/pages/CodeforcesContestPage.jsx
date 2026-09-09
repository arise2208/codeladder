import React, { useState, useMemo, useEffect } from 'react';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Pagination from '../components/ui/Pagination';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useCodeforcesData, fetchCodeforcesSubmissions } from '../hooks/useContestData';
import toast from 'react-hot-toast';
import { CheckCircle2, ExternalLink, Search, Check, RefreshCw } from 'lucide-react';
import api from '../lib/api';

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
      text: '#6B7280',
      bg: '#F9FAFB',
      border: '#E5E7EB',
      dot: '#9CA3AF',
      label: 'Unrated',
    };
  }
  if (rating < 1200) {
    return {
      text: '#808080',
      bg: '#F3F4F6',
      border: '#D1D5DB',
      dot: '#808080',
      label: 'Newbie',
    };
  }
  if (rating < 1400) {
    return {
      text: '#008000',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      dot: '#008000',
      label: 'Pupil',
    };
  }
  if (rating < 1600) {
    return {
      text: '#03A89E',
      bg: '#ECFEFF',
      border: '#A5F3FC',
      dot: '#03A89E',
      label: 'Specialist',
    };
  }
  if (rating < 1900) {
    return {
      text: '#0000FF',
      bg: '#EFF6FF',
      border: '#BFDBFE',
      dot: '#0000FF',
      label: 'Expert',
    };
  }
  if (rating < 2100) {
    return {
      text: '#AA00AA',
      bg: '#FAF5FF',
      border: '#E9D5FF',
      dot: '#AA00AA',
      label: 'Candidate Master',
    };
  }
  if (rating < 2400) {
    return {
      text: '#FF8C00',
      bg: '#FFF7ED',
      border: '#FED7AA',
      dot: '#FF8C00',
      label: 'Master',
    };
  }
  if (rating < 2600) {
    return {
      text: '#FF0000',
      bg: '#FEF2F2',
      border: '#FECACA',
      dot: '#FF0000',
      label: 'Grandmaster',
    };
  }
  return {
    text: '#CC0000',
    bg: '#FEF2F2',
    border: '#F87171',
    dot: '#CC0000',
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
  const { problems, contests, loading, error } = useCodeforcesData();
  const [handle, setHandle] = useState('');
  const [solvedSet, setSolvedSet] = useState(new Set());
  const [isFetching, setIsFetching] = useState(false);

  // Filter controls
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(true);
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  // Auto-fill connected handle from platform accounts
  useEffect(() => {
    const saved = localStorage.getItem('cf_handle');
    if (saved) {
      setHandle(saved);
      return;
    }
    api
      .get('/platform-accounts')
      .then(({ data }) => {
        const cf = (data.accounts || []).find((a) => a.platform === 'CODEFORCES');
        if (cf?.handle) {
          setHandle(cf.handle);
        }
      })
      .catch(() => {});
  }, []);

  const handleFetch = async () => {
    if (!handle.trim()) return toast.error('Please enter a Codeforces handle');
    setIsFetching(true);
    try {
      const subs = await fetchCodeforcesSubmissions(handle.trim());
      const newSolved = new Set();
      subs.forEach((s) => {
        if (s.verdict === 'OK' && s.problem?.contestId && s.problem?.index) {
          newSolved.add(`${s.problem.contestId}-${s.problem.index}`);
        }
      });
      setSolvedSet(newSolved);
      localStorage.setItem('cf_handle', handle.trim());
      toast.success(`Fetched ${newSolved.size} solved submissions for ${handle.trim()}!`);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch submissions');
    } finally {
      setIsFetching(false);
    }
  };

  const contestMap = useMemo(() => {
    const map = new Map();
    contests.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [contests]);

  const matrixContests = useMemo(() => {
    if (!problems.length) return [];

    // Group problems by contest
    const contestProblemMap = new Map();
    problems.forEach((p) => {
      if (!contestProblemMap.has(p.contestId)) {
        contestProblemMap.set(p.contestId, []);
      }
      contestProblemMap.get(p.contestId).push(p);
    });

    let result = [];
    for (const [contestId, contestProblems] of contestProblemMap.entries()) {
      const contestName = contestMap.get(contestId) || `Codeforces Round ${contestId}`;

      // Search filter
      if (search) {
        const s = search.toLowerCase();
        const matchesName = contestName.toLowerCase().includes(s);
        const matchesId = String(contestId).includes(s);
        if (!matchesName && !matchesId) continue;
      }

      // Category filter
      if (category !== 'ALL') {
        const catObj = CATEGORIES.find((c) => c.id === category);
        if (catObj?.pattern) {
          if (!catObj.pattern.test(contestName)) continue;
        } else if (category === 'OTHER') {
          const isStandard = CATEGORIES.slice(1, -1).some((c) => c.pattern.test(contestName));
          if (isStandard) continue;
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
        const isSolved = solvedSet.has(`${p.contestId}-${p.index}`);
        if (isSolved) solvedInContest++;

        const col = getColumnForIndex(p.index);
        columnGroups[col].push(p);
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

    // Sort newest contests first
    result.sort((a, b) => b.id - a.id);
    return result;
  }, [problems, contestMap, search, category, hideCompleted, minRating, maxRating, solvedSet]);

  const totalPages = Math.ceil(matrixContests.length / limit);
  const paginatedContests = useMemo(() => {
    return matrixContests.slice((page - 1) * limit, page * limit);
  }, [matrixContests, page, limit]);

  return (
    <div className="w-full max-w-[1550px] mx-auto space-y-6">
      <PageHeader
        title="Codeforces Contest Upsolver"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Codeforces Upsolver' }]}
      />

      {/* Top Controls Card */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5 space-y-4">
        {/* User Handle Fetch Row */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full max-w-md">
            <Input
              label="Codeforces Handle"
              placeholder="e.g. tourist, Benq, arose"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            />
          </div>
          <Button onClick={handleFetch} disabled={isFetching} variant="primary">
            {isFetching ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Fetching...
              </>
            ) : (
              'Fetch Submissions'
            )}
          </Button>

          {solvedSet.size > 0 && (
            <div className="flex items-center gap-2 text-sm text-[#00B894] font-semibold bg-[#00B894]/10 px-3 py-2 rounded-lg">
              <Check size={16} />
              <span>{solvedSet.size} problems solved</span>
            </div>
          )}
        </div>

        {/* Filters and Toggles Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#E5E7EB]">
          {/* Search */}
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search contest name or ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Rating Range */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#6B7280]">Rating:</span>
            <input
              type="number"
              placeholder="Min"
              value={minRating}
              onChange={(e) => {
                setMinRating(e.target.value);
                setPage(1);
              }}
              className="w-20 px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] focus:outline-none focus:border-[#6C5CE7]"
            />
            <span className="text-[#9CA3AF]">-</span>
            <input
              type="number"
              placeholder="Max"
              value={maxRating}
              onChange={(e) => {
                setMaxRating(e.target.value);
                setPage(1);
              }}
              className="w-20 px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] focus:outline-none focus:border-[#6C5CE7]"
            />
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideCompleted}
                onChange={(e) => {
                  setHideCompleted(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded text-[#6C5CE7] focus:ring-[#6C5CE7] border-gray-300"
              />
              <span className="text-xs font-medium text-[#1E1F25]">Hide Completed</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDifficulty}
                onChange={(e) => setShowDifficulty(e.target.checked)}
                className="w-4 h-4 rounded text-[#6C5CE7] focus:ring-[#6C5CE7] border-gray-300"
              />
              <span className="text-xs font-medium text-[#1E1F25]">Show Difficulty</span>
            </label>
          </div>
        </div>

        {/* Division / Category Pills */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategory(cat.id);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                category === cat.id
                  ? 'bg-[#1E1F25] text-white shadow-xs'
                  : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#1E1F25]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Kenkoooo Matrix Table */}
      {loading ? (
        <div className="py-24 flex justify-center">
          <LoadingSpinner text="Loading Codeforces problemset and contests..." />
        </div>
      ) : error ? (
        <div className="py-20 text-center text-red-500 font-medium">{error}</div>
      ) : matrixContests.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-[#E5E7EB]">
          <p className="text-sm text-[#6B7280]">No contests matched the selected filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              {/* Table Header */}
              <thead>
                <tr className="bg-[#1E1F25] text-white">
                  <th className="p-3 font-bold border-r border-[#2D2E36] min-w-[200px] max-w-[260px]">
                    Contest
                  </th>
                  {COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="p-3 font-bold text-center border-r border-[#2D2E36] min-w-[130px]"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Rows */}
              <tbody>
                {paginatedContests.map((contest) => (
                  <tr
                    key={contest.id}
                    className={`border-b border-[#E5E7EB] hover:bg-[#F8F9FB] transition-colors ${
                      contest.isCompleted ? 'bg-green-50/30' : ''
                    }`}
                  >
                    {/* Contest Column */}
                    <td className="p-3 border-r border-[#E5E7EB] align-top bg-white">
                      <div className="flex flex-col gap-1">
                        <a
                          href={`https://codeforces.com/contest/${contest.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-[#1E1F25] hover:text-[#6C5CE7] hover:underline transition-colors leading-tight line-clamp-2"
                          title={contest.name}
                        >
                          {contest.name}
                        </a>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] text-[#6C5CE7] font-semibold">
                            CF {contest.id}
                          </span>
                          <span className="text-[10px] text-[#6B7280]">
                            {contest.solvedProblems}/{contest.totalProblems} solved
                          </span>
                          {contest.isCompleted && (
                            <span className="inline-flex items-center text-[10px] text-[#00B894] font-bold">
                              <CheckCircle2 size={12} className="mr-0.5" /> Done
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Problem Columns (A, B, C, D, E, F, G, H+) */}
                    {COLUMNS.map((col) => {
                      const cellProblems = contest.columns[col] || [];
                      if (cellProblems.length === 0) {
                        return (
                          <td
                            key={col}
                            className="p-2 border-r border-[#E5E7EB] text-center text-gray-300 align-middle bg-[#FAFBFC]"
                          >
                            -
                          </td>
                        );
                      }

                      const allSolved =
                        cellProblems.length > 0 &&
                        cellProblems.every((p) => solvedSet.has(`${p.contestId}-${p.index}`));

                      return (
                        <td
                          key={col}
                          className={`p-1.5 border-r border-[#E5E7EB] align-top transition-colors ${
                            allSolved ? 'bg-[#00B894]/10' : 'bg-white'
                          }`}
                        >
                          {/* Stack multiple problems (A1, A2, A3) vertically in the same cell */}
                          <div className="flex flex-col gap-1.5 h-full justify-start">
                            {cellProblems.map((p) => {
                              const isSolved = solvedSet.has(`${p.contestId}-${p.index}`);
                              const colorStyle = getCfRatingStyle(p.rating);

                              return (
                                <div
                                  key={p.index}
                                  className={`p-1.5 rounded border transition-all ${
                                    isSolved
                                      ? 'bg-[#00B894]/15 border-[#00B894]/50'
                                      : 'bg-white border-[#E5E7EB] hover:border-gray-400 hover:shadow-xs'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <div className="flex items-start gap-1 min-w-0">
                                      {/* Status dot / check circle */}
                                      {isSolved ? (
                                        <CheckCircle2
                                          size={13}
                                          className="text-[#00B894] fill-[#00B894]/20 shrink-0 mt-0.5"
                                        />
                                      ) : (
                                        <span
                                          className="w-2.5 h-2.5 rounded-full border shrink-0 mt-0.5 inline-block"
                                          style={{
                                            borderColor: colorStyle.text,
                                            backgroundColor: `${colorStyle.text}25`,
                                          }}
                                          title={`Difficulty: ${colorStyle.label}`}
                                        />
                                      )}

                                      {/* Problem Title Link with Codeforces rating color */}
                                      <a
                                        href={`https://codeforces.com/contest/${p.contestId}/problem/${p.index}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-semibold truncate hover:underline"
                                        style={{ color: isSolved ? '#00A381' : colorStyle.text }}
                                        title={`${p.index}. ${p.name}${
                                          p.rating ? ` (${p.rating} - ${colorStyle.label})` : ''
                                        }`}
                                      >
                                        <span className="font-bold">{p.index}.</span> {p.name}
                                      </a>
                                    </div>

                                    {/* Rating badge */}
                                    {showDifficulty && p.rating && (
                                      <span
                                        className="text-[10px] font-mono font-bold shrink-0 px-1 py-0.2 rounded"
                                        style={{
                                          color: colorStyle.text,
                                          backgroundColor: `${colorStyle.text}12`,
                                        }}
                                        title={`Codeforces Rating: ${p.rating} (${colorStyle.label})`}
                                      >
                                        {p.rating}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-xs text-[#6B7280]">
                Showing {(page - 1) * limit + 1} -{' '}
                {Math.min(page * limit, matrixContests.length)} of {matrixContests.length}{' '}
                contests
              </span>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
