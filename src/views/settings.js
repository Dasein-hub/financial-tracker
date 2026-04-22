import { clearAll, exportJSON, importJSON, listExpenses } from '../db.js';
import { recordsLabel } from '../format.js';

export function renderSettings(root, { onDataChange, toast }) {
  root.innerHTML = `
    <section class="card">
      <h2>Данные</h2>
      <p class="muted" id="s-count"></p>
      <div class="settings-actions">
        <button id="s-export">Экспорт JSON</button>
        <label class="file-btn">
          Импорт JSON
          <input id="s-import" type="file" accept="application/json,.json" hidden />
        </label>
        <button id="s-clear" class="danger">Очистить все данные</button>
      </div>
    </section>
    <section class="card">
      <h2>О приложении</h2>
      <p class="muted">
        Работает полностью офлайн. Данные хранятся в браузере через IndexedDB.
        Установите как приложение, чтобы они всегда были под рукой.
      </p>
    </section>
  `;

  const countEl = root.querySelector('#s-count');
  const exportBtn = root.querySelector('#s-export');
  const importInput = root.querySelector('#s-import');
  const clearBtn = root.querySelector('#s-clear');

  async function refreshCount() {
    const rows = await listExpenses();
    countEl.textContent = `Сохранено: ${rows.length} ${recordsLabel(rows.length)}.`;
  }

  exportBtn.addEventListener('click', async () => {
    const text = await exportJSON();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raskhody-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    if (!confirm('Импорт заменит все текущие данные. Продолжить?')) {
      importInput.value = '';
      return;
    }
    try {
      const text = await file.text();
      const n = await importJSON(text);
      toast(`Импортировано: ${n} ${recordsLabel(n)}.`);
      onDataChange?.();
      await refreshCount();
    } catch (e) {
      toast('Ошибка импорта: ' + e.message);
    } finally {
      importInput.value = '';
    }
  });

  clearBtn.addEventListener('click', async () => {
    if (!confirm('Удалить ВСЕ данные? Это действие нельзя отменить.')) return;
    await clearAll();
    toast('Все данные удалены.');
    onDataChange?.();
    await refreshCount();
  });

  refreshCount();
}
