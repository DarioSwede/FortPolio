/* state.js
   Enda källan till delat state. Moduler läser/skriver via State-objektet
   istället för att ha egna globala variabler, så data hänger ihop.
*/
const State = {
  STOCKS: [],
  FUNDS: [],
  COMMODITIES: DATA.COMMODITIES,   // inte känsligt, laddas direkt från data.js
  EXCHANGES: DATA.EXCHANGES,
  OMX_CANDIDATES: DATA.OMX_CANDIDATES,
  OMXS30_LIST: DATA.OMXS30_LIST,

  // Valutor mot SEK (bitcoin i USD, som råvarorna visas i sin egen valuta
  // utan konvertering). Inte känsligt.
  CURRENCIES: [
    { name:'Dollar', symbol:'USDSEK=X', unit:'SEK' },
    { name:'Pund', symbol:'GBPSEK=X', unit:'SEK' },
    { name:'Euro', symbol:'EURSEK=X', unit:'SEK' },
    { name:'Bitcoin', symbol:'BTC-USD', unit:'USD' }
  ],

  ps: {},
  hideAmounts: false,
  simpleView: false,
  activeFilter: { kind:'all', value:null },
  targetAktier: 35,
  omxData: { value:null, changePct:null, status:'idle', symbolUsed:null },
  veckansTips: [],

  // Bevakningslista: aktier man följer utan att äga. Inte känsligt (ingen
  // innehavsstorlek), sparas okrypterat precis som råvaru-symbolerna.
  watchlist: [
    { symbol:'SMR', name:'NuScale Power', curr:'USD', price:null, prevClose:null }
  ],

  // Prisalarm: id -> { above?: number, below?: number }. id är s0/s1... för
  // innehav eller w0/w1... för bevakningslistan.
  priceAlerts: {},

  // Lokal historik - enda sättet att visa "över tid" i en app utan backend.
  // Börjar tomt och växer fram efter hand som du öppnar appen/uppdaterar kurser.
  valueHistory: [],   // [{t: isoDate, total: number}]
  fundHistory: {},    // fundId -> [{t: isoDate, varde: number}]

  // Layout: ett rutnät på 48 kolumner. Varje modul har en colSpan (bredd,
  // 1-48) och kan valfritt ha en fast height i px (annars auto efter
  // innehåll). order styr både dra-och-släpp-ordningen och var modulen
  // hamnar i rutnätets "dense"-packning - fri placering utan att moduler
  // behöver låsas ihop i grupper.
  layout: {
    order: ['borsen','aktier','fonder','ravaror','bevakning','allokering','historik','vinnareforlorare','valutor','utdelning','veckanstips'],
    colSpans: { borsen:7, aktier:17, fonder:24 }, // saknas nyckel = modulens defaultColSpan
    heights: {} // t.ex. { borsen: 640 } - saknas nyckel = auto (innehållsstyrd höjd)
  },

  // Moduler (och 'overview', de tre fördelningsstaplarna högst upp) som är
  // dolda via inställningar. Allokering-kortet är dolt som standard - dess
  // mål-fält finns istället direkt i Inställningar.
  hiddenModules: ['allokering'],

  assignIds(){
    this.STOCKS.forEach((s,i) => s.id = "s"+i);
    this.FUNDS.forEach((f,i) => f.id = "f"+i);
    // COMMODITIES saknade id helt tidigare - alla rader delade samma
    // "undefined", så symbolredigering aldrig sparades och (nu) expandera-
    // vid-klick skulle råka expandera alla rader på en gång.
    this.COMMODITIES.forEach((c,i) => c.id = "c"+i);
    this.CURRENCIES.forEach((c,i) => c.id = "cur"+i);
  },

  async load(){
    try{
      const r = await Storage.get('portfolio-state');
      if(r && r.value){
        const st = JSON.parse(r.value);
        if(st.symbols){ this.STOCKS.forEach(s => { if(st.symbols[s.id] !== undefined) s.symbol = st.symbols[s.id]; }); }
        if(st.commoditySymbols){ this.COMMODITIES.forEach(c => { if(st.commoditySymbols[c.id] !== undefined) c.symbol = st.commoditySymbols[c.id]; }); }
        if(st.currencySymbols){ this.CURRENCIES.forEach(c => { if(st.currencySymbols[c.id] !== undefined) c.symbol = st.currencySymbols[c.id]; }); }
        this.ps = st.ps || {};
        this.hideAmounts = !!st.hideAmounts;
        this.simpleView = !!st.simpleView;
        if(st.targetAktier !== undefined) this.targetAktier = st.targetAktier;
        if(st.layout){
          this.layout = st.layout;
          if(!this.layout.colSpans) this.layout.colSpans = (st.layout.widths ? {} : { borsen:7, aktier:17, fonder:24 });
          // Migrering: colSpans sparade mot det gamla 48-kolumners rutnätet
          // (grid-column) är dubbelt så stora i det nya 24-kolumners masonry-
          // schemat - skala ner en gång så bredderna inte klipps till 100%.
          const maxSpan = Math.max(0, ...Object.values(this.layout.colSpans));
          if(maxSpan > Layout.UNIT_COLS){
            Object.keys(this.layout.colSpans).forEach(id => {
              this.layout.colSpans[id] = Math.max(1, Math.round(this.layout.colSpans[id] / 2));
            });
          }
          if(!this.layout.heights) this.layout.heights = {};
          delete this.layout.groups; // ersatt av fri placering i rutnätet
        }
        if(st.hiddenModules) this.hiddenModules = st.hiddenModules;
        if(st.veckansTips) this.veckansTips = st.veckansTips;
        if(st.watchlist) this.watchlist = st.watchlist.map(w => ({ ...w, price:null, prevClose:null }));
        if(st.priceAlerts) this.priceAlerts = st.priceAlerts;
        if(st.valueHistory) this.valueHistory = st.valueHistory;
        if(st.fundHistory) this.fundHistory = st.fundHistory;
      }
    }catch(e){ /* inget sparat än, kör med defaults */ }

    // En tidigare sparad layout känner inte till moduler som lagts till sen
    // dess (t.ex. bevakningslista/historik/utdelning) - lägg till dem sist
    // istället för att de aldrig visas för en återvändande användare.
    Object.keys(Layout.modules).forEach(id => {
      if(!this.layout.order.includes(id)) this.layout.order.push(id);
    });
  },

  async save(){
    const symbols = {}; this.STOCKS.forEach(s => symbols[s.id] = s.symbol);
    const commoditySymbols = {}; this.COMMODITIES.forEach(c => commoditySymbols[c.id] = c.symbol);
    const currencySymbols = {}; this.CURRENCIES.forEach(c => currencySymbols[c.id] = c.symbol);
    const watchlist = this.watchlist.map(w => ({ symbol:w.symbol, name:w.name, curr:w.curr }));
    const payload = JSON.stringify({
      symbols, commoditySymbols, currencySymbols, ps:this.ps, hideAmounts:this.hideAmounts, simpleView:this.simpleView,
      targetAktier:this.targetAktier, layout:this.layout, veckansTips:this.veckansTips, hiddenModules:this.hiddenModules,
      watchlist, priceAlerts:this.priceAlerts, valueHistory:this.valueHistory, fundHistory:this.fundHistory
    });
    await Storage.set('portfolio-state', payload);
  },

  // Sparar en ögonblicksbild av totalvärdet + varje fonds NAV. Anropas vid
  // uppstart och efter "Uppdatera kurser" - så historiken växer fram av sig
  // själv i takt med att appen faktiskt används. Max en punkt per timme och
  // max 500 punkter, så det inte växer obegränsat i localStorage.
  recordSnapshot(totalValue){
    const now = new Date().toISOString();
    const hourKey = now.slice(0,13);
    const lastHour = this.valueHistory.length ? this.valueHistory[this.valueHistory.length-1].t.slice(0,13) : null;
    if(hourKey === lastHour) this.valueHistory[this.valueHistory.length-1] = { t:now, total:totalValue };
    else this.valueHistory.push({ t:now, total:totalValue });
    if(this.valueHistory.length > 500) this.valueHistory.shift();

    this.FUNDS.forEach(f => {
      const hist = this.fundHistory[f.id] || (this.fundHistory[f.id] = []);
      const lastFundHour = hist.length ? hist[hist.length-1].t.slice(0,13) : null;
      if(hourKey === lastFundHour) hist[hist.length-1] = { t:now, varde:f.varde };
      else hist.push({ t:now, varde:f.varde });
      if(hist.length > 500) hist.shift();
    });

    this.save();
  }
};
