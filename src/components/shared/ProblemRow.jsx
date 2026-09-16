import React from 'react';
import {
  Star,
  ExternalLink,
  BookmarkPlus,
  ChevronUp,
  ChevronDown,
  Trash2,
  CheckSquare,
  Square,
  ShieldCheck,
  Check,
} from 'lucide-react';
import StatusBadge from './StatusBadge';

/**
 * Standardized ProblemRow component.
 * Normalizes table row heights to h-16 min-h-[4rem] bounds,
 * ensures consistent cell padding, flex alignment, and unifies
 * problemset, ladder detail, and modal problem listings.
 */
export default function ProblemRow({
  question = {},
  mode = 'problemset', // 'problemset' | 'ladder' | 'modal' | 'compact'
  index,
  isSolved = false,
  isVerified = null,
  isStarred = false,
  isPractised = false,
  isPracticeMode = false,
  isSelected = false,
  isAlreadyInLadder = false,
  showTags = true,
  showRatings = true,
  canReorder = false,
  canDelete = false,
  isFirst = false,
  isLast = false,
  onStar,
  onSelect,
  onSelectTag,
  onAddToLadder,
  onBlindSolve,
  onReorder,
  onDelete,
  className = '',
  rowHeight = 'h-16 min-h-[4rem]',
}) {
  const qId = question._id || question.questionId || question.id;
  const externalId = question.externalId || question.metadata?.index || '';
  const tagsList = Array.isArray(question.tags) ? question.tags : [];
  const uniqueTags = Array.from(new Set(tagsList));
  const effectiveVerified = isVerified !== null ? Boolean(isVerified) : Boolean(question.state?.verified);

  // Determine row background depending on mode and state
  const getRowBgClass = () => {
    if (mode === 'ladder') {
      if (!isPracticeMode && isSolved) {
        return 'bg-[#2cbb5d]/15 hover:bg-[#2cbb5d]/25 border-b border-[#2cbb5d]/30 text-[#eff2f6] transition-colors group';
      }
      return 'hover:bg-[#333333]/70 transition-colors group border-b border-[#383838] text-[#eff2f6]';
    }
    if (mode === 'modal') {
      if (isAlreadyInLadder) return 'bg-[#1e1e1e]/60 opacity-50 cursor-not-allowed border-b border-[#383838] text-[#eff2f6]';
      if (isSelected) return 'bg-[#6C5CE7]/15 hover:bg-[#6C5CE7]/20 cursor-pointer border-b border-[#383838] text-[#eff2f6]';
      return 'hover:bg-[#333333] cursor-pointer border-b border-[#383838] text-[#eff2f6]';
    }
    // Default / problemset mode (dark theme)
    if (isSolved) {
      return 'bg-[#2cbb5d]/15 hover:bg-[#2cbb5d]/25 border-b border-[#2cbb5d]/30 text-[#eff2f6] transition-colors group';
    }
    return 'bg-[#282828] hover:bg-[#333333] border-b border-[#383838] text-[#eff2f6] transition-colors group';
  };

  // Render Difficulty or Rating badge
  const renderDifficultyOrRating = () => {
    if (!showRatings) return null;
    const rating = question.rating ?? question.metadata?.rating;
    if (question.platform === 'CODEFORCES') {
      if (rating) {
        return <StatusBadge type="rating" platform="CODEFORCES" rating={rating} />;
      }
      return <span className="text-xs text-[#8b949e] font-mono px-2 py-0.5 rounded bg-[#30363d]/30 border border-[#30363d]">N/A</span>;
    }
    if (question.platform === 'CODECHEF') {
      if (rating) {
        return <StatusBadge type="rating" platform="CODECHEF" rating={rating} />;
      }
      return <span className="text-xs text-[#8b949e] font-mono px-2 py-0.5 rounded bg-[#30363d]/30 border border-[#30363d]">N/A</span>;
    }
    if (question.difficulty && question.difficulty !== 'N/A') {
      return <StatusBadge type="difficulty" difficulty={question.difficulty} />;
    }
    if (rating) {
      return <StatusBadge type="rating" platform={question.platform} rating={rating} />;
    }
    return <span className="text-xs text-[#8b949e] font-mono px-2 py-0.5 rounded bg-[#30363d]/30 border border-[#30363d]">N/A</span>;
  };

  // ── MODAL MODE ──
  if (mode === 'modal') {
    return (
      <tr
        key={qId}
        onClick={() => !isAlreadyInLadder && onSelect?.(qId)}
        className={`${rowHeight} ${getRowBgClass()} ${className} align-middle`}
      >
        {/* Checkbox / In-ladder */}
        <td className="px-4 py-3 w-12 text-center align-middle" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center h-full">
            {isAlreadyInLadder ? (
              <StatusBadge type="status" status="in-ladder" />
            ) : (
              <button
                type="button"
                onClick={() => onSelect?.(qId)}
                className="inline-flex items-center justify-center text-[#6C5CE7] hover:scale-110 transition-transform cursor-pointer"
              >
                {isSelected ? (
                  <CheckSquare size={18} className="text-[#6C5CE7] fill-[#6C5CE7]/10" />
                ) : (
                  <Square size={18} className="text-gray-400" />
                )}
              </button>
            )}
          </div>
        </td>

        {/* Title */}
        <td className="px-4 py-3 align-middle font-medium text-[#eff2f6]">
          <div className="flex items-center gap-2 max-w-md">
            <span className="truncate">{question.title}</span>
            {question.url && (
              <a
                href={question.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Open problem link"
                className="text-[#8b949e] hover:text-[#ffa116] transition-colors inline-flex shrink-0"
              >
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </td>

        {/* Platform */}
        <td className="px-4 py-3 align-middle whitespace-nowrap w-28">
          <StatusBadge type="platform" platform={question.platform} />
        </td>

        {/* Rating / Difficulty */}
        <td className="px-4 py-3 align-middle whitespace-nowrap w-32">
          {renderDifficultyOrRating()}
        </td>

        {/* Status */}
        <td className="px-4 py-3 align-middle text-center whitespace-nowrap w-28">
          <div className="flex items-center justify-center h-full">
            {isAlreadyInLadder ? (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/60">
                In Ladder
              </span>
            ) : isSelected ? (
              <span className="text-xs font-semibold text-[#6C5CE7] bg-[#6C5CE7]/10 px-2 py-0.5 rounded-full border border-[#6C5CE7]/30">
                Selected
              </span>
            ) : (
              <span className="text-xs text-gray-500">—</span>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // ── LADDER DETAIL MODE ──
  if (mode === 'ladder') {
    return (
      <tr
        key={qId || index}
        className={`${rowHeight} ${getRowBgClass()} ${className} align-middle`}
      >
        {/* Order Index */}
        <td className="px-4 py-3 w-12 text-center font-mono text-[#8b949e] font-medium align-middle">
          {question.order || (typeof index === 'number' ? index + 1 : '—')}
        </td>

        {/* Problem Title & Tags */}
        <td className="px-4 py-3 align-middle">
          <div className="flex flex-col justify-center gap-1 max-w-lg">
            <div className="flex items-center gap-1.5 flex-wrap">
              <a
                href={question.url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-sm text-[#eff2f6] hover:text-[#ffa116] hover:underline flex items-center gap-1.5 group-hover:text-[#ffa116] transition-colors truncate"
              >
                <span className="truncate">{question.title}</span>
                <ExternalLink size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </a>
              {isSolved && !isPracticeMode && (
                effectiveVerified ? (
                  <span
                    title="Verified solve"
                    className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#2cbb5d] bg-[#2cbb5d]/15 border border-[#2cbb5d]/30 px-1.5 py-0.5 rounded shrink-0"
                  >
                    <ShieldCheck size={11} className="text-[#2cbb5d]" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span
                    title="Solved (Unverified)"
                    className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-400/80 bg-emerald-400/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0"
                  >
                    <Check size={11} className="text-emerald-400" />
                    <span>Solved</span>
                  </span>
                )
              )}
            </div>

            {showTags && tagsList.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                {tagsList.slice(0, 4).map((t, tIdx) => (
                  <span
                    key={tIdx}
                    onClick={() => onSelectTag?.(t)}
                    className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-[#1e1e1e] text-[#8b949e] font-mono border border-[#383838] hover:border-[#ffa116]/50 hover:text-[#ffa116] transition-all cursor-pointer"
                  >
                    #{t}
                  </span>
                ))}
                {tagsList.length > 4 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1e1e1e] text-gray-400 font-mono border border-[#383838]">
                    +{tagsList.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>
        </td>

        {/* Platform */}
        <td className="px-4 py-3 align-middle whitespace-nowrap w-28">
          <StatusBadge type="platform" platform={question.platform} />
        </td>

        {/* Rating / Difficulty */}
        <td className="px-4 py-3 align-middle whitespace-nowrap w-36">
          {renderDifficultyOrRating()}
        </td>

        {/* Status (Practice Mode vs Solved / Starred) */}
        <td className="px-4 py-3 align-middle text-center whitespace-nowrap w-40">
          <div className="flex items-center justify-center h-full">
            {isPracticeMode ? (
              <StatusBadge
                type="status"
                status={isPractised ? 'practised' : 'blind-unsolved'}
                interactive={true}
                onClick={() => onBlindSolve?.(qId, isPractised)}
              />
            ) : (
              <div className="flex items-center justify-center">
                {onStar && (
                  <button
                    type="button"
                    title={isStarred ? 'Unstar' : 'Star'}
                    onClick={() => onStar?.(qId, isStarred)}
                    className="hover:scale-110 transition-transform cursor-pointer p-0.5"
                  >
                    <Star
                      className={isStarred ? 'text-amber-400 fill-amber-400' : 'text-[#8b949e] hover:text-amber-400'}
                      size={18}
                    />
                  </button>
                )}
              </div>
            )}
          </div>
        </td>

        {/* Actions (Reorder / Delete) */}
        <td className="px-4 py-3 align-middle text-right whitespace-nowrap w-28">
          <div className="flex items-center justify-end gap-1 h-full">
            {canReorder && (
              <>
                <button
                  type="button"
                  title="Move up"
                  disabled={isFirst}
                  onClick={() => onReorder?.(index, 'up')}
                  className="p-1 rounded hover:bg-[#383838] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  type="button"
                  title="Move down"
                  disabled={isLast}
                  onClick={() => onReorder?.(index, 'down')}
                  className="p-1 rounded hover:bg-[#383838] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <ChevronDown size={15} />
                </button>
              </>
            )}
            {canDelete && (
              <button
                type="button"
                title="Remove problem from ladder"
                onClick={() => onDelete?.(qId)}
                className="p-1 rounded hover:bg-red-950/40 text-gray-400 hover:text-red-400 cursor-pointer transition-colors"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // ── DEFAULT / PROBLEMSET MODE ──
  return (
    <tr
      className={`${rowHeight} ${getRowBgClass()} ${className} align-middle`}
    >
      {/* 1. Star / Bookmark */}
      <td className="px-3 py-3 w-12 text-center align-middle whitespace-nowrap">
        <div className="flex items-center justify-center h-full">
          <button
            type="button"
            onClick={() => onStar?.(qId, isStarred)}
            className="focus:outline-hidden transition-transform active:scale-95 inline-flex items-center justify-center p-1 rounded hover:bg-white/5 cursor-pointer"
            title={isStarred ? 'Remove star' : 'Star problem'}
          >
            <Star
              className={
                isStarred
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-500 hover:text-amber-400'
              }
              size={18}
            />
          </button>
        </div>
      </td>

      {/* 2. Problem Title */}
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-2 max-w-md">
          {externalId && (
            <span className="font-mono text-xs font-semibold text-[#8b949e] bg-[#1a1a1a] border border-[#383838] px-1.5 py-0.5 rounded shrink-0">
              #{externalId}
            </span>
          )}
          <a
            href={question.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm text-[#eff2f6] hover:text-[#ffa116] hover:underline transition-colors flex items-center gap-1.5 group-hover:text-[#ffa116] truncate"
            title={question.title}
          >
            <span className="truncate">{question.title}</span>
            <ExternalLink size={13} className="shrink-0 opacity-0 group-hover:opacity-100 text-[#ffa116] transition-opacity" />
          </a>
          {isSolved && (
            effectiveVerified ? (
              <span
                title="Verified solve"
                className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#2cbb5d] bg-[#2cbb5d]/15 border border-[#2cbb5d]/30 px-1.5 py-0.5 rounded shrink-0"
              >
                <ShieldCheck size={11} className="text-[#2cbb5d]" />
                <span>Verified</span>
              </span>
            ) : (
              <span
                title="Solved (Unverified)"
                className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-400/80 bg-emerald-400/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0"
              >
                <Check size={11} className="text-emerald-400" />
                <span>Solved</span>
              </span>
            )
          )}
        </div>
      </td>

      {/* 3. Platform */}
      <td className="px-4 py-3 align-middle whitespace-nowrap w-32">
        <StatusBadge type="platform" platform={question.platform} />
      </td>

      {/* 4. Difficulty / Rating */}
      <td className="px-4 py-3 align-middle whitespace-nowrap w-32">
        {renderDifficultyOrRating()}
      </td>

      {/* 5. Tags */}
      <td className="px-4 py-3 align-middle">
        {uniqueTags.length > 0 ? (
          <div
            className="flex flex-wrap items-center gap-1.5 max-w-xs"
            title={uniqueTags.length > 3 ? `All tags: ${uniqueTags.join(', ')}` : undefined}
          >
            {uniqueTags.slice(0, 3).map((tag, idx) => (
              <button
                type="button"
                key={`${tag}-${idx}`}
                onClick={() => onSelectTag?.(tag)}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1a1a1a] text-[#8b949e] hover:bg-[#ffa116]/10 hover:text-[#ffa116] hover:border-[#ffa116]/50 border border-[#383838] transition-all duration-150 cursor-pointer"
                title={`Filter by tag "${tag}"`}
              >
                {tag}
              </button>
            ))}
            {uniqueTags.length > 3 && (
              <div className="relative group/tag inline-flex items-center">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#1a1a1a] text-[#8b949e] hover:bg-[#ffa116]/10 hover:text-[#ffa116] hover:border-[#ffa116]/50 border border-[#383838] cursor-pointer transition-all duration-150"
                  title={uniqueTags.join(', ')}
                >
                  +{uniqueTags.length - 3}
                </span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tag:flex flex-col gap-1.5 w-64 p-2.5 bg-[#282828] text-[#eff2f6] rounded-xl shadow-2xl border border-[#383838] z-50 pointer-events-auto">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#8b949e] border-b border-[#383838] pb-1">
                    <span>All Tags</span>
                    <span className="text-[10px] text-[#6e7681] font-mono">{uniqueTags.length} tags</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
                    {uniqueTags.map((t, i) => (
                      <button
                        type="button"
                        key={`tooltip-${t}-${i}`}
                        onClick={() => onSelectTag?.(t)}
                        className="px-2.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#8b949e] text-[11px] font-medium border border-[#383838] hover:border-[#ffa116]/50 hover:text-[#ffa116] hover:bg-[#ffa116]/10 cursor-pointer transition-all duration-150"
                        title={`Filter by tag "${t}"`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#282828]" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-500 italic">No tags</span>
        )}
      </td>

      {/* 6. Actions */}
      <td className="px-4 py-3 align-middle whitespace-nowrap text-right w-44">
        <div className="flex items-center justify-end gap-2 h-full">
          {onAddToLadder && (
            <button
              type="button"
              onClick={() => onAddToLadder(question)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[#ffa116] bg-[#1a1a1a] hover:bg-[#333333] border border-[#383838] transition-colors cursor-pointer"
              title="Add to ladder"
            >
              <BookmarkPlus size={14} />
              <span className="hidden sm:inline">Add to Ladder</span>
            </button>
          )}

          <a
            href={question.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-[#8b949e] hover:text-[#ffa116] transition-colors"
            title="Open problem in new tab"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </td>
    </tr>
  );
}
