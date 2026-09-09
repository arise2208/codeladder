/**
 * Platform Submission and Activity Graph Synchronizers
 * Supports: Codeforces, AtCoder, LeetCode, CodeChef
 */

// Helper to extract clean username from handle, URL, or @mention
export function extractUsername(input) {
  if (!input) return '';
  let clean = String(input).trim();
  
  // Remove trailing slashes
  clean = clean.replace(/\/+$/, '');

  // If it's a URL, extract the actual username
  // Matches:
  // https://leetcode.com/u/arise22 -> arise22
  // https://leetcode.com/arise22 -> arise22
  // https://codeforces.com/profile/arise -> arise
  // https://www.codechef.com/users/esira -> esira
  // https://atcoder.jp/users/arise2208 -> arise2208
  if (clean.includes('/')) {
    const parts = clean.split('/').filter(Boolean);
    clean = parts[parts.length - 1];
    // If the last part was 'u' (e.g. from some odd path), look at previous
    if (clean.toLowerCase() === 'u' && parts.length > 1) {
      clean = parts[parts.length - 2];
    }
  }

  // Remove leading @ or /
  clean = clean.replace(/^[@/]+/, '').trim();
  return clean;
}

// 1. Codeforces (Official User Status API)
export async function fetchCodeforcesData(handleInput) {
  const cleanHandle = extractUsername(handleInput);
  if (!cleanHandle) throw new Error('Please provide a Codeforces handle.');

  const url = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(cleanHandle)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Codeforces API error: ${res.statusText}`);
  const data = await res.json();
  if (data.status !== 'OK') throw new Error(data.comment || 'Failed to fetch Codeforces submissions');

  const acceptedMap = new Map();
  (data.result || []).forEach((s) => {
    if (s.verdict === 'OK' && s.problem) {
      const problemKey = `${s.problem.contestId}-${s.problem.index}`;
      if (!acceptedMap.has(problemKey)) {
        acceptedMap.set(problemKey, {
          _id: `cf-${problemKey}`,
          title: s.problem.name,
          platform: 'CODEFORCES',
          url: `https://codeforces.com/contest/${s.problem.contestId}/problem/${s.problem.index}`,
          difficulty: s.problem.rating ? String(s.problem.rating) : 'Unrated',
          metadata: {
            rating: s.problem.rating || 0,
            tags: s.problem.tags || []
          },
          tags: s.problem.tags || [],
          solvedAt: new Date(s.creationTimeSeconds * 1000).toISOString(),
          state: {
            solved: true,
            solvedAt: new Date(s.creationTimeSeconds * 1000).toISOString()
          }
        });
      }
    }
  });

  return Array.from(acceptedMap.values());
}

// 2. AtCoder (Kenkoooo Public API)
export async function fetchAtCoderData(handleInput) {
  const cleanHandle = extractUsername(handleInput);
  if (!cleanHandle) throw new Error('Please provide an AtCoder handle.');

  const url = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(cleanHandle)}&from_second=0`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`AtCoder API error: ${res.statusText}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Invalid AtCoder response format');

  const acceptedMap = new Map();
  data.forEach((s) => {
    if (s.result === 'AC') {
      const problemKey = s.problem_id;
      if (!acceptedMap.has(problemKey)) {
        let estimatedRating = 400;
        const pt = s.point || 0;
        if (pt <= 100) estimatedRating = 400;
        else if (pt <= 200) estimatedRating = 600;
        else if (pt <= 300) estimatedRating = 900;
        else if (pt <= 400) estimatedRating = 1200;
        else if (pt <= 500) estimatedRating = 1500;
        else if (pt <= 600) estimatedRating = 1800;
        else if (pt <= 800) estimatedRating = 2100;
        else estimatedRating = 2400;

        const contestType = s.contest_id ? s.contest_id.slice(0, 3).toUpperCase() : 'ATCODER';
        const formattedTitle = s.problem_id
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        acceptedMap.set(problemKey, {
          _id: `atc-${problemKey}`,
          title: `${formattedTitle} (${s.contest_id?.toUpperCase() || 'AtCoder'})`,
          platform: 'ATCODER',
          url: `https://atcoder.jp/contests/${s.contest_id}/tasks/${s.problem_id}`,
          difficulty: `${estimatedRating}`,
          metadata: {
            rating: estimatedRating,
            tags: [contestType, 'AtCoder']
          },
          tags: [contestType, 'AtCoder'],
          solvedAt: new Date(s.epoch_second * 1000).toISOString(),
          state: {
            solved: true,
            solvedAt: new Date(s.epoch_second * 1000).toISOString()
          }
        });
      }
    }
  });

  return Array.from(acceptedMap.values());
}

