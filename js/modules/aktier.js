/* modules/aktier.js */
Layout.register({
  id: 'aktier',
  title: 'Aktier',
  defaultWidth: 1520,

  SECTOR_COLORS: ['#5B8DEF','#9B6BCE','#4FB8E0','#E0A15C','#7FA8C9','#C97BB0','#6FBF73','#D98686','#8FA6B2','#B7A0E0'],
  FOREIGN_COLOR: '#5B8DEF',

  build(container){
    const simple = State.simpleView;
    const ALL_SECTORS = [...new Set(State.STOCKS.flatMap(s => s.tags))];

    const wrap = document.createElement('div'); wrap.className = 'aktier-container';
    const grid = document.createElement('div'); grid.className = 'aktier-layout';

    // --- Left: filter menu ---
    const menu = document.createElement('div'); menu.className = 'aktier-menu';
    const menuLabel = document.createElement('div'); menuLabel.className = 'chip-group-label'; menuLabel.style.marginTop = '0'; menuLabel.textContent = 'Resultat & geografi';
    const menuChips = document.createElement('div'); menuChips.className = 'chip-col';
    [{k:'all',label:'Alla'},{k:'winners',label:'Vinnare'},{k:'losers',label:'Förlorare'},{k:'swedish',label:'Svenska'},{k:'foreign',label:'Utländska'}]
    .forEach(b => {
      const c = document.createElement('button');
      c.className = 'chip' + (State.activeFilter.kind === b.k ? ' active' : '');
      c.textContent = b.label;
      c.onclick = () => { State.activeFilter = { kind:b.k, value:null }; Layout.refreshModule('aktier'); };
      menuChips.appendChild(c);
    });
    menu.appendChild(menuLabel); menu.appendChild(menuChips);

    if(!simple){
      const sectorLabel = document.createElement('div'); sectorLabel.className = 'chip-group-label'; sectorLabel.textContent = 'Sektor';
      const sectorChips = document.createElement('div'); sectorChips.className = 'chip-col';
      ALL_SECTORS.forEach(sec => {
        const c = document.createElement('button');
        c.className = 'chip' + (State.activeFilter.kind === 'sector' && State.activeFilter.value === sec ? ' active' : '');
        c.textContent = sec;
        c.onclick = () => { State.activeFilter = { kind:'sector', value:sec }; Layout.refreshModule('aktier'); };
        sectorChips.appendChild(c);
      });
      menu.appendChild(sectorLabel); menu.appendChild(sectorChips);
    }

    // --- Middle: stock list ---
    const main = document.createElement('div'); main.className = 'aktier-main';
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
    main.appendChild(list);

    if(!simple){
      const priceBox = document.createElement('div'); priceBox.className = 'text-box';
      priceBox.innerHTML = `
        <h3>Uppdatera kurser genom att klistra in</h3>
        <p>Fungerar oavsett om live-hämtningen strular. En rad per bolag/råvara.</p>
        <textarea id="priceInput" class="field" placeholder="t.ex.&#10;Atlas Copco A 191,10&#10;Nibe 35,42&#10;Guld 2380"></textarea>
        <div class="actions-row"><button class="btn btn-gold" onclick="ModuleActions.parsePriceUpdate()">Uppdatera kurser</button></div>
        <div class="stamp" id="pasteStamp" style="margin-top:8px;"></div>
      `;
      main.appendChild(priceBox);

      const psBox = document.createElement('div'); psBox.className = 'text-box';
      psBox.innerHTML = `
        <h3>Klistra in dagens P/S-siffror</h3>
        <p>Klistra in texten från ditt meddelande så matchas siffrorna mot rätt aktie ovan.</p>
        <textarea id="psInput" class="field" placeholder="t.ex. Atlas Copco A P/S 3,4, Nibe P/S 2,1"></textarea>
        <div class="actions-row"><button class="btn btn-gold" onclick="ModuleActions.parsePS()">Tolka och fyll i</button></div>
      `;
      main.appendChild(psBox);
    }

    // --- Right: sector/geography distribution ---
    const dist = document.createElement('div'); dist.className = 'aktier-dist';
    dist.appendChild(this.donutBlock('Sektor', this.sectorEntries()));
    dist.appendChild(this.donutBlock('Geografi', this.landEntries()));

    grid.appendChild(menu); grid.appendChild(main); grid.appendChild(dist);
    wrap.appendChild(grid);
    container.appendChild(wrap);
  },

  sectorEntries(){
    const totals = {};
    State.STOCKS.forEach(s => {
      const sec = s.tags[0] || 'Övrigt';
      totals[sec] = (totals[sec] || 0) + s.price*s.antal;
    });
    return Object.entries(totals)
      .sort((a,b) => b[1]-a[1])
      .map(([label, val], i) => ({ label, val, color: this.SECTOR_COLORS[i % this.SECTOR_COLORS.length] }));
  },

  landEntries(){
    const seValue = State.STOCKS.filter(s => s.land === 'SE').reduce((sum,s) => sum + s.price*s.antal, 0);
    const totalValue = State.STOCKS.reduce((sum,s) => sum + s.price*s.antal, 0);
    const css = getComputedStyle(document.documentElement);
    return [
      { label:'Svenska', val:seValue, color:css.getPropertyValue('--gold').trim() },
      { label:'Utländska', val:totalValue - seValue, color:this.FOREIGN_COLOR }
    ];
  },

  donutBlock(title, entries){
    const total = entries.reduce((s,e) => s + e.val, 0) || 1;
    let acc = 0;
    const stops = entries.map(e => {
      const start = acc; acc += (e.val/total)*100;
      return `${e.color} ${start}% ${acc}%`;
    }).join(', ');

    const block = document.createElement('div');
    const label = document.createElement('div'); label.className = 'chip-group-label'; label.style.marginTop = '0'; label.textContent = title;
    const wrap = document.createElement('div'); wrap.className = 'alloc-wrap';
    const donut = document.createElement('div'); donut.className = 'donut';
    donut.style.background = `conic-gradient(${stops})`;
    const legend = document.createElement('div'); legend.className = 'legend';
    legend.innerHTML = entries.map(e => {
      const pct = (e.val/total)*100;
      return `<div class="legend-row"><span class="dot" style="background:${e.color}"></span>
        <span class="legend-text">${e.label} <b>${pct.toFixed(0)}%</b></span></div>`;
    }).join('');
    wrap.appendChild(donut); wrap.appendChild(legend);
    block.appendChild(label); block.appendChild(wrap);
    return block;
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
