import api from './api';

/**
 * CodeChef User Submission & Solved Problems Synchronization
 */

// Helper to sanitize CodeChef handle from URLs, @mentions, etc.
export function extractCodeChefUsername(input) {
  if (!input) return '';
  let clean = String(input).trim();
  clean = clean.replace(/\/+$/, '');

  if (clean.includes('/')) {
    const parts = clean.split('/').filter(Boolean);
    clean = parts[parts.length - 1];
    if (clean.toLowerCase() === 'users' && parts.length > 1) {
      clean = parts[parts.length - 2];
    }
  }

  return clean.replace(/^[@/]+/, '').trim();
}

// Helper to parse CodeChef timestamps (relative e.g. "13 min ago", or absolute e.g. "08:24 PM 10/06/26" in IST)
export function parseCodeChefTimestamp(rawText) {
  if (!rawText) return null;
  const str = String(rawText).trim();
  const now = Date.now();

  // 1. Relative time
  if (/just\s+now/i.test(str)) return new Date(now).toISOString();
  const minMatch = str.match(/(\d+)\s*(?:min|minute)s?\s*ago/i);
  if (minMatch) return new Date(now - parseInt(minMatch[1], 10) * 60 * 1000).toISOString();
  const hourMatch = str.match(/(\d+)\s*(?:hour|hr)s?\s*ago/i);
  if (hourMatch) return new Date(now - parseInt(hourMatch[1], 10) * 3600 * 1000).toISOString();
  const dayMatch = str.match(/(\d+)\s*days?\s*ago/i);
  if (dayMatch) return new Date(now - parseInt(dayMatch[1], 10) * 86400 * 1000).toISOString();
  if (/yesterday/i.test(str)) return new Date(now - 86400 * 1000).toISOString();

  // 2. Absolute time in IST: [HH:MM AM/PM] DD/MM/YY(YY)
  const absMatch = str.match(/(?:(\d{1,2}):(\d{2})\s*(AM|PM)\s+)?(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
  if (absMatch) {
    let [, hours, mins, ampm, day, month, year] = absMatch;
    let y = parseInt(year, 10);
    if (y < 100) y += 2000;
    const m = parseInt(month, 10) - 1;
    const d = parseInt(day, 10);

    let h = 0, min = 0;
    if (hours && mins && ampm) {
      h = parseInt(hours, 10);
      min = parseInt(mins, 10);
      if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
      if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
    }

    // IST is UTC+5:30 -> subtract 5h 30m for UTC
    const dateObj = new Date(Date.UTC(y, m, d, h - 5, min - 30));
    if (!isNaN(dateObj.getTime())) return dateObj.toISOString();
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();
  return null;
}

// Local proxy fetcher supporting Vite dev proxy (/codechef-api)
async function fetchEndpoint(endpointPath) {
  try {
    const res = await fetch(`/codechef-api${endpointPath}`);
    if (res.ok) {
      const text = await res.text();
      if (!text.includes('"error":"Failed to fetch from CodeChef via proxy"')) {
        return text;
      }
    }
  } catch {}
  return null;
}

// In-memory cache for contest problem names -> codes mapping and problem details
let nameToCodeCache = null;
let contestProblemsMap = null;

async function getContestProblemCatalog() {
  if (nameToCodeCache && contestProblemsMap) {
    return { nameMap: nameToCodeCache, problemMap: contestProblemsMap };
  }
  const nameMap = new Map();
  const problemMap = new Map();
  try {
    const res = await fetch('/codechef-contest.json');
    if (res.ok) {
      const contests = await res.json();
      contests.forEach((c) => {
        (c.problems || []).forEach((p) => {
          if (p.code) {
            const codeUpper = p.code.trim().toUpperCase();
            if (p.name) {
              nameMap.set(p.name.trim().toLowerCase(), codeUpper);
            }
            nameMap.set(codeUpper.toLowerCase(), codeUpper);
            if (!problemMap.has(codeUpper)) {
              problemMap.set(codeUpper, {
                code: codeUpper,
                name: p.name || codeUpper,
                rating: (p.rating && !isNaN(Number(p.rating))) ? Number(p.rating) : null,
                url: p.url || `https://www.codechef.com/problems/${codeUpper}`,
                tags: Array.isArray(p.tags) ? p.tags : []
              });
            }
          }
        });
      });
    }
  } catch {}
  nameToCodeCache = nameMap;
  contestProblemsMap = problemMap;
  return { nameMap, problemMap };
}

async function getContestNameToCodeMap() {
  const { nameMap } = await getContestProblemCatalog();
  return nameMap;
}

/**
 * Fetches solved problems for a CodeChef user
 * @param {string} handleInput - CodeChef handle or profile URL
 * @param {number} maxRecentPages - Number of recent submission pages to check (default 3)
 */
export async function fetchCodeChefUserSolved(handleInput, maxRecentPages = 3) {
  const cleanHandle = extractCodeChefUsername(handleInput);
  if (!cleanHandle) throw new Error('Please provide a valid CodeChef username.');

  // 1. Primary: Dedicated CodeLadder backend API (server-side, zero CORS)
  try {
    const { data } = await api.post('/platform-accounts/codechef/fetch-user', { handle: cleanHandle });
    if (data?.success && data.userSolved) {
      const u = data.userSolved;
      const { problemMap } = await getContestProblemCatalog();
      const solvedCodes = new Set((u.solvedCodes || []).map((c) => c.toUpperCase()));
      const solvedDetails = [];

      solvedCodes.forEach((code) => {
        const item = problemMap.get(code);
        solvedDetails.push({
          code,
          name: item?.name || code,
          rating: item?.rating || null,
          url: item?.url || `https://www.codechef.com/problems/${code}`,
          tags: item?.tags || []
        });
      });

      return {
        handle: u.handle || cleanHandle,
        userRating: u.userRating || 1500,
        highestRating: u.highestRating || null,
        stars: u.stars || '1★',
        globalRank: u.globalRank || null,
        countryRank: u.countryRank || null,
        totalProblemsSolved: u.totalProblemsSolved || solvedCodes.size,
        contestsCount: u.contestsCount || null,
        solvedCodes: Array.from(solvedCodes),
        dailySubmissions: u.dailySubmissions || [],
        submissions: [],
        solvedDetails,
        profileFound: true,
        isVerified: u.isVerified || false
      };
    }
  } catch (backendErr) {
    console.warn('Backend CodeChef fetch-user failed, trying dev proxy fallback:', backendErr);
  }

  const solvedCodes = new Set();
  const solvedDetailsMap = new Map();
  const submissions = [];
  let dailySubmissions = [];
  let userRating = 1500;
  let highestRating = null;
  let stars = '1★';
  let globalRank = null;
  let countryRank = null;
  let totalProblemsSolved = null;
  let contestsCount = null;
  let profileFound = false;

  // 2. Fallback: Dev server proxy HTML parsing
  const profileHtml = await fetchEndpoint(`/users/${encodeURIComponent(cleanHandle)}`);
  if (profileHtml && typeof profileHtml === 'string') {
    profileFound = true;

    // Extract Rating & Stars
    const ratingMatch = profileHtml.match(/rating-number">\s*(\d+)/i) || profileHtml.match(/class="rating-number">(\d+)</);
    if (ratingMatch) userRating = parseInt(ratingMatch[1], 10);

    const highestMatch = profileHtml.match(/Highest Rating\s*(\d+)/i) || profileHtml.match(/\(Highest Rating\s*(\d+)\)/i);
    if (highestMatch) highestRating = parseInt(highestMatch[1], 10);

    const starContainer = profileHtml.match(/class="rating-star">([\s\S]*?)<\/div>/i);
    if (starContainer) {
      const starEntityCount = (starContainer[1].match(/&#9733;|\★/gi) || []).length;
      const spanCount = (starContainer[1].match(/<span/gi) || []).length;
      const count = starEntityCount || spanCount;
      if (count > 0) stars = `${count}★`;
    }

    // Global & Country Rank
    const globalRankMatch = profileHtml.match(/<a[^>]*href="\/ratings\/all"[^>]*>\s*<strong>\s*(\d+)\s*<\/strong>\s*<\/a>\s*Global Rank/i)
      || profileHtml.match(/class="rating-ranks">[\s\S]*?<strong>(\d+)<\/strong>\s*<\/a>\s*Global Rank/i)
      || profileHtml.match(/<strong>(\d+)<\/strong>\s*<\/a>\s*Global Rank/i);
    if (globalRankMatch) globalRank = parseInt(globalRankMatch[1], 10);

    const countryRankMatch = profileHtml.match(/<a[^>]*href="\/ratings\/all\?filterBy=Country[^"]*"[^>]*>\s*<strong>\s*(\d+)\s*<\/strong>\s*<\/a>\s*Country Rank/i)
      || profileHtml.match(/<strong>(\d+)<\/strong>\s*<\/a>\s*Country Rank/i);
    if (countryRankMatch) countryRank = parseInt(countryRankMatch[1], 10);

    const totalSolvedMatch = profileHtml.match(/Total Problems Solved:\s*(\d+)/i)
      || profileHtml.match(/<h3>Total Problems Solved:\s*(\d+)<\/h3>/i);
    if (totalSolvedMatch) totalProblemsSolved = parseInt(totalSolvedMatch[1], 10);

    const contestsMatch = profileHtml.match(/Contests\s*\((\d+)\)/i) || profileHtml.match(/No\.\s*of Contests Participated:\s*(\d+)/i);
    if (contestsMatch) contestsCount = parseInt(contestsMatch[1], 10);

    // 1a. Parse all_rating array for contest dates and contest ratings
    const contestDateMap = new Map();
    const allRatingMatch = profileHtml.match(/var\s+all_rating\s*=\s*(\[[\s\S]*?\]);/);
    if (allRatingMatch) {
      try {
        const allRating = JSON.parse(allRatingMatch[1]);
        allRating.forEach((r) => {
          let isoDate = null;
          if (r.end_date) {
            const cleanEnd = String(r.end_date).trim().replace(' ', 'T');
            const d = new Date(cleanEnd.includes('Z') || cleanEnd.includes('+') ? cleanEnd : `${cleanEnd}+05:30`);
            if (!isNaN(d.getTime())) isoDate = d.toISOString();
          }
          if (!isoDate && r.getyear && r.getmonth && r.getday) {
            const y = parseInt(r.getyear, 10);
            const m = String(parseInt(r.getmonth, 10)).padStart(2, '0');
            const d = String(parseInt(r.getday, 10)).padStart(2, '0');
            isoDate = `${y}-${m}-${d}T15:00:00.000Z`;
          }

          const rating = parseInt(r.rating, 10) || userRating;
          if (!isoDate) return;

          if (r.code) {
            const codeUpper = String(r.code).trim().toUpperCase();
            contestDateMap.set(codeUpper, { isoDate, rating });
            const root = codeUpper.replace(/[A-D]$/i, '');
            contestDateMap.set(root, { isoDate, rating });
            const numMatch = root.match(/START(\d+)/i);
            if (numMatch) {
              contestDateMap.set(`starters ${numMatch[1]}`, { isoDate, rating });
            }
          }
          if (r.name) {
            contestDateMap.set(String(r.name).trim().toLowerCase(), { isoDate, rating });
            const m = String(r.name).match(/Starters\s+(\d+)/i);
            if (m) {
              contestDateMap.set(`starters ${m[1]}`, { isoDate, rating });
            }
          }
        });
      } catch (err) {
        console.warn('Error parsing all_rating in profile HTML:', err);
      }
    }

    // 1b. Parse userDailySubmissionsStats for daily submission counts
    const dailyStatsMatch = profileHtml.match(/var\s+userDailySubmissionsStats\s*=\s*(\[[\s\S]*?\]);/);
    if (dailyStatsMatch) {
      try {
        const rawDaily = JSON.parse(dailyStatsMatch[1]);
        dailySubmissions = rawDaily.map((item) => {
          const parts = String(item.date).split('-');
          let formattedDate = item.date;
          if (parts.length === 3) {
            formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
          return {
            date: formattedDate,
            value: Number(item.value) || 0
          };
        });
      } catch (err) {
        console.warn('Error parsing userDailySubmissionsStats in profile HTML:', err);
      }
    }

    // 1c. Extract problem names & contests from problems-solved section
    const { nameMap, problemMap } = await getContestProblemCatalog();
    const idx = profileHtml.indexOf('problems-solved');
    if (idx !== -1) {
      const end = profileHtml.indexOf('</section>', idx);
      const section = profileHtml.slice(idx, end !== -1 ? end : idx + 60000);

      // Parse contest blocks: <h5>Contest Title</h5> ... <p>Problems</p>
      const contestBlocks = Array.from(
        section.matchAll(/<h5[^>]*>([\s\S]*?)<\/h5>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi)
      );

      contestBlocks.forEach((b) => {
        const cName = b[1].replace(/<[^>]+>/g, '').trim();
        const cLower = cName.toLowerCase();

        let matchedInfo = null;
        for (const [key, val] of contestDateMap.entries()) {
          if (cLower.includes(key.toLowerCase())) {
            matchedInfo = val;
            break;
          }
        }

        const spans = Array.from(
          b[2].matchAll(/<span[^>]*style="font-size:\s*12px[^>]*>([^<]+)<\/span>/gi)
        ).map((m) => m[1].trim());

        spans.forEach((name) => {
          const cleanName = name.replace(/&nbsp;/g, ' ').trim().toLowerCase();
          let code = nameMap.get(cleanName);
          if (!code) {
            const rawCode = name.replace(/[^A-Za-z0-9_]/g, '').toUpperCase();
            if (rawCode.length >= 2 && rawCode.length <= 15) {
              code = rawCode;
            }
          }

          if (code) {
            solvedCodes.add(code);
            const catProb = problemMap.get(code);
            const existing = solvedDetailsMap.get(code);
            solvedDetailsMap.set(code, {
              code,
              name: (catProb?.name && catProb.name !== code) ? catProb.name : name.replace(/&nbsp;/g, ' ').trim(),
              contest: cName,
              solvedAt: matchedInfo ? matchedInfo.isoDate : existing?.solvedAt || null,
              rating: catProb?.rating || null,
              tags: catProb?.tags || existing?.tags || []
            });
          }
        });

        // Direct hrefs inside contest block
        const directCodes = Array.from(b[2].matchAll(/(?:\/problems\/|\/status\/)([A-Z0-9_]+)/gi));
        directCodes.forEach((m) => {
          const c = m[1].trim().toUpperCase();
          if (c && c !== 'SUBMIT' && c !== 'STATUS') {
            solvedCodes.add(c);
            const catProb = problemMap.get(c);
            const existing = solvedDetailsMap.get(c);
            solvedDetailsMap.set(c, {
              code: c,
              name: (catProb?.name && catProb.name !== c) ? catProb.name : (existing?.name || c),
              contest: cName,
              solvedAt: matchedInfo ? matchedInfo.isoDate : existing?.solvedAt || null,
              rating: catProb?.rating || null,
              tags: catProb?.tags || existing?.tags || []
            });
          }
        });
      });

      // Also extract any direct href="/problems/CODE" in the whole section
      const allDirectCodes = Array.from(section.matchAll(/(?:\/problems\/|\/status\/)([A-Z0-9_]+)/gi));
      allDirectCodes.forEach((m) => {
        const c = m[1].trim().toUpperCase();
        if (c && c !== 'SUBMIT' && c !== 'STATUS') {
          solvedCodes.add(c);
          if (!solvedDetailsMap.has(c)) {
            const catProb = problemMap.get(c);
            solvedDetailsMap.set(c, {
              code: c,
              name: (catProb?.name && catProb.name !== c) ? catProb.name : c,
              contest: 'Practice',
              solvedAt: null,
              rating: catProb?.rating || null,
              tags: catProb?.tags || []
            });
          }
        }
      });
    }
  }

  // 2. Fetch Recent Submissions stream (up to maxRecentPages) to capture recent activity & exact timestamps
  for (let page = 0; page < maxRecentPages; page++) {
    const raw = await fetchEndpoint(`/recent/user?page=${page}&user_handle=${encodeURIComponent(cleanHandle)}`);
    if (!raw) continue;

    try {
      let json = null;
      try {
        json = JSON.parse(raw);
      } catch {
        // raw might be JSON string or HTML
      }

      const content = json?.content || raw;
      if (typeof content === 'string' && content.includes('<table')) {
        profileFound = true;
        const rows = Array.from(content.matchAll(/<tr\s*>([\s\S]*?)<\/tr>/gi)).map((m) => m[1]);

        rows.forEach((r) => {
          const codeMatch = r.match(/problems\/([A-Z0-9_]+)/i);
          const isAccepted = r.includes("title='accepted'") || r.includes('tick-icon') || r.includes('title="accepted"');
          const timeMatch = r.match(/<span class=['"]tooltiptext['"]>([^<]+)<\/span>/i)
            || r.match(/<td\s+title=['"]([^'"]+)['"]>/i)
            || r.match(/title='([0-9]{1,2}:[0-9]{2}\s+(?:AM|PM)\s+[0-9/]+)'/i);
          const rawTime = timeMatch ? timeMatch[1] : null;
          const parsedIso = parseCodeChefTimestamp(rawTime);
          const langMatch = r.match(/<td\s+title='([^']+)'>[A-Za-z0-9+#]+<\/td>/i) || r.match(/<td\s+title="([^"]+)">[A-Za-z0-9+#]+<\/td>/i);

          if (codeMatch) {
            const code = codeMatch[1].trim().toUpperCase();
            if (isAccepted) {
              solvedCodes.add(code);
              submissions.push({
                code,
                verdict: 'AC',
                time: parsedIso,
                language: langMatch ? langMatch[1] : 'Unknown'
              });
              if (!solvedDetailsMap.has(code) || (parsedIso && !solvedDetailsMap.get(code).solvedAt)) {
                const catProb = contestProblemsMap?.get(code);
                solvedDetailsMap.set(code, {
                  code,
                  name: (catProb?.name && catProb.name !== code) ? catProb.name : code,
                  contest: 'Recent Submissions',
                  solvedAt: parsedIso,
                  rating: catProb?.rating || null,
                  tags: catProb?.tags || []
                });
              }
            }
          }
        });

        // If max_page is less than current, stop paging
        if (json?.max_page !== undefined && page >= json.max_page) {
          break;
        }
      }
    } catch (err) {
      console.warn(`Error parsing recent submissions page ${page}:`, err);
    }
  }

  const solvedDetails = Array.from(solvedDetailsMap.values());

  if (!profileFound && solvedCodes.size === 0) {
    throw new Error(
      `Could not reach CodeChef profile for @${cleanHandle}. Please check if the username is correct at codechef.com/users/${cleanHandle}`
    );
  }

  return {
    handle: cleanHandle,
    solvedCodes: Array.from(solvedCodes),
    solvedCount: totalProblemsSolved || solvedCodes.size,
    contestSolvedCount: solvedCodes.size,
    totalProblemsSolved,
    solvedDetails,
    dailySubmissions,
    userRating,
    highestRating: highestRating || userRating,
    stars,
    globalRank,
    countryRank,
    contestsCount,
    submissions
  };
}
