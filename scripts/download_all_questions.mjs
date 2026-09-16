import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dns from 'dns';

// Fix Node.js IPv6 resolution on macOS
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

const OUTPUT_DIR = path.resolve(process.cwd(), 'output');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(questions) {
  const header = 'platform,externalId,title,url,difficulty,tags\n';
  const rows = questions.map((q) => {
    return [
      q.platform,
      escapeCsv(q.externalId),
      escapeCsv(q.title),
      escapeCsv(q.url),
      q.difficulty,
      escapeCsv((q.tags || []).join(','))
    ].join(',');
  });
  return header + rows.join('\n');
}

const PROXY_URL = process.env.https_proxy || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://172.31.2.4:8080';

function runCurl(url, options = {}) {
  const headerFlags = Object.entries(options.headers || {})
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' ');
  const methodFlag = options.method ? `-X ${options.method}` : '';
  const dataFlag = options.dataFile ? `-d @"${options.dataFile}"` : '';

  // Try 1: with proxy
  try {
    const cmd = `curl -s -L --max-time 15 -x "${PROXY_URL}" ${methodFlag} ${headerFlags} ${dataFlag} "${url}"`;
    const stdout = execSync(cmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'] });
    const trimmed = (stdout || '').trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);
  } catch {}

  // Try 2: direct without proxy
  try {
    const cmd = `curl -s -L --max-time 15 ${methodFlag} ${headerFlags} ${dataFlag} "${url}"`;
    const stdout = execSync(cmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'] });
    const trimmed = (stdout || '').trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);
  } catch {}

  return null;
}

// Resilient GET with dual curl fallback (proxy + direct)
async function smartGet(url, customHeaders = {}) {
  // 1. Try native fetch first
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        ...customHeaders
      },
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  // 2. Fallback to runCurl with proxy and direct fallback
  return runCurl(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      ...customHeaders
    }
  });
}

// Resilient POST with dual curl fallback
async function smartPost(url, jsonBody, customHeaders = {}) {
  // 1. Try native fetch first
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://leetcode.com/problemset/all/',
        'Origin': 'https://leetcode.com',
        ...customHeaders
      },
      body: JSON.stringify(jsonBody),
      signal: AbortSignal.timeout(10000)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  // 2. Fallback to runCurl via temp payload file
  const tmpFile = path.resolve(process.cwd(), `.tmp_${Date.now()}_req.json`);
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(jsonBody), 'utf-8');
    return runCurl(url, {
      method: 'POST',
      dataFile: tmpFile,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://leetcode.com/problemset/all/',
        'Origin': 'https://leetcode.com',
        ...customHeaders
      }
    });
  } finally {
    try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch {}
  }
}

// Algorithmic keyword tag detector for heuristic enrichment
function inferAlgorithmicTags(title = '') {
  const lower = title.toLowerCase();
  const tags = new Set();

  if (lower.includes('tree') || lower.includes('bst') || lower.includes('ancestor') || lower.includes('leaf')) tags.add('trees');
  if (lower.includes('graph') || lower.includes('path') || lower.includes('grid') || lower.includes('island') || lower.includes('cycle') || lower.includes('network')) tags.add('graphs');
  if (lower.includes('xor') || lower.includes('bit') || lower.includes('binary')) tags.add('bit-manipulation');
  if (lower.includes('string') || lower.includes('palindrome') || lower.includes('anagram') || lower.includes('subsequence') || lower.includes('prefix') || lower.includes('suffix')) tags.add('strings');
  if (lower.includes('array') || lower.includes('subarray') || lower.includes('matrix')) tags.add('arrays');
  if (lower.includes('prime') || lower.includes('gcd') || lower.includes('divis') || lower.includes('mod') || lower.includes('math') || lower.includes('sum') || lower.includes('integer') || lower.includes('factorial')) tags.add('math');
  if (lower.includes('sort') || lower.includes('median') || lower.includes('order')) tags.add('sorting');
  if (lower.includes('search') || lower.includes('find') || lower.includes('query')) tags.add('binary-search');
  if (lower.includes('max') || lower.includes('min') || lower.includes('optimal') || lower.includes('greedy') || lower.includes('least') || lower.includes('cheap')) tags.add('greedy');
  if (lower.includes('game') || lower.includes('nim') || lower.includes('stone') || lower.includes('winner') || lower.includes('score')) tags.add('game-theory');
  if (lower.includes('permute') || lower.includes('permutation') || lower.includes('combination') || lower.includes('ways')) tags.add('combinatorics');
  if (lower.includes('knapsack') || lower.includes('dynamic') || lower.includes('partition') || lower.includes('coin') || lower.includes('robber')) tags.add('dynamic-programming');
  if (lower.includes('stack') || lower.includes('parenthes') || lower.includes('bracket')) tags.add('stack');
  if (lower.includes('queue') || lower.includes('stream')) tags.add('queue');

  return Array.from(tags);
}

