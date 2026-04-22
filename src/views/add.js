import { addExpense, listExpenses, searchByName, searchCategories } from '../db.js';
import { attachAutocomplete } from '../autocomplete.js';
import { formatCurrency, formatDateTime } from '../format.js';

export function renderAdd(root, { onDataChange, toast }) {
  root.innerHTML = `
    <section class="card">
      <h2>New expense</h2>
      <form id="entry-form" class="entry-form" autocomplete="off" novalidate>
        <label class="field">
          <span>Name</span>
          <input id="f-name" type="text" placeholder="e.g. Coffee" required />
        </label>
        <label class="field">
          <span>Category</span>
          <input id="f-category" type="text" placeholder="e.g. Food" required />
        </label>
        <label class="field">
          <span>Price</span>
          <input id="f-price" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00" required />
        </label>
        <button type="submit" class="primary">Add</button>
      </form>
    </section>
    <section class="card">
      <h2>Recent</h2>
      <ul id="recent-list" class="recent-list"></ul>
    </section>
  `;

  const nameInput = root.querySelector('#f-name');
  const catInput = root.querySelector('#f-category');
  const priceInput = root.querySelector('#f-price');
  const form = root.querySelector('#entry-form');
  const recentList = root.querySelector('#recent-list');

  let nameMatched = false;

  attachAutocomplete(nameInput, {
    fetcher: (q) => searchByName(q, 8),
    renderItem: (it) =>
      `<span class="ac-name">${escape(it.name)}</span>` +
      `<span class="ac-meta">${escape(it.category)} · ${formatCurrency(it.price)}</span>`,
    onSelect: (it) => {
      nameInput.value = it.name;
      catInput.value = it.category;
      priceInput.value = String(it.price);
      nameMatched = true;
      priceInput.focus();
    },
  });

  nameInput.addEventListener('input', () => {
    nameMatched = false;
  });

  attachAutocomplete(catInput, {
    fetcher: async (q) => {
      if (nameMatched) return [];
      return searchCategories(q, 8);
    },
    renderItem: (s) => `<span class="ac-name">${escape(s)}</span>`,
    onSelect: (s) => {
      catInput.value = s;
      priceInput.focus();
    },
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const category = catInput.value.trim();
    const price = Number(priceInput.value);
    if (!name || !category || !Number.isFinite(price) || price < 0) {
      toast('Fill in all fields with a valid price.');
      return;
    }
    await addExpense({ name, category, price });
    form.reset();
    nameMatched = false;
    nameInput.focus();
    toast('Added.');
    await refreshRecent();
    onDataChange?.();
  });

  async function refreshRecent() {
    const rows = (await listExpenses()).slice(0, 6);
    if (rows.length === 0) {
      recentList.innerHTML = `<li class="empty">No entries yet.</li>`;
      return;
    }
    recentList.innerHTML = rows
      .map(
        (r) => `
      <li>
        <div class="entry-main">
          <strong>${escape(r.name)}</strong>
          <span class="badge">${escape(r.category)}</span>
        </div>
        <div class="entry-side">
          <span class="price">${formatCurrency(r.price)}</span>
          <span class="when">${formatDateTime(r.createdAt)}</span>
        </div>
      </li>`,
      )
      .join('');
  }

  refreshRecent();
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}
