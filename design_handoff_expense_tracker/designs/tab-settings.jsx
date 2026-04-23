// Settings tab

function SettingsTab({ entries, replaceAll, showToast, confirm }) {
  const total = entries.reduce((s, e) => s + e.price, 0);
  const fileRef = React.useRef(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rashody-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Экспорт готов.', 'ok');
  };

  const importJson = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const txt = await f.text();
      const arr = JSON.parse(txt);
      if (!Array.isArray(arr)) throw new Error();
      const ok = await confirm({
        title: 'Импортировать данные?',
        body: `Будет загружено ${arr.length} записей. Текущие данные будут заменены.`,
        confirmLabel: 'Импортировать',
      });
      if (ok) {
        replaceAll(arr.map(x => ({ ...x, id: x.id || 'imp-' + Math.random().toString(36).slice(2) })));
        showToast('Импортировано.', 'ok');
      }
    } catch {
      showToast('Ошибка: неверный файл.', 'err');
    } finally {
      e.target.value = '';
    }
  };

  const clearAll = async () => {
    const ok = await confirm({
      title: 'Удалить все данные?',
      body: `Будет удалено ${entries.length} записей. Это действие нельзя отменить.`,
      confirmLabel: 'Удалить всё',
      danger: true,
    });
    if (ok) {
      replaceAll([]);
      showToast('Все данные удалены.', 'ok');
    }
  };

  const btnStyle = (variant = 'neutral') => ({
    width: '100%', height: 44,
    border: '1px solid ' + (variant === 'danger' ? 'rgba(239,68,68,0.4)' : '#283056'),
    background: variant === 'danger' ? 'rgba(239,68,68,0.08)' : 'transparent',
    color: variant === 'danger' ? '#fca5a5' : '#e2e8f0',
    borderRadius: 10,
    fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 10 }}>Данные</div>
        <div style={{
          display: 'flex', gap: 10, marginBottom: 14,
          background: '#0b1020', borderRadius: 10,
          padding: '10px 12px', border: '1px solid #283056',
        }}>
          <Stat label="Записей" value={entries.length.toLocaleString('ru-RU')} />
          <div style={{ width: 1, background: '#283056' }} />
          <Stat label="Всего" value={fmtMoneyShort(total) + ' ₸'} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={exportJson} style={btnStyle('neutral')}>
            <Icon name="download" size={15} /> Экспорт JSON
          </button>
          <button onClick={() => fileRef.current?.click()} style={btnStyle('neutral')}>
            <Icon name="upload" size={15} /> Импорт JSON
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json"
            style={{ display: 'none' }} onChange={importJson} />
          <button onClick={clearAll} style={btnStyle('danger')}>
            <Icon name="trash" size={15} /> Очистить все данные
          </button>
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 }}>
          О приложении
        </div>
        <p style={{
          fontSize: 12.5, color: '#94a3b8', lineHeight: 1.55, margin: 0,
        }}>
          Расходы — полностью оффлайн приложение для учёта личных трат. Все данные хранятся локально на устройстве в IndexedDB, на серверах ничего не сохраняется. Работает без интернета, устанавливается на главный экран и запускается как обычное приложение.
        </p>
        <div style={{
          display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap',
        }}>
          <Chip>Offline-first</Chip>
          <Chip>IndexedDB</Chip>
          <Chip>PWA</Chip>
          <Chip>v 1.0.3</Chip>
        </div>
      </Card>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div style={{ flex: 1 }}>
    <div style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
  </div>
);

const Chip = ({ children }) => (
  <span style={{
    padding: '4px 10px', borderRadius: 999,
    background: 'rgba(99,102,241,0.12)',
    border: '1px solid rgba(99,102,241,0.3)',
    color: '#c7d2fe',
    fontSize: 11, fontWeight: 500,
  }}>{children}</span>
);

Object.assign(window, { SettingsTab });
