---
name: html-js-card
description: Creates Home Assistant Lovelace cards using the html-js-card custom card. Use this skill ALWAYS when asked to create, modify or update a Lovelace card for Home Assistant, or when custom cards, sensor visualization or dashboard data display is mentioned. Contains the correct YAML structure, available variables, HA CSS variables, update patterns, reusable components and Silvio's entity naming conventions.
---

# html-js-card Skill

This skill guides the creation of Lovelace cards for Home Assistant using the `html-js-card` custom card. Always produces complete, working YAML ready to paste into the Lovelace editor.

---

## Card configuration

```yaml
type: custom:html-js-card
title: "Optional title"          # displayed at the top of the card
height: 400px                    # card height (default: auto)
padding: 12px 16px 16px          # content padding
overflow: hidden                 # hidden | auto | scroll
update_interval: 30              # auto-refresh interval in seconds (optional)
entities:                        # entities to inject (accessible via `entities` variable)
  - sensor.nome_entita
  - input_number.altro
scripts:                         # external JS libraries to load (CDN URLs)
  - https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js
content: |
  <!-- HTML + CSS + JavaScript here -->
  <script>
    // JavaScript here
  </script>
```

**Required fields:** only `type` and `content`.

### Height guidelines

- **Prefer `height: auto`** for cards with only tiles/text.
- **Set explicit height only when needed** (charts, SVG gauges, fixed-layout grids).
- **Always add ~20% buffer** — browsers add padding and gap that is easy to undercount.

| Content | Suggested height |
|---------|-----------------|
| 1 row of 4 tiles | 120px |
| 2 rows of 4 tiles | 240px |
| Chart.js line chart | +200px |
| SVG gauge / arc | +160px |

---

## Runtime variables

These variables are always available inside `content` scripts:

| Variable | Type | Description |
|----------|------|-------------|
| `hass` | Object | Full Home Assistant instance — read states, call services |
| `entities` | Object | Only the entities declared in `entities:` — keyed by entity_id |
| `card` | HTMLElement | DOM container — use `card.querySelector()` to find elements |
| `config` | Object | The YAML card configuration object |
| `shadow` | ShadowRoot | Shadow DOM root of the card |

### Reading entity states
```javascript
// From entities (only declared entities)
const val  = entities['sensor.temperature']?.state;
const attr = entities['sensor.temperature']?.attributes?.unit_of_measurement;

// From hass (any entity, even if not listed)
const val = hass.states['light.living_room']?.state;
```

### Calling HA services
```javascript
hass.callService('light', 'toggle', { entity_id: 'light.living_room' });
hass.callService('light', 'turn_on', { entity_id: 'light.bedroom', brightness_pct: 80 });
hass.callService('input_number', 'set_value', { entity_id: 'input_number.threshold', value: 42 });
hass.callService('button', 'press', { entity_id: 'button.reset' });
hass.callService('input_datetime', 'set_datetime', {
  entity_id: 'input_datetime.data', datetime: '2025-01-01 10:00:00'
});
```

### Open HA more-info popup
```javascript
function moreInfo(entityId) {
  card.dispatchEvent(new CustomEvent('hass-more-info', {
    bubbles: true, composed: true, detail: { entityId }
  }));
}
// Usage: onclick="moreInfo('sensor.temperature')"
```

---

## Reactive updates (hass-update)

The card fires `hass-update` whenever entity states change. Standard pattern:

```javascript
function update(ents) {
  card.querySelector('#value').textContent = ents['sensor.x']?.state || '—';
}

// Save hass globally for use in click handlers
window._hjc_hass = hass;
update(entities); // initial render

card.addEventListener('hass-update', e => {
  window._hjc_hass = e.detail.hass;
  update(e.detail.entities);
});
```

> **Important:** always save `hass` in `window._hjc_hass` to have it available in global callbacks (onclick, sliders, buttons).

---

## CSS — Home Assistant variables

Always use HA CSS variables for light/dark mode compatibility:

