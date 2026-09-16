import React from 'react';
import PageHeader from '../layout/PageHeader';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Pagination from '../ui/Pagination';
import LoadingSpinner from '../ui/LoadingSpinner';
import { RefreshCw, Star, Filter, Bookmark, CheckCircle2 } from 'lucide-react';

/**
 * Standard problem card used across Codeforces, LeetCode, and CodeChef contest upsolvers.
 * - Solved status is indicated by the green boundary, background styling, and solve checkbox/checkmark.
 * - Star button (Star) toggles favorite/starred state globally in the backend.
 * - Bookmark button opens AddToLadderModal to add problem to any ladder.
 */
export function UpsolverProblemCard({
  title,
  url,
  isSolved = false,
  isStarred = false,
  onToggleSolve = null,
  onStar = null,
  onBookmark = null,
  badgeText = null,
  badgeColor = null,
  badgeBg = null,
  badgeTextColor = null,
  badgeTitle = null,
  titleColor = null,
  cardBg = null,
  subText = null,
  className = '',
}) {
  const problemColor = titleColor || badgeColor;

  return (
    <div
      className={`p-2 rounded-lg border transition-all text-xs ${
        isSolved
          ? 'bg-[#092215] border-[#1e7e34]/80 shadow-xs'
          : 'border-[#30363d] hover:border-[#58a6ff]/50 hover:shadow-xs'
      } ${className}`}
      style={!isSolved ? { backgroundColor: cardBg || badgeBg || '#0d1117' } : undefined}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          {/* Solved checkmark indicator */}
          {isSolved && (
            <div className="shrink-0 mt-0.5 select-none" title="Solved problem">
              <CheckCircle2 size={13} className="text-[#3fb950] fill-[#3fb950]/20" />
            </div>
          )}

          {/* Problem Link */}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="font-semibold hover:underline leading-snug line-clamp-2 truncate"
            style={{
              color: problemColor || (isSolved ? '#3fb950' : '#e6edf3'),
            }}
            title={badgeTitle ? `${title} (${badgeTitle})` : title}
          >
            {title}
          </a>
        </div>

        {/* Action icons: Star (favorite) and Bookmark (ladder) */}
        <div className="flex items-center gap-1 shrink-0">
          {onStar && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStar();
              }}
              className="text-[#8b949e] hover:text-amber-400 shrink-0 p-0.5 transition-colors cursor-pointer"
              title={isStarred ? 'Remove star' : 'Star problem'}
            >
              <Star
                size={13}
                className={
                  isStarred
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-[#484f58] hover:text-amber-400'
                }
              />
            </button>
          )}

          {onBookmark && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBookmark();
              }}
              className="text-[#8b949e] hover:text-[#ffa116] shrink-0 p-0.5 transition-colors cursor-pointer"
              title="Add to ladder"
            >
              <Bookmark size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Optional Badge / Footer */}
      {(badgeText || subText) && (
        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-[#30363d]/50 text-[10px]">
          {badgeText ? (
            <span
              className="font-mono font-bold px-1.5 py-0.5 rounded text-[10px]"
              style={{
                color: badgeTextColor || (badgeBg ? '#ffffff' : (badgeColor || '#58a6ff')),
                backgroundColor: badgeBg || (badgeColor ? `${badgeColor}15` : '#58a6ff15'),
              }}
              title={badgeTitle || undefined}
            >
              {badgeText}
            </span>
          ) : (
            <span />
          )}
          {subText && <span className="text-[#8b949e]">{subText}</span>}
        </div>
      )}
    </div>
  );
}

/**
 * Standardized, modular ContestUpsolverView component.
 * Reused across Codeforces, LeetCode, and CodeChef contest upsolver pages.
 * Handles handle syncing, search, category pills, rating range filters,
 * hide completed and merge divisions toggles, and matrix table rendering.
 */
