/**
 * html-js-card
 * Una custom card per Home Assistant che permette di usare
 * HTML, CSS e JavaScript arbitrario direttamente dal YAML Lovelace.
 *
 * Autore: generata con Claude / Amira
 * Repository: /config/www/html-js-card/
 *
 * Configurazione YAML esempio:
 *
 *   type: custom:html-js-card
 *   title: La mia card             # opzionale
 *   height: 400px                  # opzionale, default auto
 *   entities:                      # opzionale, lista entità da iniettare
 *     - sensor.temperatura
 *     - input_number.soglia
 *   scripts:                       # opzionale, CDN esterni da caricare
 *     - https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js
 *   content: |
 *     <div id="mia-card">...</div>
 *     <script>
 *       // Variabili disponibili automaticamente:
 *       // - hass       → oggetto Home Assistant completo
 *       // - entities   → { 'sensor.temperatura': { state, attributes, ... } }
 *       // - card       → elemento DOM della card
 *       console.log(hass.states['sensor.temperatura'].state);
 *     </script>
 */

class HtmlJsCard extends HTMLElement {

  constructor() {
    super();
    this._hass = null;
    this._config = null;
    this._initialized = false;
    this._scriptsLoaded = false;
    this._updateTimer = null;
    this.attachShadow({ mode: 'open' });
  }

  // ── Configurazione dal YAML ──────────────────────────────────────────────
  setConfig(config) {
    if (!config.content) {
      throw new Error('html-js-card: il campo "content" è obbligatorio.');
    }
    this._config = config;
    this._initialized = false;
    this._scriptsLoaded = false;
    this._render();
  }

