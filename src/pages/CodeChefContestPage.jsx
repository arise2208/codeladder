import React, { useState, useMemo, useEffect } from 'react';
import PageHeader from '../components/layout/PageHeader';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Pagination from '../components/ui/Pagination';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ExternalLink, Search, CheckCircle2 } from 'lucide-react';
import { useCodeChefData } from '../hooks/useContestData';
import api from '../lib/api';

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

// Difficulty estimation using submissions count and accuracy
export function getCodeChefProblemStyle(problem, divisionStr = '') {
  const subs = Number(problem?.submissions) || 0;
  const acc = Number(problem?.accuracy) || 0;

  // Very high solves or Div 4 early problems
  if (subs >= 600 || (subs >= 200 && acc >= 50) || (divisionStr.includes('Division 4') && subs >= 300)) {
    return { text: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', label: '1★ Easy' };
  }
  if (subs >= 300 || (divisionStr.includes('Division 4') && subs >= 100)) {
    return { text: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC', label: '2★ Medium-Easy' };
  }
  if (subs >= 150 || divisionStr.includes('Division 3')) {
    return { text: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', label: '3★ Medium' };
  }
  if (subs >= 60 || divisionStr.includes('Division 2')) {
    return { text: '#8B5CF6', bg: '#FAF5FF', border: '#E9D5FF', label: '4★ Hard' };
  }
  if (subs >= 20) {
    return { text: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', label: '5★ Very Hard' };
  }
  if (subs >= 5) {
    return { text: '#F97316', bg: '#FFF7ED', border: '#FED7AA', label: '6★ Master' };
  }
  return { text: '#EF4444', bg: '#FEF2F2', border: '#FECACA', label: '7★ Grandmaster' };
}

export default function CodeChefContestPage() {
  const { contests, loading, error } = useCodeChefData();
  const [handle, setHandle] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [mergeDivisions, setMergeDivisions] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Track locally checked/solved problems
  const [solvedCodes, setSolvedCodes] = useState(new Set());

  // Load connected CodeChef handle if exists
  useEffect(() => {
    api
      .get('/platform-accounts')
      .then(({ data }) => {
        const cc = (data.accounts || []).find((a) => a.platform === 'CODECHEF');
        if (cc?.handle) setHandle(cc.handle);
      })
      .catch(() => {});
  }, []);

  const toggleSolved = (code) => {
    setSolvedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  // Prepare table data
  const matrixRows = useMemo(() => {
    if (!contests || !contests.length) return [];

    let filtered = contests.filter((c) => {
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
          const colIndex = Math.min(idx, PROBLEM_COLUMNS.length - 1);
          const colName = PROBLEM_COLUMNS[colIndex];
          // Avoid duplicate problems in same cell if already added from another division
          if (!roundObj.problemsByCol[colName].some((existing) => existing.code === p.code)) {
            roundObj.problemsByCol[colName].push({ ...p, division: c.division });
          }
        });
      });

      return Array.from(roundMap.values()).map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: Array.from(r.subtitles).join(' · '),
        columns: r.problemsByCol,
        totalProblems: Object.values(r.problemsByCol).reduce((sum, list) => sum + list.length, 0),
      }));
    }

    // Standard unmerged: each contest division is its own row
    return filtered.map((c) => {
      const colMap = {};
      PROBLEM_COLUMNS.forEach((col) => {
        colMap[col] = [];
      });

      (c.problems || []).forEach((p, idx) => {
        const colIndex = Math.min(idx, PROBLEM_COLUMNS.length - 1);
        const colName = PROBLEM_COLUMNS[colIndex];
        colMap[colName].push({ ...p, division: c.division });
      });

      const contestCode = c.contest || c.code || 'Contest';
      const rootRound = contestCode.replace(/[A-D]$/i, '');
      return {
        id: contestCode,
        title: contestCode,
        rootRound,
        subtitle: c.division?.replace('Scorable Problems for ', '') || '',
        columns: colMap,
        totalProblems: c.problems?.length || 0,
      };
    });
  }, [contests, search, category, mergeDivisions]);

  const totalPages = Math.ceil(matrixRows.length / limit);
  const paginatedRows = useMemo(() => {
    return matrixRows.slice((page - 1) * limit, page * limit);
  }, [matrixRows, page, limit]);

  return (
    <div className="w-full max-w-[1550px] mx-auto space-y-6">
      <PageHeader
        title="CodeChef Contest Upsolver"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'CodeChef Upsolver' }]}
      />

      {/* Top Controls Card */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full max-w-md">
            <Input
              label="CodeChef Handle"
              placeholder="e.g. your_codechef_username"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>
          {handle && (
            <div className="text-xs font-semibold text-[#6C5CE7] bg-[#6C5CE7]/10 px-3 py-2 rounded-lg">
              Tracking: @{handle}
            </div>
          )}
          {solvedCodes.size > 0 && (
            <div className="text-xs font-semibold text-[#00B894] bg-[#00B894]/10 px-3 py-2 rounded-lg flex items-center gap-1">
              <CheckCircle2 size={14} />
              <span>{solvedCodes.size} solved</span>
            </div>
          )}
        </div>

        {/* Search, Toggles, and Category Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#E5E7EB]">
          {/* Search */}
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search contest, division, or problem..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showMetrics}
                onChange={(e) => setShowMetrics(e.target.checked)}
                className="w-4 h-4 rounded text-[#6C5CE7] focus:ring-[#6C5CE7] border-gray-300"
              />
              <span className="text-xs font-medium text-[#1E1F25]">Show Accuracy & Solves</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mergeDivisions}
                onChange={(e) => {
                  setMergeDivisions(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded text-[#6C5CE7] focus:ring-[#6C5CE7] border-gray-300"
              />
              <span className="text-xs font-medium text-[#1E1F25]">Merge Divisions into Single Round</span>
            </label>
          </div>
        </div>

        {/* Category Pills */}
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
          <LoadingSpinner text="Loading CodeChef contests dataset..." />
        </div>
      ) : error ? (
        <div className="py-20 text-center text-red-500 font-medium">{error}</div>
      ) : matrixRows.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-[#E5E7EB]">
          <p className="text-sm text-[#6B7280]">No CodeChef contests matched your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              {/* Table Header */}
              <thead>
                <tr className="bg-[#1E1F25] text-white">
                  <th className="p-3 font-bold border-r border-[#2D2E36] min-w-[200px] max-w-[240px]">
                    Contest
                  </th>
                  {PROBLEM_COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="p-3 font-bold text-center border-r border-[#2D2E36] min-w-[135px]"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Rows */}
              <tbody>
                {paginatedRows.map((contest, rowIndex) => {
                  const nextContest = paginatedRows[rowIndex + 1];
                  const isLastOfRound = !nextContest || (contest.rootRound && nextContest.rootRound !== contest.rootRound);
                  const boundaryClass = isLastOfRound ? 'contest-round-boundary' : 'contest-sub-row';

                  return (
                    <tr key={contest.id} className={`hover:bg-[#F8F9FB] transition-colors ${boundaryClass}`}>
                      {/* Contest Info Column */}
                      <td className="p-3 border-r border-[#E5E7EB] align-top bg-white">
                        <div className="flex flex-col gap-1">
                          <a
                            href={`https://www.codechef.com/${contest.title}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-[#1E1F25] hover:text-[#6C5CE7] hover:underline transition-colors text-sm"
                            title={contest.title}
                          >
                            {contest.title}
                          </a>
                          {contest.subtitle && (
                            <span className="text-[11px] text-[#6B7280] font-medium leading-tight">
                              {contest.subtitle}
                            </span>
                          )}
                          <span className="text-[10px] text-[#9CA3AF] mt-0.5">
                            {contest.totalProblems} problems
                          </span>
                        </div>
                      </td>

                      {/* Problem Columns (P1 to P8+) */}
                      {PROBLEM_COLUMNS.map((col) => {
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
                          cellProblems.every((p) => solvedCodes.has(p.code));

                        return (
                          <td
                            key={col}
                            className={`p-1.5 border-r border-[#E5E7EB] align-top transition-colors ${
                              allSolved ? 'bg-[#00B894]/10' : 'bg-white'
                            }`}
                          >
                          {/* Stack sub-problems vertically at different heights inside the same cell */}
                          <div className="flex flex-col gap-1.5 h-full justify-start">
                            {cellProblems.map((p) => {
                              const isSolved = solvedCodes.has(p.code);
                              const style = getCodeChefProblemStyle(p, p.division);

                              return (
                                <div
                                  key={p.code}
                                  className={`p-2 rounded border transition-all ${
                                    isSolved
                                      ? 'bg-[#00B894]/15 border-[#00B894]/50'
                                      : 'bg-white border-[#E5E7EB] hover:border-gray-400 hover:shadow-xs'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <div className="flex items-start gap-1 min-w-0">
                                      {/* Solved toggle checkbox/dot */}
                                      <button
                                        type="button"
                                        onClick={() => toggleSolved(p.code)}
                                        className="shrink-0 mt-0.5"
                                        title={isSolved ? 'Mark as Unsolved' : 'Mark as Solved'}
                                      >
                                        {isSolved ? (
                                          <CheckCircle2
                                            size={13}
                                            className="text-[#00B894] fill-[#00B894]/20"
                                          />
                                        ) : (
                                          <span
                                            className="w-2.5 h-2.5 rounded-full border block"
                                            style={{
                                              borderColor: style.text,
                                              backgroundColor: `${style.text}25`,
                                            }}
                                            title={style.label}
                                          />
                                        )}
                                      </button>

                                      {/* Problem Link */}
                                      <a
                                        href={p.url || `https://www.codechef.com/problems/${p.code}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-semibold truncate hover:underline"
                                        style={{ color: isSolved ? '#00A381' : style.text }}
                                        title={`${p.name || p.code} (${style.label})`}
                                      >
                                        {p.name || p.code}
                                      </a>
                                    </div>

                                    {/* Problem code pill */}
                                    <span className="font-mono text-[9px] text-[#6B7280] font-bold shrink-0 bg-gray-100 px-1 py-0.2 rounded">
                                      {p.code}
                                    </span>
                                  </div>

                                  {/* Metrics: Submissions & Accuracy */}
                                  {showMetrics && (p.submissions || p.accuracy) && (
                                    <div className="mt-1 flex items-center justify-between text-[10px] text-[#6B7280] font-medium pt-1 border-t border-gray-100">
                                      <span>{p.submissions || 0} solves</span>
                                      <span>{p.accuracy ? `${p.accuracy}%` : '-'}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-xs text-[#6B7280]">
                Showing {(page - 1) * limit + 1} -{' '}
                {Math.min(page * limit, matrixRows.length)} of {matrixRows.length} contests
              </span>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
