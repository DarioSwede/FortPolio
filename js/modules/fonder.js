/* modules/fonder.js */
Layout.register({
  id: 'fonder',
  title: 'Fonder <span style="text-transform:none; font-weight:400; font-size:10.5px;">NAV manuellt</span>',
  defaultWidth: 460,

  build(container){
    const sortRow = document.createElement('div'); sortRow.style.cssText = 'display:flex; justify-content:flex-end;';
    const sortDir = State.sortDir.fonder;
    const sortBtn = document.createElement('button'); sortBtn.className = 'chip';
    sortBtn.textContent = `Vinst/förlust ${sortDir === 'desc' ? '▼' : '▲'}`;
    sortBtn.title = 'Byt sorteringsriktning';
    sortBtn.onclick = () => ModuleActions.toggleSortDir('fonder');
    sortRow.appendChild(sortBtn);
    container.appendChild(sortRow);

    const list = document.createElement('div'); list.className = 'grid-list';
    State.FUNDS.slice()
      .sort((a,b) => {
        const diff = Format.pct(b.varde,b.kostnad).raw - Format.pct(a.varde,a.kostnad).raw; // desc = bäst först
        return sortDir === 'asc' ? -diff : diff;
      })
      .forEach(f => list.appendChild(this.row(f)));
    container.appendChild(list);
  },

  row(f){
    const row = document.createElement('div'); row.className = 'row';
    const ch = Format.pct(f.varde, f.kostnad);
    const hist = (State.fundHistory[f.id] || []).map(h => h.varde);
    row.innerHTML = `
      <div class="row-top">
        <span class="ticker" title="${f.name}">${f.name}</span>
        <span class="price">${Format.amount(f.varde)}</span>
      </div>
      <div class="row-sub">
        <span class="name">Inköpsvärde ${Format.amount(f.kostnad)}</span>
        <span class="change ${ch.pos?'pos':'neg'}">${ch.pos?'▲ ':'▼ '}${ch.text}</span>
      </div>
      ${hist.length >= 2 ? `<div class="row-sparkline">${Charts.sparkline(hist, { color: ch.pos ? 'var(--gain)' : 'var(--loss)' })}</div>` : ''}`;
    return row;
  }
});
