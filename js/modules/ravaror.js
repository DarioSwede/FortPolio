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
    // unit är "VALUTA/enhet" (t.ex. "USD/oz") - alla råvaror handlas i USD.
    // Räkna om till kronor med samma USD/SEK-kurs som Valutor-kortet visar,
    // så beloppet blir begripligt utan att behöva räkna om i huvudet.
    // Procentuell förändring påverkas inte av omräkningen (samma faktor på
    // både pris och gårdagens stängning).
    const [, perUnit] = (c.unit || '').split('/');
    const usdSek = (State.CURRENCIES.find(x => x.symbol === 'USDSEK=X') || {}).price;
    const showSEK = hasPrice && usdSek;
    const displayPrice = showSEK ? c.price * usdSek : c.price;
    const displayCurr = showSEK ? 'SEK' : 'USD';
    const symbol = Format.currencySymbol(displayCurr);
    row.innerHTML = `
      <div class="row-category">${displayCurr}</div>
      <div class="row-top">
        <span class="ticker">${c.name}</span>
        <span class="price">${hasPrice ? symbol + ' ' + displayPrice.toLocaleString('sv-SE',{maximumFractionDigits:2}) : '—'}${perUnit ? `<span class="unit-suffix"> /${perUnit}</span>` : ''}</span>
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
