import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { MessageSquare, Globe, ArrowRight } from 'lucide-react';
import { CodeforcesIcon } from '../ui/PlatformIcon';
import { formatDistanceToNow } from 'date-fns';

export default function RecentActionsWidget({ maxItems = 12 }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchRecent = async () => {
      try {
        const { data } = await api.get('/blogs/recent-actions');
        if (isMounted && data.actions) {
          setActions(data.actions.slice(0, maxItems));
        }
      } catch (err) {
        console.error('Failed to load recent actions', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchRecent();
    return () => { isMounted = false; };
  }, [maxItems]);

  return (
    <div className="bg-[#282828] rounded-2xl border border-[#383838] shadow-xs overflow-hidden flex flex-col">
      {/* Codeforces-style header */}
      <div className="px-4 py-3 bg-[#1a1a1a] border-b border-[#383838] flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-sm text-[#eff2f6]">
          <CodeforcesIcon size={16} />
          <span>Recent actions</span>
        </div>
        <Link to="/blogs" className="text-[11px] font-semibold text-[#ffa116] hover:underline flex items-center gap-0.5">
          <span>All</span>
          <ArrowRight size={11} />
        </Link>
      </div>

      <div className="divide-y divide-[#383838] p-2 overflow-y-auto max-h-[500px]">
        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading recent actions...</div>
        ) : actions.length === 0 ? (
          <div className="py-8 text-center px-4 space-y-2">
            <Globe size={24} className="mx-auto text-gray-400" />
            <p className="text-xs font-semibold text-gray-300">No community activity yet</p>
            <p className="text-[11px] text-[#8b949e]">Be the first to publish a blog editorial!</p>
            <Link to="/blogs/create" className="inline-block mt-2">
              <span className="text-xs font-bold text-[#ffa116] hover:underline">+ Write a Blog</span>
            </Link>
          </div>
        ) : (
          actions.map((action) => {
            const timeAgo = action.createdAt
              ? formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })
              : '';

            return (
              <div key={action.id} className="p-2.5 hover:bg-[#333333] rounded-xl transition-colors text-xs leading-snug">
                <div className="flex items-start gap-1.5">
                  <span className="shrink-0 mt-0.5">
                    {action.type === 'COMMENT' ? (
                      <MessageSquare size={13} className="text-sky-400" />
                    ) : (
                      <Globe size={13} className="text-[#ffa116]" />
                    )}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div>
                      <Link
                        to={`/profile/${action.authorUsername}`}
                        className="font-bold text-[#ffa116] hover:underline"
                      >
                        {action.authorUsername}
                      </Link>
                      <span className="text-[#8b949e] mx-1">→</span>
                      <Link
                        to={`/blog/${action.blogId}`}
                        className="font-semibold text-[#eff2f6] hover:text-[#ffa116] hover:underline"
                        title={action.blogTitle}
                      >
                        {action.blogTitle}
                      </Link>
                    </div>

                    {action.type === 'COMMENT' && action.snippet && (
                      <p className="text-[11px] text-[#8b949e] italic mt-0.5 truncate">
                        "{action.snippet}"
                      </p>
                    )}

                    <div className="text-[10px] text-[#8b949e] mt-1 flex items-center gap-2">
                      <span>{timeAgo}</span>
                      {action.score !== undefined && (
                        <span className={`font-bold ${action.score >= 0 ? 'text-[#2cbb5d]' : 'text-[#ef4743]'}`}>
                          {action.score >= 0 ? `+${action.score}` : action.score}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-2.5 bg-[#1a1a1a] border-t border-[#383838] text-center">
        <Link to="/blogs" className="text-xs font-bold text-[#ffa116] hover:underline inline-flex items-center gap-1">
          Explore Trending Blogs <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
