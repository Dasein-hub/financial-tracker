export const PALETTE = [
  '#6366f1', '#22d3ee', '#f472b6', '#f59e0b', '#34d399',
  '#a78bfa', '#fb7185', '#60a5fa', '#f87171', '#4ade80',
];

export const DEFAULT_COLOR = PALETTE[0];

/**
 * Stable colour for a category name when no explicit colour was stored.
 * Hash → palette index, so each category name maps to a consistent colour.
 */
export function colorFor(category, explicit) {
  if (explicit) return explicit;
  const s = String(category || '');
  if (!s) return DEFAULT_COLOR;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}
