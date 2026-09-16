import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Users, BookOpen, CheckCircle, ArrowRight, Globe, Share2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import StatusBadge from './StatusBadge';

export default function LadderCard({ ladder, onDelete, onPublish, onVote, isMarketplace = false }) {
  const questionCount = ladder.questionCount || (ladder.questions ? ladder.questions.length : 0);
  const memberCount = ladder.memberCount || 1;
  const solvedCount = ladder.solvedCount || 0;
  const progressPercent = questionCount > 0 ? Math.round((solvedCount / questionCount) * 100) : 0;

  const createdAgo = ladder.createdAt
    ? formatDistanceToNow(new Date(ladder.createdAt), { addSuffix: true })
    : null;

  const publishedAgo = ladder.publishedAt
    ? formatDistanceToNow(new Date(ladder.publishedAt), { addSuffix: true })
    : null;

  return (
    <div className="group relative bg-[#282828] rounded-xl border border-[#383838] hover:border-[#ffa116]/50 hover:shadow-lg shadow-sm transition-all duration-200 overflow-hidden flex flex-col justify-between h-full min-h-[14rem]">
      {/* Accent stripe */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ffa116] via-[#ffb84d] to-[#ffa116] opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Top: Title + Actions */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <Link
              to={`/ladders/${ladder._id || ladder.id}`}
              className="text-base font-bold text-[#eff2f6] hover:text-[#ffa116] transition-colors line-clamp-1 flex-1"
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
                className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#ef4743] hover:bg-[#ef4743]/10 transition-all cursor-pointer shrink-0"
                title="Delete Ladder"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>

          {/* Marketplace Author Badge */}
          {isMarketplace && ladder.ownerUsername && (
            <div className="flex items-center gap-1.5 text-xs text-[#8b949e] mb-3">
              <span>Curated by</span>
              <Link
                to={`/profile/${ladder.ownerUsername}`}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-[#eff2f6] hover:text-[#ffa116] hover:underline bg-[#1a1a1a] hover:bg-[#ffa116]/10 border border-[#383838] px-2 py-0.5 rounded-md font-mono transition-colors"
                title={`View @${ladder.ownerUsername}'s profile and contributions`}
              >
                @{ladder.ownerUsername}
              </Link>
            </div>
          )}

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {!isMarketplace && (
              <StatusBadge type="role" role={ladder.role || 'READ'} />
            )}

            {ladder.isPublic && (
              <StatusBadge type="visibility" isPublic={true} label="Community Ladder" />
            )}

            {!ladder.isPublic && ladder.role === 'OWNER' && onPublish && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onPublish(ladder);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-[#ffa116] bg-[#ffa116]/10 hover:bg-[#ffa116]/20 border border-[#ffa116]/30 transition-colors cursor-pointer"
                title="Publish to Community Ladders"
              >
                <Share2 size={11} />
                Publish
              </button>
            )}

            <span className="text-[11px] text-[#8b949e] ml-auto font-mono">
              {isMarketplace && publishedAgo ? `Listed ${publishedAgo}` : createdAgo}
            </span>
          </div>

          {/* Author Claim / Description */}
          {ladder.description && (
            <div className="mb-3.5 p-2.5 rounded-lg bg-[#1a1a1a] border border-[#383838] text-xs text-[#8b949e] line-clamp-2">
              <span className="font-semibold text-[#eff2f6] not-italic">Claim: </span>
              “{ladder.description}”
            </div>
          )}

          {/* Progress Bar */}
          {questionCount > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-[#8b949e]">Progress</span>
                <span className="text-[11px] font-bold text-[#eff2f6]">{progressPercent}%</span>
              </div>
              <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden border border-[#383838]/60">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    background: progressPercent === 100
                      ? 'linear-gradient(90deg, #2cbb5d, #38cf6e)'
                      : 'linear-gradient(90deg, #ffa116, #ffb84d)'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 pt-3 border-t border-[#383838]">
          <div className="flex items-center gap-1.5 text-[#8b949e]">
            <BookOpen size={13} className="text-[#8b949e]" />
            <span className="text-xs font-semibold text-[#eff2f6]">{questionCount}</span>
            <span className="text-[11px]">problems</span>
          </div>

          <div className="flex items-center gap-1.5 text-[#8b949e]">
            <CheckCircle size={13} className="text-[#2cbb5d]" />
            <span className="text-xs font-semibold text-[#eff2f6]">{solvedCount}</span>
            <span className="text-[11px]">solved</span>
          </div>

          {/* Upvotes & Downvotes */}
          <div className="flex items-center gap-0.5 bg-[#1a1a1a] p-0.5 rounded-md border border-[#383838]">
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
                  ? 'bg-[#2cbb5d] text-[#1a1a1a] shadow-xs'
                  : 'text-[#8b949e] hover:text-[#2cbb5d] hover:bg-[#282828]'
              } ${onVote ? 'cursor-pointer' : 'cursor-default'}`}
              title={onVote ? (ladder.userVote === 'UPVOTE' || ladder.userVote === 'LIKE' ? 'Remove upvote' : 'Upvote') : `${ladder.upvotesCount ?? ladder.likesCount ?? ladder.votes ?? 0} Upvotes`}
            >
              <ThumbsUp size={12} className={ladder.userVote === 'UPVOTE' || ladder.userVote === 'LIKE' ? 'fill-current' : ''} />
              <span>{ladder.upvotesCount ?? ladder.likesCount ?? ladder.votes ?? 0}</span>
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
                  ? 'bg-[#ef4743] text-white shadow-xs'
                  : 'text-[#8b949e] hover:text-[#ef4743] hover:bg-[#282828]'
              } ${onVote ? 'cursor-pointer' : 'cursor-default'}`}
              title={onVote ? (ladder.userVote === 'DOWNVOTE' || ladder.userVote === 'DISLIKE' ? 'Remove downvote' : 'Downvote') : `${ladder.downvotesCount ?? ladder.dislikesCount ?? 0} Downvotes`}
            >
              <ThumbsDown size={12} className={ladder.userVote === 'DOWNVOTE' || ladder.userVote === 'DISLIKE' ? 'fill-current' : ''} />
              <span>{ladder.downvotesCount ?? ladder.dislikesCount ?? 0}</span>
            </button>
          </div>

          {!isMarketplace && (
            <div className="flex items-center gap-1.5 text-[#8b949e]">
              <Users size={13} className="text-[#8b949e]" />
              <span className="text-xs font-semibold text-[#eff2f6]">{memberCount}</span>
            </div>
          )}

          <Link
            to={`/ladders/${ladder._id || ladder.id}`}
            className="ml-auto flex items-center gap-1 text-xs font-semibold text-[#ffa116] hover:text-[#ffb84d] opacity-0 group-hover:opacity-100 transition-all"
          >
            {isMarketplace ? 'Explore' : 'Open'} <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
