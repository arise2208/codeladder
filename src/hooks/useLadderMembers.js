import { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../lib/api';

export default function useLadderMembers(ladderId) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMembers = useCallback(async () => {
    if (!ladderId) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/ladders/${ladderId}/members`);
      setMembers(data.members || []);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load members.'));
    } finally {
      setLoading(false);
    }
  }, [ladderId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const addMember = async (username, role) => {
    await api.post(`/ladders/${ladderId}/members`, { username, role });
    await fetchMembers();
  };

  const updateRole = async (username, role) => {
    await api.put(`/ladders/${ladderId}/members/${username}`, { role });
    await fetchMembers();
  };

  const removeMember = async (username) => {
    await api.delete(`/ladders/${ladderId}/members/${username}`);
    await fetchMembers();
  };

  return { members, loading, error, addMember, updateRole, removeMember, refetch: fetchMembers };
}
