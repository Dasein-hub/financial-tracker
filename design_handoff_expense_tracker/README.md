# Handoff: Offline Expense Tracker (PWA)

## Overview

A Russian-language, offline-first personal expense tracker designed for mobile (Samsung Galaxy S23 viewport as reference). Users add expenses with name, category, and price (in Kazakhstani tenge, ₸), browse/search/edit their history, analyse spending across time ranges, and manage their data (JSON export/import/clear). All state is persisted locally; nothing is sent to a server.

## About the Design Files

The files in `designs/` are **design references created as an HTML/React-in-browser prototype**. They are not production code to copy directly. The prototype uses:
- React 18 loaded via CDN
- Inline JSX transpiled by Babel Standalone
- Global-scope component files glued together via `Object.assign(window, …)`
- A fake "Samsung S23" device frame (`samsung-frame.jsx`) that wraps the app for presentation

**The task is to recreate these designs in the target codebase's existing environment.** If the target is a React Native / Expo app, use its navigation and styling primitives. If it's a web PWA, use its component library and state management. If no environment exists yet, a React + Vite PWA (with IndexedDB via `idb` or Dexie) is a reasonable choice. Drop the device frame — it's only for preview.

## Fidelity

**High-fidelity.** Exact colors, typography scale, spacing, border radii, interactions, copy, and chart behavior are all locked in. Recreate pixel-perfectly using the codebase's libraries.

## Screens / Views

The app is a single screen with four tabs switched via pill buttons in the header. All views share a dark navy background, a radial indigo glow in the top-right corner, and a frosted-blur sticky header.

### Global chrome

- **App header** (sticky, `position: relative; z-index: 10`)
  - Background: `rgba(11,16,32,0.72)` with `backdrop-filter: blur(14px) saturate(140%)`
  - Bottom border: `1px solid rgba(40,48,86,0.7)`
  - Padding: `12px 16px 10px`
  - Title "Расходы": 24px, weight 700, color `#f1f5f9`, letter-spacing `-0.4px`
  - Right-side status: 11px, color `#94a3b8`, 6px green dot (`#22c55e` with `0 0 8px rgba(34,197,94,0.6)` glow) + text "оффлайн"
  - Tab pills row (horizontally scrollable, hide scrollbar):
    - Padding `8px 14px`, border-radius `999px`
    - Active: gradient `linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)`, white text, weight 600, shadow `0 6px 16px rgba(99,102,241,0.32)`, border `1px solid #6366f1`
    - Inactive: transparent bg, `#94a3b8` text, weight 500, border `1px solid rgba(40,48,86,0.8)`
    - Tabs: Добавить · История · Аналитика · Настройки
  - Remember selected tab in storage (key `tab`)

- **Content scroll area**
  - Padding: `14px 14px 34px`
  - Scrolls to top on tab change
  - Scrollbar hidden

- **Radial glow**: absolute overlay behind content, `radial-gradient(circle at 110% -10%, rgba(99,102,241,0.38) 0%, rgba(99,102,241,0.12) 25%, transparent 55%)`, `pointer-events: none`

### Tab 1: Добавить (Add)

Two stacked cards (background `#141a2e`, border `1px solid #283056`, border-radius 12px, padding 14px, gap 12px between them).

**Card 1 — entry form**

- Field label style: 11.5px, weight 600, color `#94a3b8`, UPPERCASE, letter-spacing 0.6, margin-bottom 6px
- Input style: height 44, bg `#0b1020`, border `1px solid #283056`, border-radius 10, padding `0 12px`, 15px text color `#f1f5f9`
  - On focus: border `#6366f1`, shadow `0 0 0 3px rgba(99,102,241,0.15)`
- Three fields (12px gap):
  1. **Название** — text input with **autocomplete dropdown** showing up to 5 matching previous entries (by substring), each row showing name + price + category. Tapping a suggestion auto-fills all three fields.
  2. **Категория** — text input with dropdown listing all 10 categories (each with its color dot) filtered by substring; dropdown appears when value doesn't exactly match a category.
  3. **Цена, ₸** — numeric input (`inputMode="decimal"`, supports comma decimal separator), tabular-nums
