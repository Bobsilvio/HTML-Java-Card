# HTML + JS Card

Una custom card per Home Assistant che permette di usare **HTML, CSS e JavaScript arbitrario** direttamente dal YAML Lovelace — incluso Chart.js, SVG animati, fetch API, e tutto ciò che vuoi.

[![Open in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Bobsilvio&repository=HTML-Java-Card&category=plugin)

---

## Installazione tramite HACS (consigliato)

1. Clicca il badge qui sopra oppure in HACS cerca **HTML JS Card**
2. Clicca **Scarica** e ricarica la pagina

## Installazione manuale

1. Copia `html-js-card.js` in `/config/www/html-js-card/html-js-card.js`
2. In Home Assistant vai su **Impostazioni → Dashboard → Risorse**
3. Aggiungi risorsa:
   - URL: `/local/html-js-card/html-js-card.js`
   - Tipo: `JavaScript Module`
4. Ricarica la pagina

---

## Configurazione YAML

```yaml
type: custom:html-js-card
title: La mia card          # opzionale
height: 400px               # opzionale, default auto
padding: 12px 16px 16px     # opzionale, padding del contenuto
overflow: hidden            # opzionale: hidden | auto | scroll
update_interval: 30         # opzionale, secondi tra aggiornamenti automatici
entities:                   # opzionale, entità da iniettare
  - sensor.temperatura
  - input_number.soglia
scripts:                    # opzionale, script CDN esterni
  - https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js
content: |
  <div id="mia-card">
    <p id="temp">—</p>
  </div>
  <script>
    function aggiorna(hassObj, entitiesObj) {
      const t = entitiesObj['sensor.temperatura']?.state || '—';
      card.querySelector('#temp').textContent = t + ' °C';
    }

    window._hjc_hass = hass;
    aggiorna(hass, entities);

    card.addEventListener('hass-update', e => {
      window._hjc_hass = e.detail.hass;
      aggiorna(e.detail.hass, e.detail.entities);
    });
  </script>
```

---

## Variabili disponibili negli script

| Variabile | Tipo | Descrizione |
|-----------|------|-------------|
| `hass` | Object | Oggetto HA completo (`hass.states`, `hass.callService`, ecc.) |
| `entities` | Object | Entità dichiarate in `entities:` — accesso rapido per entity_id |
| `card` | HTMLElement | Elemento DOM `#hjc-content` — il contenitore del tuo HTML |
| `config` | Object | Configurazione YAML della card |
| `shadow` | ShadowRoot | Shadow DOM della card |

---

## Aggiornamenti in tempo reale

La card emette `hass-update` ogni volta che HA aggiorna lo stato delle entità, e opzionalmente ogni `update_interval` secondi.

```javascript
card.addEventListener('hass-update', e => {
  const { hass, entities } = e.detail;
  // aggiorna UI
});
```

---

## Chiamare servizi HA

```javascript
// Premere un button
hass.callService('button', 'press', { entity_id: 'button.reset_acqua' });

// Impostare un input_number
hass.callService('input_number', 'set_value', {
  entity_id: 'input_number.soglia',
  value: 2000
});

// Accendere una luce
hass.callService('light', 'turn_on', { entity_id: 'light.salotto', brightness_pct: 80 });
```

> **Nota:** salva sempre `hass` in `window._hjc_hass = hass` per averlo disponibile dentro i callback `onclick` e gli event listener.

---

## Esempio completo — Card con Chart.js

```yaml
type: custom:html-js-card
title: Temperatura stanza
height: 280px
entities:
  - sensor.temperatura_salotto
scripts:
  - https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js
content: |
  <canvas id="grafico" style="width:100%;height:200px;"></canvas>
  <script>
    const ctx = card.querySelector('#grafico').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['1h fa','45m','30m','15m','ora'],
        datasets: [{
          data: [21.2, 21.5, 22.0, 21.8, parseFloat(entities['sensor.temperatura_salotto']?.state || 0)],
          borderColor: 'var(--primary-color)',
          tension: 0.4,
          pointRadius: 3,
          fill: false
        }]
      },
      options: { plugins: { legend: { display: false } } }
    });

    card.addEventListener('hass-update', e => {
      const val = parseFloat(e.detail.entities['sensor.temperatura_salotto']?.state || 0);
      chart.data.datasets[0].data[4] = val;
      chart.update('none');
    });
  </script>
```

---

## Note tecniche

- Gli script CDN (`scripts:`) vengono caricati nel documento principale — Chart.js e simili sono disponibili come variabili globali.
- Lo shadow DOM isola il CSS: gli stili scritti nella card non impattano sul resto della dashboard.
- Usa sempre `card.querySelector('#id')` invece di `document.getElementById()` — il shadow DOM non è visibile da `document`.
- Le variabili CSS di HA (`var(--primary-color)`, `var(--card-background-color)`, ecc.) funzionano correttamente anche dentro lo shadow DOM.
