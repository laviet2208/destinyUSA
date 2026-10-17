import { Image } from 'expo-image';

export type ImagePresentation = { uri?: string; phase: 'loading' | 'loaded' | 'error'; attempt: number };
export type ImageEvent = { type: 'source' | 'loaded' | 'error' | 'retry'; uri?: string; attempt?: number };

export function imagePresentation(state: ImagePresentation, event: ImageEvent): ImagePresentation {
  if (event.type === 'source') return state.uri === event.uri ? state : { uri: event.uri, phase: 'loading', attempt: 0 };
  if (state.uri !== event.uri) return state;
  if (event.attempt !== undefined && state.attempt !== event.attempt) return state;
  if (event.type === 'retry') return { ...state, phase: 'loading', attempt: state.attempt + 1 };
  return { ...state, phase: event.type === 'loaded' ? 'loaded' : 'error' };
}

const warming = new Map<string, Promise<boolean>>();
const warmed = new Set<string>();

export function prefetchGalleryImages(uris: string[]) {
  const upcoming = [...new Set(uris)].filter(uri => /^https?:\/\//i.test(uri)).slice(0, 2);
  return Promise.all(upcoming.map(uri => {
    if (warmed.has(uri)) return Promise.resolve(true);
    const existing = warming.get(uri);
    if (existing) return existing;
    const request = Promise.resolve().then(() => Image.prefetch(uri, 'memory-disk')).then(success => {
      if (success) {
        warmed.add(uri);
        if (warmed.size > 64) warmed.delete(warmed.values().next().value!);
      }
      return success;
    }).catch(() => false).finally(() => warming.delete(uri));
    warming.set(uri, request);
    return request;
  }));
}
