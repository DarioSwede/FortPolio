/* modules/historik.js - portföljvärde över tid, byggt av lokala ögonblicksbilder */
Layout.register({
  id: 'historik',
  title: 'Portföljvärde över tid',
  defaultWidth: 420,

  build(container){
    const hist = State.valueHistory;
    if(hist.length < 2){
      const empty = document.createElement('div'); empty.className = 'empty-note';
      empty.textContent = 'Historiken byggs upp efter hand som du använder appen - inga tidigare punkter finns att visa än.';
      container.appendChild(empty);
      return;
    }
    const values = hist.map(h => h.total);
    const first = values[0], last = values[values.length - 1];
    const diff = last - first;
    const pct = first ? (diff / first) * 100 : 0;
    const pos = pct >= 0;

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div style="display:flex; align-items:baseline; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
        <span class="change ${pos ? 'pos' : 'neg'}">${pos ? '▲ ' : '▼ '}${Format.pctShort(pct)}</span>
        <span class="name">${Format.amount(diff)} sedan ${new Date(hist[0].t).toLocaleDateString('sv-SE')}</span>
      </div>
      <div class="big-sparkline">${Charts.sparkline(values, { responsive:true, width:360, height:90, strokeWidth:2, color: pos ? 'var(--gain)' : 'var(--loss)' })}</div>
      <div class="stamp" style="margin-top:8px;">${hist.length} sparade punkt${hist.length===1?'':'er'} · en per timme du haft appen öppen</div>
    `;
    container.appendChild(wrap);
  }
});
