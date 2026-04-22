import { clearAll, exportJSON, importJSON, listExpenses } from '../db.js';

export function renderSettings(root, { onDataChange, toast }) {
  root.innerHTML = `
    <section class="card">
      <h2>Data</h2>
      <p class="muted" id="s-count"></p>
      <div class="settings-actions">
        <button id="s-export">Export JSON</button>
        <label class="file-btn">
          Import JSON
          <input id="s-import" type="file" accept="application/json,.json" hidden />
        </label>
        <button id="s-clear" class="danger">Clear all data</button>
      </div>
    </section>
    <section class="card">
      <h2>About</h2>
      <p class="muted">
        100% offline. Data is stored in your browser via IndexedDB.
        Installing as an app keeps it on your device.
      </p>
    </section>
  `;

  const countEl = root.querySelector('#s-count');
  const exportBtn = root.querySelector('#s-export');
  const importInput = root.querySelector('#s-import');
  const clearBtn = root.querySelector('#s-clear');

  async function refreshCount() {
    const rows = await listExpenses();
    countEl.textContent = `${rows.length} entries stored.`;
  }

  exportBtn.addEventListener('click', async () => {
    const text = await exportJSON();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    if (!confirm('Importing replaces all existing data. Continue?')) {
      importInput.value = '';
      return;
    }
    try {
      const text = await file.text();
      const n = await importJSON(text);
      toast(`Imported ${n} entries.`);
      onDataChange?.();
      await refreshCount();
    } catch (e) {
      toast('Import failed: ' + e.message);
    } finally {
      importInput.value = '';
    }
  });

  clearBtn.addEventListener('click', async () => {
    if (!confirm('Delete ALL expense data? This cannot be undone.')) return;
    await clearAll();
    toast('All data cleared.');
    onDataChange?.();
    await refreshCount();
  });

  refreshCount();
}
