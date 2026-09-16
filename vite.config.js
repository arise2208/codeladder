import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { exec, spawn } from 'child_process'

function customProxyPlugin() {
  return {
    name: 'custom-proxy-plugin',
    configureServer(server) {
      // CodeChef API proxy
      server.middlewares.use('/codechef-api', (req, res) => {
        const cleanPath = (req.url || '').replace(/^\/?codechef-api/, '');
        const targetUrl = `https://www.codechef.com${cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath}`;
        const proxy = process.env.https_proxy || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
        const proxyArg = proxy ? `-x "${proxy}"` : '';

        const runCurl = (cmd, fallbackCmd) => {
          exec(cmd, { maxBuffer: 25 * 1024 * 1024 }, (err, stdout) => {
            if ((err || !stdout || stdout.trim().length === 0) && fallbackCmd) {
              return runCurl(fallbackCmd, null);
            }
            if (err || !stdout) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to fetch from CodeChef via proxy', details: err?.message }));
              return;
            }
            res.statusCode = 200;
            const trimmed = stdout.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
            } else {
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
            }
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(stdout);
          });
        };

        const primaryCmd = `curl -s -L --max-time 25 ${proxyArg} -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" -H "Referer: https://www.codechef.com/" "${targetUrl}"`;
        const directCmd = `curl -s -L --max-time 25 -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" -H "Referer: https://www.codechef.com/" "${targetUrl}"`;

        if (proxyArg) {
          runCurl(primaryCmd, directCmd);
        } else {
          runCurl(directCmd, null);
        }
      });

      // Dedicated LeetCode fetch-user handler (dev proxy fallback)
      server.middlewares.use('/api/platform-accounts/leetcode/fetch-user', (req, res) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          return res.end();
        }

        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
          let handle = '';
          try {
            const parsed = JSON.parse(Buffer.concat(chunks).toString());
            handle = parsed.handle;
          } catch (_) {}
          if (!handle) {
            const urlObj = new URL(req.url, 'http://localhost');
            handle = urlObj.searchParams.get('handle') || '';
          }

          const cleanHandle = String(handle).trim().replace(/^@/, '');
          if (!cleanHandle) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'LeetCode handle is required' }));
          }

          const contestQuery = JSON.stringify({
            query: `query userContestInfo($username: String!) {
              userContestRanking(username: $username) {
                attendedContestsCount rating globalRanking totalParticipants topPercentage badge { name }
              }
              userContestRankingHistory(username: $username) {
                attended rating ranking problemsSolved contest { title startTime }
              }
            }`,
            variables: { username: cleanHandle }
          });

          const recentAcQuery = JSON.stringify({
            query: `query recentAcSubmissions($username: String!, $limit: Int!) {
              recentAcSubmissionList(username: $username, limit: $limit) {
                id title titleSlug timestamp
              }
            }`,
            variables: { username: cleanHandle, limit: 50 }
          });

          const statsQuery = JSON.stringify({
            query: `query userProfileCalendarAndStats($username: String!) {
              allQuestionsCount { difficulty count }
              matchedUser(username: $username) {
                submitStatsGlobal { acSubmissionNum { difficulty count } }
                userCalendar { streak totalActiveDays submissionCalendar }
              }
            }`,
            variables: { username: cleanHandle }
          });

          const runGql = (payload) => new Promise((resolve) => {
            exec(`curl -s -L --max-time 10 -H "Content-Type: application/json" -H "User-Agent: Mozilla/5.0" -H "Referer: https://leetcode.com/" -d '${payload.replace(/'/g, "'\\''")}' "https://leetcode.com/graphql"`, (err, stdout) => {
              try {
                const j = JSON.parse(stdout);
                resolve(j?.data || null);
              } catch (_) {
                resolve(null);
              }
            });
          });

          const [contestData, acData, statsData] = await Promise.all([
            runGql(contestQuery),
            runGql(recentAcQuery),
            runGql(statsQuery)
          ]);

          let userRating = 1500;
          let globalRanking = null;
          let attendedContests = 0;
          let topPercentage = null;
          let badgeName = null;
          let contestHistory = [];
          let rawRecentAc = [];
          let totalSolved = 0;
          let easySolved = 0;
          let mediumSolved = 0;
          let hardSolved = 0;
          let totalQuestions = 4047;
          let streak = 0;
          let totalActiveDays = 0;
          let submissionCalendar = {};
          const solvedSlugs = new Set();

          if (contestData?.userContestRanking) {
            const r = contestData.userContestRanking;
            userRating = Math.round(r.rating || 1500);
            globalRanking = r.globalRanking || null;
            attendedContests = r.attendedContestsCount || 0;
            topPercentage = r.topPercentage || null;
            badgeName = r.badge?.name || null;
          }
          if (Array.isArray(contestData?.userContestRankingHistory)) {
            contestHistory = contestData.userContestRankingHistory;
          }
          if (Array.isArray(acData?.recentAcSubmissionList)) {
            rawRecentAc = acData.recentAcSubmissionList;
            rawRecentAc.forEach(s => { if (s.titleSlug) solvedSlugs.add(s.titleSlug.toLowerCase()); });
          }
          if (statsData?.matchedUser) {
            const mu = statsData.matchedUser;
            if (mu.submitStatsGlobal?.acSubmissionNum) {
              mu.submitStatsGlobal.acSubmissionNum.forEach(item => {
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
              } catch (_) { submissionCalendar = {}; }
            }
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({
            success: true,
            userSolved: {
              handle: cleanHandle,
              userRating,
              globalRanking,
              attendedContests,
              topPercentage,
              badgeName,
              totalSolved: totalSolved || solvedSlugs.size,
              easySolved,
              mediumSolved,
              hardSolved,
              totalQuestions,
              streak,
              totalActiveDays,
              submissionCalendar,
              contestHistory,
              recentAcSubmissions: rawRecentAc,
              solvedSlugs: Array.from(solvedSlugs)
            }
          }));
        });
      });

      // CodeLadder dedicated CodeChef fetch-user endpoint (dev server middleware)
      server.middlewares.use('/api/platform-accounts/codechef/fetch-user', (req, res) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          return res.end();
        }

        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
          let handle = '';
          try {
            const parsed = JSON.parse(Buffer.concat(chunks).toString());
            handle = parsed.handle;
          } catch (_) {}
          if (!handle) {
            const urlObj = new URL(req.url, 'http://localhost');
            handle = urlObj.searchParams.get('handle') || '';
          }

          const cleanHandle = String(handle).trim().replace(/^@/, '');
          if (!cleanHandle) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'CodeChef handle is required' }));
          }

          exec(`curl -s -L --max-time 15 -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" -H "Referer: https://www.codechef.com/" "https://www.codechef.com/users/${encodeURIComponent(cleanHandle)}"`, (err, stdout) => {
            const profileHtml = stdout || '';
            let userRating = 1500;
            let highestRating = null;
            let stars = '1★';
            let globalRank = null;
            let countryRank = null;
            let totalProblemsSolved = 0;
            let contestsCount = 0;
            const solvedCodes = new Set();
            let dailySubmissions = [];

            if (profileHtml) {
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

              const idx = profileHtml.indexOf('problems-solved');
              if (idx !== -1) {
                const end = profileHtml.indexOf('</section>', idx);
                const section = profileHtml.slice(idx, end !== -1 ? end : idx + 60000);
                const spans = Array.from(section.matchAll(/<span[^>]*style="font-size:\s*12px[^>]*>([^<]+)<\/span>/gi)).map(m => m[1].trim());
                spans.forEach(s => {
                  const rawCode = s.replace(/&nbsp;/g, ' ').replace(/[^A-Za-z0-9_]/g, '').toUpperCase();
                  if (rawCode.length >= 2 && rawCode.length <= 15) solvedCodes.add(rawCode);
                });
                const statusLinks = Array.from(section.matchAll(/\/status\/([A-Za-z0-9_]+),/gi)).map(m => m[1].toUpperCase());
                statusLinks.forEach(c => solvedCodes.add(c));
              }

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
                    return { date: formattedDate, value: Number(item.value) || 0 };
                  });
                } catch (_) {}
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({
              success: true,
              userSolved: {
                handle: cleanHandle,
                userRating,
                highestRating,
                stars,
                globalRank,
                countryRank,
                totalProblemsSolved: totalProblemsSolved || solvedCodes.size,
                contestsCount,
                solvedCodes: Array.from(solvedCodes),
                dailySubmissions
              }
            }));
          });
        });
      });

      // LeetCode API proxy
      server.middlewares.use('/leetcode-api', (req, res) => {
        const cleanPath = (req.url || '').replace(/^\/?leetcode-api/, '');
        const targetUrl = `https://leetcode.com${cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath}`;
        const proxy = process.env.https_proxy || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
          const rawBody = Buffer.concat(chunks);
          const executeRequest = (useProxy) => {
            const args = [
              '-s', '-L', '--max-time', '20',
              '-H', 'Content-Type: application/json',
              '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              '-H', 'Referer: https://leetcode.com/',
              '-H', 'Origin: https://leetcode.com'
            ];
            if (useProxy && proxy) {
              args.push('-x', proxy);
            }
            if (req.method === 'POST' && rawBody.length > 0) {
              args.push('-X', 'POST', '-d', '@-');
            }
            args.push(targetUrl);

            const child = spawn('curl', args);
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', d => { stdout += d; });
            child.stderr.on('data', d => { stderr += d; });
            child.on('close', code => {
              if ((code !== 0 || !stdout) && useProxy) {
                // Retry directly without proxy
                return executeRequest(false);
              }
              if (code !== 0 || !stdout) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Failed to fetch from LeetCode via proxy', details: stderr }));
                return;
              }
              res.statusCode = 200;
              const trimmed = stdout.trim();
              if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
              } else {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
              }
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(stdout);
            });

            if (req.method === 'POST' && rawBody.length > 0) {
              child.stdin.write(rawBody);
            }
            child.stdin.end();
          };

          executeRequest(Boolean(proxy));
        });
      });

      // Codeforces API proxy
      server.middlewares.use('/codeforces-api', (req, res) => {
        const cleanPath = (req.url || '').replace(/^\/?codeforces-api/, '');
        const targetUrl = `https://codeforces.com/api${cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath}`;
        const proxy = process.env.https_proxy || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
        const proxyArg = proxy ? `-x "${proxy}"` : '';

        const runCfCurl = (cmd, fallbackCmd) => {
          exec(cmd, { maxBuffer: 25 * 1024 * 1024 }, (err, stdout) => {
            if ((err || !stdout || stdout.trim().length === 0) && fallbackCmd) {
              return runCfCurl(fallbackCmd, null);
            }
            if (err || !stdout) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to fetch from Codeforces via proxy', details: err?.message }));
              return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(stdout);
          });
        };

        const primaryCf = `curl -s -L --max-time 20 ${proxyArg} -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" "${targetUrl}"`;
        const directCf = `curl -s -L --max-time 20 -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" "${targetUrl}"`;

        if (proxyArg) {
          runCfCurl(primaryCf, directCf);
        } else {
          runCfCurl(directCf, null);
        }
      });
    }
  };
}

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  plugins: [react(), customProxyPlugin()]
})