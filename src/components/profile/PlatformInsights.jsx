import React, { useState, useMemo, useEffect } from 'react';
import { RefreshCw, Check, Database, Radio, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import RatingHeatmap from './RatingHeatmap';
import ProblemRatingsChart from './ProblemRatingsChart';
import TagsDonutChart from './TagsDonutChart';
import {
  fetchCodeforcesData,
  fetchAtCoderData,
  fetchLeetCodeData,
  fetchCodeChefData
} from '../../lib/platformSync';

const PLATFORMS = [
  { id: 'ALL', name: 'All Platforms', badgeColor: '#6C5CE7' },
  { id: 'CODEFORCES', name: 'Codeforces', badgeColor: '#3B82F6', defaultHandlePlaceholder: 'Codeforces handle' },
  { id: 'LEETCODE', name: 'LeetCode', badgeColor: '#F59E0B', defaultHandlePlaceholder: 'LeetCode username' },
  { id: 'CODECHEF', name: 'CodeChef', badgeColor: '#EA580C', defaultHandlePlaceholder: 'CodeChef username' },
  { id: 'ATCODER', name: 'AtCoder', badgeColor: '#10B981', defaultHandlePlaceholder: 'AtCoder username' }
];

const VIEW_MODES = {
  CODELADDER: 'CODELADDER',
  LIVE_API: 'LIVE_API'
};

export default function PlatformInsights({
  solvedQuestions = [],
  platformAccounts = [],
  currentUser = null,
  availableYears = []
}) {
  const [activePlatform, setActivePlatform] = useState('ALL');
  const [viewMode, setViewMode] = useState(VIEW_MODES.CODELADDER);
  const [handles, setHandles] = useState({
    CODEFORCES: '',
    LEETCODE: '',
    CODECHEF: '',
    ATCODER: ''
  });
  const [syncedByPlatform, setSyncedByPlatform] = useState({
    CODEFORCES: [],
    LEETCODE: [],
    CODECHEF: [],
    ATCODER: []
  });
  const [syncingMap, setSyncingMap] = useState({});

  // Populate handles from connected platform accounts
  useEffect(() => {
    const updated = { ...handles };
    (platformAccounts || []).forEach((acc) => {
      const p = acc.platform?.toUpperCase();
      if (p && acc.handle) {
        updated[p] = acc.handle.replace(/^@/, '').trim();
      }
    });

    if (!updated.CODEFORCES && currentUser?.username) {
      updated.CODEFORCES = currentUser.username;
    }

    setHandles((prev) => ({ ...prev, ...updated }));
  }, [platformAccounts, currentUser]);

  // Sync a single platform — auto-switch to Live API view
  const syncPlatform = async (platformId) => {
    const handle = (handles[platformId] || '').trim();
    if (!handle) {
      toast.error(`Please enter a ${platformId} handle/username to sync.`);
      return;
    }

    try {
      setSyncingMap((prev) => ({ ...prev, [platformId]: true }));

      let results = [];
      if (platformId === 'CODEFORCES') {
        results = await fetchCodeforcesData(handle);
      } else if (platformId === 'ATCODER') {
        results = await fetchAtCoderData(handle);
      } else if (platformId === 'LEETCODE') {
        results = await fetchLeetCodeData(handle);
      } else if (platformId === 'CODECHEF') {
        results = await fetchCodeChefData(handle);
      }

      setSyncedByPlatform((prev) => ({
        ...prev,
        [platformId]: results
      }));

      // Auto-switch to Live API view after syncing
      setViewMode(VIEW_MODES.LIVE_API);

      toast.success(`Synced ${results.length} live submissions for ${platformId} (@${handle})!`);
    } catch (err) {
      console.error(`Sync error for ${platformId}:`, err);
      toast.error(err.message || `Failed to sync ${platformId} activity.`);
    } finally {
      setSyncingMap((prev) => ({ ...prev, [platformId]: false }));
    }
  };

  // Sync all available platforms in parallel
  const syncAllPlatforms = async () => {
    const platformsToSync = ['CODEFORCES', 'LEETCODE', 'CODECHEF', 'ATCODER'].filter(
      (p) => Boolean(handles[p]?.trim())
    );

    if (platformsToSync.length === 0) {
      toast.error('No platform handles found to sync. Connect an account in Settings or enter a handle.');
      return;
    }

    toast.loading('Syncing all connected platforms in parallel...', { id: 'sync-all' });
    let totalSynced = 0;

    await Promise.allSettled(
      platformsToSync.map(async (plat) => {
        try {
          setSyncingMap((prev) => ({ ...prev, [plat]: true }));
          let results = [];
          if (plat === 'CODEFORCES') results = await fetchCodeforcesData(handles[plat]);
          else if (plat === 'ATCODER') results = await fetchAtCoderData(handles[plat]);
          else if (plat === 'LEETCODE') results = await fetchLeetCodeData(handles[plat]);
          else if (plat === 'CODECHEF') results = await fetchCodeChefData(handles[plat]);

          setSyncedByPlatform((prev) => ({ ...prev, [plat]: results }));
          totalSynced += results.length;
        } catch (e) {
          console.error(`Sync error for ${plat}:`, e);
        } finally {
          setSyncingMap((prev) => ({ ...prev, [plat]: false }));
        }
      })
    );

    setViewMode(VIEW_MODES.LIVE_API);
    toast.success(`Sync complete! Loaded ${totalSynced} live platform submissions.`, { id: 'sync-all' });
  };

  // Reset to CodeLadder view and clear synced data
  const resetToCodeLadder = () => {
    setViewMode(VIEW_MODES.CODELADDER);
    setSyncedByPlatform({
      CODEFORCES: [],
      LEETCODE: [],
      CODECHEF: [],
      ATCODER: []
    });
    toast.success('Switched to CodeLadder data view.');
  };

  // SEPARATE data sources — never merged
  const filteredQuestions = useMemo(() => {
    let base;

    if (viewMode === VIEW_MODES.CODELADDER) {
      // Only CodeLadder internal data (problems the user marked as solved on the site)
      base = [...(solvedQuestions || [])];
    } else {
      // Only external API-synced data
      base = [
        ...(syncedByPlatform.CODEFORCES || []),
        ...(syncedByPlatform.LEETCODE || []),
        ...(syncedByPlatform.CODECHEF || []),
        ...(syncedByPlatform.ATCODER || [])
      ];
    }

    if (activePlatform === 'ALL') {
      return base;
    }

    return base.filter((q) => q.platform?.toUpperCase() === activePlatform);
  }, [solvedQuestions, syncedByPlatform, activePlatform, viewMode]);

  const totalSyncedCount = Object.values(syncedByPlatform).reduce((acc, cur) => acc + cur.length, 0);
  const currentHandle = activePlatform !== 'ALL' ? handles[activePlatform] || '' : '';
  const isCurrentSyncing = activePlatform !== 'ALL' ? Boolean(syncingMap[activePlatform]) : Object.values(syncingMap).some(Boolean);
  const activeHandleDisplay = currentHandle || currentUser?.username || '';

  const isLiveMode = viewMode === VIEW_MODES.LIVE_API;

  return (
    <div className="space-y-6">
      {/* ── View Mode Toggle ── */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        {/* Segmented Control */}
        <div className="flex items-center justify-between gap-3 p-3.5 border-b border-[#F3F4F6]">
          <div className="inline-flex bg-[#F3F4F6] rounded-lg p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => setViewMode(VIEW_MODES.CODELADDER)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                !isLiveMode
                  ? 'bg-white text-[#1E1F25] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Database size={13} />
              <span>My CodeLadder</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                !isLiveMode ? 'bg-[#1E1F25] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {(solvedQuestions || []).length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode(VIEW_MODES.LIVE_API)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                isLiveMode
                  ? 'bg-white text-[#1E1F25] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Radio size={13} />
              <span>Live API</span>
              {totalSyncedCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  isLiveMode ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {totalSyncedCount}
                </span>
              )}
            </button>
          </div>

          {/* Reset / Sync controls */}
          <div className="flex items-center gap-2">
            {isLiveMode && totalSyncedCount > 0 && (
              <button
                type="button"
                onClick={resetToCodeLadder}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-gray-600 hover:text-gray-900 text-xs font-medium rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Reset View</span>
              </button>
            )}
          </div>
        </div>

        {/* Platform Selector Tabs + Live Sync Bar */}
        <div className="p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Platform Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {PLATFORMS.map((plat) => {
              const isActive = activePlatform === plat.id;

              // Count based on current view mode
              let count;
              if (viewMode === VIEW_MODES.CODELADDER) {
                const codeladderData = solvedQuestions || [];
                count = plat.id === 'ALL'
                  ? codeladderData.length
                  : codeladderData.filter((q) => q.platform?.toUpperCase() === plat.id).length;
              } else {
                count = plat.id === 'ALL'
                  ? totalSyncedCount
                  : (syncedByPlatform[plat.id] || []).length;
              }

              return (
                <button
                  key={plat.id}
                  type="button"
                  onClick={() => setActivePlatform(plat.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1E1F25] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: plat.badgeColor }}
                  />
                  <span>{plat.name}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Live Sync Bar — only shown in Live API mode */}
          {isLiveMode && (
            <div className="flex items-center gap-2 self-end lg:self-auto">
              {activePlatform === 'ALL' ? (
                <button
                  type="button"
                  onClick={syncAllPlatforms}
                  disabled={isCurrentSyncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#6C5CE7] hover:bg-[#5A4AD1] text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw size={13} className={isCurrentSyncing ? 'animate-spin' : ''} />
                  <span>{isCurrentSyncing ? 'Syncing All...' : 'Sync All Live'}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder={PLATFORMS.find((p) => p.id === activePlatform)?.defaultHandlePlaceholder || 'Username / Handle...'}
                    value={handles[activePlatform] || ''}
                    onChange={(e) =>
                      setHandles((prev) => ({
                        ...prev,
                        [activePlatform]: e.target.value
                      }))
                    }
                    className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#6C5CE7] w-36 sm:w-44 font-mono text-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => syncPlatform(activePlatform)}
                    disabled={isCurrentSyncing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1E1F25] hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw size={13} className={isCurrentSyncing ? 'animate-spin' : ''} />
                    <span>{isCurrentSyncing ? 'Syncing...' : 'Sync Live'}</span>
                  </button>
                </div>
              )}

              {totalSyncedCount > 0 && (
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex items-center gap-1">
                  <Check size={12} /> {totalSyncedCount} live
                </span>
              )}
            </div>
          )}

          {/* Hint for CodeLadder mode */}
          {!isLiveMode && (
            <p className="text-[11px] text-gray-400 italic self-end lg:self-auto">
              Showing problems you marked as solved on CodeLadder
            </p>
          )}
        </div>
      </div>

      {/* Empty State for Live API mode with no synced data */}
      {isLiveMode && totalSyncedCount === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center space-y-3">
          <Radio size={32} className="mx-auto text-gray-300" />
          <h4 className="text-sm font-semibold text-gray-600">No Live API Data Yet</h4>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Select a platform tab above and click <strong>Sync Live</strong> to fetch your submissions directly from Codeforces, LeetCode, CodeChef, or AtCoder.
          </p>
          <button
            type="button"
            onClick={() => setViewMode(VIEW_MODES.CODELADDER)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6C5CE7] hover:text-[#5A4AD1] cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Switch back to CodeLadder data</span>
          </button>
        </div>
      )}

      {/* Charts — show when there's data or when in CodeLadder mode */}
      {(!isLiveMode || totalSyncedCount > 0) && (
        <>
          {/* 1. Rating-Based Heatmap */}
          <RatingHeatmap
            solvedQuestions={filteredQuestions}
            availableYears={availableYears}
            handleOrUser={activeHandleDisplay}
          />

          {/* 2. Problem Ratings Bar Chart */}
          <ProblemRatingsChart
            solvedQuestions={filteredQuestions}
            platform={activePlatform}
          />

          {/* 3. Tags Solved Donut Chart */}
          <TagsDonutChart
            solvedQuestions={filteredQuestions}
            title={`Tags Solved (${PLATFORMS.find((p) => p.id === activePlatform)?.name || 'All'})`}
          />
        </>
      )}
    </div>
  );
}
