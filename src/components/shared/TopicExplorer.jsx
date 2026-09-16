import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Layers, Search, X } from 'lucide-react';
import api from '../../lib/api';

export default function TopicExplorer({
  selectedTag = '',
  onSelectTag,
  platform = ''
}) {
  const [tags, setTags] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchTags = async () => {
      try {
        const params = {};
        if (platform && platform !== 'ALL') params.platform = platform;
        const { data } = await api.get('/questions/tags', { params });
        if (isMounted && Array.isArray(data?.tags)) {
          setTags(data.tags);
        }
      } catch (err) {
        console.error('Failed to load tags for TopicExplorer', err);
      }
    };
    fetchTags();
    return () => { isMounted = false; };
  }, [platform]);

  const filteredTags = useMemo(() => {
    if (!tagSearch.trim()) return tags;
    const q = tagSearch.trim().toLowerCase();
    return tags.filter(t => t.name.toLowerCase().includes(q));
  }, [tags, tagSearch]);

  // When collapsed, show top 14 tags
  const visibleTags = isExpanded ? filteredTags : filteredTags.slice(0, 14);

  if (tags.length === 0) return null;

  return (
    <div className="bg-[#282828] border border-[#383838] text-[#eff2f6] rounded-xl p-3.5 shadow-sm space-y-3 transition-all">
      {/* Top Header / Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectTag?.('')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !selectedTag
                ? 'bg-[#ffa116] text-[#1a1a1a] shadow-sm'
                : 'bg-[#1a1a1a] text-[#8b949e] hover:bg-[#333333] hover:text-[#eff2f6] border border-[#383838]'
            }`}
          >
            <Layers size={13} />
            All Topics
          </button>
          
          {selectedTag && (
            <div className="flex items-center gap-1.5 bg-[#ffa116]/20 border border-[#ffa116]/40 px-2.5 py-1 rounded-full text-xs text-[#ffa116]">
              <span>Active: <strong className="text-[#eff2f6] capitalize">{selectedTag}</strong></span>
              <button
                type="button"
                onClick={() => onSelectTag?.('')}
                className="hover:text-white ml-0.5 p-0.5 text-gray-400"
                title="Clear topic filter"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Tag search input if expanded */}
          {isExpanded && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search topics..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="w-36 sm:w-44 bg-[#1a1a1a] border border-[#383838] rounded-full px-2.5 py-1 pl-7 text-xs text-[#eff2f6] placeholder-gray-500 focus:outline-none focus:border-[#ffa116]"
              />
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              {tagSearch && (
                <button
                  type="button"
                  onClick={() => setTagSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="text-xs text-gray-400 hover:text-[#eff2f6] inline-flex items-center gap-1 select-none py-1 px-2.5 rounded-lg hover:bg-[#333333] transition-colors"
          >
            <span>{isExpanded ? 'Collapse' : `Expand (${tags.length})`}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Topics Cloud */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {visibleTags.map((t) => {
          const isSelected = selectedTag.toLowerCase() === t.name.toLowerCase();
          return (
            <button
              key={t.name}
              type="button"
              onClick={() => onSelectTag?.(isSelected ? '' : t.name)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all group ${
                isSelected
                  ? 'bg-[#ffa116] text-[#1a1a1a] font-semibold shadow-md shadow-[#ffa116]/30 ring-2 ring-[#ffa116]/50'
                  : 'bg-[#1a1a1a] text-[#8b949e] border border-[#383838] hover:border-[#ffa116]/50 hover:text-[#ffa116] hover:bg-[#ffa116]/10'
              }`}
            >
              <span className="capitalize">{t.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono transition-colors ${
                  isSelected
                    ? 'bg-black/20 text-[#1a1a1a] font-bold'
                    : 'bg-[#282828] text-[#8b949e] group-hover:text-[#eff2f6]'
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
