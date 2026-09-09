import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useQuestions from '../hooks/useQuestions';
import api, { getErrorMessage } from '../lib/api';
import PageHeader from '../components/layout/PageHeader';
import QuestionFilters from '../components/shared/QuestionFilters';
import QuestionRow from '../components/shared/QuestionRow';
import TopicExplorer from '../components/shared/TopicExplorer';
import { Pagination, LoadingSpinner, EmptyState, Modal, Button } from '../components/ui';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext';
import { Layers, CheckCircle2, Star, HelpCircle, Plus, Check, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProblemsetPage() {
  const { user } = useAuth();
  const { questions, pagination, filters, loading, error, changePage, updateFilters } = useQuestions();

  const [solvedMap, setSolvedMap] = useState({});
  const [starredMap, setStarredMap] = useState({});

  // Add to Ladder modal state
  const [ladderModal, setLadderModal] = useState({ isOpen: false, question: null });
  const [userLadders, setUserLadders] = useState([]);
  const [loadingLadders, setLoadingLadders] = useState(false);
  const [selectedLadderIds, setSelectedLadderIds] = useState(new Set());
  const [isSavingLadders, setIsSavingLadders] = useState(false);
  const [ladderSearch, setLadderSearch] = useState('');

  // Fetch solved and starred status
  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      try {
        const [solvedRes, starredRes] = await Promise.all([
          api.get('/me/questions/solved'),
          api.get('/me/questions/starred')
        ]);
        const smap = {};
        const solvedList = solvedRes.data.questions || (Array.isArray(solvedRes.data) ? solvedRes.data : []);
        solvedList.forEach((q) => {
          smap[q._id || q.questionId?._id || q.questionId] = true;
        });
        setSolvedMap(smap);

        const starmap = {};
        const starredList = starredRes.data.questions || (Array.isArray(starredRes.data) ? starredRes.data : []);
        starredList.forEach((q) => {
          starmap[q._id || q.questionId?._id || q.questionId] = true;
        });
        setStarredMap(starmap);
      } catch (err) {
        console.error('Failed to load user question data', err);
      }
    };
    fetchUserData();
  }, [user]);

  // Load user ladders with question status when opening "Add to Ladder" modal
  const handleOpenLadderModal = async (question) => {
    if (!user) {
      toast.error('Please log in to add problems to your ladders');
      return;
    }
    setLadderModal({ isOpen: true, question });
    setSelectedLadderIds(new Set());
    setLadderSearch('');
    try {
      setLoadingLadders(true);
      const { data } = await api.get('/ladders', {
        params: { questionId: question._id }
      });
      const list = Array.isArray(data) ? data : data.ladders || [];
      setUserLadders(list);
    } catch (err) {
      toast.error('Failed to load ladders');
    } finally {
      setLoadingLadders(false);
    }
  };

  const toggleLadderSelection = (ladderId) => {
    setSelectedLadderIds((prev) => {
      const next = new Set(prev);
      if (next.has(ladderId)) {
        next.delete(ladderId);
      } else {
        next.add(ladderId);
      }
      return next;
    });
  };

  const handleSaveToLadders = async () => {
    if (selectedLadderIds.size === 0 || !ladderModal.question?._id) return;
    try {
      setIsSavingLadders(true);
      const ids = Array.from(selectedLadderIds);
      await Promise.all(
        ids.map((ladderId) =>
          api.post(`/ladders/${ladderId}/questions`, {
            questionId: ladderModal.question._id
          })
        )
      );
      toast.success(
        `Added to ${ids.length} ladder${ids.length > 1 ? 's' : ''}!`,
        { icon: '📁' }
      );
      setLadderModal({ isOpen: false, question: null });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add to ladders'));
    } finally {
      setIsSavingLadders(false);
    }
  };

  const handleSolve = async (questionId) => {
    if (!user) {
      toast.error('Please log in to track your progress');
      return;
    }
    try {
      if (solvedMap[questionId]) {
        await api.post(`/questions/${questionId}/unsolve`);
        setSolvedMap((prev) => {
          const next = { ...prev };
          delete next[questionId];
          return next;
        });
        toast.success('Marked as unsolved');
      } else {
        await api.post(`/questions/${questionId}/solve`);
        setSolvedMap((prev) => ({ ...prev, [questionId]: true }));
        toast.success('Marked as solved!');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update solve status.'));
    }
  };

  const handleStar = async (questionId) => {
    if (!user) {
      toast.error('Please log in to star problems');
      return;
    }
    const isStarred = starredMap[questionId];
    try {
      if (isStarred) {
        await api.delete(`/questions/${questionId}/star`);
        setStarredMap((prev) => {
          const next = { ...prev };
          delete next[questionId];
          return next;
        });
      } else {
        await api.put(`/questions/${questionId}/star`, { starred: true });
        setStarredMap((prev) => ({ ...prev, [questionId]: true }));
      }
    } catch (err) {
      toast.error('Failed to toggle star.');
    }
  };

  const displayedQuestions = useMemo(() => {
    if (!filters.hideSolved) return questions;
    return questions.filter((q) => !solvedMap[q._id]);
  }, [questions, filters.hideSolved, solvedMap]);

  // Pick Random Problem
  const handlePickRandom = useCallback(() => {
    if (displayedQuestions.length === 0) {
      toast.error('No problems available in current view');
      return;
    }
    const randomIndex = Math.floor(Math.random() * displayedQuestions.length);
    const chosen = displayedQuestions[randomIndex];
    toast.success(`Picked: "${chosen.title}"!`);
    window.open(chosen.url, '_blank', 'noopener,noreferrer');
  }, [displayedQuestions]);

  const solvedCount = Object.keys(solvedMap).length;
  const starredCount = Object.keys(starredMap).length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Problemset"
          breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Problemset' }]}
        />

        {/* Quick Stats Pill Header */}
        {user && (
          <div className="flex items-center gap-3 bg-white px-3.5 py-1.5 rounded-xl border border-[#E5E7EB] text-xs shadow-sm self-start sm:self-auto">
            <span className="flex items-center gap-1.5 font-medium text-emerald-600">
              <CheckCircle2 size={14} /> {solvedCount} Solved
            </span>
            <span className="text-gray-300">•</span>
            <span className="flex items-center gap-1.5 font-medium text-amber-600">
              <Star size={14} className="fill-amber-400" /> {starredCount} Starred
            </span>
            {pagination.total > 0 && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-gray-600 font-medium">{pagination.total} in Catalog</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Topics / Tags Cloud Explorer */}
      <TopicExplorer
        selectedTag={filters.tag || ''}
        onSelectTag={(tag) => updateFilters({ tag })}
        platform={filters.platform || ''}
      />

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
        <QuestionFilters
          filters={filters}
          onFilterChange={updateFilters}
          onChange={updateFilters}
          onPickRandom={handlePickRandom}
        />
      </div>

      {/* Questions Data Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="py-20 text-center text-red-500">{error}</div>
        ) : displayedQuestions.length === 0 ? (
          <EmptyState
            title="No questions found"
            description="Try adjusting your platform, difficulty, or search query."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#1E1F25] text-white text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 font-medium w-24">Status</th>
                    <th className="px-4 py-3.5 font-medium">Problem Title</th>
                    <th className="px-4 py-3.5 font-medium w-32">Platform</th>
                    <th className="px-4 py-3.5 font-medium w-32">
                      {filters.platform === 'CODEFORCES' || filters.platform === 'CODECHEF' ? 'Rating' : !filters.platform || filters.platform === 'ALL' ? 'Difficulty / Rating' : 'Difficulty'}
                    </th>
                    <th className="px-4 py-3.5 font-medium">Tags</th>
                    <th className="px-4 py-3.5 font-medium text-right w-44">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {displayedQuestions.map((q) => (
                    <QuestionRow
                      key={q._id}
                      question={q}
                      isSolved={Boolean(solvedMap[q._id])}
                      isStarred={Boolean(starredMap[q._id])}
                      onSolve={() => handleSolve(q._id)}
                      onStar={() => handleStar(q._id)}
                      onAddToLadder={user ? handleOpenLadderModal : null}
                      onSelectTag={(tag) => updateFilters({ tag })}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {(pagination.totalPages > 1 || pagination.pages > 1) && (
              <div className="p-4 border-t border-[#E5E7EB] bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-[#6B7280]">
                  Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages || pagination.pages}</strong> ({pagination.total} total problems)
                </span>
                <Pagination
                  page={pagination.page}
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages || pagination.pages}
                  onPageChange={changePage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Add to Ladder Modal (Instagram-Style Collection Selector) */}
      <Modal
        open={ladderModal.isOpen}
        isOpen={ladderModal.isOpen}
        onClose={() => setLadderModal({ isOpen: false, question: null })}
        title="Add to Ladder"
      >
        <div className="space-y-4 text-sm text-[#1E1F25]">
          {/* Selected Problem Info Card */}
          <div className="p-3.5 bg-[#F8F9FB] rounded-xl border border-[#E5E7EB]">
            <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
              Selected Problem
            </p>
            <p className="font-bold text-sm mt-0.5 text-[#1E1F25] line-clamp-1">
              {ladderModal.question?.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-gray-200 text-gray-700 uppercase">
                {ladderModal.question?.platform}
              </span>
              <span className="text-xs font-semibold text-[#6C5CE7]">
                {ladderModal.question?.difficulty || (ladderModal.question?.metadata?.rating ? `Rating: ${ladderModal.question.metadata.rating}` : 'Unrated')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              Choose Destination Ladders:
            </p>
            {userLadders.length > 0 && selectedLadderIds.size > 0 && (
              <span className="text-xs font-semibold text-[#6C5CE7] bg-[#6C5CE7]/10 px-2 py-0.5 rounded-full font-mono">
                {selectedLadderIds.size} selected
              </span>
            )}
          </div>

          {/* Quick Filter Search if more than 3 ladders */}
          {userLadders.length > 3 && (
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search ladders..."
                value={ladderSearch}
                onChange={(e) => setLadderSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#6C5CE7] text-gray-800"
              />
            </div>
          )}

          {loadingLadders ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : userLadders.length === 0 ? (
            <div className="p-6 text-center text-[#6B7280] border border-dashed rounded-xl">
              <p className="mb-2 text-xs">You haven't created any ladders yet.</p>
              <Link to="/ladders">
                <Button size="sm" className="bg-[#6C5CE7] text-white text-xs">
                  <Plus size={14} className="mr-1 inline" /> Create a Ladder
                </Button>
              </Link>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 pr-0.5">
              {userLadders
                .filter((l) =>
                  ladderSearch.trim()
                    ? l.title.toLowerCase().includes(ladderSearch.toLowerCase().trim())
                    : true
                )
                .map((ladder) => {
                  const ladderId = ladder._id || ladder.id;
                  const alreadyHas = Boolean(ladder.hasQuestion);
                  const isSelected = selectedLadderIds.has(ladderId);

                  if (alreadyHas) {
                    return (
                      <div
                        key={ladderId}
                        className="p-3 border border-gray-200 bg-gray-50/80 rounded-xl flex items-center justify-between text-gray-400 cursor-not-allowed select-none opacity-60"
                        title="This ladder already contains this problem"
                      >
                        <div className="flex items-center gap-3 truncate pr-2">
                          <div className="w-5 h-5 rounded-md bg-gray-200 border border-gray-300 flex items-center justify-center shrink-0">
                            <Check size={12} className="text-gray-500" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-sm text-gray-500 truncate">
                              {ladder.title}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {ladder.questionCount || 0} problems
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                          <Check size={10} /> Already in Ladder
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={ladderId}
                      onClick={() => toggleLadderSelection(ladderId)}
                      className={`p-3 border rounded-xl flex items-center justify-between transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'border-[#6C5CE7] bg-[#6C5CE7]/5 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate pr-2">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                            isSelected
                              ? 'bg-[#6C5CE7] border-[#6C5CE7] text-white shadow-xs'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check size={13} strokeWidth={3} />}
                        </div>
                        <div className="truncate">
                          <p className={`font-semibold text-sm truncate ${isSelected ? 'text-[#6C5CE7]' : 'text-[#1E1F25]'}`}>
                            {ladder.title}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {ladder.questionCount || 0} problems
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full transition-all shrink-0 ${
                          isSelected
                            ? 'bg-[#6C5CE7] text-white shadow-xs'
                            : 'text-gray-400 bg-gray-100 hover:text-gray-700'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLadderModal({ isOpen: false, question: null })}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveToLadders}
              disabled={selectedLadderIds.size === 0 || isSavingLadders}
              className="bg-[#6C5CE7] hover:bg-[#5A4AD1] text-white text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {isSavingLadders
                ? 'Adding...'
                : selectedLadderIds.size > 0
                ? `Add to ${selectedLadderIds.size} Ladder${selectedLadderIds.size > 1 ? 's' : ''}`
                : 'Select Ladders'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
