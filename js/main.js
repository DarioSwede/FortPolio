/* main.js
   Startpunkt. Kopplar ihop header (totalsumma, knappar) med State/Layout,
   och innehåller "Uppdatera kurser"-flödet som rör flera moduler samtidigt.
*/
const App = {
  OPEN_INTERVAL_MS: 5 * 60 * 1000,
  CLOSED_INTERVAL_MS: 60 * 60 * 1000,
  nextRefreshAt: null,
  autoRefreshTimer: null,

  async start(){
    await State.load();
    this.wireHeader();
    this.refreshAllModules();
    State.recordSnapshot(this.currentTotal());
    setInterval(() => Layout.refreshModule('borsen'), 60000);
    this.scheduleNextAutoRefresh();
    setInterval(() => this.updateCountdownDisplay(), 1000);
  },

  stockholmIsOpen(){
    const ex = State.EXCHANGES.find(e => e.name.includes('Stockholm'));
    return ex ? Market.exchangeStatus(ex).isOpen : false;
  },

  scheduleNextAutoRefresh(){
    if(this.autoRefreshTimer) clearTimeout(this.autoRefreshTimer);
    const interval = this.stockholmIsOpen() ? this.OPEN_INTERVAL_MS : this.CLOSED_INTERVAL_MS;
    this.nextRefreshAt = Date.now() + interval;
    this.autoRefreshTimer = setTimeout(() => {
      const btn = document.getElementById('refreshBtn');
      if(!btn.disabled) this.refreshMarketData();
    }, interval);
    this.updateCountdownDisplay();
  },

  updateCountdownDisplay(){
    const el = document.getElementById('autoRefreshStatus');
    if(!el || this.nextRefreshAt == null) return;
    const remaining = Math.max(0, this.nextRefreshAt - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const timeStr = `${mins}:${String(secs).padStart(2,'0')}`;
    const open = this.stockholmIsOpen();
    el.innerHTML = `<span class="status-dot ${open ? 'open' : 'closed'}"></span>${open ? 'Börsen öppen' : 'Börsen stängd'} · nästa uppdatering om ${timeStr}`;
  },

  currentTotal(){
    const stockValueSEK = State.STOCKS.filter(s => s.curr === 'SEK').reduce((sum,s) => sum + s.price*s.antal, 0);
    const fundValue = State.FUNDS.reduce((sum,f) => sum + f.varde, 0);
    return stockValueSEK + fundValue;
  },

  wireHeader(){
    document.getElementById('refreshBtn').addEventListener('click', () => this.refreshMarketData());
    document.getElementById('switchEl').addEventListener('click', () => ModuleActions.toggleAmounts());
    document.getElementById('simpleViewSwitchEl').addEventListener('click', () => ModuleActions.toggleSimpleView());
  },

  refreshAllModules(){
    Layout.renderAll();
    this.updateHeaderTotals();
  },

  updateHeaderTotals(){
    const stockCostSEK = State.STOCKS.filter(s => s.curr === 'SEK' && s.gav > 0).reduce((sum,s) => sum + s.gav*s.antal, 0);
    const fundCost = State.FUNDS.reduce((sum,f) => sum + f.kostnad, 0);
    const total = this.currentTotal();
    const cost = stockCostSEK + fundCost;

    document.getElementById('totalValue').textContent = Format.amount(total) + (State.hideAmounts ? '' : ' *');
    const diff = total - cost;
    const pct = (diff / cost) * 100;
    const sign = pct >= 0 ? '+' : '';
    const el = document.getElementById('totalChange');
    el.textContent = `${sign}${pct.toFixed(1).replace('.', ',')}% · ${sign}${Format.amount(Math.abs(diff))} sen köp`;
    el.classList.toggle('neg', pct < 0);

    document.getElementById('hideLabel').textContent = State.hideAmounts ? 'Endast kurser' : 'Visa belopp';
    document.getElementById('switchEl').classList.toggle('on', State.hideAmounts);
    document.getElementById('simpleViewSwitchEl').classList.toggle('on', State.simpleView);
  },

  async refreshMarketData(){
    const btn = document.getElementById('refreshBtn');
    btn.disabled = true; btn.textContent = '↻ Uppdaterar …';
    let okCount = 0, failCount = 0;

    for(const s of State.STOCKS){
      if(!s.symbol) continue;
      try{
        const meta = await Market.fetchQuote(s.symbol);
        const q = Market.normalizeQuote(meta);
        s.price = q.price;
        okCount++;
      }catch(e){ failCount++; }
      try{ s.sparkline = await Market.fetchHistory(s.symbol); }
      catch(e){ /* ingen graf just nu - inte kritiskt */ }
    }
    for(const w of State.watchlist){
      if(!w.symbol) continue;
      try{
        const meta = await Market.fetchQuote(w.symbol);
        const q = Market.normalizeQuote(meta);
        w.price = q.price;
        w.prevClose = q.prevClose;
        w.curr = q.currency || w.curr;
      }catch(e){ /* lämna senaste kända pris orört */ }
      try{ w.sparkline = await Market.fetchHistory(w.symbol); }
      catch(e){ /* ingen graf just nu */ }
    }
    for(const c of State.COMMODITIES){
      if(!c.symbol) continue;
      try{
        const meta = await Market.fetchQuote(c.symbol);
        const q = Market.normalizeQuote(meta);
        c.price = q.price;
        c.prevClose = q.prevClose;
        c.status = 'ok';
      }catch(e){ c.status = 'error'; }
    }
    for(const s of State.OMXS30_LIST){
      if(!s.symbol) continue;
      try{
        const meta = await Market.fetchQuote(s.symbol);
        const prev = meta.chartPreviousClose ?? meta.previousClose;
        if(prev) s.changePct = ((meta.regularMarketPrice - prev) / prev) * 100;
      }catch(e){ /* hoppa över just den här */ }
    }
    try{
      const { meta, symbolUsed } = await Market.fetchQuoteWithFallbacks(State.OMX_CANDIDATES);
      State.omxData.value = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose ?? meta.previousClose;
      State.omxData.changePct = prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : null;
      State.omxData.symbolUsed = symbolUsed;
      State.omxData.status = 'ok';
    }catch(e){ State.omxData.status = 'error'; }

    this.refreshAllModules();
    State.recordSnapshot(this.currentTotal());
    document.getElementById('stamp').textContent =
      `Senast uppdaterat: ${new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})} (${okCount} ok, ${failCount} misslyckades)`;
    btn.disabled = false; btn.textContent = '↻ Uppdatera kurser';
    this.scheduleNextAutoRefresh();
  }
};
