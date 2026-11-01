import { useCallback, useSyncExternalStore } from 'react';

export default function useMediaQuery(query) {
  const subscribe = useCallback(callback => {
    const media = matchMedia(query);
    media.addEventListener('change', callback);
    return () => media.removeEventListener('change', callback);
  }, [query]);
  const snapshot = useCallback(() => matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
