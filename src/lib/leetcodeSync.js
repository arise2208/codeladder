import api from './api';

/**
 * LeetCode User Submission & Solved Problems Synchronization
 */

// Helper to sanitize LeetCode handle from URLs, @mentions, etc.
export function extractLeetCodeUsername(input) {
  if (!input) return '';
  let clean = String(input).trim();
  clean = clean.replace(/\/+$/, '');

  // Handle https://leetcode.com/u/username or https://leetcode.com/username
  if (clean.includes('/')) {
    const parts = clean.split('/').filter(Boolean);
    clean = parts[parts.length - 1];
    if (clean.toLowerCase() === 'u' && parts.length > 1) {
      clean = parts[parts.length - 2];
    }
  }

  return clean.replace(/^[@/]+/, '').trim();
}

// Local proxy LeetCode GraphQL fetcher
async function runLeetCodeGraphQL(query, variables = {}) {
  const body = JSON.stringify({ query, variables });

  // Use local Vite proxy (/leetcode-api/graphql) - avoids CORS
  try {
    const res = await fetch('/leetcode-api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body
    });
    if (res.ok) {
      const data = await res.json();
      if (data && !data.errors) {
        return data.data;
      }
    }
  } catch (e) {
    // ignore
  }

  return null;
}

// In-memory cache for contest dataset
let contestMapCache = null;
let problemSlugMapCache = null;

export async function getLeetCodeContestMap() {
  if (contestMapCache && problemSlugMapCache) {
    return { contestMap: contestMapCache, problemSlugMap: problemSlugMapCache };
  }
  const cMap = new Map();
  const pMap = new Map();
  try {
    const res = await fetch('/leetcode.json');
    if (res.ok) {
      const contests = await res.json();
      contests.forEach((c) => {
        const slug = (c.url || '').replace(/\/$/, '').split('/').pop().toLowerCase();
        if (slug) {
          cMap.set(slug, c);
        }
        (c.problems || []).forEach((prob) => {
          const pSlug = (prob.link || prob.url || '').replace(/\/$/, '').split('/').pop().toLowerCase();
          if (pSlug && !pMap.has(pSlug)) {
            const rawTags = Array.isArray(prob.tags) ? prob.tags : [];
            const cleanTags = rawTags.filter((t) => typeof t === 'string' && !t.startsWith('rating-'));
            const diff = prob.difficulty || (prob.rating ? (prob.rating >= 2000 ? 'HARD' : prob.rating >= 1550 ? 'MEDIUM' : 'EASY') : 'MEDIUM');
            pMap.set(pSlug, {
              title: prob.title || pSlug,
              url: prob.link || `https://leetcode.com/problems/${pSlug}/`,
              rating: prob.rating || null,
              difficulty: diff,
              tags: cleanTags
            });
          }
        });
      });
    }
  } catch (e) {
    console.warn('Could not load /leetcode.json:', e);
  }
  contestMapCache = cMap;
  problemSlugMapCache = pMap;
  return { contestMap: cMap, problemSlugMap: pMap };
}

/**
 * Fetches solved problems and stats for a LeetCode user
 * @param {string} handleInput - LeetCode handle or profile URL
 */
