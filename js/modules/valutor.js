/* modules/valutor.js - kronans värde mot USD/GBP/EUR, samt bitcoin i USD */
Layout.register({
  id: 'valutor',
  title: 'Valutor',

  expanded: new Set(),

  async onRefresh(){ return App.refreshCurrencies(); },

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
    const hasPrice = c.price != null;
    const period = State.valutorTrendPeriod || 'day';

    // Visar hur mycket en enhet av valutan är värd i kronor (t.ex. "1 USD =
    // 10,55 kr") - den riktning folk faktiskt tänker i. Dollar/Pund/Euro
    // hämtas redan som "1 X = ? SEK" (unit SEK), så ingen omräkning behövs
    // där. Bitcoin har ingen SEK-notering och visas i sin egen valuta (USD).
    const isFiat = c.unit === 'SEK';
    const displayCode = c.unit;
    const symbol = Format.currencySymbol(displayCode);
    const displayPrice = c.price;

    let ch = null;
    if(hasPrice){
      if(period === 'year'){
        if(c.yearAgoPrice) ch = Format.pct(c.price, c.yearAgoPrice);
      } else if(c.prevClose){
        ch = Format.pct(c.price, c.prevClose);
      }
    }
    const changeLabel = ch
      ? (ch.pos ? '▲ ' : '▼ ') + ch.text
      : (c.status === 'error' ? 'Ej tillgänglig' : (period === 'year' ? 'Årshistorik saknas' : '—'));
    const decimals = displayPrice != null && displayPrice < 1 ? 4 : 2;

    return QuoteRow.build({
      id: c.id,
      badge: displayCode,
      name: c.name,
      priceText: hasPrice ? `${symbol} ${displayPrice.toLocaleString('sv-SE',{maximumFractionDigits:decimals})}` : '—',
      subLabel: isFiat ? `1 ${c.code} i ${displayCode}` : null,
      changeText: changeLabel,
      changeClass: ch ? (ch.pos?'pos':'neg') : 'flat',
      isOpen: this.expanded.has(c.id),
      symbolValue: c.symbol,
      symbolOnChange: `ModuleActions.setCurrencySymbol('${c.id}', this.value)`,
      onToggle: () => this.toggle(c.id)
    });
  }
});
