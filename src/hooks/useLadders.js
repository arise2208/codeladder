import { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../lib/api';

export const DEFAULT_LADDERS = [
  {
    _id: 'default-blind-75',
    title: 'Blind 75 Essentials',
    description: 'The classic curated collection of 75 high-frequency LeetCode questions for coding interviews.',
    isPublic: true,
    role: 'OWNER',
    ownerUsername: 'CodeLadder',
    votes: 94,
    questions: [
      { _id: 'q1', title: 'Two Sum', platform: 'LEETCODE', difficulty: 'EASY', tags: ['Array', 'Hash Table'] },
      { _id: 'q2', title: 'Best Time to Buy and Sell Stock', platform: 'LEETCODE', difficulty: 'EASY', tags: ['Array', 'DP'] },
      { _id: 'q3', title: 'Contains Duplicate', platform: 'LEETCODE', difficulty: 'EASY', tags: ['Array', 'Hash Table'] },
      { _id: 'q4', title: 'Product of Array Except Self', platform: 'LEETCODE', difficulty: 'MEDIUM', tags: ['Array', 'Prefix Sum'] },
      { _id: 'q5', title: 'Maximum Subarray', platform: 'LEETCODE', difficulty: 'MEDIUM', tags: ['Array', 'Divide and Conquer', 'DP'] }
    ]
  },
  {
    _id: 'default-cp-31',
    title: 'CP-31 Sheet (Rating 800 - 1200)',
    description: 'Essential Codeforces practice sheet covering implementation, math, and greedy algorithms.',
    isPublic: true,
    role: 'OWNER',
    ownerUsername: 'CodeLadder',
    votes: 76,
    questions: [
      { _id: 'q6', title: 'Watermelon', platform: 'CODEFORCES', difficulty: 'EASY', tags: ['Math', 'Brute Force'] },
      { _id: 'q7', title: 'Way Too Long Words', platform: 'CODEFORCES', difficulty: 'EASY', tags: ['Strings'] },
      { _id: 'q8', title: 'Team', platform: 'CODEFORCES', difficulty: 'EASY', tags: ['Brute Force', 'Greedy'] }
    ]
  }
];

export const DEFAULT_MARKETPLACE_LADDERS = [
  ...DEFAULT_LADDERS,
  {
    _id: 'default-neetcode-150',
    title: 'NeetCode 150 Master Track',
    description: 'Comprehensive 150-question roadmap across all major interview patterns and algorithmic paradigms.',
    isPublic: true,
    role: 'COMMUNITY',
    ownerUsername: 'NeetCode',
    votes: 182,
    questions: []
  },
  {
    _id: 'default-cf-div2',
    title: 'Codeforces Div 2 Upsolve Grinder',
    description: 'Hand-picked problems C, D, and E from recent Div 2 rounds with in-depth learning value.',
    isPublic: true,
    role: 'COMMUNITY',
    ownerUsername: 'tourist',
    votes: 128,
    questions: []
  }
];

export default function useLadders() {
  const [ladders, setLadders] = useState([]);
  const [marketplaceLadders, setMarketplaceLadders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);
  const [error, setError] = useState('');

  const normalizeList = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.ladders)) return data.ladders;
    if (Array.isArray(data.data)) return data.data;
    return [];
  };

  const fetchLadders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/ladders');
      const list = normalizeList(data);
      setLadders(list);
      setError('');
    } catch (err) {
      console.warn('Primary /ladders fetch error, checking fallback:', err);
      const local = JSON.parse(localStorage.getItem('codeladder_local_ladders') || '[]');
      if (local.length > 0) {
        setLadders(local);
        setError('');
      } else {
        // Use curated default ladders if backend is offline/unreachable
        setLadders(DEFAULT_LADDERS);
        setError('');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMarketplaceLadders = useCallback(async () => {
    try {
      setLoadingMarketplace(true);
      const { data } = await api.get('/ladders/marketplace');
      const list = normalizeList(data);
      setMarketplaceLadders(list.length > 0 ? list : DEFAULT_MARKETPLACE_LADDERS);
    } catch (err) {
      console.warn('Primary /ladders/marketplace error, fallback to curated:', err);
      setMarketplaceLadders(DEFAULT_MARKETPLACE_LADDERS);
    } finally {
      setLoadingMarketplace(false);
    }
  }, []);

  useEffect(() => {
    fetchLadders();
    fetchMarketplaceLadders();
  }, [fetchLadders, fetchMarketplaceLadders]);

  const createLadder = async (title, description = '') => {
    try {
      const { data } = await api.post('/ladders', { title, description });
      await fetchLadders();
      return data?.ladder;
    } catch (err) {
      console.warn('Backend create failed, storing locally:', err);
      const newLadder = {
        _id: 'local-' + Date.now(),
        title,
        description,
        role: 'OWNER',
        isPublic: false,
        questions: [],
        createdAt: new Date().toISOString()
      };
      const local = JSON.parse(localStorage.getItem('codeladder_local_ladders') || '[]');
      local.unshift(newLadder);
      localStorage.setItem('codeladder_local_ladders', JSON.stringify(local));
      setLadders(prev => [newLadder, ...prev]);
      return newLadder;
    }
  };

  const deleteLadder = async (ladderId) => {
    try {
      await api.delete(`/ladders/${ladderId}`);
    } catch (err) {
      console.warn('Backend delete failed, updating local state:', err);
    }
    const local = JSON.parse(localStorage.getItem('codeladder_local_ladders') || '[]');
    const filtered = local.filter(l => (l._id || l.id) !== ladderId);
    localStorage.setItem('codeladder_local_ladders', JSON.stringify(filtered));
    setLadders(prev => prev.filter(l => (l._id || l.id) !== ladderId));
    setMarketplaceLadders(prev => prev.filter(l => (l._id || l.id) !== ladderId));
  };

  const publishLadder = async (ladderId, description) => {
    try {
      const { data } = await api.post(`/ladders/${ladderId}/publish`, { description });
      await Promise.all([fetchLadders(), fetchMarketplaceLadders()]);
      return data?.ladder;
    } catch (err) {
      console.warn('Backend publish failed, updating local state:', err);
      setLadders(prev => prev.map(l => (l._id === ladderId || l.id === ladderId) ? { ...l, isPublic: true, description } : l));
      setMarketplaceLadders(prev => {
        const found = ladders.find(l => (l._id === ladderId || l.id === ladderId));
        if (found) return [{ ...found, isPublic: true, description }, ...prev];
        return prev;
      });
      return { isPublic: true, description };
    }
  };

  const voteLadder = async (ladderId, vote) => {
    try {
      const { data } = await api.post(`/ladders/${ladderId}/vote`, { vote });
      setMarketplaceLadders(prev => prev.map(l =>
        (l._id === ladderId || l.id === ladderId) ? { ...l, ...data } : l
      ));
      setLadders(prev => prev.map(l =>
        (l._id === ladderId || l.id === ladderId) ? { ...l, ...data } : l
      ));
      return data;
    } catch (err) {
      // Local optimism
      setMarketplaceLadders(prev => prev.map(l =>
        (l._id === ladderId || l.id === ladderId) ? { ...l, votes: (l.votes || 0) + (vote === 'UP' ? 1 : -1) } : l
      ));
      return { vote };
    }
  };

  return {
    ladders,
    marketplaceLadders,
    loading,
    loadingMarketplace,
    error,
    createLadder,
    deleteLadder,
    publishLadder,
    voteLadder,
    refetch: fetchLadders,
    refetchMarketplace: fetchMarketplaceLadders
  };
}
