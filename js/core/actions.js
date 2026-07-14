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

  refreshAll(){ App.refreshMarketData(); }
};
