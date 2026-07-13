/* modules/aktier.js */
Layout.register({
  id: 'aktier',
  title: 'Aktier',
  defaultWidth: 760,

  build(container){
    const ALL_SECTORS = [...new Set(State.STOCKS.flatMap(s => s.tags))];

    const chips = document.createElement('div');
    const row1label = document.createElement('div'); row1label.className = 'chip-group-label'; row1label.textContent = 'Resultat & geografi';
    const row1 = document.createElement('div'); row1.className = 'chip-row';
    [{k:'all',label:'Alla'},{k:'winners',label:'Vinnare'},{k:'losers',label:'Förlorare'},{k:'swedish',label:'Svenska'},{k:'foreign',label:'Utländska'}]
    .forEach(b => {
      const c = document.createElement('button');
      c.className = 'chip' + (State.activeFilter.kind === b.k ? ' active' : '');
      c.textContent = b.label;
      c.onclick = () => { State.activeFilter = { kind:b.k, value:null }; Layout.refreshModule('aktier'); };
      row1.appendChild(c);
    });
    const row2label = document.createElement('div'); row2label.className = 'chip-group-label'; row2label.textContent = 'Sektor';
    const row2 = document.createElement('div'); row2.className = 'chip-row';
    ALL_SECTORS.forEach(sec => {
      const c = document.createElement('button');
      c.className = 'chip' + (State.activeFilter.kind === 'sector' && State.activeFilter.value === sec ? ' active' : '');
      c.textContent = sec;
      c.onclick = () => { State.activeFilter = { kind:'sector', value:sec }; Layout.refreshModule('aktier'); };
      row2.appendChild(c);
    });
    chips.appendChild(row1label); chips.appendChild(row1);
    chips.appendChild(row2label); chips.appendChild(row2);
    container.appendChild(chips);

    const matches = s => {
      const ch = Format.pct(s.price, s.gav);
      const f = State.activeFilter;
      if(f.kind === 'all') return true;
      if(f.kind === 'winners') return ch.pos && !ch.flat;
      if(f.kind === 'losers') return !ch.pos && !ch.flat;
      if(f.kind === 'swedish') return s.land === 'SE';
      if(f.kind === 'foreign') return s.land !== 'SE';
      if(f.kind === 'sector') return s.tags.includes(f.value);
      return true;
    };

    const filtered = State.STOCKS.filter(matches).slice()
      .sort((a,b) => Format.pct(b.price,b.gav).raw - Format.pct(a.price,a.gav).raw);

    const list = document.createElement('div'); list.className = 'grid-list';
    if(filtered.length === 0){
      const empty = document.createElement('div'); empty.className = 'empty-note'; empty.textContent = 'Inga aktier matchar filtret.';
      list.appendChild(empty);
    } else {
      filtered.forEach(s => list.appendChild(this.row(s)));
    }
    container.appendChild(list);

    const priceBox = document.createElement('div'); priceBox.className = 'text-box';
    priceBox.innerHTML = `
      <h3>Uppdatera kurser genom att klistra in</h3>
      <p>Fungerar oavsett om live-hämtningen strular. En rad per bolag/råvara.</p>
      <textarea id="priceInput" class="field" placeholder="t.ex.&#10;Atlas Copco A 191,10&#10;Nibe 35,42&#10;Guld 2380"></textarea>
      <div class="actions-row"><button class="btn btn-gold" onclick="ModuleActions.parsePriceUpdate()">Uppdatera kurser</button></div>
      <div class="stamp" id="pasteStamp" style="margin-top:8px;"></div>
    `;
    container.appendChild(priceBox);

    const psBox = document.createElement('div'); psBox.className = 'text-box';
    psBox.innerHTML = `
      <h3>Klistra in dagens P/S-siffror</h3>
      <p>Klistra in texten från ditt meddelande så matchas siffrorna mot rätt aktie ovan.</p>
      <textarea id="psInput" class="field" placeholder="t.ex. Atlas Copco A P/S 3,4, Nibe P/S 2,1"></textarea>
      <div class="actions-row"><button class="btn btn-gold" onclick="ModuleActions.parsePS()">Tolka och fyll i</button></div>
    `;
    container.appendChild(psBox);
  },

  row(s){
    const row = document.createElement('div');
    row.className = 'row'; row.dataset.id = s.id;
    const value = s.price * s.antal;
    const ch = Format.pct(s.price, s.gav);
    row.innerHTML = `
      <div class="row-top">
        <span class="ticker" title="${s.name}">${s.name}</span>
        <span class="price">${Format.price(s.price, s.curr)}</span>
      </div>
      <div class="row-sub">
        <div class="name-line">
          <span class="badge land">${s.land}</span>
          ${s.tags.map(t => `<span class="badge">${t}</span>`).join('')}
        </div>
        <span class="change ${ch.flat?'flat':(ch.pos?'pos':'neg')}">${ch.flat?'':(ch.pos?'▲ ':'▼ ')}${ch.text}</span>
      </div>
      <div class="row-bottom">
        <span class="name">${s.antal} st &middot; GAV ${s.gav.toLocaleString('sv-SE',{minimumFractionDigits:2})} ${s.curr}${State.ps[s.id] ? ` &middot; <span class="ps-tag">P/S ${State.ps[s.id]}</span>` : ''}</span>
        <span class="value-amt">${Format.amount(value)}${s.curr!=='SEK' ? ' ('+s.curr+')' : ''}</span>
      </div>
      <div class="meta">
        <span>Symbol${s.guess?'<span class="guess">*</span>':''}:</span>
        <input class="field" type="text" value="${s.symbol}" placeholder="ex. ATCO-A.ST" onchange="ModuleActions.setStockSymbol('${s.id}', this.value)">
        <span>Kurs:</span>
        <input class="field" type="text" value="${s.price}" onchange="ModuleActions.setStockPrice('${s.id}', this.value)">
      </div>
    `;
    return row;
  }
});
