/**
 * Attach a keyboard-aware autocomplete dropdown to an input.
 *
 * fetcher(query) -> Promise<Array<item>>
 * renderItem(item) -> string (HTML)
 * onSelect(item) -> void
 */
export function attachAutocomplete(input, { fetcher, renderItem, onSelect }) {
  const wrap = document.createElement('div');
  wrap.className = 'ac-dropdown';
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
    wrap.innerHTML = items
      .map(
        (item, i) =>
          `<button type="button" class="ac-item${i === active ? ' is-active' : ''}" data-i="${i}">${renderItem(item)}</button>`,
      )
      .join('');
    wrap.hidden = items.length === 0;
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
    // delay so click on an item registers first
    setTimeout(close, 120);
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
    const btn = e.target.closest('.ac-item');
    if (!btn) return;
    e.preventDefault();
    select(Number(btn.dataset.i));
  });

  return { close, refresh: fetchNow };
}
