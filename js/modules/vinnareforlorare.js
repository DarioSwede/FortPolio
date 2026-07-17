/* modules/vinnareforlorare.js
   Rankar OMX30-bolagen (se DATA.OMXS30_LIST i data.js) efter dagens
   procentuella rörelse. Kräver att kortets egen ↻-knapp har tryckts minst
   en gång - innan dess visas ett meddelande om det.
*/
Layout.register({
  id: 'vinnareforlorare',
  title: 'Dagens vinnare & förlorare',

  async onRefresh(){ return App.refreshOMXS30(); },

  build(container){
    const list = State.OMXS30_LIST.filter(s => s.changePct != null);

    if(list.length === 0){
      const empty = document.createElement('div'); empty.className = 'empty-note';
      empty.textContent = 'Tryck ↻ i kortets hörn för att hämta dagens rörelser bland OMX30-bolagen.';
      container.appendChild(empty);
      return;
    }

    const sorted = list.slice().sort((a,b) => b.changePct - a.changePct);
    const winners = sorted.slice(0, 5);
    const losers = sorted.slice(-5).reverse();

    container.appendChild(this.section('Vinnare', winners));
    container.appendChild(this.section('Förlorare', losers));

    const note = document.createElement('div'); note.className = 'hours-note';
    note.textContent = `Baserat på en lista över ${State.OMXS30_LIST.length} av OMX30-bolagen (se data.js) - inte hela börsen, och listan bör stämmas av då och då eftersom indexet balanseras om.`;
    container.appendChild(note);
  },

  section(label, items){
    const wrap = document.createElement('div');
    const h = document.createElement('div'); h.className = 'chip-group-label'; h.textContent = label;
    wrap.appendChild(h);
    items.forEach((s, i) => {
      const row = document.createElement('div'); row.className = 'mover-row';
      const pos = s.changePct >= 0;
      row.innerHTML = `
        <span class="mover-rank">${i+1}.</span>
        <span class="ticker" style="flex:1;">${s.name}</span>
        <span class="change ${pos?'pos':'neg'}">${pos?'▲ ':'▼ '}${Format.pctShort(s.changePct)}</span>
      `;
      wrap.appendChild(row);
    });
    return wrap;
  }
});
