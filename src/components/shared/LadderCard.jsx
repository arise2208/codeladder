import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Users, BookOpen, CheckCircle, ArrowRight, Globe, Share2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ROLE_CONFIG = {
  OWNER: { label: 'Owner', bg: 'bg-[#6C5CE7]/10', text: 'text-[#6C5CE7]', border: 'border-[#6C5CE7]/20', dot: 'bg-[#6C5CE7]' },
  WRITE: { label: 'Editor', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500' },
  READ: { label: 'Viewer', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' }
};

export default function LadderCard({ ladder, onDelete, onPublish, onVote, isMarketplace = false }) {
  const questionCount = ladder.questionCount || 0;
  const memberCount = ladder.memberCount || 1;
  const solvedCount = ladder.solvedCount || 0;
  const progressPercent = questionCount > 0 ? Math.round((solvedCount / questionCount) * 100) : 0;

  const role = ROLE_CONFIG[ladder.role] || ROLE_CONFIG.READ;

  const createdAgo = ladder.createdAt
    ? formatDistanceToNow(new Date(ladder.createdAt), { addSuffix: true })
    : null;

  const publishedAgo = ladder.publishedAt
    ? formatDistanceToNow(new Date(ladder.publishedAt), { addSuffix: true })
    : null;

  return (
    <div className="group relative bg-white rounded-xl border border-[#E5E7EB] hover:border-[#6C5CE7]/40 hover:shadow-lg shadow-sm transition-all duration-200 overflow-hidden flex flex-col justify-between">
      {/* Accent stripe */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#6C5CE7] via-[#A29BFE] to-[#6C5CE7] opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Top: Title + Actions */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <Link
              to={`/ladders/${ladder._id}`}
              className="text-base font-bold text-[#1E1F25] hover:text-[#6C5CE7] transition-colors line-clamp-1 flex-1"
            >
              {ladder.title}
            </Link>

            {(ladder.role === 'OWNER' || ladder.isOwner) && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(ladder._id || ladder.id);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer shrink-0"
                title="Delete Ladder"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>

          {/* Marketplace Author Badge */}
          {isMarketplace && ladder.ownerUsername && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
              <span>Curated by</span>
              <Link
                to={`/profile/${ladder.ownerUsername}`}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-gray-800 hover:text-[#6C5CE7] hover:underline bg-gray-100 hover:bg-[#6C5CE7]/10 px-2 py-0.5 rounded-md font-mono transition-colors"
                title={`View @${ladder.ownerUsername}'s profile and contributions`}
              >
                @{ladder.ownerUsername}
              </Link>
            </div>
          )}

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {!isMarketplace && (
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${role.bg} ${role.text} ${role.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${role.dot}`} />
                {role.label}
              </span>
            )}

            {ladder.isPublic && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Globe size={11} />
                Community Ladder
              </span>
            )}

            {!ladder.isPublic && ladder.role === 'OWNER' && onPublish && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onPublish(ladder);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-[#6C5CE7] bg-[#6C5CE7]/10 hover:bg-[#6C5CE7]/20 border border-[#6C5CE7]/20 transition-colors cursor-pointer"
                title="Publish to Community Ladders"
              >
                <Share2 size={11} />
                Publish
              </button>
            )}

            <span className="text-[11px] text-gray-400 ml-auto">
              {isMarketplace && publishedAgo ? `Listed ${publishedAgo}` : createdAgo}
            </span>
          </div>

          {/* Author Claim / Description (Marketplace or Public) */}
          {ladder.description && (
            <div className="mb-3.5 p-2.5 rounded-lg bg-gray-50/80 border border-gray-100 text-xs text-gray-600 line-clamp-2">
              <span className="font-semibold text-gray-700 not-italic">Claim: </span>
              “{ladder.description}”
            </div>
          )}

          {/* Progress Bar */}
          {questionCount > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-gray-500">Progress</span>
                <span className="text-[11px] font-bold text-[#1E1F25]">{progressPercent}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    background: progressPercent === 100
                      ? 'linear-gradient(90deg, #00B894, #55EFC4)'
                      : 'linear-gradient(90deg, #6C5CE7, #A29BFE)'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 pt-3 border-t border-[#F3F4F6]">
          <div className="flex items-center gap-1.5 text-gray-500">
            <BookOpen size={13} className="text-gray-400" />
            <span className="text-xs font-semibold text-[#1E1F25]">{questionCount}</span>
            <span className="text-[11px]">problems</span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-500">
            <CheckCircle size={13} className="text-emerald-500" />
            <span className="text-xs font-semibold text-[#1E1F25]">{solvedCount}</span>
            <span className="text-[11px]">solved</span>
          </div>

          {/* Upvotes & Downvotes */}
          <div className="flex items-center gap-0.5 bg-gray-100/90 p-0.5 rounded-md border border-gray-200/80">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onVote && onVote(ladder._id || ladder.id, 'UPVOTE');
              }}
              disabled={!onVote}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold transition-all ${
                ladder.userVote === 'UPVOTE' || ladder.userVote === 'LIKE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-emerald-700 hover:bg-white'
              } ${onVote ? 'cursor-pointer' : 'cursor-default'}`}
              title={onVote ? (ladder.userVote === 'UPVOTE' || ladder.userVote === 'LIKE' ? 'Remove upvote' : 'Upvote') : `${ladder.upvotesCount ?? ladder.likesCount ?? 0} Upvotes`}
            >
              <ThumbsUp size={12} className={ladder.userVote === 'UPVOTE' || ladder.userVote === 'LIKE' ? 'fill-white' : ''} />
              <span>{ladder.upvotesCount ?? ladder.likesCount ?? 0}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onVote && onVote(ladder._id || ladder.id, 'DOWNVOTE');
              }}
              disabled={!onVote}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold transition-all ${
                ladder.userVote === 'DOWNVOTE' || ladder.userVote === 'DISLIKE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-rose-700 hover:bg-white'
              } ${onVote ? 'cursor-pointer' : 'cursor-default'}`}
              title={onVote ? (ladder.userVote === 'DOWNVOTE' || ladder.userVote === 'DISLIKE' ? 'Remove downvote' : 'Downvote') : `${ladder.downvotesCount ?? ladder.dislikesCount ?? 0} Downvotes`}
            >
              <ThumbsDown size={12} className={ladder.userVote === 'DOWNVOTE' || ladder.userVote === 'DISLIKE' ? 'fill-white' : ''} />
              <span>{ladder.downvotesCount ?? ladder.dislikesCount ?? 0}</span>
            </button>
          </div>

          {!isMarketplace && (
            <div className="flex items-center gap-1.5 text-gray-500">
              <Users size={13} className="text-gray-400" />
              <span className="text-xs font-semibold text-[#1E1F25]">{memberCount}</span>
            </div>
          )}

          <Link
            to={`/ladders/${ladder._id}`}
            className="ml-auto flex items-center gap-1 text-xs font-semibold text-[#6C5CE7] hover:text-[#5A4AD1] opacity-0 group-hover:opacity-100 transition-all"
          >
            {isMarketplace ? 'Explore' : 'Open'} <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

