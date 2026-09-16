import { useState, useEffect } from 'react';

export function useCodeforcesData() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        let list = null;
        try {
          const res = await fetch('/api/contests?platform=CODEFORCES&limit=100');
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.contests) && data.contests.length > 0) {
              list = data.contests;
            }
          }
        } catch {}

        if (!list) {
          const res = await fetch('/codeforces-contests.json');
          if (res.ok) {
            list = await res.json();
          }
        }

        setContests(list || []);
      } catch (err) {
        setError('Failed to load Codeforces data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { contests, loading, error };
}

export function useLeetCodeData() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        let list = null;
        try {
          const res = await fetch('/api/contests?platform=LEETCODE&limit=100');
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.contests) && data.contests.length > 0) {
              list = data.contests.map((c) => ({
                title: c.name,
                url: c.url,
                contestId: c.contestId,
                problems: (c.problems || []).map((p) => ({
                  questionId: p.questionId,
                  title: p.title,
                  link: p.url,
                  difficulty: p.difficulty,
                  rating: p.rating,
                  points: String(p.points || '4'),
                  index: p.index,
                  externalId: p.externalId,
                  tags: p.tags || []
                }))
              }));
            }
          }
        } catch {}

        if (!list) {
          const res = await fetch('/leetcode.json');
          if (res.ok) {
            list = await res.json();
          }
        }

        setContests(list || []);
      } catch {
        setError('Failed to load LeetCode data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { contests, loading, error };
}

export function useCodeChefData() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        let list = null;
        try {
          const res = await fetch('/api/contests?platform=CODECHEF&limit=100');
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.contests) && data.contests.length > 0) {
              list = data.contests.map((c) => ({
                contest: c.contestId,
                division: c.division,
                problems: (c.problems || []).map((p) => ({
                  questionId: p.questionId,
                  code: p.externalId,
                  name: p.title,
                  url: p.url,
                  rating: p.rating
                }))
              }));
            }
          }
        } catch {}

        if (!list) {
          const res = await fetch('/codechef-contest.json');
          if (res.ok) {
            list = await res.json();
          }
        }

        setContests(list || []);
      } catch {
        setError('Failed to load CodeChef data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { contests, loading, error };
}

export async function fetchCodeforcesSubmissions(handle) {
  if (!handle?.trim()) throw new Error('Please enter a Codeforces username.');
  const response = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle.trim())}`);
  if (!response.ok) throw new Error('Failed to connect to Codeforces.');
  const data = await response.json();
  if (data.status !== 'OK') throw new Error(data.comment || 'Failed to fetch submissions.');
  return data.result || [];
}

export async function fetchCodeChefSubmissions(handle) {
  const { fetchCodeChefUserSolved } = await import('../lib/codechefSync');
  return fetchCodeChefUserSolved(handle);
}