```css
/* Text */
color: var(--primary-text-color);
color: var(--secondary-text-color);
color: var(--disabled-text-color);

/* Backgrounds */
background: var(--card-background-color);
background: var(--secondary-background-color);

/* Borders */
border: 1px solid var(--divider-color);

/* Semantic colors */
color: var(--success-color);   background: var(--success-color)22;   /* green */
color: var(--warning-color);   background: var(--warning-color)22;   /* orange */
color: var(--error-color);     background: var(--error-color)22;     /* red */
color: var(--primary-color);
```

> **Note:** `22` appended to a color = ~13% opacity in hex — useful for badge backgrounds.

---

## Reusable components

### Section block
```html
<div style="background:var(--secondary-background-color);border-radius:10px;padding:12px 14px;margin-bottom:10px;">
  <div style="font-size:10px;font-weight:600;color:var(--disabled-text-color);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">
    SECTION TITLE
  </div>
  <!-- content -->
</div>
```

### Metric card (2/3/4 column grid)
```html
<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;">
  <div style="background:var(--card-background-color);border-radius:8px;padding:8px 10px;border:1px solid var(--divider-color);cursor:pointer;"
       onclick="moreInfo('sensor.entity')">
    <div style="font-size:10px;color:var(--disabled-text-color);margin-bottom:3px;">Label</div>
    <div style="font-size:18px;font-weight:500;" id="val-id">—</div>
  </div>
</div>
```

### Progress bar with dynamic color
```html
<div style="background:var(--divider-color);border-radius:99px;height:8px;overflow:hidden;margin:8px 0;">
  <div id="bar" style="height:100%;border-radius:99px;width:0%;transition:width .8s ease;background:var(--success-color);"></div>
</div>
```
```javascript
function updateBar(pct) {
  const bar = card.querySelector('#bar');
  bar.style.width = Math.min(pct, 100) + '%';
  bar.style.background = pct >= 100 ? 'var(--error-color)'
    : pct >= 80 ? 'var(--warning-color)'
    : 'var(--success-color)';
}
```

### Status badge
```html
<span id="badge" style="display:inline-flex;align-items:center;font-size:11px;font-weight:600;padding:3px 10px;border-radius:99px;background:var(--success-color)22;color:var(--success-color);">
  Ok
</span>
```

### Info rows (label + value)
```html
<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid var(--divider-color);">
  <span style="color:var(--disabled-text-color);">Label</span>
  <span style="color:var(--primary-text-color);font-weight:500;cursor:pointer;"
        onclick="moreInfo('sensor.entity')" id="val-row">—</span>
</div>
```

### Action button
```html
<button onclick="doAction()"
  style="display:flex;align-items:center;gap:5px;background:none;border:1px solid var(--divider-color);border-radius:8px;padding:7px 12px;font-size:12px;color:var(--secondary-text-color);cursor:pointer;transition:background .15s;"
  onmouseover="this.style.background='var(--secondary-background-color)'"
  onmouseout="this.style.background='none'">
  Action
</button>
```

### Confirm dialog
```html
<div id="conf" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999;align-items:center;justify-content:center;">
  <div style="background:var(--card-background-color);border-radius:12px;padding:22px 18px;max-width:280px;text-align:center;">
    <div style="font-size:15px;font-weight:500;margin-bottom:7px;">Confirm title</div>
    <div style="font-size:12px;color:var(--secondary-text-color);margin-bottom:16px;line-height:1.6;">Descriptive text.</div>
    <div style="display:flex;gap:8px;justify-content:center;">
      <button onclick="closeConf()" style="padding:7px 18px;border-radius:8px;border:1px solid var(--divider-color);font-size:13px;cursor:pointer;background:none;color:var(--secondary-text-color);">Cancel</button>
      <button onclick="doAction()" style="padding:7px 18px;border-radius:8px;border:none;font-size:13px;cursor:pointer;background:var(--error-color)22;color:var(--error-color);">Confirm</button>
    </div>
  </div>
</div>
```
```javascript
window.openConf  = () => { card.querySelector('#conf').style.display = 'flex'; };
window.closeConf = () => { card.querySelector('#conf').style.display = 'none'; };
```

