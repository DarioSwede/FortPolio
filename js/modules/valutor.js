/* modules/valutor.js - USD/GBP/EUR mot SEK, samt bitcoin i USD */
Layout.register({
  id: 'valutor',
  title: 'Valutor',

  expanded: new Set(),

  build(container){
    const list = document.createElement('div'); list.className = 'grid-list';
    State.CURRENCIES.forEach(c => list.appendChild(this.row(c)));
    container.appendChild(list);
  },

  toggle(id){
    if(this.expanded.has(id)) this.expanded.delete(id);
    else this.expanded.add(id);
    Layout.refreshModule('valutor');
  },

  row(c){
    const row = document.createElement('div'); row.className = 'row row-clickable'; row.dataset.id = c.id;
    row.onclick = () => this.toggle(c.id);
    const hasPrice = c.price != null;
    const ch = hasPrice && c.prevClose ? Format.pct(c.price, c.prevClose) : null;
    const isOpen = this.expanded.has(c.id);
    // unit är valutan kursen anges i (t.ex. "SEK" för Dollar/Pund/Euro,
    // "USD" för Bitcoin) - visa den som en egen badge så det alltid syns
    // vilken valuta man faktiskt läser av.
    const symbol = Format.currencySymbol(c.unit);
    row.innerHTML = `
      <div class="row-category">${c.unit}</div>
      <div class="row-top">
        <span class="ticker">${c.name}</span>
        <span class="price">${hasPrice ? symbol + ' ' + c.price.toLocaleString('sv-SE',{maximumFractionDigits:2}) : '—'}</span>
      </div>
      <span class="change ${ch ? (ch.pos?'pos':'neg') : 'flat'}">${ch ? (ch.pos?'▲ ':'▼ ')+ch.text : (c.status==='error' ? 'Ej tillgänglig' : '—')}</span>
      ${isOpen ? `
      <div class="meta" onclick="event.stopPropagation()">
        <span>Symbol:</span>
        <input class="field" type="text" value="${c.symbol}" onchange="ModuleActions.setCurrencySymbol('${c.id}', this.value)">
      </div>` : ''}
    `;
    return row;
  }
});
