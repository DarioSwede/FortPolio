/* main.js
   Startpunkt. Kopplar ihop header (totalsumma, knappar) med State/Layout,
   och innehåller "Uppdatera kurser"-flödet som rör flera moduler samtidigt.
*/
const App = {
  async start(){
    await State.load();
    this.wireHeader();
    this.refreshAllModules();
    setInterval(() => Layout.refreshModule('borsen'), 60000);
  },

  wireHeader(){
    document.getElementById('refreshBtn').addEventListener('click', () => this.refreshMarketData());
    document.getElementById('switchEl').addEventListener('click', () => ModuleActions.toggleAmounts());
  },

  refreshAllModules(){
    Layout.renderAll();
    this.updateHeaderTotals();
  },

  updateHeaderTotals(){
    const stockValueSEK = State.STOCKS.filter(s => s.curr === 'SEK').reduce((sum,s) => sum + s.price*s.antal, 0);
    const stockCostSEK = State.STOCKS.filter(s => s.curr === 'SEK' && s.gav > 0).reduce((sum,s) => sum + s.gav*s.antal, 0);
    const fundValue = State.FUNDS.reduce((sum,f) => sum + f.varde, 0);
    const fundCost = State.FUNDS.reduce((sum,f) => sum + f.kostnad, 0);
    const total = stockValueSEK + fundValue;
    const cost = stockCostSEK + fundCost;

    document.getElementById('totalValue').textContent = Format.amount(total) + (State.hideAmounts ? '' : ' *');
    const pct = ((total - cost) / cost) * 100;
    const el = document.getElementById('totalChange');
    el.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(1).replace('.', ',') + '% sen köp';
    el.classList.toggle('neg', pct < 0);

    document.getElementById('hideLabel').textContent = State.hideAmounts ? 'Endast kurser' : 'Visa belopp';
    document.getElementById('switchEl').classList.toggle('on', State.hideAmounts);
  },

  async refreshMarketData(){
    const btn = document.getElementById('refreshBtn');
    btn.disabled = true; btn.textContent = '↻ Uppdaterar …';
    let okCount = 0, failCount = 0;

    for(const s of State.STOCKS){
      if(!s.symbol) continue;
      try{ const meta = await Market.fetchQuote(s.symbol); s.price = meta.regularMarketPrice; okCount++; }
      catch(e){ failCount++; }
    }
    for(const c of State.COMMODITIES){
      if(!c.symbol) continue;
      try{
        const meta = await Market.fetchQuote(c.symbol);
        c.price = meta.regularMarketPrice;
        c.prevClose = meta.chartPreviousClose ?? meta.previousClose;
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
    document.getElementById('stamp').textContent =
      `Senast uppdaterat: ${new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})} (${okCount} ok, ${failCount} misslyckades)`;
    btn.disabled = false; btn.textContent = '↻ Uppdatera kurser';
  }
};
