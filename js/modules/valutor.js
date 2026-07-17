/* modules/valutor.js - kronans värde mot USD/GBP/EUR, samt bitcoin i USD */
Layout.register({
  id: 'valutor',
  title: 'Valutor',

  expanded: new Set(),

  build(container){
    const period = State.valutorTrendPeriod || 'day';
    const switchRow = document.createElement('div');
    switchRow.style.cssText = 'display:flex; justify-content:flex-end; align-items:center; gap:8px; margin-bottom:8px;';
    const label = document.createElement('span'); label.className = 'hide-toggle-label';
    label.textContent = period === 'year' ? 'Trend: år' : 'Trend: dag';
    const sw = document.createElement('div'); sw.className = 'switch' + (period === 'year' ? ' on' : '');
    sw.innerHTML = '<div class="knob"></div>';
    sw.onclick = () => {
      State.valutorTrendPeriod = State.valutorTrendPeriod === 'year' ? 'day' : 'year';
      State.save();
      Layout.refreshModule('valutor');
    };
    switchRow.appendChild(label); switchRow.appendChild(sw);
    container.appendChild(switchRow);

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
    const isOpen = this.expanded.has(c.id);
    const period = State.valutorTrendPeriod || 'day';

    // Dollar/Pund/Euro hämtas som "1 X = ? SEK" (unit SEK) - vänd på det så
    // att kortet visar kronans eget värde ("1 SEK = ? X") istället, som
    // efterfrågat: en stigande siffra ska betyda att kronan stärkts.
    // Bitcoin har ingen naturlig SEK-motsvarighet och visas oinverterad.
    const isFiat = c.unit === 'SEK';
    const displayCode = isFiat ? c.code : c.unit;
    const symbol = Format.currencySymbol(displayCode);
    const displayPrice = hasPrice ? (isFiat ? 1 / c.price : c.price) : null;

    let ch = null;
    if(hasPrice){
      if(period === 'year'){
        if(c.yearAgoPrice) ch = isFiat ? Format.pct(1 / c.price, 1 / c.yearAgoPrice) : Format.pct(c.price, c.yearAgoPrice);
      } else if(c.prevClose){
        ch = isFiat ? Format.pct(1 / c.price, 1 / c.prevClose) : Format.pct(c.price, c.prevClose);
      }
    }
    const changeLabel = ch
      ? (ch.pos ? '▲ ' : '▼ ') + ch.text
      : (c.status === 'error' ? 'Ej tillgänglig' : (period === 'year' ? 'Årshistorik saknas' : '—'));

    const decimals = displayPrice != null && displayPrice < 1 ? 4 : 2;
    row.innerHTML = `
      <div class="row-category">${displayCode}</div>
      <div class="row-top">
        <span class="ticker">${c.name}</span>
        <span class="price">${hasPrice ? symbol + ' ' + displayPrice.toLocaleString('sv-SE',{maximumFractionDigits:decimals}) : '—'}</span>
      </div>
      ${isFiat ? `<div class="unit-suffix" style="margin-top:-2px;">1 kr i ${displayCode}</div>` : ''}
      <span class="change ${ch ? (ch.pos?'pos':'neg') : 'flat'}">${changeLabel}</span>
      ${isOpen ? `
      <div class="meta" onclick="event.stopPropagation()">
        <span>Symbol:</span>
        <input class="field" type="text" value="${c.symbol}" onchange="ModuleActions.setCurrencySymbol('${c.id}', this.value)">
      </div>` : ''}
    `;
    return row;
  }
});
