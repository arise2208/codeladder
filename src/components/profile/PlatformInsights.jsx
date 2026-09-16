import React, { useState, useMemo, useEffect } from 'react';
import {
  RefreshCw,
  Check,
  Trophy,
  Award,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  X,
  Copy,
  Code2,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../lib/api';
import RatingHeatmap from './RatingHeatmap';
import ProblemRatingsChart from './ProblemRatingsChart';
import TagsDonutChart from './TagsDonutChart';
import {
  fetchCodeforcesData,
  fetchAtCoderData,
  fetchLeetCodeData,
  fetchCodeChefData
} from '../../lib/platformSync';
import { PlatformIcon } from '../ui/PlatformIcon';

const PLATFORMS = [
  { id: 'ALL', name: 'All Platforms', badgeColor: '#6C5CE7' },
  { id: 'CODEFORCES', name: 'Codeforces', badgeColor: '#3B82F6', defaultHandlePlaceholder: 'Codeforces handle' },
  { id: 'LEETCODE', name: 'LeetCode', badgeColor: '#F59E0B', defaultHandlePlaceholder: 'LeetCode username' },
  { id: 'CODECHEF', name: 'CodeChef', badgeColor: '#EA580C', defaultHandlePlaceholder: 'CodeChef username' },
  { id: 'ATCODER', name: 'AtCoder', badgeColor: '#10B981', defaultHandlePlaceholder: 'AtCoder username' }
];

export default function PlatformInsights({
  solvedQuestions = [],
  platformAccounts = [],
  currentUser = null,
  availableYears = [],
  onRefresh = null,
  isOwnProfile = true
}) {
  const [activePlatform, setActivePlatform] = useState('ALL');
  const [handles, setHandles] = useState({
    CODEFORCES: '',
    LEETCODE: '',
    CODECHEF: '',
    ATCODER: ''
  });
  const [syncedByPlatform, setSyncedByPlatform] = useState(() => {
    try {
      const cached = localStorage.getItem('synced_platform_questions_cache');
      const parsed = cached ? JSON.parse(cached) : {};
      delete parsed.LEETCODE; // LeetCode is strictly populated from MongoDB solvedQuestions
      return {
        CODEFORCES: parsed.CODEFORCES || [],
        LEETCODE: [],
        CODECHEF: parsed.CODECHEF || [],
        ATCODER: parsed.ATCODER || []
      };
    } catch {
      return {
        CODEFORCES: [],
        LEETCODE: [],
        CODECHEF: [],
        ATCODER: []
      };
    }
  });
  const [platformStats, setPlatformStats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('platform_stats_cache') || '{}');
    } catch {
      return {};
    }
  });
  const [syncingMap, setSyncingMap] = useState({});

  // LeetCode Account Ownership Verification State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [challengeData, setChallengeData] = useState(null);
  const [countdownSeconds, setCountdownSeconds] = useState(60);
  const [isStartingChallenge, setIsStartingChallenge] = useState(false);
  const [isCheckingVerify, setIsCheckingVerify] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [leetcodeVerifiedOverride, setLeetcodeVerifiedOverride] = useState(null);
  const [verificationTab, setVerificationTab] = useState('HARD_PROBLEM');
  const [copiedSolution, setCopiedSolution] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const verifiedLcAccount = (platformAccounts || []).find(
    (a) => a.platform?.toUpperCase() === 'LEETCODE' && a.verified
  );
  const isLeetCodeVerified = Boolean(
    (leetcodeVerifiedOverride && handles.LEETCODE && leetcodeVerifiedOverride.toLowerCase() === handles.LEETCODE.toLowerCase().trim()) ||
    (verifiedLcAccount &&
     verifiedLcAccount.handle &&
     handles.LEETCODE &&
     verifiedLcAccount.handle.toLowerCase().trim() === handles.LEETCODE.toLowerCase().trim())
  );

  const verifiedCodeChefAccount = (platformAccounts || []).find(
    (a) => a.platform?.toUpperCase() === 'CODECHEF' && a.verified
  );
  const isCodeChefVerified = Boolean(
    verifiedCodeChefAccount &&
    verifiedCodeChefAccount.handle &&
    handles.CODECHEF &&
    verifiedCodeChefAccount.handle.toLowerCase().trim() === handles.CODECHEF.toLowerCase().trim()
  );

  const verifiedCodeforcesAccount = (platformAccounts || []).find(
    (a) => a.platform?.toUpperCase() === 'CODEFORCES' && a.verified
  );
  const isCodeforcesVerified = Boolean(
    verifiedCodeforcesAccount &&
    verifiedCodeforcesAccount.handle &&
    handles.CODEFORCES &&
    verifiedCodeforcesAccount.handle.toLowerCase().trim() === handles.CODEFORCES.toLowerCase().trim()
  );

  const handleCopySolution = () => {
    if (!challengeData?.code) return;
    navigator.clipboard.writeText(challengeData.code);
    setCopiedSolution(true);
    toast.success('Python 3 solution copied to clipboard!');
    setTimeout(() => setCopiedSolution(false), 2500);
  };

  const handleCopyBioCode = () => {
    if (!challengeData?.verificationCode) return;
    navigator.clipboard.writeText(challengeData.verificationCode);
    setCopiedCode(true);
    toast.success('Verification code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const openVerificationModal = async () => {
    const handle = (handles.LEETCODE || '').trim();
    if (!handle) {
      toast.error('Please enter your LeetCode username first.');
      return;
    }

    setVerifyError('');
    setVerifySuccess(false);
    setIsVerifyModalOpen(true);
    setCountdownSeconds(60);
    setIsStartingChallenge(true);
    setCopiedSolution(false);
    setCopiedCode(false);

    try {
      const { data } = await api.post('/platform-accounts/leetcode/challenge/start', { handle });
      setChallengeData(data.challenge);
      toast.success(data.message || '1-minute challenge started! Copy solution and submit on LeetCode.');
    } catch (err) {
      setVerifyError(getErrorMessage(err, 'Failed to start challenge.'));
    } finally {
      setIsStartingChallenge(false);
    }
  };

  const handleCheckVerification = async () => {
    const handle = (handles.LEETCODE || '').trim();
    setIsCheckingVerify(true);
    setVerifyError('');

    try {
      const { data } = await api.post('/platform-accounts/leetcode/challenge/verify', { handle });
      if (data.verified) {
        setVerifySuccess(true);
        setLeetcodeVerifiedOverride(handle);
        toast.success(`LeetCode handle @${handle} verified successfully! 🎉`);
        if (typeof onRefresh === 'function') {
          await onRefresh();
        }
        setTimeout(() => {
          setIsVerifyModalOpen(false);
        }, 2000);
      } else {
        setVerifyError(data.message || 'Verification submission not found yet.');
      }
    } catch (err) {
      setVerifyError(getErrorMessage(err, 'Verification check failed.'));
    } finally {
      setIsCheckingVerify(false);
    }
  };

  // Timer effect for countdown
  useEffect(() => {
    if (!isVerifyModalOpen || verifySuccess) return;
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setVerifyError('Challenge window expired (1 minute limit). Please cancel and start a new challenge.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isVerifyModalOpen, verifySuccess]);

  // Auto-polling check every 3 seconds while modal is open
  useEffect(() => {
    if (!isVerifyModalOpen || verifySuccess || countdownSeconds <= 0 || isStartingChallenge) return;
    const pollInterval = setInterval(() => {
      handleCheckVerification();
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [isVerifyModalOpen, verifySuccess, countdownSeconds, isStartingChallenge]);

  // Populate handles from connected platform accounts
  useEffect(() => {
    const updated = { ...handles };
    (platformAccounts || []).forEach((acc) => {
      const p = acc.platform?.toUpperCase();
      if (p && acc.handle) {
        updated[p] = acc.handle.replace(/^@/, '').trim();
      }
    });

    if (isOwnProfile) {
      if (!updated.CODEFORCES) {
        const savedCf = localStorage.getItem('cf_handle') || localStorage.getItem('codeforces_handle');
        if (savedCf) {
          updated.CODEFORCES = savedCf.replace(/^@/, '').trim();
        } else if (currentUser?.username) {
          updated.CODEFORCES = currentUser.username;
        }
      }

      if (!updated.CODECHEF) {
        const savedCc = localStorage.getItem('cc_handle') || localStorage.getItem('codechef_handle');
        if (savedCc) updated.CODECHEF = savedCc.replace(/^@/, '').trim();
      }

      if (!updated.LEETCODE) {
        const savedLc = localStorage.getItem('lc_handle') || localStorage.getItem('leetcode_handle');
        if (savedLc) updated.LEETCODE = savedLc.replace(/^@/, '').trim();
      }
    }

    setHandles((prev) => ({ ...prev, ...updated }));
  }, [platformAccounts, currentUser, isOwnProfile]);

  // Sync a single platform
  const syncPlatform = async (platformId, silent = false) => {
    const handle = (handles[platformId] || '').trim();
    if (!handle) {
      if (!silent) toast.error(`Please enter a ${platformId} handle/username to sync.`);
      return;
    }

    try {
      setSyncingMap((prev) => ({ ...prev, [platformId]: true }));

      let results = [];
      if (platformId === 'CODEFORCES') {
        results = await fetchCodeforcesData(handle);
        const cfCodes = (results || []).map((p) => p.code || p.externalId || p.id).filter(Boolean);
        let matchedCount = 0;
        if (cfCodes.length > 0) {
          try {
            const { data } = await api.post('/platform-accounts/sync-solved', {
              codeforces: cfCodes.slice(0, 2000)
            });
            matchedCount = data.matchedCount || 0;
          } catch (err) {
            console.warn('Backend sync-solved warning for Codeforces:', err);
          }
        }
        localStorage.setItem('cf_handle', handle);
        if (typeof onRefresh === 'function') {
          await onRefresh();
        }
        if (!silent) {
          toast.success(`Synced ${results.length} Codeforces solves (@${handle}) to backend database (${matchedCount} catalog matches)!`);
        }
      } else if (platformId === 'ATCODER') {
        results = await fetchAtCoderData(handle);
      } else if (platformId === 'CODECHEF') {
        results = await fetchCodeChefData(handle);
        const ccCodes = (results || []).map((p) => p.code || p.externalId || p.id).filter(Boolean);
        let matchedCount = 0;
        if (ccCodes.length > 0) {
          try {
            const { data } = await api.post('/platform-accounts/sync-solved', {
              codechef: ccCodes.slice(0, 2000)
            });
            matchedCount = data.matchedCount || 0;
          } catch (err) {
            console.warn('Backend sync-solved warning for CodeChef:', err);
          }
        }
        localStorage.setItem('cc_handle', handle);
        if (typeof onRefresh === 'function') {
          await onRefresh();
        }
        if (!silent) {
          toast.success(`Synced ${results.length} CodeChef solves (@${handle}) to backend database (${matchedCount} catalog matches)!`);
        }
      } else if (platformId === 'LEETCODE') {
        if (!isLeetCodeVerified) {
          if (!silent) {
            toast.error(`Please verify ownership of @${handle} first.`);
            openVerificationModal();
          }
          return;
        }
        const { fetchLeetCodeUserSolved } = await import('../../lib/leetcodeSync');
        const userSolved = await fetchLeetCodeUserSolved(handle);
        const slugs = (userSolved?.solvedSlugs || []).map((s) => s.toLowerCase());
        let matchedCount = 0;
        if (slugs.length > 0) {
          try {
            const { data } = await api.post('/platform-accounts/sync-solved', {
              leetcode: slugs.slice(0, 2000)
            });
            matchedCount = data.matchedCount || 0;
          } catch (err) {
            console.warn('Backend sync-solved warning:', err);
          }
        }
        if (userSolved) {
          const statsObj = {
            totalSolved: userSolved.totalSolved || slugs.length,
            easySolved: userSolved.easySolved || 0,
            mediumSolved: userSolved.mediumSolved || 0,
            hardSolved: userSolved.hardSolved || 0,
            rating: userSolved.userRating || 1500,
            globalRanking: userSolved.globalRanking || null,
            attendedContests: userSolved.attendedContests || 0,
            topPercentage: userSolved.topPercentage || null,
            badge: userSolved.badgeName || null
          };
          setPlatformStats((prev) => {
            const next = { ...prev, LEETCODE: statsObj };
            try {
              localStorage.setItem('platform_stats_cache', JSON.stringify(next));
            } catch {}
            return next;
          });
        }
        localStorage.setItem('lc_handle', handle);
        if (typeof onRefresh === 'function') {
          await onRefresh();
        }
        if (!silent) {
          toast.success(`Synced LeetCode solves (@${handle}) to backend database (${matchedCount} catalog matches)!`);
        }
        return;
      }

      setSyncedByPlatform((prev) => {
        const next = {
          ...prev,
          [platformId]: results
        };
        try {
          localStorage.setItem('synced_platform_questions_cache', JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to cache synced_platform_questions_cache', e);
        }
        return next;
      });

      if (results.platformStats) {
        setPlatformStats((prev) => {
          const next = { ...prev, [platformId]: results.platformStats };
          localStorage.setItem('platform_stats_cache', JSON.stringify(next));
          return next;
        });
      }

      if (platformId === 'CODEFORCES') {
        localStorage.setItem('cf_handle', handle);
      }

      if (!silent) {
        toast.success(`Synced ${results.length} live submissions for ${platformId} (@${handle})!`);
      }
    } catch (err) {
      console.error(`Sync error for ${platformId}:`, err);
      if (!silent) {
        toast.error(err.message || `Failed to sync ${platformId} activity.`);
      }
    } finally {
      setSyncingMap((prev) => ({ ...prev, [platformId]: false }));
    }
  };

  // Auto-fetch Codeforces & CodeChef directly from APIs if not yet cached in state
  useEffect(() => {
    if (!isOwnProfile) return;
    const cf = (handles.CODEFORCES || '').trim();
    if (cf && (!syncedByPlatform.CODEFORCES || syncedByPlatform.CODEFORCES.length === 0) && !syncingMap.CODEFORCES) {
      syncPlatform('CODEFORCES', true);
    }
    const cc = (handles.CODECHEF || '').trim();
    if (cc && (!syncedByPlatform.CODECHEF || syncedByPlatform.CODECHEF.length === 0) && !syncingMap.CODECHEF) {
      syncPlatform('CODECHEF', true);
    }
  }, [handles.CODEFORCES, handles.CODECHEF, isOwnProfile]);

  // Auto-correct any CodeChef problem ratings and tags in cache using codechef-contest.json
  useEffect(() => {
    if (syncedByPlatform.CODECHEF && syncedByPlatform.CODECHEF.length > 0) {
      fetch('/codechef-contest.json')
        .then((r) => r.json())
        .then((contests) => {
          const problemMap = new Map();
          contests.forEach((c) => {
            (c.problems || []).forEach((p) => {
              if (p.code) problemMap.set(p.code.toUpperCase(), p);
            });
          });

          let changed = false;
          const updatedCc = syncedByPlatform.CODECHEF.map((q) => {
            const urlMatch = q.url?.match(/problems\/([A-Z0-9_]+)/i);
            const idMatch = q._id?.match(/^cc-([A-Z0-9_]+)-/i);
            const code = (urlMatch ? urlMatch[1] : (idMatch ? idMatch[1] : '')).toUpperCase();
            if (code && problemMap.has(code)) {
              const item = problemMap.get(code);
              const realRating = (item.rating && !isNaN(Number(item.rating))) ? Number(item.rating) : null;
              const realTags = Array.isArray(item.tags) ? item.tags : [];
              const currentTags = q.tags || [];
              const hasFakeTags = currentTags.some((t) => typeof t === 'string' && (t === 'CodeChef' || t === 'Practice' || t === 'Rated'));
              const needsTagUpdate = hasFakeTags || (realTags.length > 0 && currentTags.length === 0);
              const needsRatingUpdate = realRating && (q.metadata?.rating !== realRating || q.difficulty !== `${realRating}`);

              if (needsRatingUpdate || needsTagUpdate) {
                changed = true;
                const nextTags = realTags.length > 0 ? realTags : [];
                return {
                  ...q,
                  title: (item.name && item.name !== code) ? item.name : q.title,
                  difficulty: realRating ? `${realRating}` : (q.difficulty || 'Practice'),
                  tags: nextTags,
                  metadata: {
                    ...q.metadata,
                    rating: realRating || q.metadata?.rating || null,
                    tags: nextTags
                  }
                };
              }
            } else if (q.isGenericSubmission || q._id?.startsWith('cc-sub-') || q._id?.includes('Solved Problem')) {
              const currentTags = q.tags || [];
              if (currentTags.length > 0) {
                changed = true;
                return {
                  ...q,
                  tags: [],
                  metadata: {
                    ...q.metadata,
                    tags: []
                  }
                };
              }
            } else if (q.isNamedProblem && (q.metadata?.rating === 1823 || q.metadata?.rating === 1500)) {
              changed = true;
              return {
                ...q,
                difficulty: 'Practice',
                metadata: {
                  ...q.metadata,
                  rating: null
                }
              };
            }
            return q;
          });

          if (changed) {
            setSyncedByPlatform((prev) => {
              const next = { ...prev, CODECHEF: updatedCc };
              try {
                localStorage.setItem('synced_platform_questions_cache', JSON.stringify(next));
              } catch {}
              return next;
            });
          }
        })
        .catch(() => {});
    }
  }, [syncedByPlatform.CODECHEF?.length]);

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
          if (plat === 'CODEFORCES') {
            results = await fetchCodeforcesData(handles[plat]);
            const cfCodes = (results || []).map((p) => p.code || p.externalId || p.id).filter(Boolean);
            if (cfCodes.length > 0) {
              await api.post('/platform-accounts/sync-solved', {
                codeforces: cfCodes.slice(0, 2000)
              }).catch(() => {});
            }
          } else if (plat === 'ATCODER') {
            results = await fetchAtCoderData(handles[plat]);
          } else if (plat === 'CODECHEF') {
            results = await fetchCodeChefData(handles[plat]);
            const ccCodes = (results || []).map((p) => p.code || p.externalId || p.id).filter(Boolean);
            if (ccCodes.length > 0) {
              await api.post('/platform-accounts/sync-solved', {
                codechef: ccCodes.slice(0, 2000)
              }).catch(() => {});
            }
          } else if (plat === 'LEETCODE') {
            if (!isLeetCodeVerified) {
              return;
            }
            const { fetchLeetCodeUserSolved } = await import('../../lib/leetcodeSync');
            const userSolved = await fetchLeetCodeUserSolved(handles[plat]);
            const slugs = (userSolved?.solvedSlugs || []).map((s) => s.toLowerCase());
            if (slugs.length > 0) {
              await api.post('/platform-accounts/sync-solved', {
                leetcode: slugs.slice(0, 2000)
              }).catch(() => {});
            }
            if (userSolved) {
              const statsObj = {
                totalSolved: userSolved.totalSolved || slugs.length,
                easySolved: userSolved.easySolved || 0,
                mediumSolved: userSolved.mediumSolved || 0,
                hardSolved: userSolved.hardSolved || 0,
                rating: userSolved.userRating || 1500,
                globalRanking: userSolved.globalRanking || null,
                attendedContests: userSolved.attendedContests || 0,
                topPercentage: userSolved.topPercentage || null,
                badge: userSolved.badgeName || null
              };
              setPlatformStats((prev) => {
                const next = { ...prev, LEETCODE: statsObj };
                try {
                  localStorage.setItem('platform_stats_cache', JSON.stringify(next));
                } catch {}
                return next;
              });
            }
            totalSynced += slugs.length;
            return;
          }

          setSyncedByPlatform((prev) => {
            const next = { ...prev, [plat]: results };
            try {
              localStorage.setItem('synced_platform_questions_cache', JSON.stringify(next));
            } catch (e) {}
            return next;
          });
          if (results.platformStats) {
            setPlatformStats((prev) => {
              const next = { ...prev, [plat]: results.platformStats };
              localStorage.setItem('platform_stats_cache', JSON.stringify(next));
              return next;
            });
          }
          totalSynced += results.length;
        } catch (e) {
          console.error(`Sync error for ${plat}:`, e);
        } finally {
          setSyncingMap((prev) => ({ ...prev, [plat]: false }));
        }
      })
    );

    if (typeof onRefresh === 'function') {
      await onRefresh();
    }

    toast.success(`Sync complete! Synced live platform submissions.`, { id: 'sync-all' });
  };

  // Pure LeetCode solved questions strictly from backend database (MongoDB UserQuestionState)
  const dbLeetCodeQuestions = useMemo(() => {
    if (!isLeetCodeVerified) return [];
    return (solvedQuestions || []).filter(
      (q) => (q.platform || '').toUpperCase() === 'LEETCODE' && q.state?.verified
    );
  }, [solvedQuestions, isLeetCodeVerified]);

  // Deduplicate and merge database solved questions with live API synced submissions
  const unifiedQuestions = useMemo(() => {
    const map = new Map();

    const getQuestionKey = (q) => {
      const plat = (q.platform || '').toUpperCase();
      const id = q.externalId || q.problemKey || q.questionId || q.titleSlug || q._id || q.title || '';
      return plat ? `${plat}_${id}` : String(id);
    };

    // 1. Add all DB solved questions (authoritative database records)
    (solvedQuestions || []).forEach((q) => {
      const plat = (q.platform || '').toUpperCase();
      if (plat === 'LEETCODE' && (!isLeetCodeVerified || !q.state?.verified)) {
        return; // Exclude unverified LeetCode solves
      }
      const key = getQuestionKey(q);
      map.set(key, q);
    });

    // 2. Merge non-LeetCode synced platform submissions directly from APIs (Codeforces, CodeChef, AtCoder)
    Object.entries(syncedByPlatform).forEach(([platformKey, list]) => {
      if (platformKey === 'LEETCODE') return; // LeetCode is strictly populated from MongoDB
      (list || []).forEach((q) => {
        const key = getQuestionKey(q);
        if (map.has(key)) {
          const existing = map.get(key);
          map.set(key, { ...existing, ...q, state: { ...existing.state, solved: true } });
        } else {
          map.set(key, q);
        }
      });
    });

    return Array.from(map.values());
  }, [solvedQuestions, syncedByPlatform, isLeetCodeVerified]);

  const filteredQuestions = useMemo(() => {
    if (activePlatform === 'ALL') {
      return unifiedQuestions;
    }
    if (activePlatform === 'LEETCODE') {
      return dbLeetCodeQuestions;
    }
    return unifiedQuestions.filter((q) => q.platform?.toUpperCase() === activePlatform);
  }, [unifiedQuestions, activePlatform, dbLeetCodeQuestions]);

  const totalSyncedCount = Object.values(syncedByPlatform).reduce((acc, cur) => acc + cur.length, 0);
  const currentHandle = activePlatform !== 'ALL' ? handles[activePlatform] || '' : '';
  const isCurrentSyncing = activePlatform !== 'ALL' ? Boolean(syncingMap[activePlatform]) : Object.values(syncingMap).some(Boolean);
  const activeHandleDisplay = currentHandle || currentUser?.username || '';

  return (
    <div className="space-y-6">
      {/* Platform Selector Tabs + Live Sync Bar */}
      <div className="bg-[#282828] rounded-xl border border-[#383838] shadow-xs overflow-hidden">
        <div className="p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Platform Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {PLATFORMS.map((plat) => {
              const isActive = activePlatform === plat.id;

              const platQuestions = plat.id === 'ALL'
                ? unifiedQuestions
                : plat.id === 'LEETCODE'
                ? dbLeetCodeQuestions
                : unifiedQuestions.filter((q) => q.platform?.toUpperCase() === plat.id);

              let count = platQuestions.length;
              if (plat.id === 'LEETCODE') {
                count = isLeetCodeVerified ? dbLeetCodeQuestions.length : 0;
              } else if (plat.id === 'CODEFORCES' && platformStats.CODEFORCES?.totalSolved) {
                count = Math.max(count, platformStats.CODEFORCES.totalSolved);
              } else if (plat.id === 'CODECHEF' && (platformStats.CODECHEF?.totalSolved || platformStats.CODECHEF?.totalSubmissions)) {
                count = Math.max(count, platformStats.CODECHEF.totalSolved || platformStats.CODECHEF.totalSubmissions);
              }

              return (
                <button
                  key={plat.id}
                  type="button"
                  onClick={() => setActivePlatform(plat.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1a1a1a] text-[#eff2f6] border border-[#383838] shadow-xs'
                      : 'text-[#8b949e] hover:text-[#eff2f6] hover:bg-[#333333]/50'
                  }`}
                >
                  {plat.id === 'ALL' ? (
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: plat.badgeColor }}
                    />
                  ) : (
                    <PlatformIcon platform={plat.id} size={15} />
                  )}
                  <span>{plat.name}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                      isActive ? 'bg-[#ffa116] text-[#1a1a1a]' : 'bg-[#282828] text-[#8b949e]'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Live Sync Bar */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            {!isOwnProfile ? (
              activePlatform !== 'ALL' && handles[activePlatform] ? (
                <div className="flex items-center gap-2 text-xs text-gray-300 font-mono bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-[#383838]">
                  <span>@{handles[activePlatform]}</span>
                  {activePlatform === 'LEETCODE' && (
                    isLeetCodeVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2cbb5d] bg-[#2cbb5d]/15 border border-[#2cbb5d]/30 px-2 py-0.5 rounded">
                        <ShieldCheck size={12} /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8b949e] bg-[#8b949e]/15 border border-[#8b949e]/30 px-2 py-0.5 rounded">
                        Unverified
                      </span>
                    )
                  )}
                  {activePlatform === 'CODECHEF' && (
                    isCodeChefVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2cbb5d] bg-[#2cbb5d]/15 border border-[#2cbb5d]/30 px-2 py-0.5 rounded">
                        <ShieldCheck size={12} /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8b949e] bg-[#8b949e]/15 border border-[#8b949e]/30 px-2 py-0.5 rounded">
                        Unverified
                      </span>
                    )
                  )}
                  {activePlatform === 'CODEFORCES' && (
                    isCodeforcesVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2cbb5d] bg-[#2cbb5d]/15 border border-[#2cbb5d]/30 px-2 py-0.5 rounded">
                        <ShieldCheck size={12} /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8b949e] bg-[#8b949e]/15 border border-[#8b949e]/30 px-2 py-0.5 rounded">
                        Unverified
                      </span>
                    )
                  )}
                </div>
              ) : null
            ) : activePlatform === 'ALL' ? (
              <button
                type="button"
                onClick={syncAllPlatforms}
                disabled={isCurrentSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ffa116] hover:bg-[#ffb84d] text-[#1a1a1a] text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
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
                  className="text-xs px-2.5 py-1.5 border border-[#383838] bg-[#1a1a1a] rounded-lg focus:outline-hidden focus:border-[#ffa116] w-36 sm:w-44 font-mono text-[#eff2f6]"
                />
                {activePlatform === 'LEETCODE' && (
                  isLeetCodeVerified ? (
                    <span
                      title="LeetCode account ownership verified"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2cbb5d] bg-[#2cbb5d]/15 border border-[#2cbb5d]/30 px-2.5 py-1.5 rounded-lg shadow-xs"
                    >
                      <ShieldCheck size={13} className="text-[#2cbb5d]" />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={openVerificationModal}
                      title="Verify account ownership with a 2-minute Compile Error challenge"
                      className="inline-flex items-center gap-1 text-xs font-semibold bg-[#ffa116] hover:bg-[#ffb84d] text-[#1a1a1a] px-2.5 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
                    >
                      <ShieldCheck size={13} />
                      <span>Verify</span>
                    </button>
                  )
                )}

                {activePlatform === 'CODECHEF' && (
                  isCodeChefVerified ? (
                    <span
                      title="CodeChef account & solves verified via CodeLadder Chrome Extension"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2cbb5d] bg-[#2cbb5d]/15 border border-[#2cbb5d]/30 px-2.5 py-1.5 rounded-lg shadow-xs"
                    >
                      <ShieldCheck size={13} className="text-[#2cbb5d]" />
                      <span>Verified (Extension)</span>
                    </span>
                  ) : (
                    <span
                      title="CodeChef solves are verified automatically when synced using the CodeLadder Chrome Extension"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#f59e0b] bg-[#f59e0b]/15 border border-[#f59e0b]/30 px-2.5 py-1.5 rounded-lg shadow-xs"
                    >
                      <ShieldAlert size={13} className="text-[#f59e0b]" />
                      <span>Unverified (Sync via Extension)</span>
                    </span>
                  )
                )}

                {activePlatform === 'CODEFORCES' && (
                  isCodeforcesVerified ? (
                    <span
                      title="Codeforces account verified via Codeforces API"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2cbb5d] bg-[#2cbb5d]/15 border border-[#2cbb5d]/30 px-2.5 py-1.5 rounded-lg shadow-xs"
                    >
                      <ShieldCheck size={13} className="text-[#2cbb5d]" />
                      <span>Verified (CF API)</span>
                    </span>
                  ) : (
                    <span
                      title="Codeforces solves are auto-verified against Codeforces API on sync"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8b949e] bg-[#8b949e]/15 border border-[#8b949e]/30 px-2.5 py-1.5 rounded-lg shadow-xs"
                    >
                      <ShieldCheck size={13} className="text-[#8b949e]" />
                      <span>Auto-Verify on Sync</span>
                    </span>
                  )
                )}

                <button
                  type="button"
                  onClick={() => syncPlatform(activePlatform)}
                  disabled={isCurrentSyncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#333333] text-[#eff2f6] border border-[#383838] text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw size={13} className={isCurrentSyncing ? 'animate-spin' : ''} />
                  <span>{isCurrentSyncing ? 'Syncing...' : 'Sync Live'}</span>
                </button>
              </div>
            )}

            {totalSyncedCount > 0 && (
              <span className="text-xs text-[#3fb950] font-semibold bg-[#238636]/15 px-2 py-1 rounded border border-[#238636]/30 flex items-center gap-1">
                <Check size={12} /> {totalSyncedCount} live
              </span>
            )}
          </div>
        </div>
      </div>
      {/* Platform Official Profile Overview Cards */}
      {activePlatform === 'LEETCODE' && (
        !isLeetCodeVerified ? (
          <div className="bg-[#282828] border border-amber-500/30 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                  <ShieldAlert size={22} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-[#eff2f6]">LeetCode Account Unverified</h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      Verification Required
                    </span>
                  </div>
                  <p className="text-xs text-[#8b949e] max-w-xl leading-relaxed">
                    {isOwnProfile ? (
                      handles.LEETCODE ? (
                        <>
                          Ownership of <span className="font-mono text-gray-200 font-semibold">@{handles.LEETCODE}</span> has not been verified. Official problem statistics, contest rating, and activity heatmaps are locked until account ownership is confirmed.
                        </>
                      ) : (
                        <>
                          No LeetCode handle connected. Enter your LeetCode username above and verify ownership to track and showcase your solves.
                        </>
                      )
                    ) : (
                      <>
                        The user has connected <span className="font-mono text-gray-200 font-semibold">@{handles.LEETCODE || 'handle'}</span>, but ownership has not been verified yet. Official stats are hidden to prevent unverified claims.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {isOwnProfile && (
                <div className="self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={openVerificationModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#ffa116] hover:bg-[#ffb84d] text-[#1a1a1a] text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                  >
                    <ShieldCheck size={15} />
                    <span>Verify Account Ownership</span>
                  </button>
                </div>
              )}
            </div>

            {isOwnProfile && (
              <div className="pt-3 border-t border-[#383838] flex flex-wrap items-center gap-4 text-[11px] text-[#8b949e]">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Quick 60-second verification
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  Instant working Python 3 solution provided
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Alternative profile bio code option
                </span>
              </div>
            )}
          </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contest Performance Card */}
              <div className="bg-[#1E1F25] text-white rounded-xl p-5 shadow-xs border border-gray-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy size={16} className="text-amber-400" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Contest Rating</span>
                    </div>
                    {platformStats.LEETCODE?.badge && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Award size={13} /> {platformStats.LEETCODE.badge}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-baseline gap-3">
                    <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                      {platformStats.LEETCODE?.rating ? platformStats.LEETCODE.rating.toLocaleString() : (dbLeetCodeQuestions.length > 0 ? '—' : 'Unrated')}
                    </div>
                    {platformStats.LEETCODE?.topPercentage && (
                      <span className="text-xs text-amber-300 font-semibold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                        Top {platformStats.LEETCODE.topPercentage}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-800/80 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-gray-400 text-[11px]">Global Ranking</div>
                    <div className="font-bold text-gray-200 mt-0.5 font-mono">
                      {platformStats.LEETCODE?.globalRanking ? `${platformStats.LEETCODE.globalRanking.toLocaleString()} / 881,221` : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-[11px]">Attended Contests</div>
                    <div className="font-bold text-gray-200 mt-0.5 font-mono">
                      {platformStats.LEETCODE?.attendedContests ?? '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Problems Solved Breakdown Card */}
              <div className="bg-[#282828] rounded-xl p-5 shadow-xs border border-[#383838] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[#2cbb5d]" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Problems Solved</span>
                    </div>
                    <span className="text-xs font-semibold text-[#8b949e]">
                      Official LeetCode Stats
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <div className="text-3xl font-extrabold font-mono text-[#eff2f6] tracking-tight">
                      {platformStats.LEETCODE?.totalSolved ?? dbLeetCodeQuestions.length}
                    </div>
                    <span className="text-sm font-medium text-[#8b949e] font-mono">
                      / {platformStats.LEETCODE?.totalQuestions || 4047}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[#383838] grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-[#2cbb5d]/15 border border-[#2cbb5d]/30 rounded-lg p-2.5 text-center">
                    <div className="text-[11px] font-semibold text-[#2cbb5d]">Easy</div>
                    <div className="text-base font-bold text-[#2cbb5d] font-mono mt-0.5">
                      {platformStats.LEETCODE?.easySolved ?? '—'}
                    </div>
                    <div className="text-[10px] text-[#2cbb5d]/70 font-mono">/ {platformStats.LEETCODE?.easyQuestions || 963}</div>
                  </div>

                  <div className="bg-[#ffa116]/15 border border-[#ffa116]/30 rounded-lg p-2.5 text-center">
                    <div className="text-[11px] font-semibold text-[#ffa116]">Medium</div>
                    <div className="text-base font-bold text-[#ffa116] font-mono mt-0.5">
                      {platformStats.LEETCODE?.mediumSolved ?? '—'}
                    </div>
                    <div className="text-[10px] text-[#ffa116]/70 font-mono">/ {platformStats.LEETCODE?.mediumQuestions || 2111}</div>
                  </div>

                  <div className="bg-[#ef4743]/15 border border-[#ef4743]/30 rounded-lg p-2.5 text-center">
                    <div className="text-[11px] font-semibold text-[#ef4743]">Hard</div>
                    <div className="text-base font-bold text-[#ef4743] font-mono mt-0.5">
                      {platformStats.LEETCODE?.hardSolved ?? '—'}
                    </div>
                    <div className="text-[10px] text-[#ef4743]/70 font-mono">/ {platformStats.LEETCODE?.hardQuestions || 973}</div>
                  </div>
                </div>
              </div>
            </div>
        )
      )}

      {/* Platform Official Profile Overview Card for CodeChef */}
      {activePlatform === 'CODECHEF' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#282828] text-[#eff2f6] rounded-xl p-5 shadow-xs border border-[#383838] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-[#ffa116]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">CodeChef Rating</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#ffa116]/20 text-[#ffa116] border border-[#ffa116]/30">
                {platformStats.CODECHEF?.stars || '—'}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <div className="text-3xl font-extrabold font-mono text-[#eff2f6] tracking-tight">
                {platformStats.CODECHEF?.rating || '—'}
              </div>
              {platformStats.CODECHEF?.highestRating && (
                <span className="text-xs text-[#8b949e] font-mono">
                  (Highest: {platformStats.CODECHEF.highestRating})
                </span>
              )}
            </div>
            <div className="mt-5 pt-4 border-t border-[#383838] grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-[#8b949e] text-[11px]">Global Rank</div>
                <div className="font-bold text-[#eff2f6] mt-0.5 font-mono">
                  {platformStats.CODECHEF?.globalRank ? `${platformStats.CODECHEF.globalRank}` : '—'}
                </div>
              </div>
              <div>
                <div className="text-[#8b949e] text-[11px]">Country Rank</div>
                <div className="font-bold text-[#eff2f6] mt-0.5 font-mono">
                  {platformStats.CODECHEF?.countryRank ? `${platformStats.CODECHEF.countryRank}` : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#282828] rounded-xl p-5 shadow-xs border border-[#383838] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#2cbb5d]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Submissions & Solves</span>
              </div>
              <span className="text-xs font-semibold text-[#8b949e]">CodeChef Activity</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-3xl font-extrabold font-mono text-[#eff2f6] tracking-tight">
                {platformStats.CODECHEF?.totalSolved !== undefined ? platformStats.CODECHEF.totalSolved : '—'}
              </div>
              <span className="text-sm font-medium text-[#8b949e] font-mono">
                total problems solved
              </span>
            </div>
            <div className="mt-5 pt-4 border-t border-[#383838] grid grid-cols-3 gap-2 text-xs">
              <div className="bg-[#2cbb5d]/15 border border-[#2cbb5d]/30 rounded-lg p-2 text-center">
                <div className="text-[10px] font-semibold text-[#2cbb5d]">Contest Solves</div>
                <div className="text-sm font-bold text-[#2cbb5d] font-mono mt-0.5">
                  {platformStats.CODECHEF?.contestSolved || platformStats.CODECHEF?.totalSolved || '—'}
                </div>
              </div>
              <div className="bg-[#ffa116]/15 border border-[#ffa116]/30 rounded-lg p-2 text-center">
                <div className="text-[10px] font-semibold text-[#ffa116]">Submissions</div>
                <div className="text-sm font-bold text-[#ffa116] font-mono mt-0.5">
                  {platformStats.CODECHEF?.totalSubmissions || '—'}
                </div>
              </div>
              <div className="bg-[#ffa116]/15 border border-[#ffa116]/30 rounded-lg p-2 text-center">
                <div className="text-[10px] font-semibold text-[#ffa116]">Active Days</div>
                <div className="text-sm font-bold text-[#ffa116] font-mono mt-0.5">
                  {platformStats.CODECHEF?.activeDays || '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Platform Official Profile Overview Card for Codeforces */}
      {activePlatform === 'CODEFORCES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rating & Rank Card */}
              <div className="bg-[#1E1F25] text-white rounded-xl p-5 shadow-xs border border-gray-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy size={16} className="text-amber-400" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Codeforces Rating</span>
                    </div>
                    {platformStats.CODEFORCES?.rank && (
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                        (platformStats.CODEFORCES?.rating || 0) >= 2400
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : (platformStats.CODEFORCES?.rating || 0) >= 2100
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : (platformStats.CODEFORCES?.rating || 0) >= 1900
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : (platformStats.CODEFORCES?.rating || 0) >= 1600
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : (platformStats.CODEFORCES?.rating || 0) >= 1400
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          : (platformStats.CODEFORCES?.rating || 0) >= 1200
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                      }`}>
                        <Award size={13} /> {platformStats.CODEFORCES.rank}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-baseline gap-3">
                    <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                      {(platformStats.CODEFORCES?.rating || 0).toLocaleString()}
                    </div>
                    {platformStats.CODEFORCES?.maxRating && (
                      <span className="text-xs text-gray-400 font-medium">
                        Max: <span className="text-gray-200 font-mono font-semibold">{platformStats.CODEFORCES.maxRating}</span> ({platformStats.CODEFORCES?.maxRank || 'Expert'})
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-800/80 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-gray-400 text-[11px]">Organization</div>
                    <div className="font-bold text-gray-200 mt-0.5 truncate" title={platformStats.CODEFORCES?.organization || '—'}>
                      {platformStats.CODEFORCES?.organization || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-[11px]">Handle & Location</div>
                    <div className="font-bold text-gray-200 mt-0.5 truncate font-mono">
                      @{platformStats.CODEFORCES?.handle || handles.CODEFORCES || 'arise'} {platformStats.CODEFORCES?.city ? `(${platformStats.CODEFORCES.city})` : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submissions & Activity Card */}
              <div className="bg-[#282828] rounded-xl p-5 shadow-xs border border-[#383838] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[#2cbb5d]" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Codeforces Activity</span>
                    </div>
                    <span className="text-xs font-semibold text-[#8b949e]">
                      Official Submissions
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <div className="text-3xl font-extrabold font-mono text-[#eff2f6] tracking-tight">
                      {platformStats.CODEFORCES?.totalSubmissions || (syncedByPlatform.CODEFORCES || []).length || 0}
                    </div>
                    <span className="text-sm font-medium text-[#8b949e] font-mono">
                      total submissions
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[#383838] grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#2cbb5d]/15 border border-[#2cbb5d]/30 rounded-lg p-2.5 text-center">
                    <div className="text-[11px] font-semibold text-[#2cbb5d]">Problems Solved</div>
                    <div className="text-base font-bold text-[#2cbb5d] font-mono mt-0.5">
                      {platformStats.CODEFORCES?.totalSolved || 0}
                    </div>
                    <div className="text-[10px] text-[#2cbb5d]/70 font-mono">Unique AC problems</div>
                  </div>

                  <div className="bg-[#ffa116]/15 border border-[#ffa116]/30 rounded-lg p-2.5 text-center">
                    <div className="text-[11px] font-semibold text-[#ffa116]">Active Days</div>
                    <div className="text-base font-bold text-[#ffa116] font-mono mt-0.5">
                      {platformStats.CODEFORCES?.activeDays || 0}
                    </div>
                    <div className="text-[10px] text-[#ffa116]/70 font-mono">Total active days</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visual Analytics Suite: Heatmaps & Charts */}
          {activePlatform === 'LEETCODE' && !isLeetCodeVerified ? (
            <div className="bg-[#282828] rounded-xl p-8 border border-dashed border-[#383838] text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#383838] flex items-center justify-center mx-auto text-[#8b949e]">
                <Code2 size={22} />
              </div>
              <h4 className="text-sm font-bold text-[#eff2f6]">LeetCode Analytics Locked</h4>
              <p className="text-xs text-[#8b949e] max-w-md mx-auto">
                Complete account verification to unlock submission heatmaps, problem difficulty distribution, and topic breakdowns for LeetCode.
              </p>
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={openVerificationModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ffa116] hover:bg-[#ffb84d] text-[#1a1a1a] text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer mt-1"
                >
                  <ShieldCheck size={14} />
                  <span>Verify Account</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 1. Rating-Based Heatmap */}
              <RatingHeatmap
                solvedQuestions={filteredQuestions}
                availableYears={availableYears}
                handleOrUser={activeHandleDisplay}
                platform={activePlatform}
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

      {/* LeetCode Ownership Verification Challenge Modal */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#18191E] text-white rounded-2xl max-w-lg w-full p-6 border border-gray-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Verify LeetCode Ownership</h3>
                  <p className="text-[11px] text-gray-400 font-mono">@{handles.LEETCODE || 'handle'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Verification Method Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-[#20222A] p-1 rounded-xl border border-gray-800 text-xs">
              <button
                type="button"
                onClick={() => setVerificationTab('HARD_PROBLEM')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                  verificationTab === 'HARD_PROBLEM'
                    ? 'bg-[#6C5CE7] text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Code2 size={14} />
                <span>1-Min Hard Challenge</span>
              </button>
              <button
                type="button"
                onClick={() => setVerificationTab('BIO_CODE')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                  verificationTab === 'BIO_CODE'
                    ? 'bg-[#6C5CE7] text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <FileText size={14} />
                <span>Profile Bio Code</span>
              </button>
            </div>

            {/* TAB 1: 1-Minute Hard Problem Challenge */}
            {verificationTab === 'HARD_PROBLEM' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Submit provided solution on LeetCode:</span>
                  <span
                    className={`font-mono font-bold px-2.5 py-0.5 rounded-full border text-xs flex items-center gap-1 ${
                      countdownSeconds <= 15
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <span>⏱️</span>
                    <span>{countdownSeconds}s left</span>
                  </span>
                </div>

                {/* Target Problem Card */}
                <div className="bg-[#24262E] p-3 rounded-xl border border-gray-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {challengeData?.problemTitle || 'Trapping Rain Water'}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        HARD
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                      Verdict: <span className="text-emerald-400 font-semibold">Accepted (AC)</span>
                    </div>
                  </div>
                  <a
                    href={challengeData?.problemUrl || 'https://leetcode.com/problems/trapping-rain-water/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6C5CE7] hover:bg-[#5A4AD1] text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    <span>Open Problem</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                {/* Working Code Box */}
                <div className="bg-black/50 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="bg-[#1F2027] px-3 py-1.5 border-b border-gray-800 flex items-center justify-between text-xs">
                    <span className="font-mono text-gray-400 text-[11px]">Python 3 (Tested Working)</span>
                    <button
                      type="button"
                      onClick={handleCopySolution}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#6C5CE7]/20 hover:bg-[#6C5CE7]/40 text-[#A29BFE] font-medium text-[11px] transition-colors cursor-pointer"
                    >
                      {copiedSolution ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedSolution ? 'Copied!' : 'Copy Solution'}</span>
                    </button>
                  </div>
                  <pre className="p-3 text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-32 leading-relaxed bg-[#111216]">
                    <code>{challengeData?.code || 'Loading solution code...'}</code>
                  </pre>
                </div>

                {/* Steps */}
                <div className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800/80 text-[11px] text-gray-400 space-y-1">
                  <div className="font-semibold text-gray-300">Quick 3-step verification:</div>
                  <ol className="list-decimal list-inside space-y-0.5 text-gray-400 text-[10.5px]">
                    <li>Click <strong className="text-white">Copy Solution</strong> above.</li>
                    <li>Click <strong className="text-white">Open Problem</strong> & paste into Python 3 on LeetCode.</li>
                    <li>Click <strong className="text-white">Submit</strong> — CodeLadder auto-detects your solve within 60s!</li>
                  </ol>
                </div>
              </div>
            )}

            {/* TAB 2: Profile Summary / About Me Code */}
            {verificationTab === 'BIO_CODE' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-300 leading-relaxed">
                  Prefer not to submit a problem? Add this temporary verification token to your LeetCode profile summary:
                </p>

                <div className="bg-[#24262E] p-4 rounded-xl border border-gray-800 text-center space-y-2">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Your Verification Code</div>
                  <div className="font-mono text-xl font-extrabold text-amber-400 tracking-wider">
                    {challengeData?.verificationCode || 'CL-VERIFY'}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyBioCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedCode ? 'Copied Code!' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-800/80 text-[11px] text-gray-300 space-y-1.5">
                  <div className="font-semibold text-gray-200">How to use:</div>
                  <ol className="list-decimal list-inside space-y-1 text-gray-400 text-[11px]">
                    <li>
                      Go to{' '}
                      <a
                        href="https://leetcode.com/profile/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 underline font-semibold inline-flex items-center gap-0.5"
                      >
                        leetcode.com/profile/ <ExternalLink size={10} />
                      </a>
                    </li>
                    <li>Paste the code into your <strong className="text-white">Summary</strong> (About Me) field and click Save.</li>
                    <li>Click <strong className="text-white">Check Verification</strong> below (you can clear the summary right after).</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Error or Success feedback */}
            {verifyError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 leading-relaxed">
                ⚠️ {verifyError}
              </div>
            )}

            {verifySuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Successfully verified! @{handles.LEETCODE} is officially linked to your profile.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCheckVerification}
                disabled={isCheckingVerify || verifySuccess || countdownSeconds <= 0}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md"
              >
                <RefreshCw size={13} className={isCheckingVerify ? 'animate-spin' : ''} />
                <span>{isCheckingVerify ? 'Checking...' : 'Check Verification'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
