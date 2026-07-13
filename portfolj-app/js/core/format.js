/* format.js - alla siffer/text-formatteringar på ett ställe */
const Format = {
  kr(v){ return Math.round(v).toLocaleString('sv-SE') + " kr"; },

  amount(v){ return State.hideAmounts ? "•••" : this.kr(v); },

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
  }
};
