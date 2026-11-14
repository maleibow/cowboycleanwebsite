// Generic object pool. create() builds an object; reset(obj) (optional) runs on acquire.
// acquire() returns null when exhausted and `grow` is false, so callers never allocate mid-frame.
export function createPool(create, size, { reset, grow = false } = {}) {
  const items = [];
  const free = [];
  for (let i = 0; i < size; i++) { const o = create(i); items.push(o); free.push(o); }
  return {
    items,
    acquire() {
      let o = free.pop();
      if (!o) {
        if (!grow) return null;
        o = create(items.length);
        items.push(o);
      }
      if (reset) reset(o);
      return o;
    },
    release(o) { free.push(o); },
    get available() { return free.length; },
  };
}