  // ── Ricezione stato HA ───────────────────────────────────────────────────
  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._render();
    } else {
      this._updateEntities();
    }
  }

  // ── Altezza card (per il layout Lovelace) ────────────────────────────────
  getCardSize() {
    const h = parseInt(this._config?.height || '200');
    return Math.ceil(h / 50);
  }

  // ── Render principale ────────────────────────────────────────────────────
  async _render() {
    if (!this._config || !this._hass) return;

    const config = this._config;
    const shadow = this.shadowRoot;

    // Struttura base
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--primary-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
        }
        ha-card {
          overflow: hidden;
          height: ${config.height || 'auto'};
        }
        .card-header {
          display: flex;
          align-items: center;
          padding: 12px 16px 0;
          font-size: 14px;
          font-weight: 500;
          color: var(--primary-text-color);
          letter-spacing: 0.01em;
        }
        .card-content {
          padding: ${config.padding !== undefined ? config.padding : '12px 16px 16px'};
          height: ${config.height ? 'calc(100% - ' + (config.title ? '44px' : '0px') + ')' : 'auto'};
          box-sizing: border-box;
          overflow: ${config.overflow || 'hidden'};
        }
        #hjc-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 60px;
          color: var(--secondary-text-color);
          font-size: 13px;
          gap: 8px;
        }
        #hjc-loading::before {
          content: '';
          width: 14px; height: 14px;
          border: 2px solid var(--divider-color);
          border-top-color: var(--primary-color);
          border-radius: 50%;
          animation: hjc-spin 0.8s linear infinite;
        }
        @keyframes hjc-spin { to { transform: rotate(360deg); } }
        #hjc-error {
          background: var(--error-color, #a32d2d);
          color: #fff;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 12px;
          line-height: 1.5;
          display: none;
        }
      </style>
      <ha-card>
        ${config.title ? `<div class="card-header">${config.title}</div>` : ''}
        <div class="card-content">
          <div id="hjc-loading">Caricamento...</div>
          <div id="hjc-error"></div>
          <div id="hjc-content" style="display:none; height:100%;"></div>
        </div>
      </ha-card>
    `;

    // Carica script esterni se presenti
    if (config.scripts && config.scripts.length > 0 && !this._scriptsLoaded) {
      try {
        await this._loadScripts(config.scripts);
        this._scriptsLoaded = true;
      } catch(e) {
        this._showError('Errore caricamento script: ' + e.message);
        return;
      }
    } else {
      this._scriptsLoaded = true;
    }

    this._injectContent();
  }

  // ── Carica script CDN esterni ────────────────────────────────────────────
  _loadScripts(urls) {
    return Promise.all(urls.map(url => new Promise((resolve, reject) => {
      // Evita di ricaricare script già presenti nel documento principale
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve(); return;
      }
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Impossibile caricare: ${url}`));
      // Aggiunge al documento principale (non al shadow) per renderlo globale
      document.head.appendChild(s);
    })));
  }

  // ── Inietta HTML e JavaScript del content ───────────────────────────────
  _injectContent() {
    const shadow = this.shadowRoot;
    const loading = shadow.getElementById('hjc-loading');
    const contentDiv = shadow.getElementById('hjc-content');
    const config = this._config;

    try {
      // Separa HTML da script
      const { html, scripts } = this._parseContent(config.content);

      // Inietta HTML
      contentDiv.innerHTML = html;
      contentDiv.style.display = 'block';
      loading.style.display = 'none';

      // Costruisci oggetto entities
      const entities = this._buildEntities();

      // Esegui tutti gli script con il contesto HA iniettato
      scripts.forEach(scriptCode => {
        this._executeScript(scriptCode, entities, contentDiv);
      });

      this._initialized = true;

      // Imposta aggiornamento automatico se configurato
      if (config.update_interval) {
        this._startAutoUpdate(config.update_interval);
      }

    } catch(e) {
      console.error('html-js-card error:', e);
      this._showError(e.message);
    }
  }

  // ── Separa HTML dagli script nel content ────────────────────────────────
  _parseContent(content) {
    const scripts = [];
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptRegex.exec(content)) !== null) {
      scripts.push(match[1]);
    }

    const html = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    return { html, scripts };
  }

  // ── Costruisce oggetto entities dall'elenco in config ───────────────────
  _buildEntities() {
    const entities = {};
    if (this._config.entities && this._hass) {
      this._config.entities.forEach(entityId => {
        if (this._hass.states[entityId]) {
          entities[entityId] = this._hass.states[entityId];
        }
      });
    }
    return entities;
  }

  // ── moreInfo — spara dall'host element (fuori dal shadow DOM) ─────────────
  _moreInfo(entityId) {
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId }
    }));
  }

  // ── Esegue uno script con variabili HA iniettate ────────────────────────
  _executeScript(code, entities, contentEl) {
    try {
      // Wrap in funzione con variabili disponibili:
      // - hass      → oggetto HA completo
      // - entities  → entità dichiarate in config
      // - card      → elemento DOM #hjc-content
      // - config    → configurazione YAML della card
      // - shadow    → shadowRoot
      // - moreInfo  → apre popup nativo HA (entityId: string)
      const fn = new Function(
        'hass', 'entities', 'card', 'config', 'shadow', 'moreInfo',
        '"use strict";\n' + code
      );
      fn(
        this._hass,
        entities,
        contentEl,
        this._config,
        this.shadowRoot,
        this._moreInfo.bind(this)
      );
    } catch(e) {
      console.error('html-js-card script error:', e);
      this._showError('Errore script: ' + e.message);
    }
  }

  // ── Aggiorna solo le entità senza re-renderizzare tutto ─────────────────
  _updateEntities() {
    // Emette un evento custom che gli script interni possono ascoltare
    const contentEl = this.shadowRoot?.getElementById('hjc-content');
    if (!contentEl) return;

    const entities = this._buildEntities();
    const event = new CustomEvent('hass-update', {
      detail: { hass: this._hass, entities },
      bubbles: false
    });
    contentEl.dispatchEvent(event);
  }

  // ── Aggiornamento automatico ─────────────────────────────────────────────
  _startAutoUpdate(intervalSeconds) {
    if (this._updateTimer) clearInterval(this._updateTimer);
    this._updateTimer = setInterval(() => {
      const contentEl = this.shadowRoot?.getElementById('hjc-content');
      if (!contentEl) return;
      const entities = this._buildEntities();
      const event = new CustomEvent('hass-update', {
        detail: { hass: this._hass, entities },
        bubbles: false
      });
      contentEl.dispatchEvent(event);
    }, intervalSeconds * 1000);
  }

  // ── Mostra errore ────────────────────────────────────────────────────────
  _showError(msg) {
    const shadow = this.shadowRoot;
    const loading = shadow?.getElementById('hjc-loading');
    const errorDiv = shadow?.getElementById('hjc-error');
    if (loading) loading.style.display = 'none';
    if (errorDiv) {
      errorDiv.style.display = 'block';
      errorDiv.textContent = '⚠ html-js-card: ' + msg;
    }
  }

  // ── Pulizia ──────────────────────────────────────────────────────────────
  disconnectedCallback() {
    if (this._updateTimer) clearInterval(this._updateTimer);
  }
}

// ── Registrazione elemento custom ────────────────────────────────────────────
customElements.define('html-js-card', HtmlJsCard);

// ── Info per il pannello custom cards di HA ──────────────────────────────────
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'html-js-card',
  name: 'HTML + JS Card',
  description: 'Card che permette HTML, CSS e JavaScript arbitrario direttamente dal YAML Lovelace. Supporta entità HA, script CDN esterni e aggiornamento automatico.',
  preview: false,
  documentationURL: 'https://github.com/tuousername/html-js-card',
});

console.info(
  '%c HTML-JS-CARD %c v1.0.0 ',
  'background:#1D9E75;color:#fff;padding:2px 6px;border-radius:4px 0 0 4px;font-weight:600;',
  'background:#f0ede8;color:#1a1a18;padding:2px 6px;border-radius:0 4px 4px 0;'
);
