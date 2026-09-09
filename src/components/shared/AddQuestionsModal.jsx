import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Button, Input, Badge, LoadingSpinner, Pagination } from '../ui';
import api, { getErrorMessage } from '../../lib/api';
import { getCfRatingStyle } from '../../lib/ratingStyles';
import { Search, ExternalLink, Check, CheckSquare, Square, RefreshCw, X } from 'lucide-react';

export default function AddQuestionsModal({
  isOpen,
  onClose,
  onAddQuestions,
  existingQuestionIds = []
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [platform, setPlatform] = useState('ALL');
  const [difficulty, setDifficulty] = useState('ALL');
  const [tag, setTag] = useState('ALL');
  const [availableTags, setAvailableTags] = useState([]);
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Set of existing question IDs for quick lookup
  const existingSet = useMemo(() => {
    return new Set((existingQuestionIds || []).map(id => String(id)));
  }, [existingQuestionIds]);

  // Load available tags
  useEffect(() => {
    if (!isOpen) return;
    api.get('/questions/tags').then(({ data }) => {
      if (Array.isArray(data?.tags)) setAvailableTags(data.tags);
    }).catch(() => {});
  }, [isOpen]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page and filters when platform changes
  const handlePlatformChange = (e) => {
    setPlatform(e.target.value);
    setDifficulty('ALL');
    setTag('ALL');
    setMinRating('');
    setMaxRating('');
    setPage(1);
  };

  const handleDifficultyChange = (e) => {
    setDifficulty(e.target.value);
    setPage(1);
  };

  const handleTagChange = (e) => {
    setTag(e.target.value);
    setPage(1);
  };

  // Fetch questions from problemset catalog
  const fetchQuestions = useCallback(async () => {
    if (!isOpen) return;
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: 15
      };
      if (activeSearch) params.search = activeSearch;
      if (platform && platform !== 'ALL') params.platform = platform;
      if (platform === 'CODEFORCES' || platform === 'CODECHEF') {
        if (minRating) params.minRating = minRating;
        if (maxRating) params.maxRating = maxRating;
      } else if (difficulty && difficulty !== 'ALL') {
        params.difficulty = difficulty;
      }
      if (tag && tag !== 'ALL') {
        params.tag = tag;
      }

      const { data } = await api.get('/questions', { params });
      setQuestions(data.questions || []);
      if (data.pagination) {
        const pages = data.pagination.pages || data.pagination.totalPages || Math.ceil((data.pagination.total || 0) / 15) || 1;
        setTotalPages(pages);
        setTotalCount(data.pagination.total || 0);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load questions'));
    } finally {
      setLoading(false);
    }
  }, [isOpen, page, activeSearch, platform, difficulty, tag, minRating, maxRating]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setSearchInput('');
      setActiveSearch('');
      setPlatform('ALL');
      setDifficulty('ALL');
      setTag('ALL');
      setMinRating('');
      setMaxRating('');
      setPage(1);
    }
  }, [isOpen]);

  // Available selectable questions on current page
  const availableOnCurrentPage = useMemo(() => {
    return questions.filter(q => !existingSet.has(String(q._id)));
  }, [questions, existingSet]);

  // Check if all available on current page are selected
  const allCurrentSelected = useMemo(() => {
    if (availableOnCurrentPage.length === 0) return false;
    return availableOnCurrentPage.every(q => selectedIds.has(String(q._id)));
  }, [availableOnCurrentPage, selectedIds]);

  // Toggle selection for a single question
  const toggleSelect = (id) => {
    const stringId = String(id);
    if (existingSet.has(stringId)) return; // cannot select already existing

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(stringId)) {
        next.delete(stringId);
      } else {
        next.add(stringId);
      }
      return next;
    });
  };

  // Toggle select all available questions on current page
  const toggleSelectAllCurrent = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allCurrentSelected) {
        // Deselect all from this page
        availableOnCurrentPage.forEach(q => next.delete(String(q._id)));
      } else {
        // Select all from this page
        availableOnCurrentPage.forEach(q => next.add(String(q._id)));
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;
    try {
      setSubmitting(true);
      await onAddQuestions(Array.from(selectedIds));
      onClose();
    } catch (err) {
      // error handled by parent or toast
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyBadgeColor = (diff) => {
    switch (diff?.toUpperCase()) {
      case 'EASY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'HARD':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPlatformBadge = (plat) => {
    switch (plat?.toUpperCase()) {
      case 'LEETCODE':
        return <Badge className="bg-orange-50 text-orange-700 border border-orange-200">LeetCode</Badge>;
      case 'CODEFORCES':
        return <Badge className="bg-blue-50 text-blue-700 border border-blue-200">Codeforces</Badge>;
      case 'CODECHEF':
        return <Badge className="bg-amber-50 text-amber-800 border border-amber-200">CodeChef</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{plat}</Badge>;
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Add Questions from Problemset"
      maxWidth="max-w-4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#1E1F25]">
              <strong className="text-[#6C5CE7]">{selectedIds.size}</strong> question{selectedIds.size === 1 ? '' : 's'} selected
            </span>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs text-[#6B7280] hover:text-red-500 underline transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              loading={submitting}
              disabled={selectedIds.size === 0 || submitting}
              className="min-w-[150px]"
            >
              {selectedIds.size > 0
                ? `Add ${selectedIds.size} Question${selectedIds.size === 1 ? '' : 's'}`
                : 'Add Questions'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search problems by title, problem code, or tag..."
              icon={<Search size={16} className="text-[#9CA3AF]" />}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setActiveSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={platform}
              onChange={handlePlatformChange}
              className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#1E1F25] focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]"
            >
              <option value="ALL">All Platforms</option>
              <option value="LEETCODE">LeetCode</option>
              <option value="CODEFORCES">Codeforces</option>
              <option value="CODECHEF">CodeChef</option>
            </select>

            {platform === 'CODEFORCES' || platform === 'CODECHEF' ? (
              <div className="flex items-center gap-1.5 bg-gray-50 border border-[#E5E7EB] rounded-lg px-2.5 py-1.5">
                <span className="text-xs font-semibold text-gray-600">
                  {platform === 'CODEFORCES' ? 'CF Rating:' : 'CC Rating:'}
                </span>
                <input
                  type="number"
                  placeholder="Min"
                  min={platform === 'CODEFORCES' ? '800' : '200'}
                  max="4000"
                  step={platform === 'CODEFORCES' ? '100' : '50'}
                  value={minRating}
                  onChange={(e) => {
                    setMinRating(e.target.value);
                    setPage(1);
                  }}
                  className="w-16 rounded border border-gray-200 bg-white px-2 py-0.5 text-xs text-[#1E1F25] focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
                />
                <span className="text-gray-400 text-xs">–</span>
                <input
                  type="number"
                  placeholder="Max"
                  min={platform === 'CODEFORCES' ? '800' : '200'}
                  max="4000"
                  step={platform === 'CODEFORCES' ? '100' : '50'}
                  value={maxRating}
                  onChange={(e) => {
                    setMaxRating(e.target.value);
                    setPage(1);
                  }}
                  className="w-16 rounded border border-gray-200 bg-white px-2 py-0.5 text-xs text-[#1E1F25] focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
                />
                {(minRating || maxRating) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMinRating('');
                      setMaxRating('');
                      setPage(1);
                    }}
                    className="text-gray-400 hover:text-red-500 p-0.5 ml-0.5"
                    title="Reset rating filter"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ) : platform === 'LEETCODE' ? (
              <select
                value={difficulty}
                onChange={handleDifficultyChange}
                className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#1E1F25] focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]"
              >
                <option value="ALL">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            ) : null}

            {/* Tag Filter */}
            <div className="relative">
              <select
                value={tag}
                onChange={handleTagChange}
                className={`rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] max-w-[150px] truncate ${
                  tag && tag !== 'ALL'
                    ? 'border-[#6C5CE7] font-semibold text-[#6C5CE7] pr-7 bg-purple-50/40'
                    : 'border-[#E5E7EB] text-[#1E1F25]'
                }`}
                title="Filter by Topic / Tag"
              >
                <option value="ALL">All Tags</option>
                {availableTags.map((t) => {
                  const tagName = typeof t === 'string' ? t : t.name;
                  const count = typeof t === 'object' && t.count !== undefined ? ` (${t.count})` : '';
                  return (
                    <option key={tagName} value={tagName}>
                      {tagName}{count}
                    </option>
                  );
                })}
              </select>
              {tag && tag !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => {
                    setTag('ALL');
                    setPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 p-0.5"
                  title="Clear tag filter"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question List Table */}
        <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white shadow-sm">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <LoadingSpinner />
              <span className="text-sm text-[#6B7280]">Loading questions...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 text-sm">
              <p>{error}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={fetchQuestions}>
                <RefreshCw size={14} className="mr-1" /> Retry
              </Button>
            </div>
          ) : questions.length === 0 ? (
            <div className="p-10 text-center text-[#6B7280]">
              <p className="text-sm">No questions found matching your filter criteria.</p>
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 bg-[#1E1F25] text-white z-10 select-none">
                  <tr>
                    <th className="p-3 w-12 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAllCurrent}
                        disabled={availableOnCurrentPage.length === 0}
                        title={allCurrentSelected ? 'Deselect all on page' : 'Select all available on page'}
                        className="inline-flex items-center justify-center hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {allCurrentSelected ? (
                          <CheckSquare size={18} className="text-[#6C5CE7]" />
                        ) : (
                          <Square size={18} className="text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th className="p-3 font-semibold">Title</th>
                    <th className="p-3 font-semibold w-28">Platform</th>
                    <th className="p-3 font-semibold w-32">
                      {platform === 'CODEFORCES' || platform === 'CODECHEF' ? 'Rating' : platform === 'ALL' ? 'Difficulty / Rating' : 'Difficulty'}
                    </th>
                    <th className="p-3 font-semibold w-28 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {questions.map((q) => {
                    const qId = String(q._id);
                    const isAlreadyInLadder = existingSet.has(qId);
                    const isSelected = selectedIds.has(qId);

                    return (
                      <tr
                        key={qId}
                        onClick={() => !isAlreadyInLadder && toggleSelect(qId)}
                        className={`transition-colors ${
                          isAlreadyInLadder
                            ? 'bg-gray-50/60 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-[#6C5CE7]/5 hover:bg-[#6C5CE7]/10 cursor-pointer'
                            : 'hover:bg-[#F8F9FB] cursor-pointer'
                        }`}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {isAlreadyInLadder ? (
                            <span title="Already in ladder" className="inline-flex text-gray-400">
                              <Check size={16} />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleSelect(qId)}
                              className="inline-flex items-center justify-center text-[#6C5CE7] hover:scale-110 transition-transform"
                            >
                              {isSelected ? (
                                <CheckSquare size={18} className="text-[#6C5CE7] fill-[#6C5CE7]/10" />
                              ) : (
                                <Square size={18} className="text-gray-400" />
                              )}
                            </button>
                          )}
                        </td>
                        <td className="p-3 font-medium text-[#1E1F25]">
                          <div className="flex items-center gap-2">
                            <span>{q.title}</span>
                            {q.url && (
                              <a
                                href={q.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Open problem link"
                                className="text-[#9CA3AF] hover:text-[#6C5CE7] transition-colors inline-flex"
                              >
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-3">{getPlatformBadge(q.platform)}</td>
                        <td className="p-3">
                          {q.platform === 'CODEFORCES' && q.metadata?.rating ? (
                            (() => {
                              const style = getCfRatingStyle(q.metadata.rating);
                              return (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                                  style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
                                  title={`Codeforces Rating: ${q.metadata.rating} (${style.label})`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: style.dot }} />
                                  {q.metadata.rating}
                                </span>
                              );
                            })()
                          ) : q.platform === 'CODECHEF' && q.metadata?.rating ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200">
                              ★ {q.metadata.rating}
                            </span>
                          ) : (
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md border ${getDifficultyBadgeColor(q.difficulty)}`}>
                              {q.difficulty || 'Medium'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isAlreadyInLadder ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              In Ladder
                            </span>
                          ) : isSelected ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#6C5CE7] bg-[#6C5CE7]/10 px-2 py-0.5 rounded-full">
                              Selected
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Available</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom Pagination & Counts */}
        {!loading && questions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
            <span className="text-xs text-[#6B7280]">
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total questions)
            </span>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
