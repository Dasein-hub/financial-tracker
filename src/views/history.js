import { deleteExpense, listExpenses, updateExpense } from '../db.js';
import { attachAutocomplete } from '../ui/autocomplete.js';
import { CATEGORIES, CAT_COLORS } from '../data.js';
import { entryRow } from '../ui/entry-row.js';
import { escapeHtml } from '../ui/escape.js';
import { icon } from '../ui/icons.js';
import { fmtMoney } from '../format.js';
import { confirmDialog } from '../ui/confirm.js';
import { toast } from '../ui/toast.js';

export function renderHistory(root, { onDataChange }) {
  root.innerHTML = `
    <section class="card is-flush">
      <div class="history-head">
        <div class="history-title">
          Все расходы · <span class="count" id="h-count">0</span>
        </div>
        <div class="search-pill">
          ${icon('search', { size: 13 })}
          <input id="h-search" type="search" placeholder="Поиск" />
          <button type="button" class="search-clear" id="h-clear" hidden aria-label="Очистить">${icon('x', { size: 13 })}</button>
        </div>
      </div>
      <ul id="history-list" class="history-list"></ul>
    </section>
  `;

  const countEl = root.querySelector('#h-count');
  const searchEl = root.querySelector('#h-search');
  const clearBtn = root.querySelector('#h-clear');
  const list = root.querySelector('#history-list');

  let rows = [];
  let editing = null;
  let editAttached = null;

  async function refresh() {
    rows = await listExpenses({ textFilter: searchEl.value.trim() });
    render();
  }

  function render() {
    // keep total count independent of filter — fetch once
    clearBtn.hidden = !searchEl.value;
    if (rows.length === 0) {
      list.innerHTML = `<li class="empty is-tall">${searchEl.value ? 'Ничего не найдено' : 'Список пуст'}</li>`;
      return;
    }
    list.innerHTML = rows
      .map((r) => (editing === r.id ? editRowHtml(r) : entryRow(r, { actions: true })))
      .join('');
    if (editing != null) attachEditHandlers();
  }

  async function refreshTotalCount() {
    const all = await listExpenses();
    countEl.textContent = all.length.toLocaleString('ru-RU');
  }

  function editRowHtml(r) {
    return `
      <li class="edit-row" data-id="${r.id}">
        <input class="field-input is-compact e-name" value="${escapeHtml(r.name)}" placeholder="Название" />
        <div class="ac-wrap">
          <input class="field-input is-compact e-cat" value="${escapeHtml(r.category)}" placeholder="Категория" />
        </div>
        <input class="field-input is-compact is-numeric e-price" inputmode="decimal" value="${r.price}" placeholder="Цена, ₸" />
        <div class="btn-row">
          <button type="button" class="btn-secondary is-compact" data-action="cancel">Отмена</button>
          <button type="button" class="btn-primary is-compact" data-action="save">${icon('check', { size: 14, strokeWidth: 2.4 })}Сохранить</button>
        </div>
      </li>
    `;
  }

  function attachEditHandlers() {
    if (editAttached) {
      editAttached.close();
      editAttached = null;
    }
    const li = list.querySelector('.edit-row');
    if (!li) return;
    const catInput = li.querySelector('.e-cat');
    editAttached = attachAutocomplete(catInput, {
      fetcher: async (q) => {
        const needle = q.trim().toLowerCase();
        return CATEGORIES.filter((c) => !needle || c.toLowerCase().includes(needle));
      },
      shouldShow: (value, items) => items.length > 0 && !CATEGORIES.includes(value.trim()),
      renderItem: (c) => `
        <div class="ac-cat-row">
          <span class="dot" style="background:${CAT_COLORS[c]}"></span>
          <span class="name">${escapeHtml(c)}</span>
        </div>
      `,
      onSelect: (c) => {
        catInput.value = c;
      },
    });
  }

  list.addEventListener('click', async (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    const id = Number(li.dataset.id);
    const actionEl = e.target.closest('[data-action]');
    const action = actionEl?.dataset.action;
    if (action === 'edit') {
      editing = id;
      render();
      return;
    }
    if (action === 'cancel') {
      editing = null;
      render();
      return;
    }
    if (action === 'save') {
      const name = li.querySelector('.e-name').value.trim();
      const category = li.querySelector('.e-cat').value.trim();
      const price = parseFloat(li.querySelector('.e-price').value.replace(',', '.'));
      if (!name || !category || !Number.isFinite(price) || price <= 0) {
        toast('Некорректные значения.', 'err');
        return;
      }
      await updateExpense(id, { name, category, price });
      editing = null;
      await refresh();
      onDataChange?.();
      toast('Обновлено.', 'ok');
      return;
    }
    if (action === 'delete') {
      const row = rows.find((r) => r.id === id);
      if (!row) return;
      const ok = await confirmDialog({
        title: 'Удалить запись?',
        body: `«${row.name}» — ${fmtMoney(row.price)}. Это действие нельзя отменить.`,
        confirmLabel: 'Удалить',
        danger: true,
      });
      if (!ok) return;
      await deleteExpense(id);
      await refresh();
      await refreshTotalCount();
      onDataChange?.();
      toast('Удалено.', 'ok');
    }
  });

  searchEl.addEventListener('input', () => {
    refresh();
  });

  clearBtn.addEventListener('click', () => {
    searchEl.value = '';
    clearBtn.hidden = true;
    searchEl.focus();
    refresh();
  });

  refresh();
  refreshTotalCount();
}
