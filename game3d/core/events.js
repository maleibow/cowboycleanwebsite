// Tiny pub/sub. on() returns an unsubscribe function.
const map = new Map();
export const events = {
  on(name, fn) {
    let set = map.get(name);
    if (!set) map.set(name, (set = new Set()));
    set.add(fn);
    return () => set.delete(fn);
  },
  off(name, fn) { map.get(name)?.delete(fn); },
  emit(name, a, b) { const set = map.get(name); if (set) for (const fn of set) fn(a, b); },
  clear() { map.clear(); },
};
