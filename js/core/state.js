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

  ps: {},
  hideAmounts: false,
  simpleView: false,
  activeFilter: { kind:'all', value:null },
  targetAktier: 35,
  omxData: { value:null, changePct:null, status:'idle', symbolUsed:null },
  veckansTips: [],

  // Layout: vilken ordning modulerna visas i, och hur breda de är (flex-basis i px)
  layout: {
    order: ['aktier','fonder','allokering','ravaror','vinnareforlorare','veckanstips','borsen'],
    widths: {} // t.ex. { aktier: 520 } - saknas nyckel = default-bredd
  },

  assignIds(){
    this.STOCKS.forEach((s,i) => s.id = "s"+i);
    this.FUNDS.forEach((f,i) => f.id = "f"+i);
  },

  async load(){
    try{
      const r = await Storage.get('portfolio-state');
      if(r && r.value){
        const st = JSON.parse(r.value);
        if(st.symbols){ this.STOCKS.forEach(s => { if(st.symbols[s.id] !== undefined) s.symbol = st.symbols[s.id]; }); }
        if(st.commoditySymbols){ this.COMMODITIES.forEach(c => { if(st.commoditySymbols[c.id] !== undefined) c.symbol = st.commoditySymbols[c.id]; }); }
        this.ps = st.ps || {};
        this.hideAmounts = !!st.hideAmounts;
        this.simpleView = !!st.simpleView;
        if(st.targetAktier !== undefined) this.targetAktier = st.targetAktier;
        if(st.layout) this.layout = st.layout;
        if(st.veckansTips) this.veckansTips = st.veckansTips;
      }
    }catch(e){ /* inget sparat än, kör med defaults */ }
  },

  async save(){
    const symbols = {}; this.STOCKS.forEach(s => symbols[s.id] = s.symbol);
    const commoditySymbols = {}; this.COMMODITIES.forEach(c => commoditySymbols[c.id] = c.symbol);
    const payload = JSON.stringify({
      symbols, commoditySymbols, ps:this.ps, hideAmounts:this.hideAmounts, simpleView:this.simpleView,
      targetAktier:this.targetAktier, layout:this.layout, veckansTips:this.veckansTips
    });
    await Storage.set('portfolio-state', payload);
  }
};
