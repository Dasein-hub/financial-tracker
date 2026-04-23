// История tab — search + full scrollable list with inline edit.

function HistoryTab({ entries, update, remove, showToast, confirm }) {
  const [query, setQuery] = React.useState('');
  const [editId, setEditId] = React.useState(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q)
    );
  }, [query, entries]);

  const onDelete = async (e) => {
    const ok = await confirm({
      title: 'Удалить запись?',
      body: `«${e.name}» — ${fmtMoney(e.price)}. Это действие нельзя отменить.`,
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (ok) {
      remove(e.id);
      showToast('Удалено.', 'ok');
    }
  };

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid #283056',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', flex: 1 }}>
          Все расходы · <span style={{ color: '#64748b', fontWeight: 500 }}>{entries.length}</span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#0b1020',
          border: '1px solid #283056',
          borderRadius: 999,
          padding: '6px 12px',
          flex: '0 1 160px',
        }}>
          <Icon name="search" size={13} color="#94a3b8" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск"
            style={{
              flex: 1, minWidth: 0,
              background: 'transparent', border: 'none', outline: 'none',
              color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              background: 'transparent', border: 'none', padding: 0,
              color: '#64748b', cursor: 'pointer', display: 'flex',
            }}>
              <Icon name="x" size={13} />
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '4px 14px 4px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            {query ? 'Ничего не найдено' : 'Список пуст'}
          </div>
        ) : (
          filtered.map(e => (
            editId === e.id ? (
              <InlineEditRow
                key={e.id} entry={e}
                onCancel={() => setEditId(null)}
                onSave={(patch) => {
                  update(e.id, patch);
                  setEditId(null);
                  showToast('Обновлено.', 'ok');
                }}
              />
            ) : (
              <EntryRow
                key={e.id} entry={e}
                onEdit={() => setEditId(e.id)}
                onDelete={() => onDelete(e)}
              />
            )
          ))
        )}
      </div>
    </Card>
  );
}

function InlineEditRow({ entry, onSave, onCancel }) {
  const [name, setName] = React.useState(entry.name);
  const [category, setCategory] = React.useState(entry.category);
  const [price, setPrice] = React.useState(String(entry.price));
  const save = () => {
    const p = parseFloat(price.replace(',', '.'));
    if (!name.trim() || !category.trim() || !isFinite(p) || p <= 0) return;
    onSave({ name: name.trim(), category: category.trim(), price: p });
  };
  return (
    <div style={{
      padding: '12px 0',
      borderBottom: '1px solid rgba(40,48,86,0.6)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <input
        value={name} onChange={e => setName(e.target.value)}
        placeholder="Название"
        style={{ ...fieldStyle(false), height: 38, fontSize: 13.5 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <CategoryInput value={category} onChange={setCategory} />
      </div>
      <input
        value={price} onChange={e => setPrice(e.target.value)}
        placeholder="Цена, ₸" inputMode="decimal"
        style={{ ...fieldStyle(false), height: 38, fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{
          flex: 1, height: 36, borderRadius: 8,
          background: 'transparent', border: '1px solid #283056',
          color: '#cbd5e1', fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>Отмена</button>
        <button onClick={save} style={{
          flex: 1, height: 36, borderRadius: 8,
          background: '#6366f1', border: 'none',
          color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Icon name="check" size={14} strokeWidth={2.4} /> Сохранить
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { HistoryTab });
