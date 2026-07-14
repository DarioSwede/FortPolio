/* modules/allokering.js */
Layout.register({
  id: 'allokering',
  title: 'Allokering',

  deviationColor(actual, target){
    const diff = Math.abs(actual - target);
    const css = getComputedStyle(document.documentElement);
    if(diff <= 3) return css.getPropertyValue('--gain').trim();
    if(diff <= 8) return css.getPropertyValue('--warn').trim();
    return css.getPropertyValue('--loss').trim();
  },

  COLOR_AKTIER: 'var(--gold)',
  COLOR_FONDER: '#5B8DEF',

  build(container){
    const stockValueSEK = State.STOCKS.filter(s => s.curr === 'SEK').reduce((sum,s) => sum + s.price*s.antal, 0);
    const fundValue = State.FUNDS.reduce((sum,f) => sum + f.varde, 0);
    const total = stockValueSEK + fundValue || 1;
    const actualAktier = (stockValueSEK / total) * 100;
    const actualFonder = (fundValue / total) * 100;
    const targetFonder = 100 - State.targetAktier;
    const statusAktier = this.deviationColor(actualAktier, State.targetAktier);
    const statusFonder = this.deviationColor(actualFonder, targetFonder);

    const wrap = document.createElement('div'); wrap.className = 'alloc-wrap';
    const donut = document.createElement('div'); donut.className = 'donut';
    donut.style.background = `conic-gradient(${this.COLOR_AKTIER} 0% ${actualAktier}%, ${this.COLOR_FONDER} ${actualAktier}% 100%)`;
    const legend = document.createElement('div'); legend.className = 'legend';
    legend.innerHTML = `
      <div class="legend-row"><span class="dot" style="background:${this.COLOR_AKTIER}"></span>
        <span class="legend-text">Aktier <b>${actualAktier.toFixed(1).replace('.',',')}%</b> &middot; mål ${State.targetAktier}%</span>
        <span class="dot" title="Avvikelse mot mål" style="background:${statusAktier}; margin-left:auto;"></span></div>
      <div class="legend-row"><span class="dot" style="background:${this.COLOR_FONDER}"></span>
        <span class="legend-text">Fonder <b>${actualFonder.toFixed(1).replace('.',',')}%</b> &middot; mål ${targetFonder}%</span>
        <span class="dot" title="Avvikelse mot mål" style="background:${statusFonder}; margin-left:auto;"></span></div>
    `;
    wrap.appendChild(donut); wrap.appendChild(legend);
    container.appendChild(wrap);

    const targetRow = document.createElement('div'); targetRow.className = 'target-row';
    targetRow.innerHTML = `
      <label>Mål aktier</label>
      <input class="field" type="number" min="0" max="100" value="${State.targetAktier}" onchange="ModuleActions.setTargetAktier(this.value)">
      <span style="color:var(--text-muted); font-size:11px;">%</span>
      <label style="margin-left:10px;">Fonder</label>
      <span style="font-family:'IBM Plex Mono',monospace; font-size:12px;">${targetFonder}%</span>
    `;
    container.appendChild(targetRow);
  }
});