// =========================================================================
// 1. LEETCODE FETCHER
// =========================================================================
async function fetchAllLeetCode() {
  console.log('\n========================================================');
  console.log('🚀 1/2: Fetching LeetCode Questions, Topic Tags & Ratings');
  console.log('========================================================');

  const questionsMap = new Map();
  const ratingsMap = new Map();

  // Step 1: Fetch Zerotrac LeetCode Elo contest ratings via jsDelivr CDN (global, never blocked by Indian ISPs)
  console.log('📊 Fetching LeetCode Elo contest ratings from Zerotrac dataset...');
  let zeroData = await smartGet('https://cdn.jsdelivr.net/gh/zerotrac/leetcode_problem_rating@main/data.json');
  if (!zeroData) {
    zeroData = await smartGet('https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/data.json');
  }

  if (Array.isArray(zeroData)) {
    for (const item of zeroData) {
      const rating = Math.round(Number(item.Rating) || 0);
      if (item.ID) ratingsMap.set(String(item.ID), rating);
      if (item.TitleSlug) ratingsMap.set(item.TitleSlug, rating);
    }
    console.log(`✅ Loaded ${ratingsMap.size} exact LeetCode Elo contest ratings!`);
  } else {
    console.log('ℹ️ Zerotrac dataset not directly reachable. Using calibrated tier ratings.');
  }

  // Step 2: Try LeetCode GraphQL pagination
  console.log('🌐 Fetching problem catalog from LeetCode GraphQL...');
  const limit = 100;
  let skip = 0;
  let totalNum = null;
  let page = 1;
  let graphqlWorking = false;

  while (totalNum === null || skip < totalNum) {
    process.stdout.write(`Fetching batch ${page} (offset ${skip})... `);
    const data = await smartPost('https://leetcode.com/graphql', {
      query: `
        query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int) {
          problemsetQuestionList: questionList(
            categorySlug: $categorySlug
            limit: $limit
            skip: $skip
            filters: {}
          ) {
            total: totalNum
            questions: data {
              frontendQuestionId: questionFrontendId
              title
              titleSlug
              difficulty
              paidOnly: isPaidOnly
              topicTags {
                name
                slug
              }
            }
          }
        }
      `,
      variables: {
        categorySlug: 'all-code-questions',
        skip,
        limit
      }
    });

    const questionList = data?.data?.problemsetQuestionList;
    if (!questionList || !Array.isArray(questionList.questions) || questionList.questions.length === 0) {
      if (page === 1) {
        console.log('\n⚠️ LeetCode GraphQL blocked by Cloudflare challenge. Switching to REST & local datasets...');
      }
      break;
    }

    graphqlWorking = true;
    totalNum = questionList.total;
    const batch = questionList.questions;

    for (const q of batch) {
      if (!q.frontendQuestionId || !q.titleSlug) continue;

      let diff = (q.difficulty || 'MEDIUM').toUpperCase();
      if (!['EASY', 'MEDIUM', 'HARD'].includes(diff)) diff = 'MEDIUM';

      const topicTags = (q.topicTags || []).map((t) => t.slug || t.name).filter(Boolean);
      if (topicTags.length === 0) {
        inferAlgorithmicTags(q.title).forEach((t) => topicTags.push(t));
      }

      const extId = String(q.frontendQuestionId);
      const rating = ratingsMap.get(extId) || ratingsMap.get(q.titleSlug) || (diff === 'EASY' ? 1200 : diff === 'HARD' ? 2000 : 1600);
      topicTags.push(`rating-${rating}`);
      if (q.paidOnly) topicTags.push('premium');

      questionsMap.set(q.titleSlug, {
        platform: 'LEETCODE',
        externalId: extId,
        title: q.title,
        url: `https://leetcode.com/problems/${q.titleSlug}/`,
        difficulty: diff,
        tags: Array.from(new Set(topicTags)),
        rating
      });
    }

    console.log(`✅ ${questionsMap.size} / ${totalNum}`);
    skip += limit;
    page++;
    await new Promise((r) => setTimeout(r, 200));
  }

  // Step 3: Try LeetCode REST API fallback if GraphQL didn't return all
  if (!graphqlWorking || questionsMap.size < 500) {
    console.log('🔄 Checking LeetCode REST catalog (api/problems/all)...');
    const restData = await smartGet('https://leetcode.com/api/problems/all/');
    if (restData && Array.isArray(restData.stat_status_pairs)) {
      for (const item of restData.stat_status_pairs) {
        const s = item.stat;
        if (!s || !s.question__title_slug) continue;
        const slug = s.question__title_slug;
        if (questionsMap.has(slug)) continue;

        let diff = 'MEDIUM';
        if (item.difficulty?.level === 1) diff = 'EASY';
        else if (item.difficulty?.level === 3) diff = 'HARD';

        const extId = String(s.frontend_question_id || s.question_id);
        const rating = ratingsMap.get(extId) || ratingsMap.get(slug) || (diff === 'EASY' ? 1200 : diff === 'HARD' ? 2000 : 1600);

        const tags = inferAlgorithmicTags(s.question__title);
        tags.push(`rating-${rating}`);
        if (item.paid_only) tags.push('premium');

        questionsMap.set(slug, {
          platform: 'LEETCODE',
          externalId: extId,
          title: s.question__title,
          url: `https://leetcode.com/problems/${slug}/`,
          difficulty: diff,
          tags: Array.from(new Set(tags)),
          rating
        });
      }
      console.log(`✅ REST catalog processed. Current total: ${questionsMap.size}`);
    }
  }

  // Step 4: Supplement with all contest problems from public/leetcode.json
  const contestFilePath = path.resolve(process.cwd(), 'public/leetcode.json');
  if (fs.existsSync(contestFilePath)) {
    try {
      const contests = JSON.parse(fs.readFileSync(contestFilePath, 'utf-8'));
      let extraCount = 0;
      for (const c of contests) {
        const contestSlug = (c.url || '').replace(/\/$/, '').split('/').pop() || 'contest';
        for (const p of c.problems || []) {
          const link = p.link || p.url;
          if (!link) continue;
          const slug = link.replace(/\/$/, '').split('/').pop();
          if (!slug) continue;

          if (!questionsMap.has(slug)) {
            const formattedTitle = slug
              .split('-')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');

            const pts = Number(p.points) || 4;
            let diff = 'MEDIUM';
            let estRating = 1600;
            if (pts <= 3) { diff = 'EASY'; estRating = 1200; }
            else if (pts >= 6) { diff = 'HARD'; estRating = 2050; }

            const rating = ratingsMap.get(slug) || estRating;
            const tags = inferAlgorithmicTags(formattedTitle);
            tags.push(`rating-${rating}`, contestSlug);

            questionsMap.set(slug, {
              platform: 'LEETCODE',
              externalId: slug,
              title: formattedTitle,
              url: link.startsWith('http') ? link : `https://leetcode.com${link}`,
              difficulty: diff,
              tags: Array.from(new Set(tags)),
              rating
            });
            extraCount++;
          }
        }
      }
      if (extraCount > 0) {
        console.log(`ℹ️ Processed ${extraCount} contest problems from public/leetcode.json.`);
      }
    } catch {}
  }

  const result = Array.from(questionsMap.values());
  console.log(`🎉 Total LeetCode Questions Prepared: ${result.length}`);
  return result;
}

