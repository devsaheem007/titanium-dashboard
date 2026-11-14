import { useCallback, useEffect, useRef, useState } from 'react';

// Small data-fetching hook: { data, loading, error, reload }.
export function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const seq = useRef(0);

  const run = useCallback(async (silent = false) => {
    const id = ++seq.current; // ignore out-of-order responses
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcherRef.current();
      if (id === seq.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (id === seq.current) setState((s) => ({ ...s, loading: false, error }));
    }
  }, []);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload: run };
}

export function useDebounce(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
