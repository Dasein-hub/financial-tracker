import { listExpenses, updateExpense, deleteExpense } from '../db.js';
import { formatCurrency, formatDateTime } from '../format.js';

export function renderHistory(root, { onDataChange, toast }) {
  root.innerHTML = `
    <section class="card">
      <div class="row">
        <h2>History</h2>
        <input id="h-filter" class="filter" type="search" placeholder="Filter by name or category" />
      </div>
      <ul id="history-list" class="history-list"></ul>
    </section>
  `;

  const list = root.querySelector('#history-list');
  const filter = root.querySelector('#h-filter');

  let rows = [];
  let editing = null;

  async function refresh() {
    rows = await listExpenses({ textFilter: filter.value.trim() });
    render();
  }

  function render() {
    if (rows.length === 0) {
      list.innerHTML = `<li class="empty">No entries match.</li>`;
      return;
    }
    list.innerHTML = rows.map(renderRow).join('');
  }

  function renderRow(r) {
    if (editing === r.id) {
      return `
        <li class="row-edit" data-id="${r.id}">
          <input class="e-name" value="${escapeAttr(r.name)}" />
          <input class="e-cat"  value="${escapeAttr(r.category)}" />
          <input class="e-price" type="number" step="0.01" min="0" value="${r.price}" />
          <div class="row-actions">
            <button class="save">Save</button>
            <button class="cancel">Cancel</button>
          </div>
        </li>`;
    }
    return `
      <li data-id="${r.id}">
        <div class="entry-main">
          <strong>${escape(r.name)}</strong>
          <span class="badge">${escape(r.category)}</span>
        </div>
        <div class="entry-side">
          <span class="price">${formatCurrency(r.price)}</span>
          <span class="when">${formatDateTime(r.createdAt)}</span>
        </div>
        <div class="row-actions">
          <button class="edit" aria-label="Edit">Edit</button>
          <button class="del"  aria-label="Delete">Delete</button>
        </div>
      </li>`;
  }

  list.addEventListener('click', async (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    const id = Number(li.dataset.id);
    if (e.target.classList.contains('edit')) {
      editing = id;
      render();
    } else if (e.target.classList.contains('cancel')) {
      editing = null;
      render();
    } else if (e.target.classList.contains('save')) {
      const name = li.querySelector('.e-name').value.trim();
      const category = li.querySelector('.e-cat').value.trim();
      const price = Number(li.querySelector('.e-price').value);
      if (!name || !category || !Number.isFinite(price)) {
        toast('Invalid values.');
        return;
      }
      await updateExpense(id, { name, category, price });
      editing = null;
      await refresh();
      onDataChange?.();
      toast('Updated.');
    } else if (e.target.classList.contains('del')) {
      if (!confirm('Delete this entry?')) return;
      await deleteExpense(id);
      await refresh();
      onDataChange?.();
      toast('Deleted.');
    }
  });

  filter.addEventListener('input', () => {
    refresh();
  });

  refresh();
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
const escapeAttr = escape;
