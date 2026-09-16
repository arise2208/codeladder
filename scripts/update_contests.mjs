import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dns from 'dns';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const LC_PATH = path.join(PUBLIC_DIR, 'leetcode.json');
const CC_PATH = path.join(PUBLIC_DIR, 'codechef-contest.json');

// Resilient GET with curl fallback
async function smartGet(url, customHeaders = {}) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        ...customHeaders
      },
      signal: AbortSignal.timeout(10000)
    });
    if (res.ok) {
      const text = await res.text();
      try { return JSON.parse(text); } catch { return text; }
    }
  } catch {}

  try {
    const headerFlags = Object.entries({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      ...customHeaders
    }).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');

    const stdout = execSync(`curl -s -L --max-time 15 ${headerFlags} "${url}"`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'ignore']
    });

    const trimmed = (stdout || '').trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed);
    }
    return trimmed;
  } catch {}

  return null;
}

// Resilient POST with curl fallback
async function smartPost(url, jsonBody, customHeaders = {}) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://leetcode.com/contest/',
        'Origin': 'https://leetcode.com',
        ...customHeaders
      },
      body: JSON.stringify(jsonBody),
      signal: AbortSignal.timeout(12000)
    });
    if (res.ok) return await res.json();
  } catch {}

  const tmpFile = path.resolve(process.cwd(), `.tmp_${Date.now()}_req.json`);
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(jsonBody), 'utf-8');

    const headerFlags = Object.entries({
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Referer': 'https://leetcode.com/contest/',
      'Origin': 'https://leetcode.com',
      ...customHeaders
    }).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');

    const stdout = execSync(`curl -s -L --max-time 15 -X POST ${headerFlags} -d @"${tmpFile}" "${url}"`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'ignore']
    });

    const trimmed = (stdout || '').trim();
    if (trimmed.startsWith('{')) {
      return JSON.parse(trimmed);
    }
  } catch {} finally {
    try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch {}
  }

  return null;
}

// =========================================================================
// 1. LEETCODE CONTEST UPDATER
// =========================================================================
async function updateLeetCodeContests() {
  console.log('\n======================================================');
  console.log('🔄 Checking & Updating LeetCode Contest Dataset');
  console.log('======================================================');

  let existing = [];
  if (fs.existsSync(LC_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(LC_PATH, 'utf-8'));
    } catch {
      existing = [];
    }
  }

  const existingUrls = new Set(existing.map((c) => c.url));

  // Find latest Weekly and Biweekly numbers
  let maxWeekly = 0;
  let maxBiweekly = 0;

  existing.forEach((c) => {
    const wMatch = (c.url || '').match(/weekly-contest-(\d+)/i);
    if (wMatch) maxWeekly = Math.max(maxWeekly, parseInt(wMatch[1], 10));

    const bwMatch = (c.url || '').match(/biweekly-contest-(\d+)/i);
    if (bwMatch) maxBiweekly = Math.max(maxBiweekly, parseInt(bwMatch[1], 10));
  });

  console.log(`Current latest indexed: Weekly Contest ${maxWeekly}, Biweekly Contest ${maxBiweekly}`);
  console.log(`Checking for newer contests...`);

  const newContests = [];

  // Helper to fetch contest info from LeetCode GraphQL
  async function fetchContest(slug) {
    const data = await smartPost('https://leetcode.com/graphql', {
      query: `
        query contestQuestions($titleSlug: String!) {
          contest(titleSlug: $titleSlug) {
            title
            titleSlug
            questions {
              title
              titleSlug
              credit
            }
          }
        }
      `,
      variables: { titleSlug: slug }
    });

    const contest = data?.data?.contest;
    if (contest && Array.isArray(contest.questions) && contest.questions.length > 0) {
      return {
        contest: 'leetcode.com',
        url: `https://leetcode.com/contest/${slug}/`,
        problems: contest.questions.map((q) => ({
          link: `https://leetcode.com/problems/${q.titleSlug}/`,
          points: String(q.credit || '4')
        }))
      };
    }
    return null;
  }

  // 1. Scan for new Weekly Contests starting from maxWeekly + 1
  let nextW = maxWeekly + 1;
  let misses = 0;
  while (misses < 3) {
    const slug = `weekly-contest-${nextW}`;
    const contestObj = await fetchContest(slug);
    if (contestObj) {
      console.log(`✅ Found new: Weekly Contest ${nextW} (${contestObj.problems.length} problems)`);
      newContests.push(contestObj);
      existingUrls.add(contestObj.url);
      nextW++;
      misses = 0;
    } else {
      misses++;
      nextW++;
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  // 2. Scan for new Biweekly Contests starting from maxBiweekly + 1
  let nextBW = maxBiweekly + 1;
  misses = 0;
  while (misses < 3) {
    const slug = `biweekly-contest-${nextBW}`;
    const contestObj = await fetchContest(slug);
    if (contestObj) {
      console.log(`✅ Found new: Biweekly Contest ${nextBW} (${contestObj.problems.length} problems)`);
      newContests.push(contestObj);
      existingUrls.add(contestObj.url);
      nextBW++;
      misses = 0;
    } else {
      misses++;
      nextBW++;
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  if (newContests.length > 0) {
    const updated = [...newContests, ...existing];
    fs.writeFileSync(LC_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    console.log(`🎉 Saved ${newContests.length} new contests! Total in leetcode.json: ${updated.length}`);
  } else {
    console.log(`ℹ️ No newer LeetCode contests found beyond Weekly ${maxWeekly} / Biweekly ${maxBiweekly}.`);
  }

  return newContests.length;
}

// =========================================================================
// 2. CODECHEF CONTEST UPDATER
// =========================================================================
async function updateCodeChefContests() {
  console.log('\n======================================================');
  console.log('🔄 Checking & Synchronizing CodeChef Contest Dataset');
  console.log('======================================================');
  try {
    const beforeCount = fs.existsSync(CC_PATH) ? JSON.parse(fs.readFileSync(CC_PATH, 'utf-8')).length : 0;
    execSync('node scripts/sync_codechef_contests.mjs', { stdio: 'inherit' });
    const afterCount = fs.existsSync(CC_PATH) ? JSON.parse(fs.readFileSync(CC_PATH, 'utf-8')).length : 0;
    return Math.max(0, afterCount - beforeCount);
  } catch (err) {
    console.error('⚠️ Could not complete CodeChef sync:', err.message);
    return 0;
  }
}

async function main() {
  console.log('======================================================');
  console.log('  CodeLadder Universal Contest Synchronizer (Live)    ');
  console.log('======================================================');

  const lcCount = await updateLeetCodeContests();
  const ccCount = await updateCodeChefContests();

  if (lcCount > 0 || ccCount > 0) {
    console.log('\n⚡ Contest datasets were updated! Re-generating catalog CSV...');
    execSync('node scripts/download_all_questions.mjs', { stdio: 'inherit' });
  } else {
    console.log('\n✅ All contest datasets are up to date with the latest available rounds!');
  }
}

main().catch((err) => {
  console.error('\n❌ Error updating contests:', err);
  process.exit(1);
});
