import { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../lib/api';

const PLATFORMS = ['CODEFORCES', 'LEETCODE', 'CODECHEF', 'ATCODER'];

export { PLATFORMS };

export default function usePlatformAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/platform-accounts');
      setAccounts(data.accounts || []);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load platform accounts.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const saveAccount = async (platform, handle) => {
    await api.put(`/platform-accounts/${platform.toLowerCase()}`, { handle });
    const p = platform.toUpperCase();
    if (p === 'CODEFORCES') {
      localStorage.setItem('cf_handle', handle);
      localStorage.removeItem('cf_solved_problems');
    } else if (p === 'LEETCODE') {
      localStorage.setItem('lc_handle', handle);
      localStorage.removeItem('lc_solved_problems');
    } else if (p === 'CODECHEF') {
      localStorage.setItem('cc_handle', handle);
      localStorage.removeItem('cc_solved_problems');
    }
    await fetchAccounts();
  };

  const removeAccount = async (platform) => {
    await api.delete(`/platform-accounts/${platform.toLowerCase()}`);
    const p = platform.toUpperCase();
    if (p === 'CODEFORCES') {
      localStorage.removeItem('cf_handle');
      localStorage.removeItem('cf_solved_problems');
    } else if (p === 'LEETCODE') {
      localStorage.removeItem('lc_handle');
      localStorage.removeItem('lc_solved_problems');
    } else if (p === 'CODECHEF') {
      localStorage.removeItem('cc_handle');
      localStorage.removeItem('cc_solved_problems');
    }
    await fetchAccounts();
  };

  return { accounts, loading, error, saveAccount, removeAccount, refetch: fetchAccounts, PLATFORMS };
}
