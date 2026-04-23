import {
  clearAll,
  countExpenses,
  exportJSON,
  importJSON,
  sumExpenses,
} from '../db.js';
import { fmtMoneyShort } from '../format.js';
import { confirmDialog } from '../ui/confirm.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';

const APP_VERSION = '1.0.3';

export function renderSettings(root, { onDataChange }) {
  root.innerHTML = `
    <div class="stack">
      <section class="card">
        <div class="card-title" style="margin-bottom: 10px;">Данные</div>
        <div class="stats-strip">
          <div class="stat">
            <div class="stat-label">Записей</div>
            <div class="stat-value" id="s-count">0</div>
          </div>
          <div class="stats-divider"></div>
          <div class="stat">
            <div class="stat-label">Всего</div>
            <div class="stat-value" id="s-total">0 ₸</div>
          </div>
        </div>
        <div class="settings-actions">
          <button type="button" class="btn-secondary" id="s-export">${icon('download', { size: 15 })}Экспорт JSON</button>
          <label class="btn-secondary" style="cursor:pointer;">
            ${icon('upload', { size: 15 })}Импорт JSON
            <input id="s-import" type="file" accept="application/json,.json" hidden />
          </label>
          <button type="button" class="btn-danger" id="s-clear">${icon('trash', { size: 15 })}Очистить все данные</button>
        </div>
      </section>

      <section class="card">
        <div class="card-title" style="margin-bottom: 8px;">О приложении</div>
        <p class="about-text">
          Расходы — полностью оффлайн приложение для учёта личных трат. Все данные хранятся локально на устройстве в IndexedDB, на серверах ничего не сохраняется. Работает без интернета, устанавливается на главный экран и запускается как обычное приложение.
        </p>
        <div class="chip-row">
          <span class="chip">Offline-first</span>
          <span class="chip">IndexedDB</span>
          <span class="chip">PWA</span>
          <span class="chip">v ${APP_VERSION}</span>
        </div>
      </section>
    </div>
  `;

  const countEl = root.querySelector('#s-count');
  const totalEl = root.querySelector('#s-total');
  const exportBtn = root.querySelector('#s-export');
  const importInput = root.querySelector('#s-import');
  const clearBtn = root.querySelector('#s-clear');

  async function refresh() {
    const [n, sum] = await Promise.all([countExpenses(), sumExpenses()]);
    countEl.textContent = n.toLocaleString('ru-RU');
    totalEl.textContent = fmtMoneyShort(sum) + ' ₸';
  }

  exportBtn.addEventListener('click', async () => {
    const text = await exportJSON();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rashody-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Экспорт готов.', 'ok');
  });

  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : parsed?.expenses;
      if (!Array.isArray(list)) throw new Error('invalid');
      const ok = await confirmDialog({
        title: 'Импортировать данные?',
        body: `Будет загружено ${list.length} записей. Текущие данные будут заменены.`,
        confirmLabel: 'Импортировать',
      });
      if (!ok) {
        importInput.value = '';
        return;
      }
      await importJSON(text);
      toast('Импортировано.', 'ok');
      onDataChange?.();
      await refresh();
    } catch {
      toast('Ошибка: неверный файл.', 'err');
    } finally {
      importInput.value = '';
    }
  });

  clearBtn.addEventListener('click', async () => {
    const n = await countExpenses();
    const ok = await confirmDialog({
      title: 'Удалить все данные?',
      body: `Будет удалено ${n} записей. Это действие нельзя отменить.`,
      confirmLabel: 'Удалить всё',
      danger: true,
    });
    if (!ok) return;
    await clearAll();
    toast('Все данные удалены.', 'ok');
    onDataChange?.();
    await refresh();
  });

  refresh();
}