- Error message below fields: 12px, color `#fca5a5`. Validation messages (Russian): «Укажите название», «Укажите категорию», «Укажите цену»
- Primary button "+ Добавить": 46px tall, gradient `linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)`, border-radius 10, white 15px/600 text, shadow `0 10px 24px rgba(99,102,241,0.35)`, plus icon 18px stroke 2.4

**Card 2 — Недавние**

- Header row: "Недавние" (15px/600 `#f1f5f9`) + right-aligned "последние N" (11px `#64748b`)
- Up to 6 most recent entries, rendered as `EntryRow` (see shared components)
- Empty state: 22px vertical padding, centered, `#64748b`, "Пока ничего нет"

**On successful add:** reset form, show toast "Добавлено." (kind `ok`).

### Tab 2: История (History)

Single card with `padding: 0, overflow: hidden`.

- **Sticky top bar**: padding `12px 14px`, bottom border `1px solid #283056`
  - Left: "Все расходы · N" (count in `#64748b` weight 500)
  - Right: search pill — bg `#0b1020`, border `1px solid #283056`, border-radius 999, padding `6px 12px`, search icon 13px `#94a3b8`, transparent input, clear-X button when query present
- **List**: padding `4px 14px`. Each row is an `EntryRow` with Edit + Delete action buttons on the right (see shared).
- **Inline edit mode**: when the user taps the edit pencil on a row, the row is replaced with a stacked mini-form:
  - Name input, Category input (with dropdown), Price input — all 38px tall, 13.5px text
  - Two 36px-tall buttons: Отмена (outlined) and Сохранить (indigo `#6366f1`, check icon)
- **Delete flow**: tapping the trash icon opens a confirm dialog:
  - Title "Удалить запись?", body «"<name>" — <price> ₸. Это действие нельзя отменить.»
  - Confirm label "Удалить", danger style (red bg `#ef4444`)
  - On confirm: remove + toast "Удалено."
- Empty states: "Ничего не найдено" (when searching) or "Список пуст"

### Tab 3: Аналитика (Analytics)

Top card + 2×2 grid of chart cards.

**Controls card**

- Label "Период"
- Horizontal scrollable row of 7 range pills:
  - `today` Сегодня · `week` На этой неделе · `month` Этот месяц · `3mo` Последние 3 месяца · `year` Этот год · `all` За всё время · `custom` Свой период
  - Pill style: padding `6px 11px`, border-radius 999, 11.5px weight 500
  - Active: bg `#6366f1`, white text, border `#6366f1`
  - Inactive: transparent, `#cbd5e1` text, border `#283056`
- When `custom` is selected: two `<input type="date">` fields (С / По), 38px tall, dark `color-scheme: dark`
- Footer inside same card (top border `1px solid #283056`, padding-top 8px):
  - Left: "N записей" (count in `#f1f5f9` weight 600, rest `#94a3b8`)
  - Right: total amount in tenge, 18px weight 700, tabular-nums

**Chart grid** — 2 columns, 10px gap. Each chart card is a `<button>` (entire card is tappable to open fullscreen). Card style matches other cards but with:
- Padding 10px
- Title row: 11px weight 600 uppercase `#94a3b8` letter-spacing 0.5 + small 11px "open-in-new" SVG icon on the right (`#64748b`)
- The four charts:
  1. **По категориям** — doughnut (SVG, r=44 / rIn=30 / cx,cy=60). Center text: "всего" (11px `#94a3b8`) + short-formatted total (12px weight 700 `#f1f5f9`). Below: wrap of up to 6 color swatches + category names (10px). Segment colors come from `CAT_COLORS`.
  2. **По времени** — filled area chart with horizontal gridlines, indigo `#6366f1` stroke + gradient fill (55% → 2% opacity). Bucket sizing is adaptive based on range: hourly ≤ 1.5 days, daily ≤ 35 days, weekly ≤ 120 days, monthly otherwise.
  3. **По месяцам** — vertical bar chart of the last 6 months present in data, bars use `PALETTE` colors.
  4. **Топ позиций** — horizontal bar list. Preview shows top 6 only.
- All small charts have height 140 and skip/round tick labels to prevent clutter.

**Fullscreen chart view (tap any card)**