### Chart.js bar chart (requires scripts: Chart.js)
```yaml
scripts:
  - https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js
```
```html
<div style="position:relative;height:120px;"><canvas id="hc"></canvas></div>
```
```javascript
const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
const color     = isDark ? '#5DCAA5' : '#1D9E75';
const colorFill = isDark ? 'rgba(93,202,165,0.12)' : 'rgba(29,158,117,0.10)';
const colorText = isDark ? 'rgba(168,165,157,0.8)' : 'rgba(107,105,96,0.8)';
const colorGrid = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

const ctx = card.querySelector('#hc').getContext('2d');
const chart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    datasets: [{ data: [0,0,0,0,0,0,0], backgroundColor: colorFill,
      borderColor: color, borderWidth: 1.5, borderRadius: 4, borderSkipped: false }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: isDark ? '#252523' : '#fff',
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      borderWidth: 1
    }},
    scales: {
      x: { grid: { display: false }, ticks: { color: colorText, font: { size: 10 } }, border: { display: false } },
      y: { grid: { color: colorGrid }, ticks: { color: colorText, font: { size: 10 } }, border: { display: false } }
    }
  }
});
```

### Inline SVG arc gauge
```html
<svg viewBox="0 0 120 80" width="100%" style="max-height:140px;display:block;margin:auto;">
  <path id="arc-track" d="M15,75 A55,55 0 0,1 105,75"
        fill="none" stroke="var(--divider-color)" stroke-width="10" stroke-linecap="round"/>
  <path id="arc-fill" d="M15,75 A55,55 0 0,1 105,75"
        fill="none" stroke="var(--success-color)" stroke-width="10" stroke-linecap="round"
        stroke-dasharray="172.8" stroke-dashoffset="172.8" style="transition:stroke-dashoffset .4s ease"/>
  <text id="arc-label" x="60" y="68" text-anchor="middle"
        style="font-size:22px;font-weight:700;fill:var(--primary-text-color);">—</text>
  <text id="arc-sub" x="60" y="80" text-anchor="middle"
        style="font-size:12px;fill:var(--secondary-text-color);">unit</text>
</svg>
```
```javascript
function updateArc(val, max) {
  const pct = isFinite(val) ? Math.max(0, Math.min(1, val / max)) : 0;
  card.querySelector('#arc-label').textContent = isFinite(val) ? Math.round(val) : '—';
  card.querySelector('#arc-fill').style.strokeDashoffset = 172.8 * (1 - pct);
}
```

### Live animated dot
```html
<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--success-color);margin-right:5px;animation:lpulse 2s ease-in-out infinite;"></span>
<style>@keyframes lpulse{0%,100%{opacity:1}50%{opacity:0.25}}</style>
```

---

## JavaScript utilities

### Number formatting
```javascript
function fmt(v, decimals = 1) {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  return n.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
```

### Date formatting from input_datetime
```javascript
function fmtDate(rawState) {
  if (!rawState || rawState === 'unknown' || rawState === 'unavailable') return '—';
  const dt = new Date(rawState);
  return dt.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' })
    + ' ' + dt.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
}
```

### Entity history via HA API
```javascript
async function loadHistory(entityId, hours, hassObj) {
  const start = new Date(Date.now() - hours * 3600000).toISOString();
  const token = hassObj.auth?.data?.access_token || '';
  const r = await fetch(
    `/api/history/period/${start}?filter_entity_id=${entityId}&minimal_response=true`,
    { headers: { Authorization: 'Bearer ' + token } }
  );
  const data = await r.json();
  return data[0] || [];
}
```

---

## Entity conventions — Silvio's system

### Water purifier
```
sensor.controllo_acqua_acqua_buona_flusso       — flow L/min
sensor.controllo_acqua_acqua_buona_litri        — total liters (with reset offset)
sensor.acqua_buona_litri_dalla_cartuccia        — liters since cartridge
sensor.acqua_buona_usura_cartuccia              — % wear
sensor.acqua_buona_litri_rimanenti_cartuccia    — remaining L
sensor.acqua_buona_giorni_dalla_cartuccia       — days in use
sensor.acqua_buona_stato_cartuccia              — status text
sensor.acqua_buona_giornaliera / settimanale / mensile / annuale
input_datetime.data_cambio_cartuccia_buona
input_number.soglia_cambio_cartuccia
button.reset_acqua_buona_cambio_cartuccia
```

