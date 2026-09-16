import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const CC_PATH = path.resolve(process.cwd(), 'public/codechef-contest.json');

// Resilient curl-based fetcher
function fetchContestFromCodeChef(code, retries = 2) {
  return new Promise((resolve) => {
    function attempt(remaining) {
      exec(
        `curl -s -L --max-time 10 -H "User-Agent: Mozilla/5.0" "https://www.codechef.com/api/contests/${code}"`,
        { maxBuffer: 15 * 1024 * 1024 },
        (err, stdout) => {
          if (!err && stdout) {
            try {
              const j = JSON.parse(stdout);
              if (j && j.status === 'success' && j.problems) {
                // Determine scorable/main contest problems
                let problems = Object.values(j.problems).filter(
                  (p) => p.category_name === 'main' || p.category_name === 'scorable'
                );

                // Fallback: exclude explicit unscored problems
                if (problems.length === 0) {
                  problems = Object.values(j.problems).filter(
                    (p) => p.category_name !== 'unscored'
                  );
                }

                // If still empty (e.g. single division era), take all
                if (problems.length === 0) {
                  problems = Object.values(j.problems);
                }

                if (problems.length > 0) {
                  let divStr = j.scorable_heading || j.division || '';
                  if (!divStr || !divStr.toLowerCase().includes('division')) {
                    if (code.endsWith('A')) divStr = 'Scorable Problems for Division 1';
                    else if (code.endsWith('B')) divStr = 'Scorable Problems for Division 2';
                    else if (code.endsWith('C')) divStr = 'Scorable Problems for Division 3';
                    else if (code.endsWith('D')) divStr = 'Scorable Problems for Division 4';
                    else divStr = 'Scorable Problems for Division 1';
                  }

                  const formattedProblems = problems.map((p) => ({
                    name: p.name ? p.name.trim() : p.code,
                    url: `https://www.codechef.com/problems/${p.code}`,
                    code: p.code,
                    submissions: String(p.successful_submissions || 0),
                    accuracy: Number(p.accuracy || 0).toFixed(2)
                  }));

                  return resolve({
                    contest: code,
                    division: divStr,
                    problems: formattedProblems
                  });
                }
              }
            } catch {}
          }

          if (remaining > 0) {
            setTimeout(() => attempt(remaining - 1), 300);
          } else {
            resolve(null);
          }
        }
      );
    }
    attempt(retries);
  });
}

