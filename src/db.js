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
 * Returns up to `limit` entries (each with name, category, price).
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
    out.push({ name: r.name, category: r.category, price: r.price });
    if (out.length >= limit) break;
  }
  return out;
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