### Solar energy (EPCube + Tigo)
```
sensor.epcube_*    — EPCube HES-EU1-710G inverter/battery
sensor.tigo_*      — Tigo optimizers
```

### Lovelace dashboards
```
Vaira             — main dashboard
Vaira-Cell        — mobile version
Tigo              — Tigo solar dashboard
```

### HA Assistant
```
Configured name: Amira (= Claude in Silvio's HA environment)
```

---

## ❌ NEVER do this (common mistakes that break the card)

### Wrong: separate `js:` YAML field (does not exist)
```yaml
# ❌ WRONG — the `js:` field does NOT exist in html-js-card
# JS written here is silently ignored — card stays stuck on its initial HTML ("Loading...")
type: custom:html-js-card
content: |
  <div id="root">Loading...</div>
js: |
  (function() {
    const hass = this.hass;   // ❌ also wrong: `this.hass` does not exist
    ...
  })()
```
```yaml
# ✅ CORRECT — JavaScript goes inside a <script> tag within content:
type: custom:html-js-card
content: |
  <div id="root">Loading...</div>
  <script>
    window._hjc_hass = hass;
    function update(ents) {
      card.querySelector('#root').textContent = ents['sensor.x']?.state || '—';
    }
    update(entities);
    card.addEventListener('hass-update', e => {
      window._hjc_hass = e.detail.hass;
      update(e.detail.entities);
    });
  </script>
```

### Wrong: `this.hass`, `this.querySelector`, IIFE with `this`
```javascript
// ❌ WRONG
const hass = this.hass;           // undefined
const el = this.querySelector('#root');  // null
(function() { const hass = this.hass; ... })();
```
```javascript
// ✅ CORRECT — use injected variables directly
const state = hass.states['sensor.x']?.state;
const el = card.querySelector('#root');
```

### Wrong: `document.getElementById` inside shadow DOM
```javascript
// ❌ WRONG — always returns null inside shadow DOM
document.getElementById('solar').textContent = '…';
```
```javascript
// ✅ CORRECT
card.querySelector('#solar').textContent = '…';
```

### Wrong: inline onclick without `window.`
```javascript
// ❌ WRONG — local function not accessible from inline HTML in shadow DOM
function doAction() { ... }
// <button onclick="doAction()"> → ReferenceError
```
```javascript
// ✅ CORRECT
window.doAction = function() { window._hjc_hass.callService(...); };
// <button onclick="doAction()"> → works
```

### Wrong: no hass-update listener
```javascript
// ❌ WRONG — called once at startup, never again
function update() { ... }
update();
```
```javascript
// ✅ CORRECT
function update(ents) { ... }
update(entities);
card.addEventListener('hass-update', e => update(e.detail.entities));
```

### Wrong: loading CDN scripts inside content:
```yaml
# ❌ WRONG — blocked by HA Content Security Policy
content: |
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```
```yaml
# ✅ CORRECT
scripts:
  - https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js
```

---

## Output rules

1. **Always produce complete YAML** — not partial snippets. Output must be pasteable directly into the Lovelace editor, wrapped in a ```yaml code block.
2. **Always save `hass` in `window._hjc_hass`** in init functions, to have it accessible in global callbacks.
3. **Always use HA CSS variables** — never hardcode colors (except Chart.js which requires explicit values).
4. **`moreInfo` on all clickable numeric values** — every data point with a corresponding entity should open the HA popup on click.
5. **hass-update pattern is mandatory** — always listen to `hass-update` for real-time updates.
6. **`window.functionName`** for all functions called from inline `onclick` in HTML — locally declared functions are not accessible from HTML in the shadow DOM.
7. **`card.querySelector()`** instead of `document.querySelector()` — in shadow DOM, `document` cannot see the card's elements.
8. **Confirm dialog for destructive actions** — reset, deletion, writes to sensitive entities.
9. **Selector consistency** — every selector used in JS must correspond to a real element in the generated HTML/SVG.
10. **Null-safe DOM access** — use `?.` or `if (el)` guards on all queried elements to prevent runtime crashes.
