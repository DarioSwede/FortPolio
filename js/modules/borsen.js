/* modules/borsen.js */
Layout.register({
  id: 'borsen',
  title: 'Börsen idag',

  async onRefresh(){ return App.refreshOMXIndex(); },

  build(container){
    const now = Market.stockholmNow();
    const day = now.getDay();
    const minutesNow = now.getHours()*60 + now.getMinutes();
    const isOpenSE = day >= 1 && day <= 5 && minutesNow >= 540 && minutesNow < 1050;

    const status = document.createElement('div'); status.className = 'market-status';
    status.innerHTML = `
      <div class="status-dot ${isOpenSE?'open':'closed'}"></div>
      <div class="status-text">${isOpenSE ? 'Stockholmsbörsen är öppen' : 'Stockholmsbörsen är stängd'}</div>
    `;
    container.appendChild(status);

    const omx = State.omxData;
    const ch = (omx.value != null && omx.changePct != null)
      ? { pos: omx.changePct >= 0, text: Format.pctShort(omx.changePct) } : null;
    const indexBox = document.createElement('div'); indexBox.className = 'index-box';
    indexBox.innerHTML = `
      <div><div class="index-name">OMX Stockholm 30</div><div class="index-sub">${omx.symbolUsed || '^OMX'}</div></div>
      <div class="index-val">
        <div>${omx.value != null ? omx.value.toLocaleString('sv-SE',{maximumFractionDigits:2}) : (omx.status==='error' ? 'Kunde inte hämta' : '—')}</div>
        ${ch ? `<div class="change ${ch.pos?'pos':'neg'}">${ch.pos?'▲ ':'▼ '}${ch.text}</div>` : ''}
      </div>
    `;
    container.appendChild(indexBox);

    const mapWrap = document.createElement('div'); mapWrap.className = 'map-wrap';
    const img = document.createElement('img');
    img.src = 'https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg';
    img.onerror = () => { img.style.display = 'none'; };
    mapWrap.appendChild(img);
    State.EXCHANGES.forEach(ex => {
      const st = Market.exchangeStatus(ex);
      const dot = document.createElement('div');
      dot.className = 'map-dot ' + (st.isOpen ? 'open' : 'closed');
      dot.style.left = ((ex.lon+180)/360*100) + '%';
      dot.style.top = ((90-ex.lat)/180*100) + '%';
      dot.title = `${ex.flag} ${ex.name} — ${st.isOpen?'Öppen':'Stängd'} (lokal tid ${st.localTime})`;
      mapWrap.appendChild(dot);
    });
    container.appendChild(mapWrap);

    const list = document.createElement('div');
    State.EXCHANGES.forEach(ex => {
      const st = Market.exchangeStatus(ex);
      const row = document.createElement('div'); row.className = 'exch-row';
      row.innerHTML = `
        <div class="exch-name"><span class="status-dot ${st.isOpen?'open':'closed'}"></span>${ex.flag} ${ex.name}</div>
        <div class="exch-time">${st.localTime}</div>
      `;
      list.appendChild(row);
    });
    container.appendChild(list);

    const note = document.createElement('div'); note.className = 'hours-note';
    note.textContent = 'Standardöppettider, lokal tid. Tar inte hänsyn till röda dagar/halvdagar.';
    container.appendChild(note);
  }
});
