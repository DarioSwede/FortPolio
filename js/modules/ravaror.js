/* modules/ravaror.js */
Layout.register({
  id: 'ravaror',
  title: 'Råvaror',

  expanded: new Set(),

  build(container){
    const list = document.createElement('div'); list.className = 'grid-list';
    State.COMMODITIES.forEach(c => list.appendChild(this.row(c)));
    container.appendChild(list);
  },

  toggle(id){
    if(this.expanded.has(id)) this.expanded.delete(id);
    else this.expanded.add(id);
    Layout.refreshModule('ravaror');
  },

  row(c){
    const row = document.createElement('div'); row.className = 'row row-clickable'; row.dataset.id = c.id;
    row.onclick = () => this.toggle(c.id);
    const hasPrice = c.price != null;
    const ch = hasPrice && c.prevClose ? Format.pct(c.price, c.prevClose) : null;
    const isOpen = this.expanded.has(c.id);
    // unit är "VALUTA/enhet" (t.ex. "USD/oz") - dela upp så valutan kan
    // visas som en egen tydlig badge, samma mönster som aktiernas kategori.
    const [curr, perUnit] = (c.unit || '').split('/');
    const symbol = Format.currencySymbol(curr);
    row.innerHTML = `
      <div class="row-category">${curr}</div>
      <div class="row-top">
        <span class="ticker">${c.name}</span>
        <span class="price">${hasPrice ? symbol + ' ' + c.price.toLocaleString('sv-SE',{maximumFractionDigits:2}) : '—'}${perUnit ? `<span class="unit-suffix"> /${perUnit}</span>` : ''}</span>
      </div>
      <span class="change ${ch ? (ch.pos?'pos':'neg') : 'flat'}">${ch ? (ch.pos?'▲ ':'▼ ')+ch.text : (c.status==='error' ? 'Ej tillgänglig' : '—')}</span>
      ${isOpen ? `
      <div class="meta" onclick="event.stopPropagation()">
        <span>Symbol:</span>
        <input class="field" type="text" value="${c.symbol}" onchange="ModuleActions.setCommoditySymbol('${c.id}', this.value)">
      </div>` : ''}
    `;
    return row;
  }
});
