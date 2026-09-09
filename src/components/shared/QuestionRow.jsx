import React from 'react';
import { CheckCircle2, Circle, Star, ExternalLink, BookmarkPlus } from 'lucide-react';
import { getCfRatingStyle } from '../../lib/ratingStyles';

export default function QuestionRow({
  question,
  isSolved = false,
  isStarred = false,
  onSolve,
  onStar,
  onAddToLadder,
  onSelectTag
}) {
  const getPlatformBadge = (platform) => {
    switch (platform?.toUpperCase()) {
      case 'LEETCODE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            LeetCode
          </span>
        );
      case 'CODEFORCES':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Codeforces
          </span>
        );
      case 'CODECHEF':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200">
            CodeChef
          </span>
        );
      case 'ATCODER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            AtCoder
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
            {platform || 'Other'}
          </span>
        );
    }
  };

  const getDifficultyBadge = (difficulty) => {
    switch (difficulty?.toUpperCase()) {
      case 'EASY':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Easy
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Medium
          </span>
        );
      case 'HARD':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Hard
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
            Unrated
          </span>
        );
    }
  };

  const renderDifficultyOrRating = () => {
    const rating = question.metadata?.rating;
    if (question.platform === 'CODEFORCES' && rating) {
      const style = getCfRatingStyle(rating);
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs"
          style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
          title={`Codeforces Rating: ${rating} (${style.label})`}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: style.dot }} />
          {rating}
        </span>
      );
    }

    if (question.platform === 'CODECHEF' && rating) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200"
          title={`CodeChef Rating: ${rating}`}
        >
          ★ {rating}
        </span>
      );
    }

    return getDifficultyBadge(question.difficulty);
  };

  const externalId = question.externalId || question.metadata?.index || '';

  return (
    <tr className="hover:bg-[#F8F9FB] transition-colors group bg-white border-b border-[#E5E7EB]">
      {/* 1. Status & Star */}
      <td className="px-4 py-3.5 whitespace-nowrap w-24">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSolve?.(question._id)}
            className="focus:outline-none transition-transform active:scale-95"
            title={isSolved ? 'Mark as unsolved' : 'Mark as solved'}
          >
            {isSolved ? (
              <CheckCircle2 className="text-[#00B894] fill-emerald-50" size={20} />
            ) : (
              <Circle className="text-gray-300 hover:text-[#00B894]" size={20} />
            )}
          </button>

          <button
            onClick={() => onStar?.(question._id)}
            className="focus:outline-none transition-transform active:scale-95"
            title={isStarred ? 'Remove star' : 'Star problem'}
          >
            <Star
              className={
                isStarred
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-300 hover:text-amber-400'
              }
              size={19}
            />
          </button>
        </div>
      </td>

      {/* 2. Problem Title */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2 max-w-md">
          {externalId && (
            <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
              #{externalId}
            </span>
          )}
          <a
            href={question.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#1E1F25] hover:text-[#6C5CE7] hover:underline transition-colors flex items-center gap-1.5 group-hover:text-[#6C5CE7] truncate"
            title={question.title}
          >
            <span className="truncate">{question.title}</span>
            <ExternalLink size={13} className="shrink-0 opacity-0 group-hover:opacity-100 text-[#6C5CE7] transition-opacity" />
          </a>
        </div>
      </td>

      {/* 3. Platform */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        {getPlatformBadge(question.platform)}
      </td>

      {/* 4. Difficulty / Rating */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        {renderDifficultyOrRating()}
      </td>

      {/* 5. Tags */}
      <td className="px-4 py-3.5">
        {question.tags && question.tags.length > 0 ? (
          (() => {
            const uniqueTags = Array.from(new Set(question.tags));
            return (
              <div
                className="flex flex-wrap items-center gap-1 max-w-xs"
                title={uniqueTags.length > 3 ? `All tags: ${uniqueTags.join(', ')}` : undefined}
              >
                  {uniqueTags.slice(0, 3).map((tag, idx) => (
                    <button
                      type="button"
                      key={`${tag}-${idx}`}
                      onClick={() => onSelectTag?.(tag)}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-[#6C5CE7] hover:text-white transition-colors cursor-pointer"
                      title={`Filter by tag "${tag}"`}
                    >
                      {tag}
                    </button>
                  ))}
                  {uniqueTags.length > 3 && (
                    <div className="relative group/tag inline-flex items-center">
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-200/90 text-gray-600 hover:bg-[#6C5CE7] hover:text-white cursor-pointer transition-colors"
                        title={uniqueTags.join(', ')}
                      >
                        +{uniqueTags.length - 3}
                      </span>
                      {/* Floating tooltip displaying all tags on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tag:flex flex-col gap-1.5 w-64 p-2.5 bg-[#1E1F25] text-white rounded-lg shadow-xl z-50 pointer-events-auto">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 border-b border-gray-700/80 pb-1">
                          <span>All Tags</span>
                          <span className="text-[10px] text-gray-500 font-mono">{uniqueTags.length} tags</span>
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-44 overflow-y-auto">
                          {uniqueTags.map((t, i) => (
                            <button
                              type="button"
                              key={`tooltip-${t}-${i}`}
                              onClick={() => onSelectTag?.(t)}
                              className="px-2 py-0.5 rounded bg-white/10 text-gray-200 text-[11px] font-medium border border-white/5 hover:bg-[#6C5CE7] hover:text-white cursor-pointer transition-colors"
                              title={`Filter by tag "${t}"`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        {/* Little downward pointer arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1E1F25]" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <span className="text-xs text-gray-400 italic">No tags</span>
          )}
      </td>

      {/* 6. Actions */}
      <td className="px-4 py-3.5 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-2">
          {onAddToLadder && (
            <button
              onClick={() => onAddToLadder(question)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-[#6C5CE7] bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
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
            className="p-1 text-[#6B7280] hover:text-[#6C5CE7] transition-colors"
            title="Open problem in new tab"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </td>
    </tr>
  );
}
