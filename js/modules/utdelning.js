/* modules/utdelning.js - utdelningar via Yahoo Finance.
   Historik (senaste utbetalningarna) hämtas via samma beprövade chart-endpoint
   som kurser/sparklines, så den är pålitlig. Kommande ex-dag/direktavkastning
   kommer från en mindre pålitlig endpoint och visas bara om den råkar svara -
   ingen av delarna blockerar den andra.
*/
Layout.register({
  id: 'utdelning',
  title: 'Utdelningar',
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
    note.textContent = 'Historik är pålitlig data från samma källa som kurserna. Kommande ex-dag/direktavkastning är bästa försök och kan saknas för vissa bolag.';
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
      return row;
    }
    const last = d.history && d.history[0];
    const hasAnything = last || d.calendar;
    if(!hasAnything){
      row.innerHTML = `<div class="row-top"><span class="ticker" title="${s.name}">${s.name}</span></div><span class="name" style="color:var(--loss)">Ingen utdelningsdata hittad</span>`;
      return row;
    }
    const lastDateStr = last ? new Date(last.date * 1000).toLocaleDateString('sv-SE') : null;
    row.innerHTML = `
      <div class="row-top">
        <span class="ticker" title="${s.name}">${s.name}</span>
        <span class="price">${last ? last.amount : '—'}</span>
      </div>
      <div class="row-sub">
        <span class="name">Senast: ${lastDateStr || '—'}</span>
        ${d.calendar?.yieldPct ? `<span class="name">Direktavkastning: ${d.calendar.yieldPct}</span>` : ''}
      </div>
      ${d.calendar?.exDiv ? `<div class="row-sub"><span class="name">Nästa ex-dag: ${d.calendar.exDiv}</span></div>` : ''}
    `;
    return row;
  },

  async fetchAll(){
    if(this.fetching) return;
    this.fetching = true;
    Layout.refreshModule('utdelning');
    const withSymbols = State.STOCKS.filter(s => s.symbol);
    for(const s of withSymbols){
      const entry = { history: null, calendar: null };
      try{ entry.history = await Market.fetchDividendHistory(s.symbol); }
      catch(e){ /* ingen historik - visa i alla fall kalenderdata om den finns */ }
      try{ entry.calendar = await Market.fetchDividendCalendar(s.symbol); }
      catch(e){ /* bästa försök - inte kritiskt */ }
      this.data[s.symbol] = entry;
    }
    this.fetching = false;
    Layout.refreshModule('utdelning');
  }
});
