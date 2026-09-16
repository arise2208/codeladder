import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CC_PATH = path.resolve(process.cwd(), 'public/codechef-contest.json');

// Load contest catalog
let contestMap = new Map();
let allCodes = new Set();
if (fs.existsSync(CC_PATH)) {
  try {
    const contests = JSON.parse(fs.readFileSync(CC_PATH, 'utf-8'));
    contests.forEach((c) => {
      (c.problems || []).forEach((p) => {
        if (p.code) {
          const codeUpper = p.code.trim().toUpperCase();
          allCodes.add(codeUpper);
          if (p.name) {
            contestMap.set(p.name.trim().toLowerCase(), codeUpper);
          }
          contestMap.set(codeUpper.toLowerCase(), codeUpper);
        }
      });
    });
  } catch (e) {
    console.warn('Could not read codechef-contest.json:', e.message);
  }
}

function fetchCurl(url) {
  try {
    return execSync(
      `curl -s -L --max-time 10 -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" "${url}"`,
      { encoding: 'utf-8', maxBuffer: 15 * 1024 * 1024 }
    );
  } catch {
    return null;
  }
}

async function syncUser(handleInput) {
  if (!handleInput) {
    console.log('Usage: node scripts/sync_user_codechef.mjs <codechef_username>');
    process.exit(1);
  }

  const handle = handleInput.replace(/^[@/]+/, '').trim();
  console.log('===========================================================');
  console.log(`🚀 Synchronizing Solved CodeChef Submissions for: @${handle}`);
  console.log('===========================================================');

  const solvedCodes = new Set();
  const submissions = [];
  let userRating = 1500;
  let stars = '1★';

  // 1. Fetch recent user submissions (up to 4 pages)
  console.log('📡 Fetching recent submissions stream...');
  for (let page = 0; page < 4; page++) {
    const url = `https://www.codechef.com/recent/user?page=${page}&user_handle=${encodeURIComponent(handle)}`;
    const stdout = fetchCurl(url);
    if (!stdout) continue;

    try {
      const json = JSON.parse(stdout);
      if (json.content) {
        const rows = Array.from(json.content.matchAll(/<tr\s*>([\s\S]*?)<\/tr>/gi)).map((m) => m[1]);
        rows.forEach((r) => {
          const codeMatch = r.match(/problems\/([A-Z0-9_]+)/i);
          const isAccepted = r.includes("title='accepted'") || r.includes('tick-icon');
          const timeMatch = r.match(/title='([0-9]{1,2}:[0-9]{2}\s+(?:AM|PM)\s+[0-9/]+)'/i);
          const langMatch = r.match(/<td\s+title='([^']+)'>[A-Za-z0-9+#]+<\/td>/i);

          if (codeMatch) {
            const code = codeMatch[1].trim().toUpperCase();
            if (isAccepted) {
              solvedCodes.add(code);
              submissions.push({
                code,
                verdict: 'AC',
                time: timeMatch ? timeMatch[1] : null,
                language: langMatch ? langMatch[1] : 'Unknown'
              });
            }
          }
        });

        if (json.max_page !== undefined && page >= json.max_page) break;
      }
    } catch {}
  }
  console.log(`✅ Extracted ${solvedCodes.size} solved problems from recent submissions.`);

  // 2. Fetch User Profile page
  console.log('📄 Fetching user profile upsolved contest records...');
  const profileHtml = fetchCurl(`https://www.codechef.com/users/${encodeURIComponent(handle)}`);
  if (profileHtml) {
    const ratingMatch = profileHtml.match(/class="rating-number">(\d+)</);
    if (ratingMatch) userRating = parseInt(ratingMatch[1], 10);

    const starMatch = profileHtml.match(/class="rating-star">([^<]+)</);
    if (starMatch) stars = starMatch[1].trim();

    // 2a. Parse all_rating
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
        console.warn('Error parsing all_rating:', err.message);
      }
    }

    // 2b. Parse userDailySubmissionsStats
    let dailySubmissions = [];
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
      } catch {}
    }

    const solvedDetails = [];
    const idx = profileHtml.indexOf('problems-solved');
    if (idx !== -1) {
      const end = profileHtml.indexOf('</section>', idx);
      const section = profileHtml.slice(idx, end !== -1 ? end : idx + 60000);

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
          let code = contestMap.get(cleanName);
          if (!code) {
            const rawCode = name.replace(/[^A-Za-z0-9_]/g, '').toUpperCase();
            if (rawCode.length >= 2 && rawCode.length <= 15) {
              code = rawCode;
            }
          }

          if (code) {
            solvedCodes.add(code);
            solvedDetails.push({
              code,
              name: name.replace(/&nbsp;/g, ' ').trim(),
              contest: cName,
              solvedAt: matchedInfo ? matchedInfo.isoDate : null,
              rating: matchedInfo ? matchedInfo.rating : userRating
            });
          }
        });
      });
    }

    console.log('===========================================================');
    console.log('📊 CodeChef User Sync Summary:');
    console.log(`   - Username:           @${handle}`);
    console.log(`   - Rating:             ${userRating} (${stars})`);
    console.log(`   - Solved Count:       ${solvedCodes.size} problems`);
    console.log(`   - Contest Solved:     ${solvedDetails.length} mapped problems`);
    console.log(`   - Active Days:        ${dailySubmissions.length} active days`);
    console.log('   - Sample Codes:      ', Array.from(solvedCodes).slice(0, 10).join(', '));
    console.log('===========================================================');

    // Export to output/user_codechef_solved.json
    const outDir = path.resolve(process.cwd(), 'output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `${handle}_codechef_solved.json`);
    fs.writeFileSync(
      outFile,
      JSON.stringify(
        {
          handle,
          rating: userRating,
          stars,
          totalSolved: solvedCodes.size,
          solvedCodes: Array.from(solvedCodes),
          solvedDetails,
          dailySubmissions,
          syncedAt: new Date().toISOString()
        },
        null,
        2
      ),
      'utf-8'
    );
    console.log(`💾 Saved solved problem list to: ${outFile}`);
  }
}

const arg = process.argv[2] || 'yash2003bisht';
syncUser(arg);
