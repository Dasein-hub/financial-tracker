import Dexie from 'dexie';

export const db = new Dexie('financial-tracker');
db.version(1).stores({
  expenses: '++id, nameLower, categoryLower, createdAt',
});

const norm = (s) => String(s ?? '').trim();
const lower = (s) => norm(s).toLowerCase();

export async function addExpense({ name, category, price, color }) {
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
    color: color || undefined,
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
  if (patch.color !== undefined) next.color = patch.color || undefined;
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
    const lo = from ?? 0;
    const hi = to ?? Number.MAX_SAFE_INTEGER;
    if (lo > hi) return [];
    coll = db.expenses
      .where('createdAt')
      .between(lo, hi, true, true)
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
 * Name substring search, deduped by name, newest first.
 */
export async function searchByName(prefix, limit = 5) {
  const q = lower(prefix);
  if (!q) return [];
  const rows = await db.expenses.orderBy('createdAt').reverse().toArray();
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    if (!r.nameLower.includes(q)) continue;
    if (seen.has(r.nameLower)) continue;
    seen.add(r.nameLower);
    out.push({
      name: r.name,
      category: r.category,
      price: r.price,
      color: r.color,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Category substring search, deduped by category, newest-first.
 * Each result carries the most-recent colour seen for that category.
 */
export async function searchCategories(prefix, limit = 5) {
  const q = lower(prefix);
  const rows = await db.expenses.orderBy('createdAt').reverse().toArray();
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    if (q && !r.categoryLower.includes(q)) continue;
    if (seen.has(r.categoryLower)) continue;
    seen.add(r.categoryLower);
    out.push({ category: r.category, color: r.color });
    if (out.length >= limit) break;
  }
  return out;
}

/** Look up the most-recent colour stored for a category (case-insensitive). */
export async function colorForCategory(category) {
  const key = lower(category);
  if (!key) return null;
  const row = await db.expenses
    .where('categoryLower')
    .equals(key)
    .reverse()
    .sortBy('createdAt')
    .then((rows) => rows.find((r) => r.color));
  return row?.color || null;
}

export async function exportJSON() {
  const rows = await db.expenses.orderBy('createdAt').toArray();
  return JSON.stringify(
    { version: 1, exportedAt: Date.now(), expenses: rows },
    null,
    2,
  );
}

export async function importJSON(text) {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : data?.expenses;
  if (!Array.isArray(list)) throw new Error('Invalid file');
  const rows = list.map((r) => {
    const ts = Number(r.createdAt ?? r.ts) || Date.now();
    return {
      name: norm(r.name),
      nameLower: lower(r.name),
      category: norm(r.category),
      categoryLower: lower(r.category),
      price: Number(r.price),
      color: r.color || undefined,
      createdAt: ts,
    };
  });
  await db.transaction('rw', db.expenses, async () => {
    await db.expenses.clear();
    await db.expenses.bulkAdd(rows);
  });
  return rows.length;
}

export async function countExpenses() {
  return db.expenses.count();
}

export async function sumExpenses() {
  const rows = await db.expenses.toArray();
  return rows.reduce((s, r) => s + (Number(r.price) || 0), 0);
}
