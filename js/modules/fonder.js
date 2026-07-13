/* modules/fonder.js */
Layout.register({
  id: 'fonder',
  title: 'Fonder <span style="text-transform:none; font-weight:400; font-size:10.5px;">NAV manuellt</span>',

  build(container){
    const list = document.createElement('div'); list.className = 'grid-list';
    State.FUNDS.slice()
      .sort((a,b) => Format.pct(b.varde,b.kostnad).raw - Format.pct(a.varde,a.kostnad).raw)
      .forEach(f => list.appendChild(this.row(f)));
    container.appendChild(list);
  },

  row(f){
    const row = document.createElement('div'); row.className = 'row';
    const ch = Format.pct(f.varde, f.kostnad);
    row.innerHTML = `
      <div class="row-top">
        <span class="ticker" title="${f.name}">${f.name}</span>
        <span class="price">${Format.amount(f.varde)}</span>
      </div>
      <div class="row-sub">
        <span class="name">Inköpsvärde ${Format.amount(f.kostnad)}</span>
        <span class="change ${ch.pos?'pos':'neg'}">${ch.pos?'▲ ':'▼ '}${ch.text}</span>
      </div>`;
    return row;
  }
});
