/* modules/ravaror.js */
Layout.register({
  id: 'ravaror',
  title: 'Råvaror',

  build(container){
    const list = document.createElement('div'); list.className = 'grid-list';
    State.COMMODITIES.forEach(c => list.appendChild(this.row(c)));
    container.appendChild(list);
  },

  row(c){
    const row = document.createElement('div'); row.className = 'row'; row.dataset.id = c.id;
    const hasPrice = c.price != null;
    const ch = hasPrice && c.prevClose ? Format.pct(c.price, c.prevClose) : null;
    row.innerHTML = `
      <div class="row-top">
        <span class="ticker">${c.name}</span>
        <span class="price">${hasPrice ? c.price.toLocaleString('sv-SE',{maximumFractionDigits:2}) : '—'}</span>
      </div>
      <div class="row-sub">
        <span class="name">${c.unit}</span>
        <span class="change ${ch ? (ch.pos?'pos':'neg') : 'flat'}">${ch ? (ch.pos?'▲ ':'▼ ')+ch.text : (c.status==='error' ? 'Ej tillgänglig' : '—')}</span>
      </div>
      <div class="meta">
        <span>Symbol:</span>
        <input class="field" type="text" value="${c.symbol}" onchange="ModuleActions.setCommoditySymbol('${c.id}', this.value)">
      </div>
    `;
    return row;
  }
});
