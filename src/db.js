import Dexie from 'dexie';

export const db = new Dexie('financial-tracker');
db.version(1).stores({
  expenses: '++id, nameLower, categoryLower, createdAt',
});

const norm = (s) => String(s ?? '').trim();
const lower = (s) => norm(s).toLowerCase();

export async function addExpense({ name, category, price }) {
  const n = norm(name);
  const c = norm(category);
  const p = Number(price);
  if (!n || !c || !Number.isFinite(p)) throw new Error('Invalid entry');
  return db.expenses.add({
    name: n,
    nameLower: n.toLowerCase(),
    category: c,
    categoryLower: c.toLowerCase(),
    price: p,
    createdAt: Date.now(),
  });
}

export async function updateExpense(id, patch) {
  const next = { ...patch };
  if (patch.name != null) {
    next.name = norm(patch.name);
    next.nameLower = next.name.toLowerCase();
  }
  if (patch.category != null) {
    next.category = norm(patch.category);
    next.categoryLower = next.category.toLowerCase();
  }
  if (patch.price != null) next.price = Number(patch.price);
  return db.expenses.update(id, next);
}

export async function deleteExpense(id) {
  return db.expenses.delete(id);
}

export async function clearAll() {
  return db.expenses.clear();
}

export async function listExpenses({ from, to, textFilter } = {}) {
  let coll = db.expenses.orderBy('createdAt').reverse();
  if (from != null || to != null) {
    coll = db.expenses
      .where('createdAt')
      .between(from ?? 0, to ?? Number.MAX_SAFE_INTEGER, true, true)
      .reverse();
  }
  const rows = await coll.toArray();
  if (!textFilter) return rows;
  const q = lower(textFilter);
  return rows.filter(
    (r) => r.nameLower.includes(q) || r.categoryLower.includes(q),
  );
}

/**
 * Name-prefix search. Returns deduped (name, category, price) suggestions,
 * newest combo first.
 */
export async function searchByName(prefix, limit = 8) {
  const q = lower(prefix);
  if (!q) return [];
  const rows = await db.expenses
    .where('nameLower')
    .startsWith(q)
    .limit(200)
    .toArray();
  rows.sort((a, b) => b.createdAt - a.createdAt);
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const key = `${r.nameLower}|${r.categoryLower}|${r.price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: r.name, category: r.category, price: r.price });
    if (out.length >= limit) break;
  }
  return out;
}

/** Distinct category prefix search — category-only autofill. */
export async function searchCategories(prefix, limit = 8) {
  const q = lower(prefix);
  if (!q) return [];
  const keys = await db.expenses
    .orderBy('categoryLower')
    .uniqueKeys();
  const matches = keys.filter((k) => typeof k === 'string' && k.startsWith(q));
  if (matches.length === 0) return [];
  // Get the display-cased category from the latest record for each key.
  const out = [];
  for (const k of matches.slice(0, limit)) {
    const rec = await db.expenses
      .where('categoryLower')
      .equals(k)
      .last();
    if (rec) out.push(rec.category);
  }
  return out;
}

export async function exportJSON() {
  const rows = await db.expenses.orderBy('createdAt').toArray();
  return JSON.stringify({ version: 1, exportedAt: Date.now(), expenses: rows }, null, 2);
}

export async function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.expenses)) throw new Error('Invalid file');
  const rows = data.expenses.map((r) => ({
    name: norm(r.name),
    nameLower: lower(r.name),
    category: norm(r.category),
    categoryLower: lower(r.category),
    price: Number(r.price),
    createdAt: Number(r.createdAt) || Date.now(),
  }));
  await db.transaction('rw', db.expenses, async () => {
    await db.expenses.clear();
    await db.expenses.bulkAdd(rows);
  });
  return rows.length;
}
