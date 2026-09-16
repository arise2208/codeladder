import React, { useState, useEffect, useRef } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Search, Shuffle, X } from 'lucide-react';

export default function QuestionFilters({
  filters = {},
  onChange,
  onFilterChange,
  onPickRandom
}) {
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  const handleChange = (key, value) => {
    const callback = onFilterChange || onChange;
    if (callback) {
      callback({ ...filters, [key]: value });
    }
  };

  const handleSearchChange = (val) => {
    setLocalSearch(val);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      handleChange('search', val);
    }, 300);
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    handleChange('search', '');
  };

  const handlePlatformChange = (newPlatform) => {
    const nextFilters = {
      ...filters,
      platform: newPlatform === 'ALL' ? '' : newPlatform,
      difficulty: '',
      minRating: '',
      maxRating: ''
    };
    const callback = onFilterChange || onChange;
    if (callback) callback(nextFilters);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
      {/* Search Input */}
      <div className="relative flex-1 max-w-lg">
        <Input
          placeholder="Search problems by title, ID, or slug..."
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          icon={<Search size={18} className="text-[#8b949e]" />}
          className="pr-8"
        />
        {localSearch && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Selects & Toggles */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Platform Dropdown */}
        <select
          value={filters.platform || 'ALL'}
          onChange={(e) => handlePlatformChange(e.target.value)}
          className="rounded-lg border border-[#383838] px-3 py-2 text-sm font-medium text-[#eff2f6] bg-[#1a1a1a] focus:border-[#ffa116] focus:outline-none"
        >
          <option value="ALL">All Platforms</option>
          <option value="LEETCODE">LeetCode</option>
          <option value="CODEFORCES">Codeforces</option>
          <option value="CODECHEF">CodeChef</option>
          <option value="ATCODER">AtCoder</option>
        </select>

        {/* Platform-Specific Difficulty / Rating Filter */}
        {filters.platform === 'CODEFORCES' || filters.platform === 'CODECHEF' ? (
          <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#383838] rounded-lg px-2.5 py-1.5">
            <span className="text-xs font-semibold text-[#8b949e]">
              {filters.platform === 'CODEFORCES' ? 'CF Rating:' : 'CC Rating:'}
            </span>
            <input
              type="number"
              placeholder="Min"
              min={filters.platform === 'CODEFORCES' ? '800' : '200'}
              max="4000"
              step={filters.platform === 'CODEFORCES' ? '100' : '50'}
              value={filters.minRating || ''}
              onChange={(e) => handleChange('minRating', e.target.value)}
              className="w-16 rounded border border-[#383838] bg-[#282828] px-2 py-0.5 text-xs text-[#eff2f6] focus:outline-none focus:ring-1 focus:ring-[#ffa116]"
            />
            <span className="text-[#8b949e] text-xs">–</span>
            <input
              type="number"
              placeholder="Max"
              min={filters.platform === 'CODEFORCES' ? '800' : '200'}
              max="4000"
              step={filters.platform === 'CODEFORCES' ? '100' : '50'}
              value={filters.maxRating || ''}
              onChange={(e) => handleChange('maxRating', e.target.value)}
              className="w-16 rounded border border-[#383838] bg-[#282828] px-2 py-0.5 text-xs text-[#eff2f6] focus:outline-none focus:ring-1 focus:ring-[#ffa116]"
            />
            {(filters.minRating || filters.maxRating) && (
              <button
                type="button"
                onClick={() => {
                  const next = { ...filters, minRating: '', maxRating: '' };
                  (onFilterChange || onChange)?.(next);
                }}
                className="text-[#8b949e] hover:text-[#ef4743] p-0.5 ml-0.5"
                title="Reset rating filter"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ) : filters.platform === 'LEETCODE' ? (
          <select
            value={filters.difficulty || 'ALL'}
            onChange={(e) => handleChange('difficulty', e.target.value === 'ALL' ? '' : e.target.value)}
            className="rounded-lg border border-[#383838] px-3 py-2 text-sm text-[#eff2f6] bg-[#1a1a1a] focus:border-[#ffa116] focus:outline-none"
          >
            <option value="ALL">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        ) : null}

        {/* Hide Solved Toggle */}
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#eff2f6] select-none pl-1">
          <input
            type="checkbox"
            checked={Boolean(filters.hideSolved)}
            onChange={(e) => handleChange('hideSolved', e.target.checked)}
            className="rounded border-[#383838] bg-[#1a1a1a] text-[#ffa116] focus:ring-[#ffa116] w-4 h-4 cursor-pointer"
          />
          <span>Hide Solved</span>
        </label>

        {/* Pick Random Button */}
        {onPickRandom && (
          <Button
            type="button"
            variant="outline"
            onClick={onPickRandom}
            className="flex items-center gap-1.5 border-[#383838] bg-[#282828] text-[#eff2f6] hover:bg-[#333333]"
            title="Pick a random problem from current list"
          >
            <Shuffle size={15} />
            <span className="hidden sm:inline">Pick Random</span>
          </Button>
        )}
      </div>
    </div>
  );
}
