/* main.js
   Startpunkt. Kopplar ihop header (totalsumma, knappar) med State/Layout,
   och innehåller "Uppdatera kurser"-flödet som rör flera moduler samtidigt.
*/
const App = {
  // 1 min hade 5-dubblat anropsvolymen (~65-70 sekventiella anrop/cykel mot
  // Yahoo Finance + gratis CORS-proxy-reserver utan dokumenterade rate
  // limits) under börsens öppettider - 2 min är en rimligare kompromiss
  // mellan färskhet och risk för fler misslyckade anrop.
  OPEN_INTERVAL_MS: 2 * 60 * 1000,
  CLOSED_INTERVAL_MS: 60 * 60 * 1000,
  nextRefreshAt: null,
  autoRefreshTimer: null,
  currentIntervalMs: null,

  async start(){
    await State.load();
    this.wireHeader();
    this.refreshAllModules();
    State.recordSnapshot(this.currentTotal());
    setInterval(() => Layout.refreshModule('borsen'), 60000);
    this.scheduleNextAutoRefresh();
    this.updateMarketIndicator();
    setInterval(() => { this.updateCountdownDisplay(); this.updateMarketIndicator(); }, 1000);
  },

  stockholmIsOpen(){
    const ex = State.EXCHANGES.find(e => e.name.includes('Stockholm'));
    return ex ? Market.exchangeStatus(ex).isOpen : false;
  },

  scheduleNextAutoRefresh(){
    if(this.autoRefreshTimer) clearTimeout(this.autoRefreshTimer);
    const interval = this.stockholmIsOpen() ? this.OPEN_INTERVAL_MS : this.CLOSED_INTERVAL_MS;
    this.currentIntervalMs = interval;
    this.nextRefreshAt = Date.now() + interval;
    this.autoRefreshTimer = setTimeout(() => {
      const btn = document.getElementById('refreshBtn');
      if(!btn.disabled) this.refreshMarketData();
    }, interval);
    this.updateCountdownDisplay();
  },

  // Bar som fylls i grönt i takt med att tiden går mot nästa uppdatering,
  // med nedräkningen skriven direkt i baren istället för en separat siffra.
  updateCountdownDisplay(){
    const fill = document.getElementById('refreshBarFill');
    const time = document.getElementById('refreshBarTime');
    if(!fill || !time || this.nextRefreshAt == null) return;
    const remaining = Math.max(0, this.nextRefreshAt - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    time.textContent = `${mins}:${String(secs).padStart(2,'0')}`;
    const total = this.currentIntervalMs || 1;
    const progress = Math.min(1, Math.max(0, 1 - remaining / total));
    fill.style.width = (progress * 100) + '%';
  },

  // Badge för "Svenska börsen öppen/stängd" - egen, väl synlig rad i toppen
  // istället för att vara ihopskriven med nedräkningstexten.
  updateMarketIndicator(){
    const el = document.getElementById('marketIndicator');
    if(!el) return;
    const open = this.stockholmIsOpen();
    el.innerHTML = `<span class="status-dot ${open ? 'open' : 'closed'}"></span>${open ? 'Svenska börsen öppen' : 'Svenska börsen stängd'}`;
    el.classList.toggle('open', open);
    el.classList.toggle('closed', !open);
  },

  // Aktier/fonder var för sig (samma underlag som currentTotal() summerar),
  // så header kan visa både totalen och hur den fördelar sig.
  holdingsBreakdown(){
    const aktier = State.STOCKS.filter(s => s.curr === 'SEK').reduce((sum,s) => sum + s.price*s.antal, 0);
    const fonder = State.FUNDS.reduce((sum,f) => sum + f.varde, 0);
    return { aktier, fonder, total: aktier + fonder };
  },

  currentTotal(){
    return this.holdingsBreakdown().total;
  },

  wireHeader(){
    document.getElementById('refreshBtn').addEventListener('click', () => this.refreshMarketData());
    document.getElementById('switchEl').addEventListener('click', () => ModuleActions.toggleAmounts());
    document.getElementById('simpleViewSwitchEl').addEventListener('click', () => ModuleActions.toggleSimpleView());
  },

  refreshAllModules(){
    Layout.renderAll();
    Overview.render();
    this.updateHeaderTotals();
  },

  updateHeaderTotals(){
    const stockCostSEK = State.STOCKS.filter(s => s.curr === 'SEK' && s.gav > 0).reduce((sum,s) => sum + s.gav*s.antal, 0);
    const fundCost = State.FUNDS.reduce((sum,f) => sum + f.kostnad, 0);
    const { aktier, fonder, total } = this.holdingsBreakdown();
    const cost = stockCostSEK + fundCost;

    document.getElementById('totalValue').textContent = Format.amount(total) + (State.hideAmounts ? '' : ' *');
    const diff = total - cost;
    const pct = (diff / cost) * 100;
    const sign = pct >= 0 ? '+' : '';
    const el = document.getElementById('totalChange');
    el.textContent = `${sign}${pct.toFixed(1).replace('.', ',')}% · ${sign}${Format.amount(Math.abs(diff))} sen köp`;
    el.classList.toggle('neg', pct < 0);

    document.getElementById('totalAktierValue').textContent = Format.amount(aktier);
    document.getElementById('totalFonderValue').textContent = Format.amount(fonder);

    document.getElementById('hideLabel').textContent = State.hideAmounts ? 'Endast kurser' : 'Visa belopp';
    document.getElementById('switchEl').classList.toggle('on', State.hideAmounts);
    document.getElementById('simpleViewSwitchEl').classList.toggle('on', State.simpleView);
  },

  async refreshMarketData(){
    const btn = document.getElementById('refreshBtn');
    btn.disabled = true; btn.textContent = '↻ Uppdaterar …';
    let okCount = 0, failCount = 0;

    // Råvaror och valutor hämtas allra först - de är en liten fast grupp
    // (10 anrop totalt) men hamnade tidigare sist i en lång sekventiell kö
    // av 50+ anrop (aktier + historik + OMXS30-listan), så om en gratis
    // CORS-proxy började strypa/rate-limita hann de aldrig uppdateras trots
    // att aktierna längre fram redan hade lyckats.
    for(const c of State.COMMODITIES){
      if(!c.symbol) continue;
      try{
        const meta = await Market.fetchQuote(c.symbol);
        const q = Market.normalizeQuote(meta);
        c.price = q.price;
        c.prevClose = q.prevClose;
        c.status = 'ok';
        okCount++;
      }catch(e){ c.status = 'error'; failCount++; }
    }
    for(const c of State.CURRENCIES){
      if(!c.symbol) continue;
      try{
        const meta = await Market.fetchQuote(c.symbol);
        const q = Market.normalizeQuote(meta);
        c.price = q.price;
        c.prevClose = q.prevClose;
        c.status = 'ok';
        okCount++;
      }catch(e){ c.status = 'error'; failCount++; }
      // Årstrenden bygger på en extra historik-hämtning (1 stängningskurs
      // per månad senaste året) - bara för valutor, inte kritiskt om den
      // misslyckas, räknas inte separat.
      try{
        const hist = await Market.fetchHistory(c.symbol, '1y', '1mo');
        if(hist && hist.length) c.yearAgoPrice = hist[0];
      }catch(e){ /* årstrend inte tillgänglig just nu */ }
    }

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
        okCount++;
      }catch(e){ failCount++; /* lämna senaste kända pris orört */ }
      try{ w.sparkline = await Market.fetchHistory(w.symbol); }
      catch(e){ /* ingen graf just nu */ }
    }
    for(const s of State.OMXS30_LIST){
      if(!s.symbol) continue;
      try{
        const meta = await Market.fetchQuote(s.symbol);
        const prev = meta.chartPreviousClose ?? meta.previousClose;
        if(prev) s.changePct = ((meta.regularMarketPrice - prev) / prev) * 100;
        okCount++;
      }catch(e){ failCount++; /* hoppa över just den här */ }
    }
    try{
      const { meta, symbolUsed } = await Market.fetchQuoteWithFallbacks(State.OMX_CANDIDATES);
      State.omxData.value = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose ?? meta.previousClose;
      State.omxData.changePct = prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : null;
      State.omxData.symbolUsed = symbolUsed;
      State.omxData.status = 'ok';
      okCount++;
    }catch(e){ State.omxData.status = 'error'; failCount++; }

    this.refreshAllModules();
    State.recordSnapshot(this.currentTotal());
    const time = new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'});
    // Bara nämna misslyckade poster om det faktiskt förekom några - annars
    // tar "0 misslyckades av X poster" bara plats i onödan.
    const summary = failCount > 0
      ? `${okCount} ok, ${failCount} misslyckades av ${okCount+failCount} poster`
      : `${okCount} ok`;
    document.getElementById('stamp').textContent = `Senast uppdaterat: ${time} (${summary})`;
    btn.disabled = false; btn.textContent = '↻ Uppdatera kurser';
    this.scheduleNextAutoRefresh();
  }
};
