import React, { useState, useMemo } from 'react';
import { Layers, Plus, Sparkles, Globe, Search, Share2, AlertCircle, X, ShieldAlert } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { LoadingSpinner, Modal, Button } from '../components/ui';
import LadderCard from '../components/shared/LadderCard';
import useLadders from '../hooks/useLadders';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../lib/api';

const MAX_LADDERS_LIMIT = 10;

export default function LaddersPage() {
  const {
    ladders,
    marketplaceLadders,
    loading,
    loadingMarketplace,
    error,
    createLadder,
    deleteLadder,
    publishLadder,
    voteLadder
  } = useLadders();

  const [activePanel, setActivePanel] = useState('MY_LADDERS'); // 'MY_LADDERS' | 'MARKETPLACE'
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // Marketplace search
  const [marketplaceSearch, setMarketplaceSearch] = useState('');

  // Publish Modal State
  const [publishModal, setPublishModal] = useState({
    isOpen: false,
    ladder: null,
    claimDescription: '',
    loading: false
  });

  const ownedLadders = useMemo(() => ladders.filter(l => l.role === 'OWNER'), [ladders]);
  const sharedLadders = useMemo(() => ladders.filter(l => l.role !== 'OWNER'), [ladders]);
  const publicCount = useMemo(() => ownedLadders.filter(l => l.isPublic).length, [ownedLadders]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (ownedLadders.length >= MAX_LADDERS_LIMIT) {
      toast.error(`You have reached the maximum limit of ${MAX_LADDERS_LIMIT} ladders per account.`);
      return;
    }
    try {
      setCreating(true);
      await createLadder(title);
      setTitle('');
      toast.success('Ladder created successfully');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create ladder'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this ladder? If it is publicly listed, it will be removed from Community Ladders.')) {
      try {
        await deleteLadder(id);
        toast.success('Ladder deleted');
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to delete ladder'));
      }
    }
  };

  const handleOpenPublishModal = (ladder) => {
    if (ladder.isPublic) {
      toast('This ladder is already listed in Community Ladders', { icon: '🌐' });
      return;
    }
    if (publicCount >= MAX_LADDERS_LIMIT) {
      toast.error(`You can have at most ${MAX_LADDERS_LIMIT} publicly listed ladders.`);
      return;
    }
    setPublishModal({
      isOpen: true,
      ladder,
      claimDescription: ladder.description || '',
      loading: false
    });
  };

  const handleConfirmPublish = async () => {
    if (!publishModal.claimDescription.trim()) {
      toast.error('Please describe what you claim for this ladder (e.g. topic coverage, target rating).');
      return;
    }

    try {
      setPublishModal(prev => ({ ...prev, loading: true }));
      await publishLadder(publishModal.ladder._id, publishModal.claimDescription.trim());
      toast.success('Ladder successfully published to Community Ladders!', { icon: '🚀' });
      setPublishModal({ isOpen: false, ladder: null, claimDescription: '', loading: false });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to publish ladder'));
      setPublishModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleVote = async (ladderId, vote) => {
    try {
      await voteLadder(ladderId, vote);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update vote'));
    }
  };

  const filteredMarketplace = useMemo(() => {
    if (!marketplaceSearch.trim()) return marketplaceLadders;
    const query = marketplaceSearch.toLowerCase().trim();
    return marketplaceLadders.filter(l =>
      l.title.toLowerCase().includes(query) ||
      (l.ownerUsername && l.ownerUsername.toLowerCase().includes(query)) ||
      (l.description && l.description.toLowerCase().includes(query))
    );
  }, [marketplaceLadders, marketplaceSearch]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ladders"
        breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Ladders' }]}
      />

      {/* Top Segment Control: My Ladders vs Community Marketplace */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded-xl border border-[#E5E7EB] shadow-xs">
        <div className="inline-flex bg-[#F3F4F6] rounded-lg p-1 gap-1 self-start">
          <button
            type="button"
            onClick={() => setActivePanel('MY_LADDERS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activePanel === 'MY_LADDERS'
                ? 'bg-white text-[#1E1F25] shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Layers size={14} />
            <span>My Ladders</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activePanel === 'MY_LADDERS' ? 'bg-[#1E1F25] text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {ownedLadders.length}/{MAX_LADDERS_LIMIT}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePanel('MARKETPLACE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activePanel === 'MARKETPLACE'
                ? 'bg-white text-[#1E1F25] shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Globe size={14} className={activePanel === 'MARKETPLACE' ? 'text-[#6C5CE7]' : ''} />
            <span>Community Ladders</span>
            {marketplaceLadders.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activePanel === 'MARKETPLACE' ? 'bg-[#6C5CE7] text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {marketplaceLadders.length}
              </span>
            )}
          </button>
        </div>

        {activePanel === 'MY_LADDERS' && (
          <div className="text-xs text-gray-500 px-2 flex items-center gap-2">
            <span>Quota:</span>
            <span className="font-semibold text-gray-800">{ownedLadders.length} / {MAX_LADDERS_LIMIT} Created</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">{publicCount} / {MAX_LADDERS_LIMIT} Public</span>
          </div>
        )}
      </div>

      {/* ── PANEL 1: MY LADDERS ── */}
      {activePanel === 'MY_LADDERS' && (
        <div className="space-y-8">
          {/* Create New Ladder */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-[#F3F4F6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus size={15} className="text-[#6C5CE7]" />
                <h3 className="text-xs font-bold text-[#1E1F25] uppercase tracking-wider">Create New Ladder</h3>
              </div>
              <span className="text-[11px] text-gray-400">
                {ownedLadders.length >= MAX_LADDERS_LIMIT ? (
                  <span className="text-amber-600 font-semibold">Limit reached ({MAX_LADDERS_LIMIT}/{MAX_LADDERS_LIMIT})</span>
                ) : (
                  `${MAX_LADDERS_LIMIT - ownedLadders.length} remaining slots`
                )}
              </span>
            </div>

            <form onSubmit={handleCreate} className="p-4 flex gap-3 items-center">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={ownedLadders.length >= MAX_LADDERS_LIMIT}
                placeholder={
                  ownedLadders.length >= MAX_LADDERS_LIMIT
                    ? `You have reached the maximum limit of ${MAX_LADDERS_LIMIT} ladders.`
                    : 'e.g. Dynamic Programming Master, Graph Algorithms, Codeforces Div 2...'
                }
                className="flex-1 px-3.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#6C5CE7] text-gray-800 placeholder:text-gray-400 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={creating || !title.trim() || ownedLadders.length >= MAX_LADDERS_LIMIT}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6C5CE7] hover:bg-[#5A4AD1] text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Sparkles size={13} />
                {creating ? 'Creating...' : 'Create Ladder'}
              </button>
            </form>
          </div>

          {/* Ladders Grid */}
          {ladders.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-14 text-center">
              <Layers size={40} className="mx-auto text-gray-200 mb-4" />
              <h3 className="text-base font-semibold text-gray-700 mb-1">No ladders created yet</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto mb-4">
                Ladders are curated collections of problems. Create one above or explore community ladders in Community Ladders.
              </p>
              <button
                type="button"
                onClick={() => setActivePanel('MARKETPLACE')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#6C5CE7]/10 hover:bg-[#6C5CE7]/20 text-[#6C5CE7] rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Globe size={13} /> Browse Community Ladders
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* My Ladders */}
              {ownedLadders.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-xs font-bold text-[#1E1F25] uppercase tracking-wider">My Ladders</h2>
                    <span className="text-[10px] font-mono font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {ownedLadders.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {ownedLadders.map(ladder => (
                      <LadderCard
                        key={ladder._id || ladder.id}
                        ladder={ladder}
                        onDelete={() => handleDelete(ladder._id || ladder.id)}
                        onPublish={handleOpenPublishModal}
                        onVote={handleVote}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Shared With Me */}
              {sharedLadders.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-xs font-bold text-[#1E1F25] uppercase tracking-wider">Shared With Me</h2>
                    <span className="text-[10px] font-mono font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {sharedLadders.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sharedLadders.map(ladder => (
                      <LadderCard
                        key={ladder._id || ladder.id}
                        ladder={ladder}
                        onVote={handleVote}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PANEL 2: COMMUNITY LADDERS ── */}
      {activePanel === 'MARKETPLACE' && (
        <div className="space-y-6">
          {/* Community Ladders Banner */}
          <div className="bg-gradient-to-r from-[#1E1F25] to-[#2B2D42] text-white rounded-xl p-5 shadow-sm border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-[#A29BFE]" />
                <h3 className="font-bold text-base">Community Ladders</h3>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#6C5CE7]/30 text-[#A29BFE] border border-[#6C5CE7]/50">
                  Public
                </span>
              </div>
              <p className="text-xs text-gray-300 max-w-xl">
                Discover problem collections published by community members with their personal strategy and claims. Pick any ladder to start solving and practicing.
              </p>
            </div>

            {/* Search Box */}
            <div className="relative min-w-[240px] md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, author, or claim..."
                value={marketplaceSearch}
                onChange={(e) => setMarketplaceSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 bg-white/10 text-white placeholder:text-gray-400 border border-white/20 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#A29BFE]"
              />
              {marketplaceSearch && (
                <button
                  type="button"
                  onClick={() => setMarketplaceSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Community Ladders Grid */}
          {loadingMarketplace ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : filteredMarketplace.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-14 text-center">
              <Globe size={40} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-base font-semibold text-gray-700 mb-1">
                {marketplaceSearch ? 'No matching community ladders' : 'No public community ladders listed yet'}
              </h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto mb-4">
                {marketplaceSearch
                  ? 'Try searching for another topic, keyword, or author handle.'
                  : 'Be the first to share your curated collection with the community! Go to My Ladders and click "Publish".'}
              </p>
              {marketplaceSearch ? (
                <button
                  type="button"
                  onClick={() => setMarketplaceSearch('')}
                  className="text-xs font-semibold text-[#6C5CE7] hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActivePanel('MY_LADDERS')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#6C5CE7] hover:bg-[#5A4AD1] text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Go to My Ladders
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMarketplace.map(ladder => (
                <LadderCard
                  key={ladder._id || ladder.id}
                  ladder={ladder}
                  isMarketplace={true}
                  onVote={handleVote}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Publish to Community Ladders Modal ── */}
      <Modal
        open={publishModal.isOpen}
        isOpen={publishModal.isOpen}
        onClose={() => setPublishModal({ isOpen: false, ladder: null, claimDescription: '', loading: false })}
        title="Publish Ladder to Community Ladders"
      >
        <div className="space-y-4 text-sm text-[#1E1F25]">
          {/* Target Ladder Info */}
          <div className="p-3.5 bg-[#F8F9FB] rounded-xl border border-[#E5E7EB]">
            <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
              Ladder to Publish
            </p>
            <p className="font-bold text-sm mt-0.5 text-[#1E1F25]">
              {publishModal.ladder?.title}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {publishModal.ladder?.questionCount || 0} questions included
            </p>
          </div>

          {/* Irreversible Rule Warning */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert size={14} className="text-amber-700" />
              <span>Permanent Community Listing</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Once publicly listed, <strong>this ladder cannot be reverted back to private</strong>. However, you can delete the ladder at any time if you wish to remove it.
            </p>
            <p className="text-[11px] text-amber-800">
              You can have at most <strong>{MAX_LADDERS_LIMIT}</strong> publicly listed ladders.
            </p>
          </div>

          {/* Author Claim Textarea */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              What do you claim for this ladder? <span className="text-red-500">*</span>
            </label>
            <p className="text-[11px] text-gray-500">
              State what makes this ladder valuable (e.g. topic mastery, difficulty curve, interview prep guarantee).
            </p>
            <textarea
              rows={3}
              value={publishModal.claimDescription}
              onChange={(e) => setPublishModal(prev => ({ ...prev, claimDescription: e.target.value }))}
              placeholder="e.g. 40 essential problems covering dynamic programming from basic 1D DP to advanced tree and digit DP..."
              className="w-full text-xs p-3 border border-gray-300 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#6C5CE7] text-gray-800 placeholder:text-gray-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPublishModal({ isOpen: false, ladder: null, claimDescription: '', loading: false })}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmPublish}
              disabled={publishModal.loading || !publishModal.claimDescription.trim()}
              className="bg-[#6C5CE7] hover:bg-[#5A4AD1] text-white text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {publishModal.loading ? 'Publishing...' : 'Publish to Community Ladders'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
