/* modules/bevakning.js - aktier man följer utan att äga */
Layout.register({
  id: 'bevakning',
  title: 'Bevakningslista',
  defaultWidth: 420,

  build(container){
    const list = document.createElement('div'); list.className = 'grid-list';
    if(State.watchlist.length === 0){
      const empty = document.createElement('div'); empty.className = 'empty-note'; empty.textContent = 'Inga bevakade aktier än.';
      list.appendChild(empty);
    } else {
      State.watchlist.forEach((w, i) => list.appendChild(this.row(w, i)));
    }
    container.appendChild(list);

    const box = document.createElement('div'); box.className = 'text-box';
    box.innerHTML = `
      <h3>Lägg till bevakning</h3>
      <div class="row-inputs">
        <input class="field" id="watchName" placeholder="Namn, t.ex. NuScale Power">
        <input class="field" id="watchSymbol" placeholder="Symbol, t.ex. SMR">
      </div>
      <div class="actions-row"><button class="btn btn-gold" onclick="ModuleActions.addWatch()">Lägg till</button></div>
    `;
    container.appendChild(box);
  },

  row(w, i){
    const row = document.createElement('div');
    row.className = 'row';
    const ch = (w.price != null && w.prevClose) ? Format.pct(w.price, w.prevClose) : null;
    const triggered = Alerts.check('w'+i, w.name, w.price);
    const alert = State.priceAlerts['w'+i];
    row.innerHTML = `
      <div class="row-top">
        <span class="ticker" title="${w.name}">${triggered ? '🔔 ' : ''}${w.name}</span>
        <span class="price">${w.price != null ? Format.price(w.price, w.curr) : '—'}</span>
      </div>
      <div class="row-sub">
        <div class="name-line"><span class="badge">${w.symbol}</span></div>
        ${ch ? `<span class="change ${ch.flat?'flat':(ch.pos?'pos':'neg')}">${ch.flat?'':(ch.pos?'▲ ':'▼ ')}${ch.text}</span>` : '<span class="name">Ej hämtat</span>'}
      </div>
      ${w.sparkline ? `<div class="row-sparkline">${Charts.sparkline(w.sparkline, { color: (w.price!=null && w.prevClose!=null && w.price < w.prevClose) ? 'var(--loss)' : 'var(--gain)' })}</div>` : ''}
      <div class="meta">
        <span>Alarm över:</span>
        <input class="field" type="text" placeholder="pris" value="${alert && alert.above != null ? alert.above : ''}" onchange="ModuleActions.setWatchAlert(${i}, 'above', this.value)">
        <span>under:</span>
        <input class="field" type="text" placeholder="pris" value="${alert && alert.below != null ? alert.below : ''}" onchange="ModuleActions.setWatchAlert(${i}, 'below', this.value)">
      </div>
      <div class="actions-row" style="margin-top:6px; justify-content:flex-start;">
        <button class="btn" style="padding:4px 8px; font-size:10px;" onclick="ModuleActions.removeWatch(${i})">Ta bort</button>
      </div>
    `;
    return row;
  }
});
