// Saloon upgrades: same six items, prices and max levels as the original (cleaningup.html 2436-2505).
// `key` is the run.upgrades field; max 1 = a one-off (boolean) upgrade.
export const STORE_ITEMS = [
  { id: 'jump',    key: 'jump',    label: 'High Jump',    price: 100, max: 3 },
  { id: 'speed',   key: 'speed',   label: 'Speed Boots',  price: 100, max: 3 },
  { id: 'size',    key: 'size',    label: 'Big Bullets',  price: 150, max: 3 },
  { id: 'lasso',   key: 'lasso',   label: 'Magic Lasso',  price: 400, max: 1 },
  { id: 'laser',   key: 'laser',   label: 'Laser Gun',    price: 500, max: 1 },
  { id: 'vehicle', key: 'vehicle', label: 'Mecha-Horse',  price: 800, max: 1 },
];
export const isOwned = (up, item) => (item.max === 1 ? !!up[item.key] : up[item.key] >= item.max);
// attemptBuy from the original: returns true and mutates `run` when the purchase went through.
export function buy(run, item) {
  if (run.coins < item.price || isOwned(run.upgrades, item)) return false;
  run.coins -= item.price;
  if (item.max === 1) run.upgrades[item.key] = true; else run.upgrades[item.key]++;
  return true;
}
