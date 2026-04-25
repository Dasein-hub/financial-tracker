import { PALETTE } from '../data.js';

/**
 * Attach a colour swatch button + popover to the host element.
 * The host should already contain a `.swatch-btn` button.
 *
 * Returns a controller with setColor / getColor / close.
 */
export function attachColorPicker(host, { initialColor, onChange }) {
  const swatchBtn = host.querySelector('.swatch-btn');
  if (!swatchBtn) throw new Error('color-picker: missing .swatch-btn');

  let current = initialColor || PALETTE[0];
  let pop = null;
  let docHandler = null;

  const applySwatch = () => {
    swatchBtn.style.setProperty('--swatch', current);
  };
  applySwatch();

  const close = () => {
    if (!pop) return;
    pop.remove();
    pop = null;
    if (docHandler) {
      document.removeEventListener('mousedown', docHandler, true);
      docHandler = null;
    }
  };

  const open = () => {
    if (pop) return;
    pop = document.createElement('div');
    pop.className = 'color-pop';
    pop.innerHTML = PALETTE.map(
      (c) =>
        `<button type="button" class="color-swatch${c === current ? ' is-selected' : ''}" data-color="${c}" style="--swatch:${c}" aria-label="Цвет ${c}"></button>`,
    ).join('');
    host.appendChild(pop);

    pop.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-color]');
      if (!btn) return;
      current = btn.dataset.color;
      applySwatch();
      onChange?.(current);
      close();
    });

    docHandler = (e) => {
      if (host.contains(e.target)) return;
      close();
    };
    document.addEventListener('mousedown', docHandler, true);
  };

  swatchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (pop) close();
    else open();
  });

  return {
    setColor(c) {
      current = c || PALETTE[0];
      applySwatch();
      if (pop) {
        pop.querySelectorAll('.color-swatch').forEach((b) => {
          b.classList.toggle('is-selected', b.dataset.color === current);
        });
      }
    },
    getColor() {
      return current;
    },
    close,
  };
}
