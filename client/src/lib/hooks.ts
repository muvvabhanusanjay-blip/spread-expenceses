import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useRefreshKey() {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const handler = () => setKey((value) => value + 1);
    window.addEventListener('spendwise:data-changed', handler);
    return () => window.removeEventListener('spendwise:data-changed', handler);
  }, []);

  return key;
}

export function notifyDataChanged() {
  window.dispatchEvent(new Event('spendwise:data-changed'));
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · SpendWise`;
  }, [title]);
}
