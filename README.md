# HTML + JS Card

Una custom card per Home Assistant che permette di usare **HTML, CSS e JavaScript arbitrario** direttamente dal YAML Lovelace — incluso Chart.js, fetch API, e tutto ciò che vuoi.

## Installazione manuale

1. Copia `html-js-card.js` in `/config/www/html-js-card/html-js-card.js`
2. In Home Assistant vai su **Impostazioni → Dashboard → Risorse**
3. Aggiungi risorsa:
   - URL: `/local/html-js-card/html-js-card.js`
   - Tipo: `JavaScript Module`
4. Ricarica la pagina

## Configurazione YAML

```yaml
type: custom:html-js-card
title: La mia card          # opzionale
height: 400px               # opzionale, default auto
padding: 12px 16px 16px    # opzionale, padding del contenuto
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
    // Variabili disponibili:
    // hass     → oggetto Home Assistant completo
    // entities → entità dichiarate in config (già filtrate)
    // card     → elemento DOM contenitore (#hjc-content)
    // config   → configurazione YAML della card
    // shadow   → shadowRoot della card

    function aggiorna(hassObj, entitiesObj) {
      const t = entitiesObj['sensor.temperatura']?.state || '—';
      card.querySelector('#temp').textContent = t + ' °C';
    }

    // Prima esecuzione
    aggiorna(hass, entities);

    // Aggiornamento quando HA cambia stato
    card.addEventListener('hass-update', e => {
      aggiorna(e.detail.hass, e.detail.entities);
    });
  </script>
```

## Variabili disponibili negli script

| Variabile | Tipo | Descrizione |
|-----------|------|-------------|
| `hass` | Object | Oggetto HA completo (`hass.states`, `hass.callService`, ecc.) |
| `entities` | Object | Entità dichiarate in `entities:` — accesso rapido per entity_id |
| `card` | HTMLElement | Elemento DOM `#hjc-content` — il contenitore del tuo HTML |
| `config` | Object | Configurazione YAML della card |
| `shadow` | ShadowRoot | Shadow DOM della card |

## Gestione aggiornamenti

La card emette un evento `hass-update` sul contenitore ogni volta che HA aggiorna lo stato delle entità, e opzionalmente ogni `update_interval` secondi.

```javascript
card.addEventListener('hass-update', e => {
  const { hass, entities } = e.detail;
  // aggiorna UI
});
```

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
          borderColor: '#1D9E75',
          tension: 0.4,
          pointRadius: 3
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

## Chiamare servizi HA

```javascript
// Esempio: premere un button
hass.callService('button', 'press', { entity_id: 'button.reset_acqua' });

// Esempio: impostare un input_number
hass.callService('input_number', 'set_value', {
  entity_id: 'input_number.soglia',
  value: 2000
});
```

## Note

- Gli script CDN vengono caricati nel documento principale (non nel shadow DOM) per renderli globali — quindi Chart.js e simili sono disponibili come globali dopo il caricamento.
- Lo shadow DOM isola il CSS, quindi gli stili che scrivi nella card non impattano sul resto della dashboard.
- Per accedere alle variabili CSS di HA usa `var(--primary-color)` ecc. — funzionano anche dentro lo shadow DOM.