export default function ContestUpsolverView({
  // Page Header
  title,
  breadcrumbs = [],

  // User Profile / Sync Bar
  handle = '',
  onHandleChange,
  onSync,
  isSyncing = false,
  handleLabel = 'Handle',
  handlePlaceholder = 'Enter handle...',
  syncButtonText = 'Sync Solved',
  trackingText = null,
  solvedCount = 0,

  // Search & Filters
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search contest or problem...',

  // Rating Range Filter (Codeforces & CodeChef)
  showRatingFilter = false,
  minRating = '',
  maxRating = '',
  onMinRatingChange,
  onMaxRatingChange,

  // Difficulty Range Filter (LeetCode: Easy, Medium, Hard)
  showDifficultyFilter = false,
  minDifficulty = 'EASY',
  maxDifficulty = 'HARD',
  onMinDifficultyChange,
  onMaxDifficultyChange,
  onPresetSelect,

  // Toggles
  hideCompleted = false,
  onHideCompletedChange,
  metricToggle = null, // { label: string, checked: boolean, onChange: (checked: boolean) => void }
  mergeDivisionsToggle = null, // { checked: boolean, onChange: (checked: boolean) => void }

  // Categories / Divisions
  categories = [],
  selectedCategory = 'ALL',
  onCategoryChange,

  // Table Structure & Data
  columns = [],
  contests = [],
  totalContests = 0,
  loading = false,
  loadingText = 'Loading contests dataset...',
  error = null,
  emptyMessage = 'No contests matched your filters.',

  // Custom Rendering Slots
  renderContestInfo,
  renderProblemCell,
  getRowClassName,

  // Pagination
  page = 1,
  totalPages = 1,
  onPageChange,
}) {
  return (
    <div className="w-full max-w-[1550px] mx-auto space-y-6">
      {/* 1. Header */}
      <PageHeader title={title} breadcrumbs={breadcrumbs} />

      {/* 2. Top Controls & Sync Card */}
      <div className="bg-[#161b22] dark:bg-[#161b22] rounded-xl border border-[#30363d] shadow-sm p-5 space-y-4">
        {/* Handle Sync Row */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex gap-2 w-full max-w-lg items-end">
            <div className="flex-1">
              <Input
                label={handleLabel}
                placeholder={handlePlaceholder}
                value={handle}
                onChange={(e) => onHandleChange?.(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSync?.()}
              />
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={onSync}
              disabled={isSyncing}
              className="h-[42px] px-4 whitespace-nowrap flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Syncing...' : syncButtonText}</span>
            </Button>
          </div>

          {/* Tracking Status Pill */}
          {trackingText && (
            <div className="text-xs font-semibold text-[#58a6ff] bg-[#58a6ff]/10 border border-[#58a6ff]/20 px-3 py-2.5 rounded-lg flex items-center gap-1.5">
              {trackingText}
            </div>
          )}

          {/* Solved Problems Counter */}
          {solvedCount > 0 && (
            <div className="text-xs font-semibold text-[#3fb950] bg-[#238636]/15 border border-[#238636]/30 px-3 py-2.5 rounded-lg flex items-center gap-1.5">
              <span>{solvedCount} solved</span>
            </div>
          )}
        </div>

        {/* Filters and Toggles Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#30363d]">
          {/* Search Input */}
          <div className="w-full sm:w-72">
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>

          {/* Optional Rating Range (Codeforces & CodeChef) */}
          {showRatingFilter && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#8b949e]">Rating:</span>
              <input
                type="number"
                placeholder="Min"
                value={minRating}
                onChange={(e) => onMinRatingChange?.(e.target.value)}
                className="w-20 px-2.5 py-1.5 text-xs rounded-lg border border-[#30363d] bg-[#0d1117] text-[#e6edf3] focus:outline-hidden focus:border-[#58a6ff]"
              />
              <span className="text-[#8b949e]">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxRating}
                onChange={(e) => onMaxRatingChange?.(e.target.value)}
                className="w-20 px-2.5 py-1.5 text-xs rounded-lg border border-[#30363d] bg-[#0d1117] text-[#e6edf3] focus:outline-hidden focus:border-[#58a6ff]"
              />
            </div>
          )}

          {/* Optional Difficulty Range (LeetCode: Easy, Medium, Hard) */}
          {showDifficultyFilter && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-[#8b949e]">Difficulty:</span>
              <div className="flex items-center gap-1.5">
                <select
                  value={minDifficulty}
                  onChange={(e) => onMinDifficultyChange?.(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-[#30363d] bg-[#0d1117] text-[#e6edf3] font-medium focus:outline-hidden focus:border-[#ffa116] cursor-pointer"
                  aria-label="Min Difficulty"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
                <span className="text-xs text-[#8b949e] font-medium">to</span>
                <select
                  value={maxDifficulty}
                  onChange={(e) => onMaxDifficultyChange?.(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-[#30363d] bg-[#0d1117] text-[#e6edf3] font-medium focus:outline-hidden focus:border-[#ffa116] cursor-pointer"
                  aria-label="Max Difficulty"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>

                {/* Quick Presets */}
                <div className="flex items-center gap-1 ml-1 border-l border-[#30363d] pl-2">
                  <button
                    type="button"
                    onClick={() => onPresetSelect?.('ALL')}
                    className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                      minDifficulty === 'EASY' && maxDifficulty === 'HARD'
                        ? 'bg-[#ffa116]/20 text-[#ffa116] font-semibold border border-[#ffa116]/40'
                        : 'text-[#8b949e] hover:text-[#e6edf3] bg-[#21262d] hover:bg-[#30363d]'
                    }`}
                    title="All difficulties (Easy to Hard)"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => onPresetSelect?.('EASY_MEDIUM')}
                    className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                      minDifficulty === 'EASY' && maxDifficulty === 'MEDIUM'
                        ? 'bg-[#ffa116]/20 text-[#ffa116] font-semibold border border-[#ffa116]/40'
                        : 'text-[#8b949e] hover:text-[#e6edf3] bg-[#21262d] hover:bg-[#30363d]'
                    }`}
                    title="Easy to Medium"
                  >
                    Easy–Med
                  </button>
                  <button
                    type="button"
                    onClick={() => onPresetSelect?.('MEDIUM_HARD')}
                    className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                      minDifficulty === 'MEDIUM' && maxDifficulty === 'HARD'
                        ? 'bg-[#ffa116]/20 text-[#ffa116] font-semibold border border-[#ffa116]/40'
                        : 'text-[#8b949e] hover:text-[#e6edf3] bg-[#21262d] hover:bg-[#30363d]'
                    }`}
                    title="Medium to Hard"
                  >
                    Med–Hard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toggles */}
          <div className="flex items-center gap-5 flex-wrap">
            {/* Hide Completed */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideCompleted}
                onChange={(e) => onHideCompletedChange?.(e.target.checked)}
                className="w-4 h-4 rounded text-[#238636] focus:ring-[#238636] border-[#30363d] bg-[#0d1117]"
              />
              <span className="text-xs font-medium text-[#e6edf3]">Hide Completed</span>
            </label>

            {/* Metric Toggle (Difficulty / Points / Accuracy) */}
            {metricToggle && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={metricToggle.checked}
                  onChange={(e) => metricToggle.onChange?.(e.target.checked)}
                  className="w-4 h-4 rounded text-[#238636] focus:ring-[#238636] border-[#30363d] bg-[#0d1117]"
                />
                <span className="text-xs font-medium text-[#e6edf3]">{metricToggle.label}</span>
              </label>
            )}

            {/* Merge Divisions Toggle (CodeChef) */}
            {mergeDivisionsToggle && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mergeDivisionsToggle.checked}
                  onChange={(e) => mergeDivisionsToggle.onChange?.(e.target.checked)}
                  className="w-4 h-4 rounded text-[#ffa116] focus:ring-[#ffa116] border-[#30363d] bg-[#0d1117]"
                />
                <span className="text-xs font-medium text-[#ffa116] font-semibold">Merge Divisions</span>
              </label>
            )}
          </div>
        </div>

        {/* Division / Category Pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#30363d]">
            <span className="text-xs font-semibold text-[#8b949e] mr-2 flex items-center gap-1">
              <Filter size={13} /> Divisions:
            </span>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange?.(cat.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#21262d] text-[#e6edf3] border border-[#58a6ff]/50 shadow-xs font-semibold'
                    : 'bg-[#0d1117] text-[#8b949e] border border-[#30363d] hover:bg-[#21262d] hover:text-[#e6edf3]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Main Matrix Table */}
      {loading ? (
        <div className="py-24 flex justify-center">
          <LoadingSpinner text={loadingText} />
        </div>
      ) : error ? (
        <div className="py-20 text-center text-red-500 font-medium">{error}</div>
      ) : contests.length === 0 ? (
        <div className="bg-[#161b22] p-12 text-center rounded-xl border border-[#30363d]">
          <p className="text-sm text-[#8b949e]">{emptyMessage}</p>
        </div>
      ) : (
        <div className="bg-[#161b22] rounded-xl border border-[#30363d] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              {/* Header */}
              <thead>
                <tr className="bg-[#0d1117] text-[#e6edf3] border-b border-[#30363d]">
                  <th className="p-3 font-bold border-r border-[#30363d] min-w-[200px] max-w-[260px]">
                    Contest
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="p-3 font-bold text-center border-r border-[#30363d] min-w-[135px]"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Rows */}
              <tbody className="divide-y divide-[#30363d]">
                {contests.map((contest, rowIndex) => {
                  const customClass = getRowClassName ? getRowClassName(contest, rowIndex) : '';
                  const rowCompletionClass = contest.isCompleted
                    ? 'bg-[#092215]/60 hover:bg-[#092215]/80'
                    : 'bg-[#161b22] hover:bg-[#21262d]';

                  return (
                    <tr
                      key={contest.id || rowIndex}
                      className={`transition-colors h-16 min-h-[4rem] align-middle ${rowCompletionClass} ${customClass}`}
                    >
                      {/* Left: Contest Info */}
                      <td className="p-3 border-r border-[#30363d] align-top">
                        {renderContestInfo ? renderContestInfo(contest) : contest.name || contest.title}
                      </td>

                      {/* Problem Columns */}
                      {columns.map((col) => {
                        const rawProblems = contest.columns?.[col];
                        const cellProblems = Array.isArray(rawProblems)
                          ? rawProblems
                          : rawProblems
                          ? [rawProblems]
                          : [];
                        if (cellProblems.length === 0) {
                          return (
                            <td
                              key={col}
                              className="p-2 border-r border-[#30363d] text-center text-[#30363d] align-middle bg-[#0d1117]"
                            >
                              -
                            </td>
                          );
                        }

                        return (
                          <td
                            key={col}
                            className="p-1.5 border-r border-[#30363d] align-top"
                          >
                            <div className="flex flex-col gap-1.5 h-full justify-start">
                              {cellProblems.map((problem, pIdx) =>
                                renderProblemCell ? (
                                  renderProblemCell(problem, col, contest, pIdx)
                                ) : null
                              )}
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

          {/* Footer Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[#30363d] bg-[#0d1117] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-[#8b949e]">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalContests} total contests)
              </span>
              <Pagination
                page={page}
                currentPage={page}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
