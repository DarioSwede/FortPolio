/* history-chart.js
   Portföljvärde över tid, visas kompakt i headerns hero-kort (flyttad dit
   ur den gamla fristående "Portföljvärde över tid"-modulen för en
   snyggare, mer lättöverskådlig topp). Bygger av lokala ögonblicksbilder,
   se State.recordSnapshot() i state.js.
*/
const HistoryChart = {
  render(){
    const body = document.getElementById('heroChartBody');
    const change = document.getElementById('heroChartChange');
    if(!body || !change) return;

    const hist = State.valueHistory;
    if(hist.length < 2){
      body.innerHTML = `<div class="empty-note" style="padding:0; text-align:left;">Historiken byggs upp efter hand.</div>`;
      change.textContent = '';
      return;
    }

    const values = hist.map(h => h.total);
    const first = values[0], last = values[values.length - 1];
    const diff = last - first;
    const pct = first ? (diff / first) * 100 : 0;
    const pos = pct >= 0;

    body.innerHTML = Charts.sparkline(values, { responsive:true, width:220, height:48, strokeWidth:2, color: pos ? 'var(--gain)' : 'var(--loss)' });
    change.innerHTML = `<span class="change ${pos?'pos':'neg'}">${pos?'▲ ':'▼ '}${Format.pctShort(pct)}</span> · ${Format.amount(diff)} sedan ${new Date(hist[0].t).toLocaleDateString('sv-SE')}`;
  }
};
