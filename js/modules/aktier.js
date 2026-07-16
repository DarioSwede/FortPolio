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

    // --- Filter, som en horisontell rad högst upp ---
    const menuRow = document.createElement('div'); menuRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;';
    const menuLabel = document.createElement('div'); menuLabel.className = 'chip-group-label'; menuLabel.style.marginTop = '0'; menuLabel.textContent = 'Resultat & geografi';
    const sortDir = State.sortDir.aktier;
    const sortBtn = document.createElement('button'); sortBtn.className = 'chip';
    sortBtn.textContent = `Vinst/förlust ${sortDir === 'desc' ? '▼' : '▲'}`;
    sortBtn.title = 'Byt sorteringsriktning';
    sortBtn.onclick = () => ModuleActions.toggleSortDir('aktier');
    menuRow.appendChild(menuLabel); menuRow.appendChild(sortBtn);
    const menuChips = document.createElement('div'); menuChips.className = 'chip-row';
    [{k:'all',label:'Alla'},{k:'winners',label:'Vinnare'},{k:'losers',label:'Förlorare'},{k:'swedish',label:'Svenska'},{k:'foreign',label:'Utländska'}]
    .forEach(b => {
      const c = document.createElement('button');
      c.className = 'chip' + (State.activeFilter.kind === b.k ? ' active' : '');
      c.textContent = b.label;
      c.onclick = () => { State.activeFilter = { kind:b.k, value:null }; Layout.refreshModule('aktier'); };
      menuChips.appendChild(c);
    });
    container.appendChild(menuRow); container.appendChild(menuChips);

    if(!simple){
      const sectorLabel = document.createElement('div'); sectorLabel.className = 'chip-group-label'; sectorLabel.textContent = 'Sektor';
      const sectorChips = document.createElement('div'); sectorChips.className = 'chip-row';
      ALL_SECTORS.forEach(sec => {
        const c = document.createElement('button');
        c.className = 'chip' + (State.activeFilter.kind === 'sector' && State.activeFilter.value === sec ? ' active' : '');
        c.textContent = sec;
        c.onclick = () => { State.activeFilter = { kind:'sector', value:sec }; Layout.refreshModule('aktier'); };
        sectorChips.appendChild(c);
      });
      container.appendChild(sectorLabel); container.appendChild(sectorChips);
    }

    // --- Aktielista ---
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
      .sort((a,b) => {
        const diff = Format.pct(b.price,b.gav).raw - Format.pct(a.price,a.gav).raw; // desc = bäst först
        return State.sortDir.aktier === 'asc' ? -diff : diff;
      });

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

    container.appendChild(main);
  },

  MIN_SLICE_SHARE: 0.04,

  sectorEntries(){
    const totals = {};
    State.STOCKS.forEach(s => {
      const sec = s.tags[0] || 'Övrigt';
      totals[sec] = (totals[sec] || 0) + s.price*s.antal;
    });
    const total = Object.values(totals).reduce((a,b) => a+b, 0) || 1;
    const sorted = Object.entries(totals).sort((a,b) => b[1]-a[1]);

    const main = [];
    let rest = 0;
    sorted.forEach(([label, val]) => {
      if(val/total >= this.MIN_SLICE_SHARE) main.push([label, val]);
      else rest += val;
    });
    if(rest > 0){
      const other = main.find(([label]) => label === 'Övrigt');
      if(other) other[1] += rest;
      else main.push(['Övrigt', rest]);
    }

    return main
      .sort((a,b) => b[1]-a[1])
      .map(([label, val], i) => ({ label, val, color: label === 'Övrigt' ? 'var(--text-muted)' : this.SECTOR_COLORS[i % this.SECTOR_COLORS.length] }));
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

  distBlock(title, entries){
    const block = document.createElement('div');
    const label = document.createElement('div'); label.className = 'chip-group-label'; label.style.marginTop = '0'; label.textContent = title;
    block.appendChild(label);
    block.insertAdjacentHTML('beforeend', Charts.percentBar(entries));
    return block;
  },

  row(s, simple){
    const row = document.createElement('div');
    row.className = 'row row-clickable'; row.dataset.id = s.id;
    row.onclick = () => this.openDetail(s);
    const value = s.price * s.antal;
    const ch = Format.pct(s.price, s.gav);
    const triggered = Alerts.check(s.id, s.name, s.price);
    const category = s.tags[0] || '';
    row.innerHTML = `
      ${category ? `<div class="row-category">${category}</div>` : ''}
      <div class="row-name" title="${s.name}">${Format.flag(s.land)} ${triggered ? '🔔 ' : ''}${s.name}</div>
      <div class="row-top">
        <span class="price">${Format.price(s.price, s.curr)}</span>
        <span class="change ${ch.flat?'flat':(ch.pos?'pos':'neg')}">${ch.flat?'':(ch.pos?'▲ ':'▼ ')}${ch.text}</span>
      </div>
      <div class="row-sub">
        <span class="value-amt">${Format.amountIn(value, s.curr)}</span>
      </div>
      ${!simple && s.sparkline ? `<div class="row-sparkline">${Charts.sparkline(s.sparkline, { color: ch.pos ? 'var(--gain)' : 'var(--loss)' })}</div>` : ''}
    `;
    return row;
  },

  openDetail(s){
    const ch = Format.pct(s.price, s.gav);
    const alert = State.priceAlerts[s.id];
    const box = document.getElementById('stockDetailBox');
    box.innerHTML = `
      <h3>${Format.flag(s.land)} ${s.name}</h3>
      <div class="name-line" style="margin:8px 0 14px;">
        ${s.tags.map(t => `<span class="badge">${t}</span>`).join('')}
      </div>
      ${s.sparkline ? `<div class="big-sparkline" style="margin-bottom:14px;">${Charts.sparkline(s.sparkline, { responsive:true, width:300, height:70, strokeWidth:2, color: ch.pos ? 'var(--gain)' : 'var(--loss)' })}</div>` : ''}
      <div class="settings-row">
        <span>Kurs</span>
        <span>${Format.price(s.price, s.curr)} <span class="change ${ch.flat?'flat':(ch.pos?'pos':'neg')}" style="margin-left:6px;">${ch.flat?'':(ch.pos?'▲ ':'▼ ')}${ch.text}</span></span>
      </div>
      <div class="settings-row">
        <span>Innehav</span>
        <span>${s.antal} st &middot; GAV ${s.gav.toLocaleString('sv-SE',{minimumFractionDigits:2})} ${s.curr}</span>
      </div>
      <div class="settings-row">
        <span>Marknadsvärde</span>
        <span class="value-amt">${Format.amountIn(s.price*s.antal, s.curr)}</span>
      </div>
      ${State.ps[s.id] ? `<div class="settings-row"><span>P/S</span><span class="ps-tag">${State.ps[s.id]}</span></div>` : ''}
      <div class="settings-row" style="flex-direction:column; align-items:stretch; gap:8px;">
        <span>Symbol${s.guess ? ' <span class="guess">*</span>' : ''}</span>
        <input class="field" type="text" value="${s.symbol}" placeholder="ex. ATCO-A.ST" onchange="ModuleActions.setStockSymbol('${s.id}', this.value)">
      </div>
      <div class="settings-row" style="flex-direction:column; align-items:stretch; gap:8px;">
        <span>Manuell kurs</span>
        <input class="field" type="text" value="${s.price}" onchange="ModuleActions.setStockPrice('${s.id}', this.value)">
      </div>
      <div class="settings-row" style="flex-direction:column; align-items:stretch; gap:8px;">
        <span>Prisalarm</span>
        <div class="row-inputs">
          <input class="field" type="text" placeholder="över" value="${alert && alert.above != null ? alert.above : ''}" onchange="ModuleActions.setStockAlert('${s.id}', 'above', this.value)">
          <input class="field" type="text" placeholder="under" value="${alert && alert.below != null ? alert.below : ''}" onchange="ModuleActions.setStockAlert('${s.id}', 'below', this.value)">
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; margin-top:14px;">
        <button class="btn btn-gold" onclick="ModuleActions.closeStockDetail()">Stäng</button>
      </div>
    `;
    document.getElementById('stockDetailScreen').classList.remove('hidden');
  }
});
