import { listExpenses, updateExpense, deleteExpense } from '../db.js';
import { formatCurrency, formatDateTime } from '../format.js';

export function renderHistory(root, { onDataChange, toast }) {
  root.innerHTML = `
    <section class="card">
      <div class="row">
        <h2>История</h2>
        <input id="h-filter" class="filter" type="search" placeholder="Поиск по названию или категории" />
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
      list.innerHTML = `<li class="empty">Совпадений не найдено.</li>`;
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
          <input class="e-price" type="number" step="1" min="0" value="${r.price}" />
          <div class="row-actions">
            <button class="save">Сохранить</button>
            <button class="cancel">Отмена</button>
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
          <button class="edit" aria-label="Изменить">Изменить</button>
          <button class="del"  aria-label="Удалить">Удалить</button>
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
        toast('Некорректные значения.');
        return;
      }
      await updateExpense(id, { name, category, price });
      editing = null;
      await refresh();
      onDataChange?.();
      toast('Обновлено.');
    } else if (e.target.classList.contains('del')) {
      if (!confirm('Удалить запись?')) return;
      await deleteExpense(id);
      await refresh();
      onDataChange?.();
      toast('Удалено.');
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