// =========================================================================
// 2. CODECHEF FETCHER
// =========================================================================
async function fetchAllCodeChef() {
  console.log('\n========================================================');
  console.log('🚀 2/2: Fetching CodeChef Questions, Topic Tags & Ratings');
  console.log('========================================================');

  const questionsMap = new Map();
  const officialRatings = new Map(); // code -> rating
  const problemTagsMap = new Map(); // code -> Set of tags

  // Step 1: Fetch official difficulty ratings from CodeChef Practice API
  console.log('🌐 Fetching official CodeChef problem ratings (difficulty_rating)...');
  let page = 0;
  const limit = 500;

  while (page < 15) {
    process.stdout.write(`Fetching CodeChef ratings batch ${page + 1}... `);
    const url = `https://www.codechef.com/api/list/problems?page=${page}&limit=${limit}&sort_by=difficulty_rating&sort_order=desc&category=rated`;
    const data = await smartGet(url, { 'User-Agent': 'Mozilla/5.0' });
    const problemList = data?.data || [];
    if (!Array.isArray(problemList) || problemList.length === 0) {
      console.log('Done.');
      break;
    }

    problemList.forEach((p) => {
      const code = (p.code || '').trim().toUpperCase();
      if (!code) return;
      const r = Number(p.difficulty_rating);
      if (!isNaN(r) && r > 0) {
        officialRatings.set(code, r);
      }

      const rating = r > 0 ? r : 1500;
      let diff = 'MEDIUM';
      if (rating < 1300) diff = 'EASY';
      else if (rating >= 1900) diff = 'HARD';

      const tags = new Set();
      tags.add(`rating-${rating}`);
      if (p.contest_code) tags.add(p.contest_code);

      inferAlgorithmicTags(p.name || code).forEach((t) => tags.add(t));

      if (!questionsMap.has(code)) {
        questionsMap.set(code, {
          platform: 'CODECHEF',
          externalId: code,
          title: p.name || code,
          url: `https://www.codechef.com/problems/${code}`,
          difficulty: diff,
          tags: Array.from(tags),
          rating
        });
      }
    });

    console.log(`Loaded ${officialRatings.size} ratings so far.`);
    if (problemList.length < limit) break;
    page++;
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`✅ Loaded ${officialRatings.size} official CodeChef difficulty ratings!`);

  // Step 2: Fetch official topic tags from CodeChef API
  console.log('🏷️ Fetching official CodeChef algorithmic topic tags...');
  const majorTags = [
    'data-structures',
    'dynamic-programming',
    'greedy',
    'graphs',
    'trees',
    'binary-search',
    'number-theory',
    'bit-manipulation',
    'sorting',
    'two-pointers',
    'math',
    'constructive-algorithms',
    'game-theory',
    'recursion',
    'combinatorics',
    'segment-trees'
  ];

  for (const tag of majorTags) {
    try {
      const url = `https://www.codechef.com/api/list/problems?page=0&limit=500&tags=${tag}`;
      const data = await smartGet(url, { 'User-Agent': 'Mozilla/5.0' });
      const list = data?.data || [];
      list.forEach((p) => {
        const code = (p.code || '').trim().toUpperCase();
        if (!code) return;
        if (!problemTagsMap.has(code)) problemTagsMap.set(code, new Set());
        problemTagsMap.get(code).add(tag);
      });
      if (list.length > 0) {
        console.log(`   - Tag "${tag}": ${list.length} tagged problems mapped`);
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 80));
  }

  // Step 3: Process public/codechef-contest.json (contest problems & metadata)
  const ccContestPath = path.resolve(process.cwd(), 'public/codechef-contest.json');
  if (fs.existsSync(ccContestPath)) {
    try {
      console.log('📖 Processing public/codechef-contest.json with contest divisions...');
      const contests = JSON.parse(fs.readFileSync(ccContestPath, 'utf-8'));

      for (const c of contests) {
        const contestCode = c.contest || c.code || '';
        const div = c.division ? c.division.replace('Scorable Problems for ', '') : '';

        (c.problems || []).forEach((p) => {
          if (!p.code) return;
          const code = p.code.trim().toUpperCase();

          const subs = Number(p.submissions) || 0;
          const acc = Number(p.accuracy) || 0;

          // Check if we have an official CodeChef difficulty rating
          let rating = officialRatings.get(code);
          let diff = 'MEDIUM';

          if (!rating) {
            // Calibrate based on contest division and solve count
            if (div.includes('Division 4')) {
              if (subs >= 500) { rating = 500; diff = 'EASY'; }
              else if (subs >= 200) { rating = 800; diff = 'EASY'; }
              else { rating = 1150; diff = 'EASY'; }
            } else if (div.includes('Division 3')) {
              if (subs >= 300) { rating = 1200; diff = 'EASY'; }
              else if (subs >= 100) { rating = 1450; diff = 'MEDIUM'; }
              else { rating = 1650; diff = 'MEDIUM'; }
            } else if (div.includes('Division 2')) {
              if (subs >= 150) { rating = 1600; diff = 'MEDIUM'; }
              else if (subs >= 50) { rating = 1850; diff = 'MEDIUM'; }
              else { rating = 2100; diff = 'HARD'; }
            } else if (div.includes('Division 1')) {
              if (subs >= 80) { rating = 1950; diff = 'MEDIUM'; }
              else if (subs >= 25) { rating = 2250; diff = 'HARD'; }
              else { rating = 2550; diff = 'HARD'; }
            } else {
              if (subs >= 600 || (subs >= 200 && acc >= 50)) { rating = 800; diff = 'EASY'; }
              else if (subs >= 250) { rating = 1350; diff = 'EASY'; }
              else if (subs >= 80) { rating = 1650; diff = 'MEDIUM'; }
              else { rating = 2100; diff = 'HARD'; }
            }
          } else {
            if (rating < 1300) diff = 'EASY';
            else if (rating >= 1900) diff = 'HARD';
            else diff = 'MEDIUM';
          }

          const tags = new Set();
          tags.add(`rating-${rating}`);
          if (contestCode) tags.add(contestCode);

          // Add official CodeChef tags if known
          const offTags = problemTagsMap.get(code);
          if (offTags) offTags.forEach((t) => tags.add(t));

          // Add heuristic tags from title
          const titleName = p.name ? p.name.trim() : code;
          inferAlgorithmicTags(titleName).forEach((t) => tags.add(t));

          questionsMap.set(code, {
            platform: 'CODECHEF',
            externalId: code,
            title: titleName,
            url: p.url || `https://www.codechef.com/problems/${code}`,
            difficulty: diff,
            tags: Array.from(tags),
            rating
          });
        });
      }
    } catch (err) {
      console.warn('Could not parse public/codechef-contest.json:', err.message);
    }
  }

  // Attach collected official tags to any questions in questionsMap
  for (const [code, q] of questionsMap.entries()) {
    const offTags = problemTagsMap.get(code);
    if (offTags && offTags.size > 0) {
      const mergedTags = new Set(q.tags);
      offTags.forEach((t) => mergedTags.add(t));
      q.tags = Array.from(mergedTags);
    }
  }

  const result = Array.from(questionsMap.values());
  console.log(`🎉 Total CodeChef Questions Prepared: ${result.length}`);
  return result;
}

