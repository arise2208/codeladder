import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { fetchCodeforcesSubmissions } from './useContestData';
import { fetchLeetCodeUserSolved } from '../lib/leetcodeSync';
import { fetchCodeChefUserSolved } from '../lib/codechefSync';

const COOLDOWN_MS = 60 * 1000; // 1 minute cooldown
const STORAGE_KEY = 'codeladder_last_sync_all';

export function getSyncAllRemainingCooldown() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const lastSync = parseInt(raw, 10);
    if (isNaN(lastSync) || lastSync <= 0) return 0;
    const elapsed = Date.now() - lastSync;
    if (elapsed >= COOLDOWN_MS) return 0;
    return Math.max(0, Math.ceil((COOLDOWN_MS - elapsed) / 1000));
  } catch {
    return 0;
  }
}

export default function useSyncAll(onSyncSuccess) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [cooldown, setCooldown] = useState(() => getSyncAllRemainingCooldown());

  // Listen to interval, tab visibility change, focus, and cross-tab storage
  useEffect(() => {
    const checkCooldown = () => {
      setCooldown(getSyncAllRemainingCooldown());
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkCooldown();
      }
    };

    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        checkCooldown();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkCooldown);
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkCooldown);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const syncAll = useCallback(async () => {
    const remaining = getSyncAllRemainingCooldown();
    if (remaining > 0) {
      toast(`Please wait ${remaining}s before resyncing.`, { icon: '⏳' });
      return;
    }

    // Check auth token
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in to sync solved problems.');
      return;
    }

    setIsSyncing(true);
    const toastId = toast.loading('Syncing problems from Codeforces, LeetCode & CodeChef...');

    try {
      // 1. Fetch connected accounts
      let accounts = [];
      try {
        const { data } = await api.get('/platform-accounts');
        accounts = data.accounts || [];
      } catch (err) {
        console.warn('Could not fetch /platform-accounts, using local cache handles:', err);
      }

      const cfAccount = accounts.find((a) => a.platform === 'CODEFORCES');
      const lcAccount = accounts.find((a) => a.platform === 'LEETCODE');
      const ccAccount = accounts.find((a) => a.platform === 'CODECHEF');

      // The handles fixed in Settings (/platform-accounts) are the authoritative source of truth
      const cfHandle = (cfAccount?.handle || (!accounts.length ? localStorage.getItem('cf_handle') : '') || '').trim();
      const lcHandle = (lcAccount?.handle || (!accounts.length ? localStorage.getItem('lc_handle') : '') || '').trim();
      const ccHandle = (ccAccount?.handle || (!accounts.length ? localStorage.getItem('cc_handle') : '') || '').trim();

      if (!cfHandle && !lcHandle && !ccHandle) {
        toast.error(
          'No connected platform handles found. Connect your accounts in Settings or Upsolvers first.',
          { id: toastId }
        );
        setIsSyncing(false);
        return;
      }

      let cfSolved = [];
      let lcSolved = [];
      let ccSolved = [];
      let totalSolvedCount = 0;

      // 2. Sync in parallel
      const syncTasks = [];

      if (cfHandle) {
        syncTasks.push(
          (async () => {
            try {
              const subs = await fetchCodeforcesSubmissions(cfHandle);
              const set = new Set();
              subs.forEach((s) => {
                if (s.verdict === 'OK' && s.problem?.contestId && s.problem?.index) {
                  set.add(`${s.problem.contestId}-${s.problem.index}`);
                  set.add(`${s.problem.contestId}${s.problem.index}`);
                }
              });
              cfSolved = Array.from(set);
              localStorage.setItem('cf_handle', cfHandle);
              localStorage.setItem('cf_solved_problems', JSON.stringify(cfSolved));
              totalSolvedCount += cfSolved.length;
            } catch (err) {
              console.warn('CF sync error:', err);
            }
          })()
        );
      }

      if (lcHandle) {
        syncTasks.push(
          (async () => {
            try {
              const res = await fetchLeetCodeUserSolved(lcHandle);
              const slugs = (res.solvedSlugs || []).map((s) => s.toLowerCase());
              lcSolved = slugs;
              localStorage.setItem('lc_handle', lcHandle);
              localStorage.setItem('lc_solved_problems', JSON.stringify(lcSolved));
              totalSolvedCount += lcSolved.length;
            } catch (err) {
              console.warn('LC sync error:', err);
            }
          })()
        );
      }

      if (ccHandle) {
        syncTasks.push(
          (async () => {
            try {
              const res = await fetchCodeChefUserSolved(ccHandle);
              const codes = (res.solvedCodes || []).map((c) => c.toUpperCase());
              ccSolved = codes;
              localStorage.setItem('cc_handle', ccHandle);
              localStorage.setItem('cc_solved_problems', JSON.stringify(ccSolved));
              totalSolvedCount += ccSolved.length;
            } catch (err) {
              console.warn('CC sync error:', err);
            }
          })()
        );
      }

      await Promise.allSettled(syncTasks);

      // 3. Post to backend to mark UserQuestionState in DB
      let matchedCount = 0;
      try {
        const { data } = await api.post('/platform-accounts/sync-solved', {
          codeforces: cfSolved.slice(0, 2000),
          leetcode: lcSolved.slice(0, 2000),
          codechef: ccSolved.slice(0, 2000)
        });
        matchedCount = data.matchedCount || 0;
      } catch (err) {
        console.warn('Backend sync-solved call warning:', err);
      }

      // 4. Save cooldown timestamp to localStorage & trigger cross-tab update
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, now.toString());
      setCooldown(60);
      window.dispatchEvent(new Event('storage'));

      // 5. Trigger onSyncSuccess callback
      if (typeof onSyncSuccess === 'function') {
        await onSyncSuccess();
      }

      toast.success(
        `Sync complete! Synced ${totalSolvedCount} platform solves (${matchedCount} catalog matches).`,
        { id: toastId, icon: '🔄' }
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to complete platform sync.'), { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  }, [onSyncSuccess]);

  return {
    isSyncing,
    cooldown,
    canSync: !isSyncing && cooldown === 0,
    syncAll
  };
}