export async function fetchLeetCodeUserSolved(handleInput) {
  const cleanHandle = extractLeetCodeUsername(handleInput);
  if (!cleanHandle) throw new Error('Please provide a valid LeetCode username.');

  // 1. Primary: Query dedicated CodeLadder backend API (server-side, zero CORS, auto-persisted)
  try {
    const { data } = await api.post('/platform-accounts/leetcode/fetch-user', { handle: cleanHandle });
    if (data?.success && data.userSolved) {
      const u = data.userSolved;
      const { contestMap, problemSlugMap } = await getLeetCodeContestMap();
      const solvedSlugs = new Set(u.solvedSlugs || []);
      const solvedDetails = [];

      (u.contestHistory || []).forEach((item) => {
        if (!item.attended || !item.problemsSolved || item.problemsSolved <= 0) return;
        const title = item.contest?.title || '';
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const contest = contestMap.get(slug);

        if (contest && Array.isArray(contest.problems)) {
          const solvedInContest = contest.problems.slice(0, item.problemsSolved);
          const startTime = item.contest?.startTime ? Number(item.contest.startTime) * 1000 : Date.now();
          const solvedDate = new Date(startTime).toISOString();

          solvedInContest.forEach((prob) => {
            const pSlug = (prob.link || prob.url || '').replace(/\/$/, '').split('/').pop().toLowerCase();
            if (pSlug) {
              solvedSlugs.add(pSlug);
              const rawTags = Array.isArray(prob.tags) ? prob.tags : [];
              const cleanTags = rawTags.filter((t) => typeof t === 'string' && !t.startsWith('rating-'));
              const rawDiff = prob.difficulty || (prob.rating ? (prob.rating >= 2000 ? 'HARD' : prob.rating >= 1550 ? 'MEDIUM' : 'EASY') : 'MEDIUM');
              solvedDetails.push({
                slug: pSlug,
                title: prob.title || pSlug,
                url: prob.link || `https://leetcode.com/problems/${pSlug}/`,
                points: prob.points || '4',
                rating: prob.rating || 1500,
                difficulty: rawDiff,
                tags: cleanTags,
                solvedAt: solvedDate,
                contestTitle: title
              });
            }
          });
        }
      });

      (u.recentAcSubmissions || []).forEach((sub) => {
        const slug = (sub.titleSlug || '').toLowerCase();
        if (slug) {
          solvedSlugs.add(slug);
          const tsNum = Number(sub.timestamp);
          const solvedAt = tsNum
            ? new Date(tsNum < 10000000000 ? tsNum * 1000 : tsNum).toISOString()
            : new Date().toISOString();

          if (!solvedDetails.some((d) => d.slug === slug)) {
            const matchedCatalog = problemSlugMap?.get(slug);
            const rawDiff = matchedCatalog?.difficulty || (matchedCatalog?.rating ? (matchedCatalog.rating >= 2000 ? 'HARD' : matchedCatalog.rating >= 1550 ? 'MEDIUM' : 'EASY') : 'MEDIUM');
            solvedDetails.push({
              slug,
              title: matchedCatalog?.title || sub.title || slug,
              url: matchedCatalog?.url || `https://leetcode.com/problems/${slug}/`,
              points: '4',
              rating: matchedCatalog?.rating || 1500,
              difficulty: rawDiff,
              tags: matchedCatalog?.tags || [],
              solvedAt,
              contestTitle: null
            });
          }
        }
      });

      return {
        handle: cleanHandle,
        solvedSlugs: Array.from(solvedSlugs),
        solvedDetails,
        userRating: u.userRating || 1500,
        globalRanking: u.globalRanking,
        attendedContests: u.attendedContests || 0,
        badge: u.badgeName,
        badgeName: u.badgeName,
        topPercentage: u.topPercentage,
        submissionCalendar: u.submissionCalendar || {},
        totalActiveDays: u.totalActiveDays || 0,
        streak: u.streak || 0,
        contestHistory: u.contestHistory || [],
        totalSolved: u.totalSolved || solvedSlugs.size,
        easySolved: u.easySolved || 0,
        mediumSolved: u.mediumSolved || 0,
        hardSolved: u.hardSolved || 0,
        totalQuestions: u.totalQuestions || 4047,
        easyQuestions: 963,
        mediumQuestions: 2111,
        hardQuestions: 973,
        isVerified: u.isVerified || false
      };
    }
  } catch (err) {
    console.warn('Backend LeetCode fetch-user error, using local fallback:', err?.message);
  }

  // 2. Secondary fallback via local Vite proxy route
  const solvedSlugs = new Set();
  const solvedDetails = [];
  let userRating = 1500;
  let globalRanking = null;
  let attendedContests = 0;
  let topPercentage = null;
  let badgeName = null;
  let submissionCalendar = {};
  let totalActiveDays = 0;
  let streak = 0;
  let contestHistory = [];
  let rawRecentAc = [];
  let totalSolved = 0;
  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;
  let totalQuestions = 4047;
  let easyQuestions = 963;
  let mediumQuestions = 2111;
  let hardQuestions = 973;

  // Query 1: Contest Ranking & Contest History
  const contestQuery = `
    query userContestInfo($username: String!) {
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        totalParticipants
        topPercentage
        badge {
          name
        }
      }
      userContestRankingHistory(username: $username) {
        attended
        rating
        ranking
        problemsSolved
        contest {
          title
          startTime
        }
      }
    }
  `;

  // Query 2: Recent AC submissions
  const recentAcQuery = `
    query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id
        title
        titleSlug
        timestamp
      }
    }
  `;

  // Query 3: Calendar, Submit Stats & Total Questions
  const calendarAndStatsQuery = `
    query userProfileCalendarAndStats($username: String!) {
      allQuestionsCount {
        difficulty
        count
      }
      matchedUser(username: $username) {
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
        userCalendar {
          streak
          totalActiveDays
          submissionCalendar
        }
      }
    }
  `;

  let primaryData = await runLeetCodeGraphQL(contestQuery, { username: cleanHandle });

  if (primaryData?.userContestRanking) {
    const rank = primaryData.userContestRanking;
    userRating = Math.round(rank.rating || 1500);
    globalRanking = rank.globalRanking || null;
    attendedContests = rank.attendedContestsCount || 0;
    topPercentage = rank.topPercentage || null;
    badgeName = rank.badge?.name || null;
  }

  if (Array.isArray(primaryData?.userContestRankingHistory)) {
    contestHistory = primaryData.userContestRankingHistory;
  }

  // Fetch recent AC submissions
  const acData = await runLeetCodeGraphQL(recentAcQuery, { username: cleanHandle, limit: 20 });
  if (Array.isArray(acData?.recentAcSubmissionList)) {
    rawRecentAc = acData.recentAcSubmissionList;
  }

  // Fetch calendar and solved counts
  const calData = await runLeetCodeGraphQL(calendarAndStatsQuery, { username: cleanHandle });
  if (calData?.allQuestionsCount && Array.isArray(calData.allQuestionsCount)) {
    calData.allQuestionsCount.forEach((item) => {
      if (item.difficulty === 'All') totalQuestions = item.count;
      else if (item.difficulty === 'Easy') easyQuestions = item.count;
      else if (item.difficulty === 'Medium') mediumQuestions = item.count;
      else if (item.difficulty === 'Hard') hardQuestions = item.count;
    });
  }

  if (calData?.matchedUser) {
    const mu = calData.matchedUser;
    if (mu.submitStatsGlobal?.acSubmissionNum) {
      mu.submitStatsGlobal.acSubmissionNum.forEach((item) => {
        if (item.difficulty === 'All') totalSolved = item.count;
        else if (item.difficulty === 'Easy') easySolved = item.count;
        else if (item.difficulty === 'Medium') mediumSolved = item.count;
        else if (item.difficulty === 'Hard') hardSolved = item.count;
      });
    }

    if (mu.userCalendar) {
      streak = mu.userCalendar.streak || 0;
      totalActiveDays = mu.userCalendar.totalActiveDays || 0;
      try {
        submissionCalendar = typeof mu.userCalendar.submissionCalendar === 'string'
          ? JSON.parse(mu.userCalendar.submissionCalendar)
          : (mu.userCalendar.submissionCalendar || {});
      } catch {
        submissionCalendar = {};
      }
    }
  }

  // Map attended contests to solved problems using public/leetcode.json
  const { contestMap, problemSlugMap } = await getLeetCodeContestMap();

  contestHistory.forEach((item) => {
    if (!item.attended || !item.problemsSolved || item.problemsSolved <= 0) return;
    const title = item.contest?.title || '';
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const contest = contestMap.get(slug);

    if (contest && Array.isArray(contest.problems)) {
      const solvedInContest = contest.problems.slice(0, item.problemsSolved);
      const startTime = item.contest?.startTime ? Number(item.contest.startTime) * 1000 : Date.now();
      const solvedDate = new Date(startTime).toISOString();

      solvedInContest.forEach((prob) => {
        const pSlug = (prob.link || prob.url || '').replace(/\/$/, '').split('/').pop().toLowerCase();
        if (pSlug) {
          solvedSlugs.add(pSlug);
          const rawTags = Array.isArray(prob.tags) ? prob.tags : [];
          const cleanTags = rawTags.filter((t) => typeof t === 'string' && !t.startsWith('rating-'));
          const rawDiff = prob.difficulty || (prob.rating ? (prob.rating >= 2000 ? 'HARD' : prob.rating >= 1550 ? 'MEDIUM' : 'EASY') : 'MEDIUM');
          solvedDetails.push({
            slug: pSlug,
            title: prob.title || pSlug,
            url: prob.link || `https://leetcode.com/problems/${pSlug}/`,
            points: prob.points || '4',
            rating: prob.rating || 1500,
            difficulty: rawDiff,
            tags: cleanTags,
            solvedAt: solvedDate,
            contestTitle: title
          });
        }
      });
    }
  });

  // Add recent AC submissions
  rawRecentAc.forEach((sub) => {
    const slug = (sub.titleSlug || '').toLowerCase();
    if (slug) {
      solvedSlugs.add(slug);
      const tsNum = Number(sub.timestamp);
      const solvedAt = tsNum
        ? new Date(tsNum < 10000000000 ? tsNum * 1000 : tsNum).toISOString()
        : new Date().toISOString();

      // Avoid duplicate details if already added from contest
      if (!solvedDetails.some((d) => d.slug === slug)) {
        const matchedCatalog = problemSlugMap?.get(slug);
        const rawDiff = matchedCatalog?.difficulty || (matchedCatalog?.rating ? (matchedCatalog.rating >= 2000 ? 'HARD' : matchedCatalog.rating >= 1550 ? 'MEDIUM' : 'EASY') : 'MEDIUM');
        solvedDetails.push({
          slug,
          title: matchedCatalog?.title || sub.title || slug,
          url: matchedCatalog?.url || `https://leetcode.com/problems/${slug}/`,
          points: '4',
          rating: matchedCatalog?.rating || 1500,
          difficulty: rawDiff,
          tags: matchedCatalog?.tags || [],
          solvedAt,
          contestTitle: null
        });
      }
    }
  });

  return {
    handle: cleanHandle,
    solvedSlugs: Array.from(solvedSlugs),
    solvedDetails,
    userRating,
    globalRanking,
    attendedContests,
    badge: badgeName,
    topPercentage,
    submissionCalendar,
    totalActiveDays,
    streak,
    contestHistory,
    totalSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    totalQuestions,
    easyQuestions,
    mediumQuestions,
    hardQuestions
  };
}
