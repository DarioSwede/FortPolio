/* redeye.js
   Egen "sida" (fristående vy, inte ett dashboard-kort bland de andra) för
   nyheter/analyser från Redeye. Ingen backend kan hämta e-post automatiskt
   från en statisk GitHub Pages-sajt, så precis som Dagens tips/Signallistan
   är det klistra-in-baserat - men visat som en kalender istället för en
   lista, för bättre överblick över när saker kom in. En liten prick på
   headerknappen visar om det finns poster tillagda sen sidan senast öppnades.
*/
const Redeye = {
  viewYear: null,
  viewMonth: null, // 0-11
  selectedDate: null, // 'YYYY-MM-DD'

  MONTH_NAMES: ['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'],
  WEEKDAY_LABELS: ['M','T','O','T','F','L','S'],

  init(){
    this.updateBadge();
  },

  todayStr(){
    return new Date().toISOString().slice(0,10);
  },

  // Enkelt textescape - innehållet klistras in från externa mejl, så det ska
  // aldrig tolkas som HTML när det sätts via innerHTML.
  escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  },

  updateBadge(){
    const badge = document.getElementById('redeyeBadge');
    if(!badge) return;
    const lastViewed = State.redeyeLastViewed;
    const hasUnread = State.redeyeNews.some(e => !lastViewed || (e.addedAt && e.addedAt > lastViewed));
    badge.style.display = hasUnread ? 'block' : 'none';
  },

  open(){
    document.getElementById('redeyeScreen').classList.remove('hidden');
    const now = new Date();
    this.viewYear = now.getFullYear();
    this.viewMonth = now.getMonth();
    this.selectedDate = this.todayStr();
    this.render();
    // Öppnandet i sig räknas som "läst" - badgen ska försvinna direkt.
    State.redeyeLastViewed = new Date().toISOString();
    State.save();
    this.updateBadge();
  },

  close(){
    document.getElementById('redeyeScreen').classList.add('hidden');
  },

  prevMonth(){
    this.viewMonth--;
    if(this.viewMonth < 0){ this.viewMonth = 11; this.viewYear--; }
    this.render();
  },

  nextMonth(){
    this.viewMonth++;
    if(this.viewMonth > 11){ this.viewMonth = 0; this.viewYear++; }
    this.render();
  },

  selectDay(dateStr){
    this.selectedDate = dateStr;
    this.render();
  },

  entriesFor(dateStr){
    return State.redeyeNews
      .filter(e => e.date === dateStr)
      .sort((a,b) => (a.addedAt || '').localeCompare(b.addedAt || ''));
  },

  render(){
    this.renderCalendar();
    this.renderEntries();
  },

  renderCalendar(){
    const wrap = document.getElementById('redeyeCalendar');
    if(!wrap) return;
    const y = this.viewYear, m = this.viewMonth;
    const first = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    // Måndag som första veckodag - JS getDay() ger 0=söndag..6=lördag.
    const firstWeekday = (first.getDay() + 6) % 7;
    const today = this.todayStr();
    const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;

    const countByDay = {};
    State.redeyeNews.forEach(e => {
      if(e.date && e.date.slice(0, 7) === monthPrefix) countByDay[e.date] = (countByDay[e.date] || 0) + 1;
    });

    let cells = '';
    for(let i = 0; i < firstWeekday; i++) cells += `<div class="cal-cell empty"></div>`;
    for(let d = 1; d <= daysInMonth; d++){
      const dateStr = `${monthPrefix}-${String(d).padStart(2, '0')}`;
      const count = countByDay[dateStr] || 0;
      const cls = ['cal-cell'];
      if(dateStr === today) cls.push('today');
      if(dateStr === this.selectedDate) cls.push('selected');
      if(count) cls.push('has-entries');
      cells += `
        <div class="${cls.join(' ')}" onclick="Redeye.selectDay('${dateStr}')">
          <span class="cal-day-num">${d}</span>
          ${count ? '<span class="cal-dot"></span>' : ''}
        </div>`;
    }

    wrap.innerHTML = `
      <div class="cal-header">
        <button class="btn icon-btn" onclick="Redeye.prevMonth()">‹</button>
        <span class="cal-title">${this.MONTH_NAMES[m]} ${y}</span>
        <button class="btn icon-btn" onclick="Redeye.nextMonth()">›</button>
      </div>
      <div class="cal-grid cal-weekdays">${this.WEEKDAY_LABELS.map(w => `<div class="cal-weekday">${w}</div>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
    `;
  },

  renderEntries(){
    const wrap = document.getElementById('redeyeEntries');
    if(!wrap) return;
    const entries = this.selectedDate ? this.entriesFor(this.selectedDate) : [];
    const dateLabel = this.selectedDate
      ? new Date(this.selectedDate + 'T00:00:00').toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })
      : '';

    const entriesHTML = entries.length === 0
      ? `<div class="empty-note">Inga sparade nyheter den här dagen.</div>`
      : entries.map(e => `
        <div class="redeye-entry">
          <div class="redeye-entry-title">${this.escapeHtml(e.title) || '(utan rubrik)'}</div>
          ${e.content ? `<div class="redeye-entry-content">${this.escapeHtml(e.content).replace(/\n/g, '<br>')}</div>` : ''}
          <button class="btn" style="padding:4px 8px; font-size:10px; margin-top:8px;" onclick="ModuleActions.removeRedeyeEntry('${e.id}')">Ta bort</button>
        </div>
      `).join('');

    wrap.innerHTML = `
      <h3 style="text-transform:capitalize;">${dateLabel}</h3>
      ${entriesHTML}
      <div class="text-box" style="margin-top:14px;">
        <h3>Lägg till nyhet</h3>
        <p>Klistra in texten från mejlet (eller skriv en egen anteckning).</p>
        <div class="row-inputs">
          <input class="field" type="date" id="redeyeDateInput" value="${this.selectedDate || this.todayStr()}">
          <input class="field" type="text" id="redeyeTitleInput" placeholder="Rubrik">
        </div>
        <textarea id="redeyeContentInput" class="field" placeholder="Klistra in text från Redeye här..."></textarea>
        <div class="actions-row"><button class="btn btn-gold" onclick="ModuleActions.addRedeyeEntry()">Lägg till</button></div>
      </div>
    `;
  }
};
