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
    const targetFonder = 100 - State.targetAktier;
    const note = document.createElement('p');
    note.style.cssText = 'font-size:11.5px; color:var(--text-muted); line-height:1.5; margin-bottom:4px;';
    note.textContent = 'Fördelningen mellan aktier och fonder visas som en stapel högst upp på sidan.';
    container.appendChild(note);

    const targetRow = document.createElement('div'); targetRow.className = 'target-row';
    targetRow.style.marginTop = '0';
    targetRow.style.paddingTop = '14px';
    targetRow.innerHTML = `
      <label>Mål aktier</label>
      <input class="field" type="number" min="0" max="100" value="${State.targetAktier}" onchange="ModuleActions.setTargetAktier(this.value)">
      <span style="color:var(--text-muted); font-size:11px;">%</span>
      <label style="margin-left:10px;">Fonder</label>
      <span style="font-family:'IBM Plex Mono',monospace; font-size:12px;">${targetFonder}%</span>
    `;
    container.appendChild(targetRow);
  },

  // Kompakt stapel istället för cirkeldiagram, för Översikt-sektionen högst
  // upp på sidan - behåller de gröna/gula/röda målavvikelse-punkterna.
  distBlock(){
    const stockValueSEK = State.STOCKS.filter(s => s.curr === 'SEK').reduce((sum,s) => sum + s.price*s.antal, 0);
    const fundValue = State.FUNDS.reduce((sum,f) => sum + f.varde, 0);
    const total = stockValueSEK + fundValue || 1;
    const actualAktier = (stockValueSEK / total) * 100;
    const actualFonder = (fundValue / total) * 100;
    const targetFonder = 100 - State.targetAktier;
    const statusAktier = this.deviationColor(actualAktier, State.targetAktier);
    const statusFonder = this.deviationColor(actualFonder, targetFonder);

    const block = document.createElement('div');
    const label = document.createElement('div'); label.className = 'chip-group-label'; label.style.marginTop = '0'; label.textContent = 'Allokering';
    block.appendChild(label);
    block.insertAdjacentHTML('beforeend', Charts.barOnly([
      { val: stockValueSEK, color: this.COLOR_AKTIER },
      { val: fundValue, color: this.COLOR_FONDER }
    ]));
    const legend = document.createElement('div'); legend.className = 'bar-legend';
    legend.innerHTML = `
      <span class="bar-legend-item"><span class="dot" style="background:${this.COLOR_AKTIER}"></span>Aktier <b>${actualAktier.toFixed(0)}%</b> &middot; mål ${State.targetAktier}% <span class="dot" title="Avvikelse mot mål" style="background:${statusAktier};"></span></span>
      <span class="bar-legend-item"><span class="dot" style="background:${this.COLOR_FONDER}"></span>Fonder <b>${actualFonder.toFixed(0)}%</b> &middot; mål ${targetFonder}% <span class="dot" title="Avvikelse mot mål" style="background:${statusFonder};"></span></span>
    `;
    block.appendChild(legend);
    return block;
  }
});
