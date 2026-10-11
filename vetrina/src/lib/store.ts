/**
 * Mini store reattivo, facoltativamente persistito in localStorage.
 * I dati veri arrivano dalle funzioni in api/: qui restano solo preferenze di questo browser
 * (consenso ai cookie, prenotazioni fatte da qui, vista dell'area) e stati in memoria.
 */
import { useSyncExternalStore } from "react";

const PREFIX = "foro-demo:v2:";

export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(fn: () => void): () => void;
  reset(): void;
}

export function createStore<T>(key: string, initial: T | (() => T), opts: { persist?: boolean } = {}): Store<T> {
  const persist = opts.persist ?? true;
  const seed = () => (typeof initial === "function" ? (initial as () => T)() : structuredClone(initial));
  let state: T = seed();
  if (persist) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw) state = JSON.parse(raw) as T;
    } catch {
      /* storage non disponibile: si resta in memoria */
    }
  }
  const subs = new Set<() => void>();
  const write = () => {
    if (!persist) return;
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  };
  const store: Store<T> = {
    get: () => state,
    set(next) {
      state = typeof next === "function" ? (next as (p: T) => T)(state) : next;
      write();
      subs.forEach((f) => f());
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    reset() {
      state = seed();
      try {
        localStorage.removeItem(PREFIX + key);
      } catch {
        /* ignore */
      }
      subs.forEach((f) => f());
    },
  };
  return store;
}

export function useStore<T>(store: Store<T>): T;
export function useStore<T, S>(store: Store<T>, select: (s: T) => S): S;
export function useStore<T, S>(store: Store<T>, select?: (s: T) => S) {
  return useSyncExternalStore(
    store.subscribe,
    () => (select ? select(store.get()) : store.get()),
    () => (select ? select(store.get()) : store.get()),
  );
}

export function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}
