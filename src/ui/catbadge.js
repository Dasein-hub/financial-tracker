import { CAT_COLORS } from '../data.js';
import { escapeHtml } from './escape.js';

export function catBadge(category) {
  const c = CAT_COLORS[category] || '#6366f1';
  return `<span class="cat-badge" style="--cat:${c}"><span class="cat-dot"></span>${escapeHtml(category)}</span>`;
}
