/* modules/utdelning.js - utdelningskalender, bästa-försök via Yahoo Finance.
   Mindre pålitlig än kursdata: hämtas bara på begäran, inte automatiskt vid
   varje kursuppdatering, så en trög/felande symbol inte stör resten av appen.
*/
Layout.register({
  id: 'utdelning',
  title: 'Utdelningskalender',
  defaultWidth: 420,

  data: {},
  fetching: false,

  build(container){
    const box = document.createElement('div');

    const btn = document.createElement('button');
    btn.className = 'btn btn-gold';
    btn.textContent = this.fetching ? 'Hämtar …' : 'Hämta utdelningsdata';
    btn.disabled = this.fetching;
    btn.onclick = () => this.fetchAll();
    box.appendChild(btn);

    const note = document.createElement('p');
    note.style.cssText = 'font-size:11px; color:var(--text-muted); margin-top:8px; line-height:1.5;';
    note.textContent = 'Bästa försök via Yahoo Finance - kan saknas eller vara fel för vissa bolag, särskilt utanför USA/Sverige.';
    box.appendChild(note);

    const list = document.createElement('div');
    list.className = 'grid-list';
    list.style.marginTop = '12px';
    const withSymbols = State.STOCKS.filter(s => s.symbol);
    if(withSymbols.length === 0){
      const empty = document.createElement('div'); empty.className = 'empty-note'; empty.textContent = 'Inga aktier med symbol att slå upp.';
      list.appendChild(empty);
    } else {
      withSymbols.forEach(s => list.appendChild(this.row(s)));
    }
    box.appendChild(list);
    container.appendChild(box);
  },

  row(s){
    const d = this.data[s.symbol];
    const row = document.createElement('div');
    row.className = 'row';
    if(!d){
      row.innerHTML = `<div class="row-top"><span class="ticker" title="${s.name}">${s.name}</span></div><span class="name">Ej hämtat än</span>`;
    } else if(d === 'error'){
      row.innerHTML = `<div class="row-top"><span class="ticker" title="${s.name}">${s.name}</span></div><span class="name" style="color:var(--loss)">Kunde inte hämta utdelningsdata</span>`;
    } else {
      row.innerHTML = `
        <div class="row-top">
          <span class="ticker" title="${s.name}">${s.name}</span>
          <span class="price">${d.rate || '—'}</span>
        </div>
        <div class="row-sub">
          <span class="name">Ex-dag: ${d.exDiv || '—'}</span>
          <span class="name">Direktavkastning: ${d.yieldPct || '—'}</span>
        </div>
      `;
    }
    return row;
  },

  async fetchAll(){
    if(this.fetching) return;
    this.fetching = true;
    Layout.refreshModule('utdelning');
    const withSymbols = State.STOCKS.filter(s => s.symbol);
    for(const s of withSymbols){
      try{ this.data[s.symbol] = await Market.fetchDividendCalendar(s.symbol); }
      catch(e){ this.data[s.symbol] = 'error'; }
    }
    this.fetching = false;
    Layout.refreshModule('utdelning');
  }
});
