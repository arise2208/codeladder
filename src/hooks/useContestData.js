import { useState, useEffect } from 'react';

export function useCodeforcesData() {
  const [problems, setProblems] = useState([]);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [problemsRes, contestsRes] = await Promise.all([
          fetch('/problemset.json').then(r => r.json()),
          fetch('/contest.json').then(r => r.json()),
        ]);
        setProblems(problemsRes?.result?.problems || []);
        setContests(contestsRes?.result || []);
      } catch (err) {
        setError('Failed to load Codeforces data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { problems, contests, loading, error };
}

export function useLeetCodeData() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/leetcode.json').then(r => r.json());
        setContests(res || []);
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
        const res = await fetch('/codechef-contest.json').then(r => r.json());
        setContests(res || []);
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
