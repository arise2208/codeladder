import React, { useState, useMemo } from 'react';
import { Layers, Plus, Sparkles, Globe, Search, AlertCircle, X, ShieldAlert, RefreshCw } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { LoadingSpinner, Modal, Button } from '../components/ui';
import LadderCard from '../components/shared/LadderCard';
import SyncAllButton from '../components/shared/SyncAllButton';
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
    voteLadder,
    refetch
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
      toast('This ladder is already public and listed in Community Ladders.', { icon: 'ℹ️' });
      return;
    }
    if (publicCount >= MAX_LADDERS_LIMIT) {
      toast.error(`You have reached the maximum limit of ${MAX_LADDERS_LIMIT} publicly listed ladders.`);
      return;
    }
    setPublishModal({
      isOpen: true,
      ladder,
      claimDescription: '',
      loading: false
    });
  };

  const handleConfirmPublish = async () => {
    if (!publishModal.claimDescription.trim()) {
      toast.error('Please describe what makes this ladder valuable to the community.');
      return;
    }
    try {
      setPublishModal(prev => ({ ...prev, loading: true }));
      await publishLadder(publishModal.ladder._id || publishModal.ladder.id, publishModal.claimDescription.trim());
      toast.success('Ladder successfully published to Community Ladders!');
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
      toast.error(getErrorMessage(err, 'Failed to cast vote'));
    }
  };

  const filteredMarketplace = useMemo(() => {
    if (!marketplaceSearch.trim()) return marketplaceLadders;
    const query = marketplaceSearch.trim().toLowerCase();
    return marketplaceLadders.filter(l =>
      l.title.toLowerCase().includes(query) ||
      (l.ownerUsername && l.ownerUsername.toLowerCase().includes(query)) ||
      (l.description && l.description.toLowerCase().includes(query))
    );
  }, [marketplaceLadders, marketplaceSearch]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ladders"
        breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Ladders' }]}
        actions={<SyncAllButton onSyncComplete={refetch} />}
      />

      {/* Non-fatal error banner with retry */}
      {error && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => refetch?.()} className="text-xs">
            <RefreshCw size={12} /> Retry
          </Button>
        </div>
      )}

      {/* Top Segment Control: My Ladders vs Community Marketplace */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#282828] p-2 rounded-xl border border-[#383838] shadow-xs">
        <div className="inline-flex bg-[#1a1a1a] rounded-lg p-1 gap-1 self-start border border-[#383838]">
          <button
            type="button"
            onClick={() => setActivePanel('MY_LADDERS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activePanel === 'MY_LADDERS'
                ? 'bg-[#ffa116] text-[#1a1a1a] shadow-xs'
                : 'text-[#8b949e] hover:text-[#eff2f6]'
            }`}
          >
            <Layers size={14} />
            <span>My Ladders</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activePanel === 'MY_LADDERS' ? 'bg-[#1a1a1a] text-[#ffa116]' : 'bg-[#282828] text-[#8b949e]'
            }`}>
              {ownedLadders.length}/{MAX_LADDERS_LIMIT}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePanel('MARKETPLACE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activePanel === 'MARKETPLACE'
                ? 'bg-[#ffa116] text-[#1a1a1a] shadow-xs'
                : 'text-[#8b949e] hover:text-[#eff2f6]'
            }`}
          >
            <Globe size={14} className={activePanel === 'MARKETPLACE' ? 'text-[#1a1a1a]' : 'text-[#ffa116]'} />
            <span>Community Ladders</span>
            {marketplaceLadders.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activePanel === 'MARKETPLACE' ? 'bg-[#1a1a1a] text-[#ffa116]' : 'bg-[#282828] text-[#8b949e]'
              }`}>
                {marketplaceLadders.length}
              </span>
            )}
          </button>
        </div>

        {activePanel === 'MY_LADDERS' && (
          <div className="text-xs text-[#8b949e] px-2 flex items-center gap-2">
            <span>Quota:</span>
            <span className="font-semibold text-[#eff2f6]">{ownedLadders.length} / {MAX_LADDERS_LIMIT} Created</span>
            <span>•</span>
            <span className="text-[#2cbb5d] font-semibold">{publicCount} / {MAX_LADDERS_LIMIT} Public</span>
          </div>
        )}
      </div>

      {/* ── PANEL 1: MY LADDERS ── */}
      {activePanel === 'MY_LADDERS' && (
        <div className="space-y-8">
          {/* Create New Ladder */}
          <div className="bg-[#282828] rounded-xl border border-[#383838] shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-[#383838] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus size={15} className="text-[#ffa116]" />
                <h3 className="text-xs font-bold text-[#eff2f6] uppercase tracking-wider">Create New Ladder</h3>
              </div>
              <span className="text-[11px] text-[#8b949e]">
                {ownedLadders.length >= MAX_LADDERS_LIMIT ? (
                  <span className="text-[#ffa116] font-semibold">Limit reached ({MAX_LADDERS_LIMIT}/{MAX_LADDERS_LIMIT})</span>
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
                className="flex-1 px-3.5 py-2 text-xs border border-[#383838] bg-[#1a1a1a] rounded-lg focus:outline-hidden focus:border-[#ffa116] text-[#eff2f6] placeholder:text-[#6e7681] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={creating || !title.trim() || ownedLadders.length >= MAX_LADDERS_LIMIT}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#ffa116] hover:bg-[#ffb84d] text-[#1a1a1a] text-xs font-bold rounded-lg shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Sparkles size={13} />
                {creating ? 'Creating...' : 'Create Ladder'}
              </button>
            </form>
          </div>

          {/* Ladders Grid */}
          {ladders.length === 0 ? (
            <div className="bg-[#282828] rounded-xl border border-dashed border-[#383838] p-14 text-center">
              <Layers size={40} className="mx-auto text-[#8b949e] mb-4 opacity-40" />
              <h3 className="text-base font-semibold text-[#eff2f6] mb-1">No ladders created yet</h3>
              <p className="text-xs text-[#8b949e] max-w-md mx-auto mb-4">
                Ladders are curated collections of problems. Create one above or explore community ladders in Community Ladders.
              </p>
              <button
                type="button"
                onClick={() => setActivePanel('MARKETPLACE')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#ffa116]/10 hover:bg-[#ffa116]/20 text-[#ffa116] rounded-lg text-xs font-semibold cursor-pointer border border-[#ffa116]/30 transition-colors"
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
                    <h2 className="text-xs font-bold text-[#eff2f6] uppercase tracking-wider">My Ladders</h2>
                    <span className="text-[10px] font-mono font-medium bg-[#1a1a1a] text-[#ffa116] border border-[#383838] px-2 py-0.5 rounded-full">
                      {ownedLadders.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
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
                    <h2 className="text-xs font-bold text-[#eff2f6] uppercase tracking-wider">Shared With Me</h2>
                    <span className="text-[10px] font-mono font-medium bg-[#1a1a1a] text-[#8b949e] border border-[#383838] px-2 py-0.5 rounded-full">
                      {sharedLadders.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
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
          <div className="bg-[#282828] text-[#eff2f6] rounded-xl p-5 shadow-sm border border-[#383838] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-[#ffa116]" />
                <h3 className="font-bold text-base">Community Ladders</h3>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#ffa116]/20 text-[#ffa116] border border-[#ffa116]/30">
                  Public
                </span>
              </div>
              <p className="text-xs text-[#8b949e] max-w-xl">
                Discover problem collections published by community members with their personal strategy and claims. Pick any ladder to start solving and practicing.
              </p>
            </div>

            {/* Search Box */}
            <div className="relative min-w-[240px] md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
              <input
                type="text"
                placeholder="Search by title, author, or claim..."
                value={marketplaceSearch}
                onChange={(e) => setMarketplaceSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 bg-[#1a1a1a] text-[#eff2f6] placeholder:text-[#6e7681] border border-[#383838] rounded-lg focus:outline-hidden focus:border-[#ffa116]"
              />
              {marketplaceSearch && (
                <button
                  type="button"
                  onClick={() => setMarketplaceSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#eff2f6] cursor-pointer"
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
            <div className="bg-[#282828] rounded-xl border border-dashed border-[#383838] p-14 text-center">
              <Globe size={40} className="mx-auto text-[#8b949e] mb-3 opacity-40" />
              <h3 className="text-base font-semibold text-[#eff2f6] mb-1">
                {marketplaceSearch ? 'No matching community ladders' : 'No public community ladders listed yet'}
              </h3>
              <p className="text-xs text-[#8b949e] max-w-md mx-auto mb-4">
                {marketplaceSearch
                  ? 'Try searching for another topic, keyword, or author handle.'
                  : 'Be the first to share your curated collection with the community! Go to My Ladders and click "Publish".'}
              </p>
              {marketplaceSearch ? (
                <button
                  type="button"
                  onClick={() => setMarketplaceSearch('')}
                  className="text-xs font-semibold text-[#ffa116] hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActivePanel('MY_LADDERS')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#ffa116] hover:bg-[#ffb84d] text-[#1a1a1a] rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Go to My Ladders
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
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
        <div className="space-y-4 text-sm text-[#eff2f6]">
          {/* Target Ladder Info */}
          <div className="p-3.5 bg-[#1a1a1a] rounded-xl border border-[#383838]">
            <p className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">
              Ladder to Publish
            </p>
            <p className="font-bold text-sm mt-0.5 text-[#eff2f6]">
              {publishModal.ladder?.title}
            </p>
            <p className="text-xs text-[#8b949e] mt-1">
              {publishModal.ladder?.questionCount || 0} questions included
            </p>
          </div>

          {/* Irreversible Rule Warning */}
          <div className="p-3 bg-[#ffa116]/10 rounded-xl border border-[#ffa116]/30 text-[#eff2f6] space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[#ffa116]">
              <ShieldAlert size={14} className="text-[#ffa116]" />
              <span>Permanent Community Listing</span>
            </div>
            <p className="text-[11px] text-[#eff2f6] leading-relaxed">
              Once publicly listed, <strong>this ladder cannot be reverted back to private</strong>. However, you can delete the ladder at any time if you wish to remove it.
            </p>
            <p className="text-[11px] text-[#8b949e]">
              You can have at most <strong>{MAX_LADDERS_LIMIT}</strong> publicly listed ladders.
            </p>
          </div>

          {/* Author Claim Textarea */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#eff2f6]">
              What do you claim for this ladder? <span className="text-[#ef4743]">*</span>
            </label>
            <p className="text-[11px] text-[#8b949e]">
              State what makes this ladder valuable (e.g. topic mastery, difficulty curve, interview prep guarantee).
            </p>
            <textarea
              rows={3}
              value={publishModal.claimDescription}
              onChange={(e) => setPublishModal(prev => ({ ...prev, claimDescription: e.target.value }))}
              placeholder="e.g. 40 essential problems covering dynamic programming from basic 1D DP to advanced tree and digit DP..."
              className="w-full text-xs p-3 border border-[#383838] bg-[#1a1a1a] text-[#eff2f6] placeholder:text-[#6e7681] rounded-xl focus:outline-hidden focus:border-[#ffa116]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-[#383838]">
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
              className="bg-[#ffa116] hover:bg-[#ffb84d] text-[#1a1a1a] text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {publishModal.loading ? 'Publishing...' : 'Publish to Community Ladders'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
