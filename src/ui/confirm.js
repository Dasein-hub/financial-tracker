import { escapeHtml } from './escape.js';

export function confirmDialog({ title, body, confirmLabel = 'Подтвердить', danger = false }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
      <div class="dialog" role="dialog" aria-modal="true">
        <div class="dialog-title">${escapeHtml(title)}</div>
        <div class="dialog-body">${escapeHtml(body)}</div>
        <div class="dialog-actions">
          <button type="button" class="btn-secondary" data-action="cancel">Отмена</button>
          <button type="button" class="${danger ? 'btn-danger' : 'btn-primary'}" data-action="ok">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const finish = (val) => {
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
      resolve(val);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') finish(false);
      else if (e.key === 'Enter') finish(true);
    };
    document.addEventListener('keydown', onKey);

    backdrop.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'ok') finish(true);
      else if (action === 'cancel' || e.target === backdrop) finish(false);
    });

    const confirmBtn = backdrop.querySelector('[data-action="ok"]');
    confirmBtn?.focus();
  });
}
