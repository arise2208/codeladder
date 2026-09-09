import { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../lib/api';

export default function useLadder(ladderId) {
  const [ladder, setLadder] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLadder = useCallback(async () => {
    if (!ladderId) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/ladders/${ladderId}`);
      setLadder(data.ladder);
      setQuestions(data.questions || []);
      setRole(data.role);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load ladder.'));
    } finally {
      setLoading(false);
    }
  }, [ladderId]);

  useEffect(() => { fetchLadder(); }, [fetchLadder]);

  const updateTitle = async (title) => {
    const { data } = await api.put(`/ladders/${ladderId}`, { title });
    setLadder(data.ladder);
  };

  const addQuestion = async (questionId) => {
    await api.post(`/ladders/${ladderId}/questions`, { questionId });
    await fetchLadder();
  };

  const addQuestions = async (questionIds) => {
    const res = await api.post(`/ladders/${ladderId}/questions`, { questionIds });
    await fetchLadder();
    return res.data;
  };

  const removeQuestion = async (questionId) => {
    await api.delete(`/ladders/${ladderId}/questions/${questionId}`);
    await fetchLadder();
  };

  const reorderQuestions = async (orderedQuestions) => {
    await api.put(`/ladders/${ladderId}/questions/reorder`, { questions: orderedQuestions });
    await fetchLadder();
  };

  const setMode = async (mode) => {
    const { data } = await api.put(`/ladders/${ladderId}/mode`, { mode });
    setLadder(data.ladder);
  };

  const practiseQuestion = async (questionId) => {
    await api.post(`/ladders/${ladderId}/questions/${questionId}/practise`);
    await fetchLadder();
  };

  const unpractiseQuestion = async (questionId) => {
    await api.delete(`/ladders/${ladderId}/questions/${questionId}/practise`);
    await fetchLadder();
  };

  const clearPractice = async () => {
    await api.post(`/ladders/${ladderId}/practise/clear`);
    await fetchLadder();
  };

  const publishLadder = async (description) => {
    const { data } = await api.post(`/ladders/${ladderId}/publish`, { description });
    setLadder(data.ladder);
    return data.ladder;
  };

  const voteLadder = async (vote) => {
    const { data } = await api.post(`/ladders/${ladderId}/vote`, { vote });
    setLadder(prev => ({ ...prev, ...data }));
    return data;
  };

  const deleteLadder = async () => {
    await api.delete(`/ladders/${ladderId}`);
  };

  return { ladder, questions, role, loading, error, updateTitle, addQuestion, addQuestions, removeQuestion, reorderQuestions, setMode, practiseQuestion, unpractiseQuestion, clearPractice, publishLadder, voteLadder, deleteLadder, refetch: fetchLadder };
}