// Concurrent worker pool
async function processQueue(items, concurrency = 8, onProgress = () => {}) {
  const results = [];
  let index = 0;
  let completed = 0;

  async function worker() {
    while (index < items.length) {
      const currentIdx = index++;
      const item = items[currentIdx];
      const res = await fetchContestFromCodeChef(item);
      completed++;
      onProgress(completed, items.length, item, res);
      if (res) results.push(res);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// Custom sort comparator for CodeChef contests
function contestSortKey(c) {
  const code = c.contest || '';
  let typePriority = 3; // default
  let num = 0;
  let div = 'E';

  const m = code.match(/^([A-Z]+)(\d+)([A-D])?$/i);
  if (m) {
    const prefix = m[1].toUpperCase();
    num = parseInt(m[2], 10);
    div = (m[3] || 'A').toUpperCase();

    if (prefix === 'START') typePriority = 1; // Starters first
    else if (prefix === 'COOK') typePriority = 2; // Cook-Offs second
    else if (prefix === 'LTIME') typePriority = 3; // Lunchtimes third
  }

  return { typePriority, num, div };
}

function compareContests(a, b) {
  const keyA = contestSortKey(a);
  const keyB = contestSortKey(b);

  if (keyA.typePriority !== keyB.typePriority) {
    return keyA.typePriority - keyB.typePriority;
  }
  if (keyA.num !== keyB.num) {
    return keyB.num - keyA.num; // Descending round number (e.g. 255 -> 1)
  }
  return keyA.div.localeCompare(keyB.div); // Ascending division (A -> B -> C -> D)
}

async function main() {
  console.log('===========================================================');
  console.log('  CodeChef Contest Dataset Comprehensive Synchronizer      ');
  console.log('===========================================================');

  // Load existing contests
  let existing = [];
  if (fs.existsSync(CC_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(CC_PATH, 'utf-8'));
      console.log(`📁 Loaded ${existing.length} existing contest division entries from ${CC_PATH}`);
    } catch (e) {
      console.warn('⚠️ Could not parse existing codechef-contest.json:', e.message);
    }
  }

  const existingMap = new Map();
  existing.forEach((entry) => {
    if (entry.contest && Array.isArray(entry.problems) && entry.problems.length > 0) {
      existingMap.set(entry.contest, entry);
    }
  });

  // Build full candidate list of contests to index
  const candidates = [];
  const DIVS = ['A', 'B', 'C', 'D'];

  // 1. Starters: 1 to 258
  for (let s = 1; s <= 258; s++) {
    for (const div of DIVS) {
      candidates.push(`START${s}${div}`);
    }
  }

  // 2. Cook-Offs: 90 to 145
  for (let c = 90; c <= 145; c++) {
    for (const div of DIVS) {
      candidates.push(`COOK${c}${div}`);
    }
    candidates.push(`COOK${c}`);
  }

  // 3. Lunchtimes: 58 to 115
  for (let l = 58; l <= 115; l++) {
    for (const div of DIVS) {
      candidates.push(`LTIME${l}${div}`);
    }
    candidates.push(`LTIME${l}`);
  }

  // Filter candidates: only fetch ones not already in existingMap
  const missingCandidates = candidates.filter((code) => !existingMap.has(code));
  console.log(`🔍 Total candidate contests: ${candidates.length}`);
  console.log(`ℹ️ Already cached with problems: ${existingMap.size}`);
  console.log(`🚀 Remaining to probe/fetch: ${missingCandidates.length}\n`);

  if (missingCandidates.length > 0) {
    const startTime = Date.now();
    let foundCount = 0;

    const newEntries = await processQueue(missingCandidates, 8, (completed, total, code, res) => {
      if (res) {
        foundCount++;
        process.stdout.write(
          `\r[${completed}/${total}] ✅ Found ${code.padEnd(10)} (${res.problems.length} problems) | Total new: ${foundCount} `
        );
      } else if (completed % 25 === 0 || completed === total) {
        process.stdout.write(
          `\r[${completed}/${total}] Probing CodeChef API... | Total new: ${foundCount} `
        );
      }
    });

    console.log(`\n\n🎉 Probing finished in ${((Date.now() - startTime) / 1000).toFixed(1)}s!`);
    console.log(`✨ Successfully retrieved ${newEntries.length} new contest division entries.`);

    for (const entry of newEntries) {
      existingMap.set(entry.contest, entry);
    }
  }

  // Attach ratings from existing entries or output/codechef_questions.csv
  const csvPath = path.resolve(process.cwd(), 'output/codechef_questions.csv');
  const ratingMap = new Map();
  if (fs.existsSync(csvPath)) {
    try {
      const lines = fs.readFileSync(csvPath, 'utf8').split('\n');
      for (const line of lines.slice(1)) {
        const parts = line.split(',');
        if (parts.length >= 2) {
          const extId = parts[1].trim().toUpperCase();
          const m = line.match(/rating-(\d+)/);
          if (m) {
            const r = parseInt(m[1]);
            if (r > 0 && r !== 9999) ratingMap.set(extId, r);
          }
        }
      }
    } catch {}
  }

  allEntries.forEach((c) => {
    (c.problems || []).forEach((p) => {
      const code = (p.code || '').trim().toUpperCase();
      if (!p.rating && ratingMap.has(code)) {
        p.rating = ratingMap.get(code);
      }
    });
  });

  // Save updated file
  fs.writeFileSync(CC_PATH, JSON.stringify(allEntries, null, 2), 'utf-8');

  console.log('===========================================================');
  console.log('📊 CodeChef Dataset Summary:');
  console.log(`   - Starters Entries:   ${starters.length}`);
  console.log(`   - Cook-Off Entries:   ${cookoffs.length}`);
  console.log(`   - Lunchtime Entries:  ${lunchtimes.length}`);
  console.log(`   - Total Contest Rows: ${allEntries.length} (was ${existing.length})`);
  console.log(`   - Unique Problems:    ${uniqueProblemCodes.size}`);
  console.log(`💾 Saved to: ${CC_PATH}`);
  console.log('===========================================================');
}

main().catch((err) => {
  console.error('❌ Error during CodeChef synchronization:', err);
  process.exit(1);
});