- Covers the entire device screen (must be rendered at App root, NOT inside the scrollable content area — otherwise it gets clipped below the header).
- Background `#0b1020`, fades in 180ms.
- Contents are wrapped in a panel of size `width = screen height`, `height = screen width`, centered via `transform: translate(-50%,-50%) rotate(90deg)` — so the whole view appears landscape.
- Panel padding `20px 28px`, structured as:
  - Header row:
    - Left: subtitle (11px uppercase `#94a3b8`, contains the current range label, e.g. "Этот месяц") + title 20px weight 700 `#f1f5f9`
    - Right: 40×40 round close button — bg `#141a2e`, border `1px solid #283056`, X icon 20px
  - Chart area: `flex: 1, min-height: 0`
  - Footer hint: centered 11px `#64748b`, "Нажмите × или на фон, чтобы вернуться"
- A transparent full-screen button behind the panel also closes the overlay.
- Big-chart variants:
  - **Doughnut big**: doughnut on the left (height 94%), a 2-column scrollable grid of legend rows on the right (16px labels with color square + name + percentage). If the legend overflows vertically, the grid scrolls.
  - **AreaChart big**: W=720 H=320, padding `l60 r20 t20 b40`, ticks `[0, 0.25, 0.5, 0.75, 1]`, dot markers on each point (r=3, fill indigo, stroke `#0b1020` 1.5).
  - **BarChart big**: same dims, rounded corners 6, value labels above each bar (14px weight 600 `#cbd5e1`).
  - **HBarChart big**: scrollable vertical list of ALL rows (not capped), 15px labels, 18px bar height, full `fmtMoney` amounts. Container has `overflow-y: auto` and `padding: 4px 20px 4px 4px`.

### Tab 4: Настройки (Settings)

Two stacked cards.

**Card 1 — Данные**

- Title "Данные" 15px weight 600
- Stats strip: 10px gap, bg `#0b1020`, border `1px solid #283056`, border-radius 10, padding `10px 12px`
  - Two `Stat` columns split by a 1px divider: "Записей" (count, ru-RU formatted) and "Всего" (short-formatted amount + " ₸")
  - Stat labels 10.5px uppercase `#94a3b8`; values 15px weight 700 `#f1f5f9` tabular-nums
- Three buttons, 44px tall, border-radius 10, 14px weight 500, icon + label:
  - Экспорт JSON — outlined neutral, download icon → saves `rashody-YYYY-MM-DD.json`
  - Импорт JSON — outlined neutral, upload icon → opens file picker, parses array, confirms with dialog «Импортировать данные? Будет загружено N записей. Текущие данные будут заменены.» (label "Импортировать"), replaces state on confirm, toast "Импортировано."; on parse error toast "Ошибка: неверный файл." (kind `err`)
  - Очистить все данные — danger variant: bg `rgba(239,68,68,0.08)`, border `rgba(239,68,68,0.4)`, color `#fca5a5`, trash icon, confirm dialog with danger button, toast "Все данные удалены."

**Card 2 — О приложении**

- Title "О приложении" 15px weight 600
- Paragraph 12.5px `#94a3b8` line-height 1.55, exact copy:
  > Расходы — полностью оффлайн приложение для учёта личных трат. Все данные хранятся локально на устройстве в IndexedDB, на серверах ничего не сохраняется. Работает без интернета, устанавливается на главный экран и запускается как обычное приложение.
- Chip row (flex-wrap, 10px gap, margin-top 12): "Offline-first", "IndexedDB", "PWA", "v 1.0.3"
- Chip style: padding `4px 10px`, border-radius 999, bg `rgba(99,102,241,0.12)`, border `1px solid rgba(99,102,241,0.3)`, color `#c7d2fe`, 11px weight 500

## Shared components

### EntryRow
- Row layout: flex, gap 10, padding `11px 0` (or `10px 0` if `compact`), bottom border `1px solid rgba(40,48,86,0.6)`
- Left column (flex 1, ellipsis):
  - Name 14px weight 600 `#f1f5f9`
  - `CatBadge` — pill showing category: padding `3px 8px`, border-radius 999, 10.5px weight 500; color = `CAT_COLORS[category]`; bg = color + `1f` (12% alpha); border = color + `33` (20% alpha); leading 5px dot in full color
- Right column (flex-shrink 0, right-aligned):
  - Price 15px weight 700 indigo `#818cf8` tabular-nums (formatted with `fmtMoney` → `N,NNN ₸`)
  - Time 10.5px `#64748b`: "Сегодня · HH:MM", "Вчера · HH:MM", or "D мес · HH:MM" (Russian short months: янв, фев, мар, апр, мая, июн, июл, авг, сен, окт, ноя, дек)
