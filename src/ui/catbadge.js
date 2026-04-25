import { colorFor } from '../data.js';
import { escapeHtml } from './escape.js';

export function catBadge(category, color) {
  const c = colorFor(category, color);
  return `<span class="cat-badge" style="--cat:${c}"><span class="cat-dot"></span>${escapeHtml(category)}</span>`;
}
