/* format.js - alla siffer/text-formatteringar på ett ställe */
const Format = {
  kr(v){ return Math.round(v).toLocaleString('sv-SE') + " kr"; },

  amount(v){ return State.hideAmounts ? "•••" : this.kr(v); },

  // Som amount(), men för belopp i en annan valuta än SEK - "kr" är
  // missvisande (och rentav motsägelsefullt) på ett belopp i t.ex. GBP.
  amountIn(v, curr){
    if(State.hideAmounts) return "•••";
    if(curr === 'SEK') return this.kr(v);
    return Math.round(v).toLocaleString('sv-SE') + " " + curr;
  },

  price(v, curr){
    const dec = v < 5 ? 4 : 2;
    return v.toLocaleString('sv-SE', { minimumFractionDigits:dec, maximumFractionDigits:dec }) + " " + curr;
  },

  pct(cur, prev){
    if(!prev || prev === 0) return { text:"Ny position", pos:true, raw:0, flat:true };
    const pct = ((cur - prev) / prev) * 100;
    return { text:(pct >= 0 ? "+" : "") + pct.toFixed(1).replace('.', ',') + "%", pos: pct >= 0, raw: pct };
  },

  pctShort(pct){
    return (pct >= 0 ? "+" : "") + pct.toFixed(2).replace('.', ',') + "%";
  },

  // ISO 3166-1 alpha-2 landskod -> flagg-emoji, via Unicode regional indicators.
  // Fungerar för alla giltiga tvåbokstavskoder utan en hårdkodad tabell.
  flag(land){
    if(!land || land.length !== 2) return '🏳️';
    const points = [...land.toUpperCase()].map(c => 0x1F1E6 + (c.charCodeAt(0) - 65));
    return String.fromCodePoint(...points);
  },

  // Valutasymbol för de valutakoder som faktiskt förekommer i appen (råvaror
  // handlas i USD, valutakortet visar kurser i SEK/USD) - faller tillbaka på
  // koden själv för allt annat så det aldrig blir tomt.
  CURRENCY_SYMBOLS: { SEK:'kr', USD:'$', EUR:'€', GBP:'£', CAD:'$', BTC:'₿' },
  currencySymbol(code){ return this.CURRENCY_SYMBOLS[code] || code || ''; }
};