- Action column (only on History tab): two 28×28 icon buttons stacked with 4px gap
  - Edit: outlined neutral — border `#283056`, color `#cbd5e1`, pencil icon 13
  - Delete: danger — border `rgba(239,68,68,0.35)`, color `#fca5a5`, trash icon 13

### Toast
- Position: absolute, centered horizontally, `bottom: 38px`
- Style: bg `rgba(20,26,46,0.96)`, border `1px solid <color>55`, padding `10px 14px`, border-radius 999, 13px weight 500, shadow `0 12px 30px rgba(0,0,0,0.45)`
- Leading 6px dot colored by kind: `info` indigo `#6366f1`, `ok` green `#22c55e`, `err` red `#ef4444`
- Auto-dismiss after 2000ms
- Enter animation (220ms cubic-bezier(.2,.9,.3,1.2)): slide up 14px + fade

### ConfirmDialog
- Backdrop: `rgba(5,8,18,0.72)` with `backdrop-filter: blur(4px)`, fade-in 180ms
- Card: bg `#141a2e`, border `1px solid #283056`, border-radius 16, padding 18, shadow `0 30px 60px rgba(0,0,0,0.55)`, enter animation 240ms (scale 0.95 → 1, translateY 8 → 0)
- Title 16px weight 600 `#f1f5f9`; body 13.5px `#94a3b8` line-height 1.45
- Two 42px equal-flex buttons with 8px gap: outlined "Отмена" + primary-or-danger confirm button (6px 18 shadow in accent color)

## State Management

- **Entries**: array of `{ id: string, name: string, category: string, price: number, ts: number }`, kept newest-first (by `ts` descending).
- Persistence key `expenses-ru-v1` — JSON stringified array in local storage.
- On first run with no saved data, seed from a built-in list of ~80 sample entries (`buildSeed` in `data.jsx`). In production, seed should be empty or behind a dev flag.
- Tab selection persists under key `tab`.
- Operations:
  - `add(e)` — prepend with generated id + `ts: Date.now()`
  - `update(id, patch)` — shallow merge
  - `remove(id)` — filter by id
  - `replaceAll(arr)` — used by import and clear; re-sort newest-first

**Production note:** the README paragraph claims IndexedDB; this prototype uses localStorage for simplicity. In the real app, use IndexedDB (`idb` or Dexie) since expense history can grow large.

## Design Tokens

### Colors

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0b1020` | Page background |
| `--surface` | `#141a2e` | Card background |
| `--surface-2` | `#1b2240` | Suggestion popover |
| `--border` | `#283056` | Card/input border |
| `--border-soft` | `rgba(40,48,86,0.6)` | Row dividers |
| `--primary` | `#6366f1` | Indigo brand |
| `--primary-strong` | `#4f46e5` | Gradient bottom |
| `--primary-soft` | `#818cf8` | Price accent |
| `--primary-tint-12` | `rgba(99,102,241,0.12)` | Chip bg |
| `--primary-tint-15` | `rgba(99,102,241,0.15)` | Focus ring |
| `--text` | `#f1f5f9` | Primary text |
| `--text-2` | `#e2e8f0` | Default body |
| `--text-3` | `#cbd5e1` | Muted |
| `--text-4` | `#94a3b8` | Label/secondary |
| `--text-5` | `#64748b` | Caption |
| `--success` | `#22c55e` | Online dot / toast ok |
| `--danger` | `#ef4444` | Delete / toast err |
| `--danger-soft` | `#fca5a5` | Danger text |

### Category palette (`CAT_COLORS`)

```
Продукты     #22d3ee      Одежда       #f59e0b
Кафе         #f472b6      Дом          #60a5fa
Транспорт    #6366f1      Подписки     #fb7185
Развлечения  #a78bfa      Путешествия  #f87171
Здоровье     #34d399      Прочее       #4ade80
```

### Chart palette (`PALETTE`)
`#6366f1, #22d3ee, #f472b6, #f59e0b, #34d399, #a78bfa, #fb7185, #60a5fa, #f87171, #4ade80`

### Spacing
2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 32

### Radius
- Buttons / inputs: 10
- Cards: 12, 16 (dialog)
- Pills / chips / toast: 999
- Small dots / swatches: 2–4

