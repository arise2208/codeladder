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
    await fetchAccounts();
  };

  const removeAccount = async (platform) => {
    await api.delete(`/platform-accounts/${platform.toLowerCase()}`);
    await fetchAccounts();
  };

  return { accounts, loading, error, saveAccount, removeAccount, refetch: fetchAccounts, PLATFORMS };
}
