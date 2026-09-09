import { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../lib/api';

export default function useQuestions(initialFilters = {}) {
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1, pages: 1 });
  const [filters, setFilters] = useState({ platform: '', difficulty: '', search: '', hideSolved: false, ...initialFilters });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchQuestions = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: pagination.limit };
      if (filters.platform && filters.platform !== 'ALL') params.platform = filters.platform;
      if (filters.difficulty && filters.difficulty !== 'ALL') params.difficulty = filters.difficulty;
      if (filters.search) params.search = filters.search;
      if (filters.tag && filters.tag !== 'ALL') params.tag = filters.tag;
      if (filters.minRating) params.minRating = filters.minRating;
      if (filters.maxRating) params.maxRating = filters.maxRating;
      const { data } = await api.get('/questions', { params });
      setQuestions(data.questions || []);
      const totalPages = data.pagination?.pages || data.pagination?.totalPages || Math.ceil((data.pagination?.total || 0) / (data.pagination?.limit || pagination.limit)) || 1;
      setPagination({
        page: data.pagination?.page || page,
        limit: data.pagination?.limit || pagination.limit,
        total: data.pagination?.total || 0,
        totalPages,
        pages: totalPages
      });
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load questions.'));
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => { fetchQuestions(1); }, [filters]);

  const changePage = (page) => fetchQuestions(page);
  const updateFilters = (newFilters) => {
    setFilters(prev => {
      const incoming = typeof newFilters === 'function' ? newFilters(prev) : newFilters;
      const merged = { ...prev, ...incoming };
      const cleaned = {};
      Object.keys(merged).forEach(k => {
        if (merged[k] !== '' && merged[k] !== undefined && merged[k] !== null && merged[k] !== 'ALL') {
          cleaned[k] = merged[k];
        }
      });
      // Purge explicitly cleared fields
      if (incoming.difficulty === '' || incoming.difficulty === undefined || incoming.difficulty === 'ALL') {
        delete cleaned.difficulty;
      }
      if (incoming.minRating === '' || incoming.minRating === undefined) {
        delete cleaned.minRating;
      }
      if (incoming.maxRating === '' || incoming.maxRating === undefined) {
        delete cleaned.maxRating;
      }
      if (incoming.platform === '' || incoming.platform === undefined || incoming.platform === 'ALL') {
        delete cleaned.platform;
      }
      if (incoming.tag === '' || incoming.tag === undefined || incoming.tag === 'ALL') {
        delete cleaned.tag;
      }
      return cleaned;
    });
  };

  return { questions, pagination, filters, loading, error, changePage, updateFilters, refetch: () => fetchQuestions(pagination.page) };
}
