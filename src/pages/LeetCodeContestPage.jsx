import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/layout/PageHeader';
import Input from '../components/ui/Input';
import Pagination from '../components/ui/Pagination';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  Search,
  ExternalLink,
  CheckCircle2,
  Check,
  Trophy,
  Filter,
} from 'lucide-react';
import { useLeetCodeData } from '../hooks/useContestData';
import api from '../lib/api';

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

export default function LeetCodeContestPage() {
  const { contests, loading, error } = useLeetCodeData();
  const [handle, setHandle] = useState('');
  const [solvedSet, setSolvedSet] = useState(new Set());

  // Filter controls
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showPoints, setShowPoints] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 25;

  // Load saved handle
  useEffect(() => {
    const savedHandle = localStorage.getItem('lc_handle');
    if (savedHandle) {
      setHandle(savedHandle);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        const lcAcc = res.data?.user?.platformAccounts?.find((a) => a.platform === 'leetcode');
        if (lcAcc?.handle) {
          setHandle(lcAcc.handle);
          localStorage.setItem('lc_handle', lcAcc.handle);
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

  // Toggle solve state
  const toggleSolved = (slug) => {
    if (!slug) return;
    setSolvedSet((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      localStorage.setItem('lc_solved_problems', JSON.stringify([...next]));
      return next;
    });
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
          const pName = formatProblemTitle(p.link || p.url || '');
          const pSlug = getProblemSlug(p.link || p.url || '');
          return pName.toLowerCase().includes(q) || pSlug.toLowerCase().includes(q);
        });
        if (!matchesName && !matchesProblem) return;
      }

      // Build column mappings
      const columns = { Q1: null, Q2: null, Q3: null, Q4: null };
      let solvedCount = 0;

      problemsList.forEach((p, pIdx) => {
        const pUrl = p.link || p.url || '';
        const slug = getProblemSlug(pUrl);
        const title = formatProblemTitle(pUrl);
        const colKey = COLUMNS[pIdx] || `Q${pIdx + 1}`;
        const isSolved = solvedSet.has(slug);

        if (isSolved) solvedCount++;

        const probObj = {
          ...p,
          url: pUrl,
          slug,
          title,
          isSolved,
          points: p.points || '',
        };

        if (columns[colKey] !== undefined) {
          columns[colKey] = probObj;
        }
      });

      const totalProblems = problemsList.length || 4;
      const isCompleted = totalProblems > 0 && solvedCount === totalProblems;

      if (hideCompleted && isCompleted) return;

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
  }, [contests, category, search, hideCompleted, solvedSet]);

  const totalPages = Math.ceil(matrixRows.length / limit);
  const paginatedRows = useMemo(() => {
    return matrixRows.slice((page - 1) * limit, page * limit);
  }, [matrixRows, page, limit]);

  return (
    <div className="w-full max-w-[1550px] mx-auto space-y-6">
      <PageHeader
        title="LeetCode Contest Upsolver"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'LeetCode Upsolver' }]}
      />

      {/* Top Controls Card */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5 space-y-4">
        {/* Handle and Stats */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full max-w-md">
            <Input
              label="LeetCode Handle"
              placeholder="e.g. your_leetcode_username"
              value={handle}
              onChange={(e) => handleHandleChange(e.target.value)}
            />
          </div>

          {handle && (
            <div className="text-xs font-semibold text-[#6C5CE7] bg-[#6C5CE7]/10 px-3 py-2 rounded-lg">
              Tracking: @{handle}
            </div>
          )}

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
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search contest (e.g. 456, Weekly) or problem..."
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
                checked={showPoints}
                onChange={(e) => setShowPoints(e.target.checked)}
                className="w-4 h-4 rounded text-[#6C5CE7] focus:ring-[#6C5CE7] border-gray-300"
              />
              <span className="text-xs font-medium text-[#1E1F25]">Show Points</span>
            </label>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E7EB]">
          <span className="text-xs font-semibold text-[#6B7280] mr-2 flex items-center gap-1">
            <Filter size={13} /> Contests:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategory(cat.id);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                category === cat.id
                  ? 'bg-[#1E1F25] text-white shadow-xs'
                  : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]'
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
          <LoadingSpinner text="Loading LeetCode contests dataset..." />
        </div>
      ) : error ? (
        <div className="py-20 text-center text-red-500 font-medium">{error}</div>
      ) : matrixRows.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-[#E5E7EB]">
          <p className="text-sm text-[#6B7280]">No LeetCode contests matched your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              {/* Table Header */}
              <thead>
                <tr className="bg-[#1E1F25] text-white">
                  <th className="p-3 font-bold border-r border-[#2D2E36] min-w-[220px] max-w-[260px]">
                    Contest
                  </th>
                  {COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="p-3 font-bold text-center border-r border-[#2D2E36] min-w-[170px]"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Rows with Simple Partition */}
              <tbody>
                {paginatedRows.map((contest) => (
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
                          href={contest.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-[#1E1F25] hover:text-[#6C5CE7] hover:underline transition-colors text-sm leading-tight line-clamp-2"
                          title={contest.title}
                        >
                          {contest.title}
                        </a>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              contest.type === 'weekly'
                                ? 'bg-[#3B82F6]/10 text-[#3B82F6]'
                                : 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                            }`}
                          >
                            {contest.type === 'weekly' ? 'Weekly' : 'Biweekly'}
                          </span>
                          <span className="text-[10px] text-[#6B7280]">
                            {contest.solvedCount}/{contest.totalProblems} solved
                          </span>
                          {contest.isCompleted && (
                            <span className="inline-flex items-center text-[10px] text-[#00B894] font-bold">
                              <CheckCircle2 size={12} className="mr-0.5" /> Done
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Problem Columns (Q1, Q2, Q3, Q4) */}
                    {COLUMNS.map((col) => {
                      const prob = contest.columns[col];
                      if (!prob) {
                        return (
                          <td
                            key={col}
                            className="p-2 border-r border-[#E5E7EB] text-center text-gray-300 align-middle bg-[#FAFBFC]"
                          >
                            -
                          </td>
                        );
                      }

                      const isSolved = prob.isSolved;

                      return (
                        <td
                          key={col}
                          className={`p-2 border-r border-[#E5E7EB] align-top transition-colors ${
                            isSolved ? 'bg-[#00B894]/10' : 'bg-white'
                          }`}
                        >
                          <div
                            className={`p-2.5 rounded-lg border transition-all h-full flex flex-col justify-between ${
                              isSolved
                                ? 'bg-[#00B894]/15 border-[#00B894]/50 shadow-xs'
                                : 'bg-white border-[#E5E7EB] hover:border-gray-400 hover:shadow-xs'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-start gap-2 min-w-0 flex-1">
                                {/* Solved Toggle Button */}
                                <button
                                  type="button"
                                  onClick={() => toggleSolved(prob.slug)}
                                  className="shrink-0 mt-0.5"
                                  title={isSolved ? 'Mark as Unsolved' : 'Mark as Solved'}
                                >
                                  {isSolved ? (
                                    <CheckCircle2
                                      size={15}
                                      className="text-[#00B894] fill-[#00B894]/20"
                                    />
                                  ) : (
                                    <span className="w-3.5 h-3.5 rounded-full border border-gray-300 hover:border-[#6C5CE7] bg-gray-50 transition-colors block" />
                                  )}
                                </button>

                                {/* Problem Link */}
                                <a
                                  href={prob.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`font-semibold hover:underline leading-snug line-clamp-2 text-xs ${
                                    isSolved ? 'text-[#00B894] font-bold line-through' : 'text-[#1E1F25]'
                                  }`}
                                  title={prob.title}
                                >
                                  {prob.title}
                                </a>
                              </div>

                              <a
                                href={prob.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-gray-400 hover:text-gray-600 shrink-0 p-0.5 mt-0.5"
                                title="Open on LeetCode"
                              >
                                <ExternalLink size={12} />
                              </a>
                            </div>

                            {/* Points Row (Only shows real points, no guessed difficulty tags) */}
                            {showPoints && prob.points && (
                              <div className="flex items-center justify-end mt-2 pt-1.5 border-t border-gray-100 text-[10px]">
                                <span className="font-mono font-medium text-[#4B5563] bg-[#F3F4F6] px-1.5 py-0.5 rounded border border-[#E5E7EB]">
                                  {prob.points} pts
                                </span>
                              </div>
                            )}
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