// 3. LeetCode (Submission Calendar / Graph API with multi-source fallback)
export async function fetchLeetCodeData(handleInput) {
  const cleanHandle = extractUsername(handleInput);
  if (!cleanHandle) throw new Error('Please provide a valid LeetCode username.');

  let calendarObj = null;
  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;

  // Strategy 1: Direct LeetCode GraphQL via public CORS proxy
  try {
    const targetUrl = 'https://leetcode.com/graphql';
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: `
          query getUserProfile($username: String!) {
            matchedUser(username: $username) {
              userCalendar {
                submissionCalendar
              }
              submitStatsGlobal {
                acSubmissionNum {
                  difficulty
                  count
                }
              }
            }
          }
        `,
        variables: { username: cleanHandle }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const matched = data?.data?.matchedUser;
      if (matched) {
        if (matched.userCalendar?.submissionCalendar) {
          calendarObj = matched.userCalendar.submissionCalendar;
        }
        const stats = matched.submitStatsGlobal?.acSubmissionNum || [];
        stats.forEach((st) => {
          if (st.difficulty === 'Easy') easySolved = st.count;
          if (st.difficulty === 'Medium') mediumSolved = st.count;
          if (st.difficulty === 'Hard') hardSolved = st.count;
        });
      }
    }
  } catch (err) {
    console.warn('LeetCode GraphQL proxy attempt 1 failed:', err);
  }

  // Strategy 2: Vercel serverless API
  if (!calendarObj) {
    try {
      const res = await fetch(`https://leetcode-api-faisalshohag.vercel.app/${encodeURIComponent(cleanHandle)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.submissionCalendar) {
          calendarObj = data.submissionCalendar;
          easySolved = data.easySolved || 0;
          mediumSolved = data.mediumSolved || 0;
          hardSolved = data.hardSolved || 0;
        }
      }
    } catch (err) {
      console.warn('Vercel LeetCode API fallback failed:', err);
    }
  }

  // Strategy 3: Alfa LeetCode API (Render)
  if (!calendarObj) {
    try {
      const res = await fetch(`https://alfa-leetcode-api.onrender.com/userProfileCalendar?username=${encodeURIComponent(cleanHandle)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.submissionCalendar) {
          calendarObj = data.submissionCalendar;
        }
      }
    } catch {
      // try next
    }
  }

  // Strategy 4: LeetCode Stats API (Heroku)
  if (!calendarObj) {
    try {
      const res = await fetch(`https://leetcode-stats-api.herokuapp.com/${encodeURIComponent(cleanHandle)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.submissionCalendar) {
          calendarObj = data.submissionCalendar;
          easySolved = data.easySolved || 0;
          mediumSolved = data.mediumSolved || 0;
          hardSolved = data.hardSolved || 0;
        }
      }
    } catch {
      // ignore
    }
  }

  // Parse calendarObj if returned as string
  if (typeof calendarObj === 'string') {
    try {
      calendarObj = JSON.parse(calendarObj);
    } catch (e) {
      console.warn('Failed to parse calendarObj JSON string:', e);
    }
  }

  if (!calendarObj || Object.keys(calendarObj).length === 0) {
    throw new Error(`Could not fetch LeetCode activity calendar for @${cleanHandle}. Please ensure your LeetCode profile (https://leetcode.com/u/${cleanHandle}/) is public.`);
  }

  const generatedQuestions = [];
  const entries = Object.entries(calendarObj).sort((a, b) => Number(a[0]) - Number(b[0]));

  let easyLeft = easySolved;
  let medLeft = mediumSolved;
  let hardLeft = hardSolved;

  entries.forEach(([tsStr, count]) => {
    const rawVal = Number(tsStr);
    const tsMillis = rawVal < 10000000000 ? rawVal * 1000 : rawVal;
    const dateObj = new Date(tsMillis);
    const dateIso = dateObj.toISOString();
    const solveCount = Math.min(25, Math.max(1, Number(count)));

    for (let i = 0; i < solveCount; i++) {
      let diff = 'Medium';
      let rating = 1500;

      if (hardLeft > 0 && Math.random() < 0.25) {
        diff = 'Hard';
        rating = 1950;
        hardLeft--;
      } else if (easyLeft > 0 && Math.random() < 0.5) {
        diff = 'Easy';
        rating = 1100;
        easyLeft--;
      } else if (medLeft > 0) {
        diff = 'Medium';
        rating = 1550;
        medLeft--;
      }

      generatedQuestions.push({
        _id: `lc-${rawVal}-${i}`,
        title: `LeetCode Solved Problem`,
        platform: 'LEETCODE',
        url: `https://leetcode.com/u/${cleanHandle}/`,
        difficulty: diff,
        metadata: {
          rating,
          tags: ['LeetCode', diff]
        },
        tags: ['LeetCode', diff],
        solvedAt: dateIso,
        state: {
          solved: true,
          solvedAt: dateIso
        }
      });
    }
  });

  return generatedQuestions;
}

// 4. CodeChef (Submission Heatmap & Rating API)
export async function fetchCodeChefData(handleInput) {
  const cleanHandle = extractUsername(handleInput);
  if (!cleanHandle) throw new Error('Please provide a CodeChef username.');

  let heatMapEntries = null;
  let userRating = 1500;

  // Try Primary: codechef-api
  try {
    const res = await fetch(`https://codechef-api.vercel.app/handle/${encodeURIComponent(cleanHandle)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.heatMap && Array.isArray(data.heatMap)) {
        heatMapEntries = data.heatMap;
        userRating = data.currentRating || data.highestRating || 1500;
      }
    }
  } catch {
    // try fallback below
  }

  // Fallback 1: codechef-api.onrender.com
  if (!heatMapEntries) {
    try {
      const res = await fetch(`https://codechef-api.onrender.com/handle/${encodeURIComponent(cleanHandle)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.heatMap && Array.isArray(data.heatMap)) {
          heatMapEntries = data.heatMap;
          userRating = data.currentRating || data.highestRating || 1500;
        }
      }
    } catch {
      // ignore
    }
  }

  // Fallback 2: Direct public scrape through CORS proxy
  if (!heatMapEntries) {
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://www.codechef.com/users/${cleanHandle}`)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const html = await res.text();
        const ratingMatch = html.match(/class="rating-number">(\d+)</);
        if (ratingMatch) userRating = Number(ratingMatch[1]);

        const matches = Array.from(html.matchAll(/"(\d{4}-\d{2}-\d{2})":\s*(\d+)/g));
        if (matches.length > 0) {
          heatMapEntries = matches.map((m) => ({ date: m[1], value: Number(m[2]) }));
        }
      }
    } catch {
      // ignore
    }
  }

  if (!heatMapEntries || heatMapEntries.length === 0) {
    throw new Error(`Could not fetch CodeChef activity heatmap for @${cleanHandle}. Please verify the handle is correct at codechef.com/users/${cleanHandle}`);
  }

  const generatedQuestions = [];
  heatMapEntries.forEach((entry, idx) => {
    const dateStr = entry.date;
    const count = Number(entry.value || 1);
    if (!dateStr || count <= 0) return;

    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return;
    const dateIso = dateObj.toISOString();

    for (let i = 0; i < count; i++) {
      generatedQuestions.push({
        _id: `cc-${dateStr}-${i}-${idx}`,
        title: `CodeChef Solved Problem`,
        platform: 'CODECHEF',
        url: `https://www.codechef.com/users/${cleanHandle}`,
        difficulty: `${userRating}`,
        metadata: {
          rating: userRating,
          tags: ['CodeChef', 'Practice']
        },
        tags: ['CodeChef', 'Practice'],
        solvedAt: dateIso,
        state: {
          solved: true,
          solvedAt: dateIso
        }
      });
    }
  });

  return generatedQuestions;
}
