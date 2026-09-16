import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PROXY = process.env.https_proxy || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://172.31.2.4:8080';

async function fetchZerotrac() {
  return new Promise((resolve, reject) => {
    const args = ['-s', '-L', '--max-time', '20'];
    if (PROXY) args.push('-x', PROXY);
    args.push('https://cdn.jsdelivr.net/gh/zerotrac/leetcode_problem_rating@main/data.json');

    const child = spawn('curl', args);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);
    child.on('close', code => {
      if (code !== 0 || !stdout) {
        return reject(new Error('Failed to fetch Zerotrac data: ' + stderr));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function parseContestWeight(slug) {
  const match = slug.match(/^(weekly|biweekly)-contest-(\d+)$/i);
  if (!match) return 0;
  const type = match[1].toLowerCase();
  const num = parseInt(match[2], 10);
  if (type === 'weekly') {
    return num * 10;
  } else {
    // Biweekly started later, roughly Biweekly N aligns with Weekly (N * 2 + 50)
    return (num + 50) * 10 - 1;
  }
}

async function main() {
  console.log('🔄 Fetching Zerotrac dataset...');
  const zerotrac = await fetchZerotrac();
  console.log(`✅ Loaded ${zerotrac.length} problem records from Zerotrac.`);

  // Load existing leetcode.json if present
  const existingPath = path.resolve(process.cwd(), 'public/leetcode.json');
  let existingContests = [];
  if (fs.existsSync(existingPath)) {
    try {
      existingContests = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
    } catch {}
  }
  console.log(`📁 Loaded ${existingContests.length} existing contests from public/leetcode.json.`);

  // Map existing contest slugs -> existing problem points
  const existingPointsMap = new Map(); // "contestSlug|problemSlug" -> points
  existingContests.forEach(c => {
    const cSlug = (c.url || '').replace(/\/$/, '').split('/').pop().toLowerCase();
    (c.problems || []).forEach(p => {
      const pSlug = (p.link || p.url || '').replace(/\/$/, '').split('/').pop().toLowerCase();
      if (cSlug && pSlug && p.points) {
        existingPointsMap.set(`${cSlug}|${pSlug}`, String(p.points));
      }
    });
  });

  // Load official catalog difficulties & tags from output/leetcode_questions.csv if present
  const catalogCsvPath = path.resolve(process.cwd(), 'output/leetcode_questions.csv');
  const catalogMap = new Map();
  if (fs.existsSync(catalogCsvPath)) {
    const csvContent = fs.readFileSync(catalogCsvPath, 'utf8');
    const lines = csvContent.split('\n').filter(Boolean);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      let inQuotes = false;
      let current = '';
      const fields = [];
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          fields.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      fields.push(current);
      if (fields.length >= 6) {
        const externalId = fields[1].trim();
        const url = fields[3].replace(/^"|"$/g, '').trim();
        const difficulty = fields[4].trim().toUpperCase();
        const tags = fields[5].replace(/^"|"$/g, '').split(',').map(t => t.trim()).filter(Boolean);
        const slug = url.replace(/\/$/, '').split('/').pop().toLowerCase();
        if (slug) catalogMap.set(slug, { externalId, difficulty, tags });
      }
    }
    console.log(`📑 Loaded ${catalogMap.size} questions from ${catalogCsvPath}.`);
  }

  // Group Zerotrac records by ContestSlug
  const groups = new Map();
  zerotrac.forEach(item => {
    if (!item.ContestSlug) return;
    const slug = item.ContestSlug.toLowerCase();
    if (!groups.has(slug)) groups.set(slug, []);
    groups.get(slug).push(item);
  });

  // Default points by problem index
  const defaultPoints = { Q1: '3', Q2: '4', Q3: '5', Q4: '6' };

  const contests = [];
  for (const [slug, items] of groups.entries()) {
    // Sort items by ProblemIndex Q1, Q2, Q3, Q4
    items.sort((a, b) => {
      const order = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
      return (order[a.ProblemIndex] || 99) - (order[b.ProblemIndex] || 99);
    });

    const contestTitle = items[0]?.ContestID_en || slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const problems = items.map((it, idx) => {
      const pSlug = (it.TitleSlug || '').toLowerCase();
      const points = existingPointsMap.get(`${slug}|${pSlug}`) || defaultPoints[it.ProblemIndex] || String(idx + 3);
      const rating = Math.round(Number(it.Rating) || 0);
      const catalogInfo = catalogMap.get(pSlug);

      return {
        title: it.Title || pSlug,
        link: `https://leetcode.com/problems/${pSlug}/`,
        points: points,
        rating: rating > 0 ? rating : undefined,
        index: it.ProblemIndex || `Q${idx + 1}`,
        difficulty: catalogInfo?.difficulty || (rating >= 2000 ? 'HARD' : rating >= 1550 ? 'MEDIUM' : 'EASY'),
        tags: catalogInfo?.tags || (rating > 0 ? [`rating-${rating}`] : []),
        externalId: catalogInfo?.externalId || undefined
      };
    });

    contests.push({
      contest: 'leetcode.com',
      url: `https://leetcode.com/contest/${slug}/`,
      title: contestTitle,
      problems
    });
  }

  // Sort contests descending (newest contests first)
  contests.sort((a, b) => {
    const slugA = (a.url || '').replace(/\/$/, '').split('/').pop().toLowerCase();
    const slugB = (b.url || '').replace(/\/$/, '').split('/').pop().toLowerCase();
    return parseContestWeight(slugB) - parseContestWeight(slugA);
  });

  console.log(`🎉 Formatted ${contests.length} full contests with Elo ratings & points.`);
  fs.writeFileSync(existingPath, JSON.stringify(contests, null, 2), 'utf8');

  // Also copy to dist if dist exists
  const distPath = path.resolve(process.cwd(), 'dist/leetcode.json');
  if (fs.existsSync(path.dirname(distPath))) {
    fs.writeFileSync(distPath, JSON.stringify(contests, null, 2), 'utf8');
  }

  console.log(`💾 Successfully updated ${existingPath}!`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
