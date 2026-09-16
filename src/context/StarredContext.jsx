import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api, { getErrorMessage } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import toast from 'react-hot-toast';

const StarredContext = createContext(null);

export function StarredProvider({ children }) {
  const { user } = useAuth();
  const [starredMap, setStarredMap] = useState({});
  const [starredKeys, setStarredKeys] = useState(new Set());
  const [starredList, setStarredList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch starred questions from backend whenever authenticated user changes
  const fetchStarred = useCallback(async () => {
    if (!user) {
      setStarredMap({});
      setStarredKeys(new Set());
      setStarredList([]);
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.get('/me/questions/starred');
      const list = data?.questions || (Array.isArray(data) ? data : []);
      const newMap = {};
      const newKeys = new Set();

      list.forEach((q) => {
        const id = q._id || q.questionId?._id || q.questionId;
        if (id) newMap[String(id)] = true;

        const plat = (q.platform || '').toUpperCase();
        const ids = [q.externalId, q.code, q.slug, q.index].filter(Boolean);
        ids.forEach((rawId) => {
          const clean = String(rawId).toUpperCase();
          if (plat) newKeys.add(`${plat}:${clean}`);
          newMap[clean] = true;
        });
      });

      setStarredMap(newMap);
      setStarredKeys(newKeys);
      setStarredList(list);
    } catch (err) {
      console.warn('Failed to load starred questions:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStarred();
  }, [fetchStarred]);

  // Check if a question is starred (supports ObjectId, problem object, or platform:externalId)
  const isStarred = useCallback((questionOrId, optionalPlatform, optionalExtId) => {
    if (!questionOrId && !optionalExtId) return false;

    // 1. Direct ID / string lookup
    if (typeof questionOrId === 'string') {
      const q = questionOrId.trim();
      if (starredMap[q]) return true;
      if (starredMap[q.toUpperCase()]) return true;
      if (optionalPlatform) {
        const key = `${optionalPlatform.toUpperCase()}:${q.toUpperCase()}`;
        if (starredKeys.has(key)) return true;
      }
    }

    // 2. Object lookup
    if (typeof questionOrId === 'object' && questionOrId !== null) {
      const qId = questionOrId._id || questionOrId.questionId;
      if (qId && starredMap[String(qId)]) return true;

      const plat = (questionOrId.platform || optionalPlatform || '').toUpperCase();
      const possibleExtIds = [
        questionOrId.externalId,
        questionOrId.code,
        questionOrId.slug,
        questionOrId.index,
        optionalExtId
      ].filter(Boolean).map((x) => String(x).toUpperCase());

      for (const eid of possibleExtIds) {
        if (plat && starredKeys.has(`${plat}:${eid}`)) return true;
        if (starredMap[eid]) return true;
      }
    }

    // 3. Platform + externalId lookup
    if (optionalPlatform && optionalExtId) {
      const key = `${optionalPlatform.toUpperCase()}:${String(optionalExtId).toUpperCase()}`;
      if (starredKeys.has(key)) return true;
      if (starredMap[String(optionalExtId).toUpperCase()]) return true;
    }

    return false;
  }, [starredMap, starredKeys]);

  // Global toggleStar function communicating with the backend
  const toggleStar = useCallback(async (questionOrId, fallbackPlatform, fallbackExtId) => {
    if (!user) {
      toast.error('Please log in to star problems');
      return false;
    }

    let qId = null;
    let plat = null;
    let extId = null;

    if (typeof questionOrId === 'string') {
      qId = questionOrId;
      plat = fallbackPlatform;
      extId = fallbackExtId || questionOrId;
    } else if (typeof questionOrId === 'object' && questionOrId !== null) {
      qId = questionOrId._id || questionOrId.questionId;
      plat = questionOrId.platform || fallbackPlatform;
      extId = questionOrId.externalId || questionOrId.code || questionOrId.slug || questionOrId.index || fallbackExtId;
    }

    plat = (plat || '').toUpperCase();
    extId = String(extId || '').toUpperCase();
    const compositeKey = plat && extId ? `${plat}:${extId}` : null;

    // If qId is missing or not a 24-char ObjectId, attempt resolution via /api/questions first
    if (!qId || qId.length !== 24) {
      if (extId) {
        try {
          const { data } = await api.get('/questions', {
            params: { search: extId, platform: plat || undefined, limit: 10 }
          });
          const match = (data?.questions || []).find(
            (q) => String(q.externalId).toUpperCase() === extId && (!plat || String(q.platform || '').toUpperCase() === plat)
          ) || (data?.questions || []).find(
            (q) => String(q.externalId).toUpperCase() === extId
          );
          if (match?._id) qId = String(match._id);
        } catch {}
      }
      if (!qId || qId.length !== 24) {
        if (compositeKey) {
          qId = compositeKey;
        }
      }
    }

    if (!qId) {
      toast.error('Could not identify problem to star');
      return false;
    }

    // Determine currently starred state accurately
    const currentlyStarred = Boolean(
      (qId && starredMap[String(qId)]) ||
      (compositeKey && starredKeys.has(compositeKey)) ||
      (extId && starredMap[extId]) ||
      (plat && extId && starredKeys.has(`${plat}:${extId}`))
    );

    // Optimistic UI update
    const previousList = starredList;
    setStarredMap((prev) => {
      const next = { ...prev };
      if (currentlyStarred) {
        if (qId) delete next[String(qId)];
        if (extId) delete next[extId];
      } else {
        if (qId) next[String(qId)] = true;
        if (extId) next[extId] = true;
      }
      return next;
    });

    setStarredList((prev) => {
      if (currentlyStarred) {
        return prev.filter((item) => {
          const itemQId = item._id || item.questionId?._id || item.questionId;
          const itemExtId = item.externalId || item.code || item.slug || item.index;
          if (qId && String(itemQId) === String(qId)) return false;
          if (extId && String(itemExtId).toUpperCase() === extId) return false;
          return true;
        });
      } else {
        const newObj =
          typeof questionOrId === 'object' && questionOrId !== null
            ? { ...questionOrId, _id: qId, starredAt: new Date().toISOString() }
            : { _id: qId, externalId: extId, platform: plat, starredAt: new Date().toISOString() };
        return [newObj, ...prev];
      }
    });

    if (compositeKey) {
      setStarredKeys((prev) => {
        const next = new Set(prev);
        if (currentlyStarred) {
          next.delete(compositeKey);
        } else {
          next.add(compositeKey);
        }
        return next;
      });
    }

    try {
      if (currentlyStarred) {
        await api.delete(`/questions/${qId}/star`);
        toast('Problem unstarred', { icon: '☆' });
      } else {
        await api.put(`/questions/${qId}/star`, { starred: true });
        toast.success('Problem starred!', { icon: '★' });
      }
      fetchStarred();
      return !currentlyStarred;
    } catch (err) {
      // Rollback optimistic update on error
      setStarredList(previousList);
      setStarredMap((prev) => {
        const next = { ...prev };
        if (currentlyStarred) {
          if (qId) next[String(qId)] = true;
          if (extId) next[extId] = true;
        } else {
          if (qId) delete next[String(qId)];
          if (extId) delete next[extId];
        }
        return next;
      });

      if (compositeKey) {
        setStarredKeys((prev) => {
          const next = new Set(prev);
          if (currentlyStarred) next.add(compositeKey);
          else next.delete(compositeKey);
          return next;
        });
      }

      toast.error(getErrorMessage(err, 'Failed to update star'));
      return currentlyStarred;
    }
  }, [user, starredMap, starredKeys, starredList, fetchStarred]);

  const value = useMemo(() => ({
    starredMap,
    starredKeys,
    starredList,
    starredCount: Array.isArray(starredList) ? starredList.length : 0,
    loading,
    isStarred,
    toggleStar,
    refetchStarred: fetchStarred,
  }), [starredMap, starredKeys, starredList, loading, isStarred, toggleStar, fetchStarred]);

  return (
    <StarredContext.Provider value={value}>
      {children}
    </StarredContext.Provider>
  );
}

export function useStarred() {
  const context = useContext(StarredContext);
  if (!context) {
    throw new Error('useStarred must be used within a StarredProvider');
  }
  return context;
}

export default StarredContext;
