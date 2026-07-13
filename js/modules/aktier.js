/* modules/aktier.js */
Layout.register({
  id: 'aktier',
  title: 'Aktier',
  defaultWidth: 1520,

  SECTOR_COLORS: ['#5B8DEF','#9B6BCE','#4FB8E0','#E0A15C','#7FA8C9','#C97BB0','#6FBF73','#D98686','#8FA6B2','#B7A0E0'],

  build(container){
    const simple = State.simpleView;

    const toggleRow = document.createElement('div'); toggleRow.className = 'hide-toggle'; toggleRow.style.cssText = 'justify-content:flex-end; margin-bottom:14px;';
    toggleRow.innerHTML = `
      <span class="hide-toggle-label">Enkel vy</span>
      <div class="switch ${simple ? 'on' : ''}" onclick="ModuleActions.toggleSimpleView()"><div class="knob"></div></div>
    `;
    container.appendChild(toggleRow);

    container.appendChild(this.distribution());

    const ALL_SECTORS = [...new Set(State.STOCKS.flatMap(s => s.tags))];

    const chips = document.createElement('div');
    const row = document.createElement('div'); row.className = 'chip-row';
    [{k:'all',label:'Alla'},{k:'winners',label:'Vinnare'},{k:'losers',label:'Förlorare'},{k:'swedish',label:'Svenska'},{k:'foreign',label:'Utländska'}]
    .forEach(b => {
      const c = document.createElement('button');
      c.className = 'chip' + (State.activeFilter.kind === b.k ? ' active' : '');
      c.textContent = b.label;
      c.onclick = () => { State.activeFilter = { kind:b.k, value:null }; Layout.refreshModule('aktier'); };
      row.appendChild(c);
    });
    if(!simple){
      ALL_SECTORS.forEach((sec, i) => {
        const c = document.createElement('button');
        c.className = 'chip' + (i === 0 ? ' sector-start' : '') + (State.activeFilter.kind === 'sector' && State.activeFilter.value === sec ? ' active' : '');
        c.textContent = sec;
        c.onclick = () => { State.activeFilter = { kind:'sector', value:sec }; Layout.refreshModule('aktier'); };
        row.appendChild(c);
      });
    }
    chips.appendChild(row);
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
      filtered.forEach(s => list.appendChild(this.row(s, simple)));
    }
    container.appendChild(list);

    if(!simple){
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
    }
  },

  distribution(){
    const wrap = document.createElement('div'); wrap.className = 'dist-wrap';
    const totalValue = State.STOCKS.reduce((sum,s) => sum + s.price*s.antal, 0) || 1;

    const sectorTotals = {};
    State.STOCKS.forEach(s => {
      const sec = s.tags[0] || 'Övrigt';
      sectorTotals[sec] = (sectorTotals[sec] || 0) + s.price*s.antal;
    });
    const sectorEntries = Object.entries(sectorTotals).sort((a,b) => b[1]-a[1]);

    const sectorBar = document.createElement('div'); sectorBar.className = 'dist-bar';
    const sectorLegend = document.createElement('div'); sectorLegend.className = 'dist-legend';
    sectorEntries.forEach(([sec, val], i) => {
      const pct = (val/totalValue)*100;
      const color = this.SECTOR_COLORS[i % this.SECTOR_COLORS.length];
      const seg = document.createElement('div'); seg.className = 'dist-seg';
      seg.style.cssText = `flex:${pct} 0 0; background:${color};`;
      seg.title = `${sec} ${pct.toFixed(1).replace('.',',')}%`;
      sectorBar.appendChild(seg);
      const item = document.createElement('span'); item.className = 'dist-legend-item';
      item.innerHTML = `<span class="dot" style="background:${color}"></span>${sec} ${pct.toFixed(0)}%`;
      sectorLegend.appendChild(item);
    });

    const seValue = State.STOCKS.filter(s => s.land === 'SE').reduce((sum,s) => sum + s.price*s.antal, 0);
    const sePct = (seValue/totalValue)*100;
    const foreignPct = 100 - sePct;
    const foreignColor = '#5B8DEF';

    const landBar = document.createElement('div'); landBar.className = 'dist-bar';
    landBar.innerHTML = `
      <div class="dist-seg" style="flex:${sePct} 0 0; background:var(--gold);" title="Svenska ${sePct.toFixed(1).replace('.',',')}%"></div>
      <div class="dist-seg" style="flex:${foreignPct} 0 0; background:${foreignColor};" title="Utländska ${foreignPct.toFixed(1).replace('.',',')}%"></div>
    `;
    const landLegend = document.createElement('div'); landLegend.className = 'dist-legend';
    landLegend.innerHTML = `
      <span class="dist-legend-item"><span class="dot" style="background:var(--gold)"></span>Svenska ${sePct.toFixed(0)}%</span>
      <span class="dist-legend-item"><span class="dot" style="background:${foreignColor}"></span>Utländska ${foreignPct.toFixed(0)}%</span>
    `;

    const sectorLabel = document.createElement('div'); sectorLabel.className = 'dist-group-label'; sectorLabel.textContent = 'Sektor';
    const landLabel = document.createElement('div'); landLabel.className = 'dist-group-label'; landLabel.style.marginTop = '10px'; landLabel.textContent = 'Geografi';

    wrap.appendChild(sectorLabel);
    wrap.appendChild(sectorBar);
    wrap.appendChild(sectorLegend);
    wrap.appendChild(landLabel);
    wrap.appendChild(landBar);
    wrap.appendChild(landLegend);
    return wrap;
  },

  row(s, simple){
    const row = document.createElement('div');
    row.className = 'row'; row.dataset.id = s.id;
    const value = s.price * s.antal;
    const ch = Format.pct(s.price, s.gav);
    const meta = simple ? '' : `
      <div class="meta">
        <span>Symbol${s.guess?'<span class="guess">*</span>':''}:</span>
        <input class="field" type="text" value="${s.symbol}" placeholder="ex. ATCO-A.ST" onchange="ModuleActions.setStockSymbol('${s.id}', this.value)">
        <span>Kurs:</span>
        <input class="field" type="text" value="${s.price}" onchange="ModuleActions.setStockPrice('${s.id}', this.value)">
      </div>
    `;
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
      ${meta}
    `;
    return row;
  }
});