// =========================================================================
// MAIN CONTROLLER
// =========================================================================
async function main() {
  console.log('===========================================================');
  console.log('  CodeLadder Question & Algorithmic Tag Catalog Generator  ');
  console.log('===========================================================');

  const leetcodeQuestions = await fetchAllLeetCode();
  const codechefQuestions = await fetchAllCodeChef();
  const combined = [...leetcodeQuestions, ...codechefQuestions];

  console.log('\n💾 Generating CSV & JSON exports in output/ ...');

  const lcCsvPath = path.join(OUTPUT_DIR, 'leetcode_questions.csv');
  fs.writeFileSync(lcCsvPath, toCsv(leetcodeQuestions), 'utf-8');
  console.log(`✅ LeetCode CSV: ${lcCsvPath} (${leetcodeQuestions.length} questions)`);

  const ccCsvPath = path.join(OUTPUT_DIR, 'codechef_questions.csv');
  fs.writeFileSync(ccCsvPath, toCsv(codechefQuestions), 'utf-8');
  console.log(`✅ CodeChef CSV: ${ccCsvPath} (${codechefQuestions.length} questions)`);

  const allCsvPath = path.join(OUTPUT_DIR, 'all_questions.csv');
  fs.writeFileSync(allCsvPath, toCsv(combined), 'utf-8');
  console.log(`✅ Combined CSV: ${allCsvPath} (${combined.length} questions)`);

  const jsonPayloadPath = path.join(OUTPUT_DIR, 'questions_bulk_payload.json');
  fs.writeFileSync(
    jsonPayloadPath,
    JSON.stringify({ questions: combined }, null, 2),
    'utf-8'
  );
  console.log(`✅ Bulk JSON Payload: ${jsonPayloadPath}`);

  console.log('\n===========================================================');
  console.log('  SUMMARY:');
  console.log(`  - LeetCode Total: ${leetcodeQuestions.length} (with algorithmic tags & Elo ratings)`);
  console.log(`  - CodeChef Total: ${codechefQuestions.length} (with division ratings & topic tags)`);
  console.log(`  - Combined Total: ${combined.length} questions`);
  console.log('===========================================================');
  console.log('\n👉 To import into CodeLadder:');
  console.log('1. Go to http://localhost:5173/admin/questions');
  console.log('2. Click "Bulk CSV Import"');
  console.log(`3. Select "${allCsvPath}" and upload!`);
}

main().catch((err) => {
  console.error('\n❌ Fatal Error running script:', err);
  process.exit(1);
});
