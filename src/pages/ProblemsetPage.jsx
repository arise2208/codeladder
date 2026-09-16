import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import useQuestions from '../hooks/useQuestions';
import api, { getErrorMessage } from '../lib/api';
import PageHeader from '../components/layout/PageHeader';
import QuestionFilters from '../components/shared/QuestionFilters';
import QuestionRow from '../components/shared/QuestionRow';
import BaseTable from '../components/shared/BaseTable';
import AddToLadderModal from '../components/shared/AddToLadderModal';
import TopicExplorer from '../components/shared/TopicExplorer';
import SyncAllButton from '../components/shared/SyncAllButton';
import { Pagination, LoadingSpinner, EmptyState, Modal, Button } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { useStarred } from '../context/StarredContext';
import { Layers, CheckCircle2, Star, HelpCircle, Plus, Check, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProblemsetPage() {
  const { user } = useAuth();
  const { questions, pagination, filters, loading, error, changePage, updateFilters } = useQuestions();

  const { isStarred, toggleStar, starredCount } = useStarred();

  const [solvedMap, setSolvedMap] = useState({});
  const [syncTick, setSyncTick] = useState(0);

  // Add to Ladder modal state
  const [ladderModal, setLadderModal] = useState({ isOpen: false, question: null });

  // Fetch solved status
  const fetchUserData = useCallback(async () => {
    if (!user) return;
    try {
      const solvedRes = await api.get('/me/questions/solved');
      const smap = {};
      const solvedList = solvedRes.data.questions || (Array.isArray(solvedRes.data) ? solvedRes.data : []);
      solvedList.forEach((q) => {
        const key = q._id || q.questionId?._id || q.questionId;
        if (key) {
          smap[key] = {
            solved: true,
            verified: Boolean(q.state?.verified),
            verificationMethod: q.state?.verificationMethod || 'UNVERIFIED'
          };
        }
      });
      setSolvedMap(smap);
    } catch (err) {
      console.error('Failed to load user solved data', err);
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData, syncTick]);

  // Listen to cross-tab storage changes (e.g. sync from another tab or modal)
  useEffect(() => {
    const handleStorage = (e) => {
      if (
        e.key === 'cf_solved_problems' ||
        e.key === 'lc_solved_problems' ||
        e.key === 'cc_solved_problems' ||
        e.key === 'sync_all_last_at'
      ) {
        setSyncTick((t) => t + 1);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Determine if a problem is solved via backend solved list or synced platforms
  const isQuestionSolved = useCallback((q) => {
    if (!q) return false;
    if (solvedMap[q._id] || q.isSolved || q.state?.solved) return true;
    try {
      const plat = (q.platform || '').toUpperCase();
      const extId = String(q.externalId || q.metadata?.index || '');
      if (plat === 'CODEFORCES') {
        const cf = JSON.parse(localStorage.getItem('cf_solved_problems') || '[]');
        if (cf.includes(extId) || cf.includes(extId.replace('-', ''))) return true;
        if (q.metadata?.contestId && q.metadata?.index) {
          if (cf.includes(`${q.metadata.contestId}-${q.metadata.index}`)) return true;
          if (cf.includes(`${q.metadata.contestId}${q.metadata.index}`)) return true;
        }
      } else if (plat === 'LEETCODE') {
        const lc = JSON.parse(localStorage.getItem('lc_solved_problems') || '[]');
        const lcLower = lc.map((s) => String(s).toLowerCase());
        const qSlug = (q.slug || (q.url || '').replace(/\/+$/, '').split('/').pop() || '').toLowerCase();
        if (lcLower.includes(extId.toLowerCase())) return true;
        if (qSlug && lcLower.includes(qSlug)) return true;
      } else if (plat === 'CODECHEF') {
        const cc = JSON.parse(localStorage.getItem('cc_solved_problems') || '[]');
        const ccUpper = cc.map((c) => String(c).toUpperCase());
        if (ccUpper.includes(extId.toUpperCase())) return true;
        if (q.code && ccUpper.includes(String(q.code).toUpperCase())) return true;
      }
    } catch {}
    return false;
  }, [solvedMap, syncTick]);

  const isQuestionVerified = useCallback((q) => {
    if (!q) return false;
    const entry = solvedMap[q._id];
    if (entry && typeof entry === 'object' && entry.verified !== undefined) {
      return Boolean(entry.verified);
    }
    return Boolean(q.state?.verified);
  }, [solvedMap]);

  // Open Add to Ladder modal
  const handleOpenLadderModal = (question) => {
    if (!user) {
      toast.error('Please log in to add problems to your ladders');
      return;
    }
    setLadderModal({ isOpen: true, question });
  };

  const displayedQuestions = useMemo(() => {
    if (!filters.hideSolved) return questions;
    return questions.filter((q) => !isQuestionSolved(q));
  }, [questions, filters.hideSolved, isQuestionSolved]);

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

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Problemset"
          breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Problemset' }]}
        />

        {/* Quick Stats Pill Header & Sync All */}
        {user && (
          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
            <SyncAllButton
              size="sm"
              onSyncComplete={() => {
                fetchUserData();
                setSyncTick((t) => t + 1);
              }}
            />
            <div className="flex items-center gap-3 bg-[#161b22] px-3.5 py-1.5 rounded-xl border border-[#30363d] text-xs shadow-xs">
              <span className="flex items-center gap-1.5 font-semibold text-[#3fb950]">
                <CheckCircle2 size={14} /> {solvedCount} Solved
              </span>
              <span className="text-[#30363d]">•</span>
              <Link
                to="/starred"
                className="flex items-center gap-1.5 font-semibold text-[#e3b341] hover:underline transition-all"
                title="View all starred problems"
              >
                <Star size={14} className="fill-amber-400 text-amber-400" /> {starredCount} Starred
              </Link>
              {pagination.total > 0 && (
                <>
                  <span className="text-[#30363d]">•</span>
                  <span className="text-[#8b949e] font-medium">{pagination.total} in Catalog</span>
                </>
              )}
            </div>
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
      <div className="bg-[#161b22] rounded-xl border border-[#30363d] shadow-sm p-4">
        <QuestionFilters
          filters={filters}
          onFilterChange={updateFilters}
          onChange={updateFilters}
          onPickRandom={handlePickRandom}
        />
      </div>

      {/* Questions Data Table */}
      {loading ? (
        <div className="bg-[#161b22] rounded-xl border border-[#30363d] shadow-sm py-20 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-[#161b22] rounded-xl border border-[#30363d] shadow-sm py-20 text-center text-red-400">{error}</div>
      ) : displayedQuestions.length === 0 ? (
        <EmptyState
          title="No questions found"
          description="Try adjusting your platform, difficulty, or search query."
        />
      ) : (
        <BaseTable
          className="bg-[#161b22] border-[#30363d]"
          headerClassName="bg-[#161b22] text-[#8b949e] border-b border-[#30363d]"
          bodyClassName="divide-y divide-[#21262d]"
          headers={
            <tr>
              <th className="px-3 py-3.5 font-medium w-12 text-center" title="Starred / Saved">
                <Star size={14} className="inline text-gray-500" />
              </th>
              <th className="px-4 py-3.5 font-medium">Problem Title</th>
              <th className="px-4 py-3.5 font-medium w-32">Platform</th>
              <th className="px-4 py-3.5 font-medium w-32">
                {filters.platform === 'CODEFORCES' || filters.platform === 'CODECHEF' ? 'Rating' : !filters.platform || filters.platform === 'ALL' ? 'Difficulty / Rating' : 'Difficulty'}
              </th>
              <th className="px-4 py-3.5 font-medium">Tags</th>
              <th className="px-4 py-3.5 font-medium text-right w-44">Actions</th>
            </tr>
          }
          footer={
            (pagination.totalPages > 1 || pagination.pages > 1) ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-[#8b949e]">
                  Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages || pagination.pages}</strong> ({pagination.total} total problems)
                </span>
                <Pagination
                  page={pagination.page}
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages || pagination.pages}
                  onPageChange={changePage}
                />
              </div>
            ) : null
          }
        >
          {displayedQuestions.map((q) => (
            <QuestionRow
              key={q._id}
              question={q}
              isSolved={Boolean(isQuestionSolved(q))}
              isVerified={Boolean(isQuestionVerified(q))}
              isStarred={Boolean(isStarred(q._id))}
              onStar={() => toggleStar(q._id)}
              onAddToLadder={user ? handleOpenLadderModal : null}
              onSelectTag={(tag) => updateFilters({ tag })}
            />
          ))}
        </BaseTable>
      )}

      {/* Add to Ladder Modal */}
      {ladderModal.isOpen && (
        <AddToLadderModal
          isOpen={ladderModal.isOpen}
          onClose={() => setLadderModal({ isOpen: false, question: null })}
          question={ladderModal.question}
        />
      )}
    </div>
  );
}
