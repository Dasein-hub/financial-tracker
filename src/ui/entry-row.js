import { fmtMoney, fmtTime } from '../format.js';
import { catBadge } from './catbadge.js';
import { escapeHtml } from './escape.js';
import { icon } from './icons.js';

export function entryRow(entry, { actions = false, compact = false } = {}) {
  const actionsHtml = actions
    ? `<div class="row-actions">
         <button type="button" class="icon-btn" data-action="edit" aria-label="Изменить">${icon('edit', { size: 13 })}</button>
         <button type="button" class="icon-btn icon-btn-danger" data-action="delete" aria-label="Удалить">${icon('trash', { size: 13 })}</button>
       </div>`
    : '';
  return `
    <li class="entry-row${compact ? ' is-compact' : ''}" data-id="${entry.id}">
      <div class="entry-main">
        <div class="entry-name">${escapeHtml(entry.name)}</div>
        ${catBadge(entry.category, entry.color)}
      </div>
      <div class="entry-side">
        <div class="entry-price">${fmtMoney(entry.price)}</div>
        <div class="entry-time">${escapeHtml(fmtTime(entry.createdAt))}</div>
      </div>
      ${actionsHtml}
    </li>
  `;
}
