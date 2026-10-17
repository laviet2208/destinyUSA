import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';

export function useResource<Result>(path: string | null) {
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    setData(null); setError('');
  }, [path]);
  useEffect(() => {
    if (!path) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    api<Result>(path, 'GET', undefined, undefined, controller.signal).then(result => { if (!controller.signal.aborted) setData(result); }).catch(failure => { if (!controller.signal.aborted) setError((failure as Error).message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, revision]);
  useFocusEffect(useCallback(() => { if (path) refresh(); }, [path, refresh]));
  return { data, loading, error, refresh };
}
