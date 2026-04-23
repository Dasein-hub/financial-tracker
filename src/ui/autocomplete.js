/**
 * Attach an autocomplete popover to an input.
 *
 * fetcher(query) -> Promise<Array<item>>
 * renderItem(item, index) -> HTML string for one row (excludes outer button)
 * onSelect(item) -> void
 * shouldShow?(currentValue, items) -> boolean (defaults to items.length > 0)
 */
export function attachAutocomplete(input, { fetcher, renderItem, onSelect, shouldShow }) {
  const wrap = document.createElement('div');
  wrap.className = 'ac-pop';
  wrap.hidden = true;
  input.parentElement.appendChild(wrap);

  let items = [];
  let active = -1;
  let requestId = 0;

  const close = () => {
    wrap.hidden = true;
    active = -1;
  };

  const render = () => {
    const visible = shouldShow ? shouldShow(input.value, items) : items.length > 0;
    if (!visible) {
      close();
      return;
    }
    wrap.innerHTML = items
      .map(
        (item, i) =>
          `<div class="ac-item${i === active ? ' is-active' : ''}" data-i="${i}" role="option">${renderItem(item, i)}</div>`,
      )
      .join('');
    wrap.hidden = false;
  };

  const select = (i) => {
    const item = items[i];
    if (!item) return;
    onSelect(item);
    close();
  };

  const fetchNow = async () => {
    const q = input.value;
    const myId = ++requestId;
    const results = await fetcher(q);
    if (myId !== requestId) return;
    items = results || [];
    active = -1;
    render();
  };

  input.addEventListener('input', fetchNow);
  input.addEventListener('focus', fetchNow);
  input.addEventListener('blur', () => {
    setTimeout(close, 140);
  });
  input.addEventListener('keydown', (e) => {
    if (wrap.hidden || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      active = (active + 1) % items.length;
      render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active - 1 + items.length) % items.length;
      render();
    } else if (e.key === 'Enter') {
      if (active >= 0) {
        e.preventDefault();
        select(active);
      }
    } else if (e.key === 'Escape') {
      close();
    }
  });

  wrap.addEventListener('mousedown', (e) => {
    const row = e.target.closest('.ac-item');
    if (!row) return;
    e.preventDefault();
    select(Number(row.dataset.i));
  });

  return { close, refresh: fetchNow };
}
