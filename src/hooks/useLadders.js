import { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../lib/api';

export default function useLadders() {
  const [ladders, setLadders] = useState([]);
  const [marketplaceLadders, setMarketplaceLadders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);
  const [error, setError] = useState('');

  const fetchLadders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/ladders');
      setLadders(data.ladders || []);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load ladders.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMarketplaceLadders = useCallback(async () => {
    try {
      setLoadingMarketplace(true);
      const { data } = await api.get('/ladders/marketplace');
      setMarketplaceLadders(data.ladders || []);
    } catch (err) {
      console.error('Failed to load marketplace ladders', err);
    } finally {
      setLoadingMarketplace(false);
    }
  }, []);

  useEffect(() => {
    fetchLadders();
    fetchMarketplaceLadders();
  }, [fetchLadders, fetchMarketplaceLadders]);

  const createLadder = async (title) => {
    const { data } = await api.post('/ladders', { title });
    await fetchLadders();
    return data.ladder;
  };

  const deleteLadder = async (ladderId) => {
    await api.delete(`/ladders/${ladderId}`);
    await Promise.all([fetchLadders(), fetchMarketplaceLadders()]);
  };

  const publishLadder = async (ladderId, description) => {
    const { data } = await api.post(`/ladders/${ladderId}/publish`, { description });
    await Promise.all([fetchLadders(), fetchMarketplaceLadders()]);
    return data.ladder;
  };

  const voteLadder = async (ladderId, vote) => {
    const { data } = await api.post(`/ladders/${ladderId}/vote`, { vote });
    setMarketplaceLadders(prev => prev.map(l =>
      (l._id === ladderId || l.id === ladderId) ? { ...l, ...data } : l
    ));
    setLadders(prev => prev.map(l =>
      (l._id === ladderId || l.id === ladderId) ? { ...l, ...data } : l
    ));
    return data;
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