### Typography
- Font family: `system-ui, -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif`
- Scale (px): 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 15, 16, 18, 20, 22, 24
- Weights: 400 / 500 / 600 / 700
- Numbers always use `font-variant-numeric: tabular-nums`

### Shadows
- Card (subtle): none; rely on border
- Primary button: `0 10px 24px rgba(99,102,241,0.35)`
- Tab pill active: `0 6px 16px rgba(99,102,241,0.32)`
- Suggestion popover: `0 12px 28px rgba(0,0,0,0.45)`
- Toast: `0 12px 30px rgba(0,0,0,0.45)`
- Dialog: `0 30px 60px rgba(0,0,0,0.55)`

## Formatters (see `primitives.jsx`)

- `fmtMoney(n)` → `N,NNN ₸` with ru-RU locale thousands separator (non-breaking space)
- `fmtMoneyShort(n)` → `1,5к` / `12к` for values ≥ 1000 (comma decimal, suffix "к"); otherwise the raw integer
- `fmtTime(ts)` → "Сегодня · HH:MM" / "Вчера · HH:MM" / "D мес · HH:MM"
- `fmtDateInput(ts)` → `YYYY-MM-DD` for `<input type="date">`

## Icons

Inline SVG, 24×24 viewBox, stroke-based (`strokeLinecap: round`, `strokeLinejoin: round`, default strokeWidth 1.8). Icon names used: `plus`, `search`, `edit`, `trash`, `x`, `check`, `chevron`, `download`, `upload`, `wifi`, `info`. See `primitives.jsx` → `Icon`. Feel free to swap with the target codebase's icon library (Lucide has equivalents with the same names).

## Interactions & Behavior

- **Autocomplete (Add tab, name field)**: shows up to 5 deduplicated (by name) matches sorted by recency. Picking one fills name + category + price and closes the popover. Blur closes it after 140ms (so taps register).
- **Category autocomplete**: always shows matching categories (with color dots) unless current value exactly matches one of the 10 canonical categories.
- **Tap-to-enlarge charts**: entire chart card is a button; opens rotated-landscape overlay over the whole screen. Close via X button, tapping the backdrop, or pressing Escape (optional but nice).
- **Search (History)**: case-insensitive substring match against both name and category.
- **Scroll positions**: content scroll resets to top on tab change.
- **Button press feedback**: `button:active { transform: scale(0.98); }` globally.

## Assets

No external images. All icons are inline SVG. No fonts loaded — uses system font stack.

## Files in `designs/`

- `Expense Tracker PWA.html` — entry HTML + global styles + script tags. Opening in a browser runs the full prototype.
- `app.jsx` — App shell, tabs, persistence hook (`useExpenses`), toast + dialog + fullscreen-chart coordinators, device-frame wrapper.
- `data.jsx` — `CATEGORIES`, `CAT_COLORS`, `PALETTE`, `buildSeed()` (dev-only sample data).
- `primitives.jsx` — `fmtMoney`, `fmtMoneyShort`, `fmtTime`, `fmtDateInput`, `Icon`, `CatBadge`, `Toast`, `ConfirmDialog`.
- `tab-add.jsx` — Add form + autocomplete (`NameInput`, `CategoryInput`) + Recent list. Also defines shared `Card`, `Label`, `fieldStyle`, `EntryRow`.
- `tab-history.jsx` — History list + search + inline edit + delete confirm.
- `tab-analytics.jsx` — Range picker, 4 chart components (`Doughnut`, `AreaChart`, `BarChart`, `HBarChart`), aggregators, `FullscreenChart` overlay.
- `tab-settings.jsx` — Data stats, export/import/clear, about card.
- `samsung-frame.jsx` — Preview-only device bezel. **Do not port this** — it's only a visual wrapper for the prototype.

## What to discard when implementing

- The Samsung S23 frame (`samsung-frame.jsx` and its usage in `app.jsx`'s `Page` component).
- The global-scope `Object.assign(window, …)` pattern — use normal ES module imports instead.
- The built-in seed data (`buildSeed`) unless you want it behind a dev-only flag.
- The hand-rolled SVG charts if your codebase already has a chart library (Recharts, Victory, Chart.js, etc.) — but replicate the exact visual language (colors, rounded bars, gradient fill on area, donut center totals, tappable-to-fullscreen behavior with 90° landscape rotation).
