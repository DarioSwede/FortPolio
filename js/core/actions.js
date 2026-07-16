/* actions.js
   Globalt nåbara funktioner som HTML-attribut som onclick="..." kan
   anropa. Själva logiken delegeras vidare in i moduler/Layout/State.
*/
const ModuleActions = {
  setStockSymbol(id, val){
    const s = State.STOCKS.find(x => x.id === id); if(!s) return;
    s.symbol = val.trim(); s.guess = false; State.save();
  },
  setStockPrice(id, val){
    const s = State.STOCKS.find(x => x.id === id); if(!s) return;
    const num = parseFloat(val.replace(',', '.'));
    if(!isNaN(num)){ s.price = num; App.refreshAllModules(); }
  },
  setCommoditySymbol(id, val){
    const c = State.COMMODITIES.find(x => x.id === id); if(!c) return;
    c.symbol = val.trim(); State.save();
  },
  setTargetAktier(val){
    let n = parseFloat(val);
    if(isNaN(n)) n = 35;
    State.targetAktier = Math.max(0, Math.min(100, n));
    State.save();
    Layout.refreshModule('allokering');
    Overview.render();
  },

  toggleAmounts(){
    State.hideAmounts = !State.hideAmounts;
    State.save();
    App.refreshAllModules();
  },

  toggleSimpleView(){
    State.simpleView = !State.simpleView;
    State.save();
    document.getElementById('simpleViewSwitchEl').classList.toggle('on', State.simpleView);
    Layout.refreshModule('aktier');
  },

  parsePriceUpdate(){
    const raw = document.getElementById('priceInput').value;
    let matched = 0, unmatched = [];
    raw.split('\n').forEach(line => {
      const trimmed = line.trim();
      if(!trimmed) return;
      const m = trimmed.match(/^(.+?)\s+([\d]+(?:[.,]\d+)?)\s*[A-Za-z]*\s*$/);
      if(!m){ unmatched.push(trimmed); return; }
      const query = m[1].trim().toLowerCase();
      const num = parseFloat(m[2].replace(',', '.'));
      if(isNaN(num)){ unmatched.push(trimmed); return; }

      const stockMatch = State.STOCKS.find(s => s.name.toLowerCase().includes(query) || query.includes(s.name.toLowerCase().split(' ')[0]));
      const commodityMatch = !stockMatch ? State.COMMODITIES.find(c => c.name.toLowerCase().includes(query) || query.includes(c.name.toLowerCase().split(' ')[0])) : null;

      if(stockMatch){ stockMatch.price = num; matched++; }
      else if(commodityMatch){ commodityMatch.price = num; commodityMatch.status = 'ok'; matched++; }
      else { unmatched.push(trimmed); }
    });
    const stampEl = document.getElementById('pasteStamp');
    if(stampEl){
      stampEl.textContent = unmatched.length
        ? `${matched} rad(er) uppdaterade. Kunde inte matcha: ${unmatched.join(', ')}`
        : `${matched} rad(er) uppdaterade.`;
    }
    App.refreshAllModules();
  },

  parsePS(){
    const raw = document.getElementById('psInput').value;
    raw.split('\n').forEach(line => {
      const m = line.match(/^\s*(.+?)\s*P\/S\s*([\d.,]+)/i);
      if(!m) return;
      const query = m[1].trim().toLowerCase();
      const val = m[2].replace(',', '.');
      const match = State.STOCKS.find(s => s.name.toLowerCase().includes(query) || query.includes(s.name.toLowerCase().split(' ')[0]));
      if(match){ State.ps[match.id] = val.replace('.', ','); }
    });
    State.save();
    Layout.refreshModule('aktier');
  },

  openRekrypt(){ Lock.openRekrypt(); },
  closeRekrypt(){ Lock.closeRekrypt(); },
  doRekrypt(){ Lock.doRekrypt(); },

  async openSettings(){
    document.getElementById('settingsScreen').classList.remove('hidden');

    const hidden = new Set(State.hiddenModules || []);
    const listEl = document.getElementById('moduleVisibilityList');
    const entries = [
      { id:'overview', title:'Cirkeldiagram (högst upp)' },
      ...Object.values(Layout.modules).map(mod => ({ id:mod.id, title: mod.title.replace(/<[^>]*>/g,'').trim() }))
    ];
    listEl.innerHTML = entries.map(e => `
      <label class="settings-row" style="cursor:pointer; padding:8px 0;">
        <span>${e.title}</span>
        <input type="checkbox" ${hidden.has(e.id) ? '' : 'checked'} onchange="ModuleActions.toggleModuleVisibility('${e.id}')">
      </label>
    `).join('');

    const badge = document.getElementById('httpsIndicator');
    const https = NetworkInfo.isHttps();
    badge.textContent = https ? '🛡️ Krypterad (HTTPS)' : '⚠️ Okrypterad (HTTP)';
    badge.className = 'conn-badge ' + (https ? 'ok' : 'warn');

    const ipEl = document.getElementById('ipInfo');
    ipEl.textContent = 'Hämtar IP …';
    const { v4, v6 } = await NetworkInfo.fetchIPs();
    const parts = [];
    if(v4) parts.push(`IPv4: ${v4}`);
    if(v6) parts.push(`IPv6: ${v6}`);
    ipEl.textContent = parts.length ? parts.join(' · ') : 'Kunde inte hämta IP just nu.';
  },
  closeSettings(){ document.getElementById('settingsScreen').classList.add('hidden'); },

  toggleModuleVisibility(id){
    const idx = State.hiddenModules.indexOf(id);
    if(idx === -1) State.hiddenModules.push(id);
    else State.hiddenModules.splice(idx, 1);
    State.save();
    Layout.renderAll();
    Overview.render();
  },

  async copyRekryptOutput(){
    const outEl = document.getElementById('rekryptOutput');
    const btn = document.getElementById('copyRekryptBtn');
    try{
      await navigator.clipboard.writeText(outEl.value);
      const old = btn.textContent;
      btn.textContent = 'Kopierat!';
      setTimeout(() => { btn.textContent = old; }, 1500);
    }catch(e){
      outEl.select();
    }
  },

  refreshAll(){ App.refreshMarketData(); },

  addWatch(){
    const nameEl = document.getElementById('watchName');
    const symEl = document.getElementById('watchSymbol');
    const name = nameEl.value.trim();
    const symbol = symEl.value.trim();
    if(!name || !symbol) return;
    State.watchlist.push({ symbol, name, curr:'USD', price:null, prevClose:null });
    State.save();
    Layout.refreshModule('bevakning');
  },

  removeWatch(i){
    State.watchlist.splice(i, 1);
    const shifted = {};
    Object.keys(State.priceAlerts).forEach(key => {
      if(!key.startsWith('w')){ shifted[key] = State.priceAlerts[key]; return; }
      const idx = parseInt(key.slice(1), 10);
      if(idx < i) shifted[key] = State.priceAlerts[key];
      else if(idx > i) shifted['w' + (idx - 1)] = State.priceAlerts[key];
      // idx === i: bevakningen togs bort, dess alarm följer med
    });
    State.priceAlerts = shifted;
    State.save();
    Layout.refreshModule('bevakning');
  },

  setWatchAlert(i, kind, val){ this._setAlert('w' + i, kind, val); },
  setStockAlert(id, kind, val){ this._setAlert(id, kind, val); },

  _setAlert(id, kind, val){
    const num = parseFloat(String(val).replace(',', '.'));
    const alert = State.priceAlerts[id] || (State.priceAlerts[id] = {});
    if(val === '' || isNaN(num)) delete alert[kind];
    else alert[kind] = num;
    if(alert.above == null && alert.below == null) delete State.priceAlerts[id];
    State.save();
  },

  openStockDetail(id){
    const s = State.STOCKS.find(x => x.id === id);
    if(s) Layout.modules.aktier.openDetail(s);
  },
  closeStockDetail(){ document.getElementById('stockDetailScreen').classList.add('hidden'); },

  async enableNotifications(){
    const ok = await Alerts.ensurePermission();
    const statusEl = document.getElementById('notifStatus');
    if(statusEl){
      statusEl.textContent = ok
        ? '✓ Notiser tillåtna (fungerar bara medan appen är öppen i fliken)'
        : 'Notiser blockerade eller stöds inte i den här webbläsaren.';
    }
  }
};
