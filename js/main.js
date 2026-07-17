/* main.js
   Startpunkt. Kopplar ihop header (totalsumma, knappar) med State/Layout.
   Live-datahämtning sker per modul (se resp. modulfils onRefresh) - den här
   filen håller bara ihop den automatiska bakgrundsuppdateringen som kör
   alla kategorier i tur och ordning, plus header-vyn.
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
    Redeye.init();
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

  // Ingen global "Uppdatera kurser"-knapp längre - varje modul har sin egen
  // (se layout.js/onRefresh). Den här timern kör en tyst bakgrundsuppdatering
  // av allt, om den inte är pausad genom att klicka på uppdaterings-baren.
  scheduleNextAutoRefresh(){
    if(this.autoRefreshTimer) clearTimeout(this.autoRefreshTimer);
    if(State.autoRefreshPaused){
      this.nextRefreshAt = null;
      this.updateCountdownDisplay();
      return;
    }
    const interval = this.stockholmIsOpen() ? this.OPEN_INTERVAL_MS : this.CLOSED_INTERVAL_MS;
    this.currentIntervalMs = interval;
    this.nextRefreshAt = Date.now() + interval;
    this.autoRefreshTimer = setTimeout(() => this.refreshAllMarketData(), interval);
    this.updateCountdownDisplay();
  },

  // Bar som fylls i grönt i takt med att tiden går mot nästa uppdatering,
  // med nedräkningen skriven direkt i baren istället för en separat siffra.
  // Baren är själv på/av-knappen för auto-uppdatering (klick i index.html) -
  // ingen separat växel bredvid den.
  updateCountdownDisplay(){
    const bar = document.getElementById('refreshBar');
    const fill = document.getElementById('refreshBarFill');
    const time = document.getElementById('refreshBarTime');
    if(!bar || !fill || !time) return;
    bar.classList.toggle('paused', State.autoRefreshPaused);
    if(State.autoRefreshPaused || this.nextRefreshAt == null){
      fill.style.width = '0%';
      time.textContent = 'Pausad';
      return;
    }
    const remaining = Math.max(0, this.nextRefreshAt - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    time.textContent = `${mins}:${String(secs).padStart(2,'0')}`;
    const total = this.currentIntervalMs || 1;
    const progress = Math.min(1, Math.max(0, 1 - remaining / total));
    fill.style.width = (progress * 100) + '%';
  },

  // Svensk flagga i färg när börsen är öppen, gråtonad när den är stängd -
  // egen väl synlig rad i toppen istället för ihopskriven med annan text.
  updateMarketIndicator(){
    const el = document.getElementById('marketIndicator');
    if(!el) return;
    const open = this.stockholmIsOpen();
    el.innerHTML = `<span class="market-flag${open ? '' : ' closed'}">🇸🇪</span>${open ? 'Svenska börsen öppen' : 'Svenska börsen stängd'}`;
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
    document.getElementById('hideAmountsSwitchEl').addEventListener('click', () => ModuleActions.toggleAmounts());
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

    // Etiketten är ett statiskt "Visa belopp" i Inställningar nu (inte längre
    // dynamisk text bredvid en knapp i headern) - så växeln ska stå PÅ när
    // beloppen faktiskt syns, dvs. inverterat mot hideAmounts-flaggan.
    document.getElementById('hideAmountsSwitchEl').classList.toggle('on', !State.hideAmounts);
    document.getElementById('simpleViewSwitchEl').classList.toggle('on', State.simpleView);
  },

  // --- Live-hämtning, en kategori i taget. Anropas antingen från en enskild
  // modul (dess egen ↻-knapp, se layout.js) eller i tur och ordning av
  // refreshAllMarketData() (bakgrundstimern). Returnerar { ok, fail } så
  // uppdateringsknappen kan visa en liten stämpel. Loopen/räkningen sköts av
  // Market.fetchEach() - här sätts bara vad som är specifikt för kategorin.

  async refreshCommodities(){
    const result = await Market.fetchEach(State.COMMODITIES,
      async c => {
        const q = Market.normalizeQuote(await Market.fetchQuote(c.symbol));
        c.price = q.price; c.prevClose = q.prevClose; c.status = 'ok';
      },
      c => { c.status = 'error'; }
    );
    Layout.refreshModule('ravaror');
    return result;
  },

  async refreshCurrencies(){
    const result = await Market.fetchEach(State.CURRENCIES,
      async c => {
        const q = Market.normalizeQuote(await Market.fetchQuote(c.symbol));
        c.price = q.price; c.prevClose = q.prevClose; c.status = 'ok';
        // Årstrenden bygger på en extra historik-hämtning, inte kritisk om
        // den misslyckas - påverkar inte ok/fail för själva kursen.
        try{
          const hist = await Market.fetchHistory(c.symbol, '1y', '1mo');
          if(hist && hist.length) c.yearAgoPrice = hist[0];
        }catch(e){ /* årstrend inte tillgänglig just nu */ }
      },
      c => { c.status = 'error'; }
    );
    Layout.refreshModule('valutor');
    return result;
  },

  async refreshStocks(){
    const result = await Market.fetchEach(State.STOCKS, async s => {
      // Sparklinen hämtas alltid, även om själva kursen misslyckas - de är
      // oberoende anrop och en lyckad historik är värd att visa ändå.
      // quoteErr kastas på nytt sist så fetchEach:s ok/fail speglar kursen.
      let quoteErr = null;
      try{ s.price = Market.normalizeQuote(await Market.fetchQuote(s.symbol)).price; }
      catch(e){ quoteErr = e; }
      try{ s.sparkline = await Market.fetchHistory(s.symbol); }
      catch(e){ /* ingen graf just nu - inte kritiskt */ }
      if(quoteErr) throw quoteErr;
    });
    Layout.refreshModule('aktier');
    Overview.render();
    this.updateHeaderTotals();
    return result;
  },

  async refreshWatchlist(){
    const result = await Market.fetchEach(State.watchlist, async w => {
      // Samma resonemang som refreshStocks: sparklinen hämtas oberoende av
      // om kursen lyckas, och lämnar senaste kända pris orört vid fel.
      let quoteErr = null;
      try{
        const q = Market.normalizeQuote(await Market.fetchQuote(w.symbol));
        w.price = q.price; w.prevClose = q.prevClose; w.curr = q.currency || w.curr;
      }catch(e){ quoteErr = e; }
      try{ w.sparkline = await Market.fetchHistory(w.symbol); }
      catch(e){ /* ingen graf just nu */ }
      if(quoteErr) throw quoteErr;
    });
    Layout.refreshModule('bevakning');
    return result;
  },

  async refreshOMXS30(){
    const result = await Market.fetchEach(State.OMXS30_LIST, async s => {
      const meta = await Market.fetchQuote(s.symbol);
      const prev = meta.chartPreviousClose ?? meta.previousClose;
      if(prev) s.changePct = ((meta.regularMarketPrice - prev) / prev) * 100;
    });
    Layout.refreshModule('vinnareforlorare');
    return result;
  },

  async refreshOMXIndex(){
    let ok = 0, fail = 0;
    try{
      const { meta, symbolUsed } = await Market.fetchQuoteWithFallbacks(State.OMX_CANDIDATES);
      State.omxData.value = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose ?? meta.previousClose;
      State.omxData.changePct = prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : null;
      State.omxData.symbolUsed = symbolUsed;
      State.omxData.status = 'ok';
      ok++;
    }catch(e){ State.omxData.status = 'error'; fail++; }
    Layout.refreshModule('borsen');
    return { ok, fail };
  },

  // Bakgrundscykeln - körs av auto-uppdateringstimern. Råvaror/valutor körs
  // först (liten fast grupp) innan de tyngre, mer utbytbara listorna
  // (aktier+historik, OMXS30) som lättare kan trigga rate-limiting hos de
  // fria CORS-proxyerna.
  async refreshAllMarketData(){
    const results = [
      await this.refreshCommodities(),
      await this.refreshCurrencies(),
      await this.refreshStocks(),
      await this.refreshWatchlist(),
      await this.refreshOMXS30(),
      await this.refreshOMXIndex(),
    ];
    const ok = results.reduce((sum, r) => sum + r.ok, 0);
    const fail = results.reduce((sum, r) => sum + r.fail, 0);
    State.recordSnapshot(this.currentTotal());
    const time = new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'});
    const summary = fail > 0
      ? `${ok} ok, ${fail} misslyckades av ${ok+fail} poster`
      : `${ok} ok`;
    const stampEl = document.getElementById('stamp');
    if(stampEl) stampEl.textContent = `Senast auto-uppdaterat: ${time} (${summary})`;
    this.scheduleNextAutoRefresh();
  }
};
