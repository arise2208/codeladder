import React, { useState, useEffect } from 'react';
import { Modal, Button, LoadingSpinner } from '../ui';
import { Search, Check, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../lib/api';
import toast from 'react-hot-toast';

export default function AddToLadderModal({
  isOpen,
  onClose,
  question,
}) {
  const [userLadders, setUserLadders] = useState([]);
  const [loadingLadders, setLoadingLadders] = useState(false);
  const [selectedLadderIds, setSelectedLadderIds] = useState(new Set());
  const [ladderSearch, setLadderSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !question) return;
    setSelectedLadderIds(new Set());
    setLadderSearch('');

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in to add problems to your ladders');
      onClose?.();
      return;
    }

    const loadLadders = async () => {
      try {
        setLoadingLadders(true);
        let qId = question._id || question.questionId;

        if (!qId) {
          const extId = question.code || question.externalId || question.slug || question.index;
          const platform = (question.platform || 'CODECHEF').toUpperCase();
          if (extId) {
            try {
              const { data } = await api.get('/questions', {
                params: { search: extId, platform, limit: 5 }
              });
              const match = (data.questions || []).find(
                (q) => String(q.externalId).toUpperCase() === String(extId).toUpperCase() ||
                       q.title?.toLowerCase() === (question.name || question.title)?.toLowerCase()
              );
              if (match?._id) qId = match._id;
            } catch {}
          }
        }

        const { data } = await api.get('/ladders', {
          params: qId ? { questionId: qId } : {}
        });
        const list = Array.isArray(data) ? data : data.ladders || [];
        setUserLadders(list);
      } catch (err) {
        toast.error('Failed to load ladders');
      } finally {
        setLoadingLadders(false);
      }
    };
    loadLadders();
  }, [isOpen, question, onClose]);

  const toggleLadderSelection = (ladderId) => {
    setSelectedLadderIds((prev) => {
      const next = new Set(prev);
      if (next.has(ladderId)) next.delete(ladderId);
      else next.add(ladderId);
      return next;
    });
  };

  const handleSaveToLadders = async () => {
    if (selectedLadderIds.size === 0 || !question) return;
    try {
      setIsSaving(true);
      let questionId = question._id || question.questionId;

      // If question came from upsolver (no _id), resolve or create it
      if (!questionId) {
        const extId = question.code || question.externalId || question.slug || question.index;
        const platform = (question.platform || 'CODECHEF').toUpperCase();

        // 1. Search existing question
        try {
          const { data } = await api.get('/questions', {
            params: { search: extId, platform, limit: 5 }
          });
          const match = (data.questions || []).find(
            (q) => String(q.externalId).toUpperCase() === String(extId).toUpperCase() ||
                   q.title?.toLowerCase() === (question.name || question.title)?.toLowerCase()
          );
          if (match?._id) questionId = match._id;
        } catch {}

        // 2. If not found, create it
        if (!questionId) {
          try {
            const { data } = await api.post('/questions', {
              platform,
              externalId: extId,
              title: question.title || question.name || extId,
              url: question.url,
              difficulty: question.difficulty || (question.rating >= 2000 ? 'HARD' : question.rating >= 1400 ? 'MEDIUM' : 'EASY'),
              rating: question.rating || undefined,
              tags: question.tags || (question.rating ? [`rating-${question.rating}`] : [])
            });
            questionId = data.question?._id || data._id;
          } catch {}
        }
      }

      if (!questionId) {
        toast.error('Could not resolve problem in catalog');
        return;
      }

      const ids = Array.from(selectedLadderIds);
      await Promise.all(
        ids.map((ladderId) =>
          api.post(`/ladders/${ladderId}/questions`, { questionId })
        )
      );

      toast.success(`Added to ${ids.length} ladder${ids.length > 1 ? 's' : ''}!`, { icon: '📁' });
      onClose?.();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add to ladders'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal open={isOpen} isOpen={isOpen} onClose={onClose} title="Add to Ladder">
      <div className="space-y-4 text-sm text-[#eff2f6]">
        {/* Selected Problem Info Card */}
        <div className="p-3.5 bg-[#1e1e1e] rounded-xl border border-[#383838]">
          <p className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">
            Selected Problem
          </p>
          <p className="font-bold text-sm mt-0.5 text-[#eff2f6] line-clamp-1">
            {question?.title || question?.name}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-[#282828] text-[#8b949e] uppercase">
              {question?.platform || 'CODECHEF'}
            </span>
            {question?.rating && (
              <span className="text-xs font-semibold text-[#58a6ff]">
                Rating: {question.rating}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[#8b949e] uppercase tracking-wider">
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
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
            <input
              type="text"
              placeholder="Search ladders..."
              value={ladderSearch}
              onChange={(e) => setLadderSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-[#383838] bg-[#1e1e1e] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#ffa116] text-[#eff2f6] placeholder:text-[#8b949e]"
            />
          </div>
        )}

        {loadingLadders ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : userLadders.length === 0 ? (
          <div className="p-6 text-center text-[#8b949e] border border-dashed border-[#383838] rounded-xl">
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
                      className="p-3 border border-[#383838] bg-[#1e1e1e]/60 rounded-xl flex items-center justify-between text-[#8b949e] cursor-not-allowed select-none opacity-60"
                      title="This ladder already contains this problem"
                    >
                      <div className="flex items-center gap-3 truncate pr-2">
                        <div className="w-5 h-5 rounded-md bg-[#282828] border border-[#383838] flex items-center justify-center shrink-0">
                          <Check size={12} className="text-[#8b949e]" />
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-sm text-[#8b949e] truncate">
                            {ladder.title}
                          </p>
                          <p className="text-[11px] text-[#8b949e]/80">
                            {ladder.questionCount || 0} problems
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-[#8b949e] bg-[#282828] px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
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
                        ? 'border-[#6C5CE7] bg-[#6C5CE7]/10 shadow-xs'
                        : 'border-[#383838] hover:border-[#484848] bg-[#1e1e1e]'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate pr-2">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                          isSelected
                            ? 'bg-[#6C5CE7] border-[#6C5CE7] text-white shadow-xs'
                            : 'border-[#383838] bg-[#282828]'
                        }`}
                      >
                        {isSelected && <Check size={13} strokeWidth={3} />}
                      </div>
                      <div className="truncate">
                        <p className={`font-semibold text-sm truncate ${isSelected ? 'text-[#6C5CE7]' : 'text-[#eff2f6]'}`}>
                          {ladder.title}
                        </p>
                        <p className="text-[11px] text-[#8b949e]">
                          {ladder.questionCount || 0} problems
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full transition-all shrink-0 ${
                        isSelected
                          ? 'bg-[#6C5CE7] text-white shadow-xs'
                          : 'text-[#8b949e] bg-[#282828] hover:text-[#eff2f6]'
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
        <div className="flex items-center justify-between pt-3 border-t border-[#383838]">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSaveToLadders}
            disabled={selectedLadderIds.size === 0 || isSaving}
            className="bg-[#6C5CE7] hover:bg-[#5b4bc4] text-white shadow-xs"
          >
            {isSaving ? 'Saving...' : `Save (${selectedLadderIds.size})`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
