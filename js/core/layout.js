/* layout.js
   Modul-registret och själva "fönster-motorn". Paneler positioneras som en
   riktig masonry (som Pinterest): varje av UNIT_COLS smala kolumner packas
   för sig, så en kort modul inte lämnar en tom lucka bara för att en annan
   modul i samma "rad" råkar vara mycket högre. CSS Grid med gemensamma
   rad-höjder gav exakt det problemet - därför beräknas position/bredd/höjd
   i JS istället (relayout()) och sätts som absolut positionering.

   Bredd = colSpan (1-UNIT_COLS), höjd = auto efter innehåll om inget annat
   valts, annars en fast height i px (satt via det nedre kant-handtaget).
   Ordningen i State.layout.order styr både dra-och-släpp och var i
   packningen modulen hamnar - fri placering utan att moduler behöver
   låsas ihop.
*/
const Layout = {
  modules: {},
  UNIT_COLS: 24,
  GAP: 18,
  MOBILE_BREAKPOINT: 700,

  register(mod){
    // mod: { id, title, build(container), refresh?(container) }
    this.modules[mod.id] = mod;
    if(!State.layout.order.includes(mod.id)) State.layout.order.push(mod.id);
  },

  renderAll(){
    const columns = document.getElementById('columns');
    columns.innerHTML = '';
    const hidden = new Set(State.hiddenModules || []);
    State.layout.order.forEach(id => {
      if(hidden.has(id)) return;
      const mod = this.modules[id];
      if(!mod) return; // modul kan saknas om man tagit bort en fil
      columns.appendChild(this.buildPanel(mod));
    });
    this.relayout();
  },

  defaultColSpan(mod){
    // Bygger vidare på det gamla pixel-tänket (defaultWidth) så befintliga
    // moduler får en rimlig startbredd i masonry-rutnätet.
    if(!mod.defaultWidth) return 8;
    return Math.max(3, Math.min(this.UNIT_COLS, Math.round(mod.defaultWidth / 1900 * this.UNIT_COLS)));
  },

  buildPanel(mod){
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.dataset.id = mod.id;

    const card = document.createElement('div');
    card.className = 'card';
    const height = State.layout.heights[mod.id];
    if(height){ card.style.height = height + 'px'; card.style.overflowY = 'auto'; }

    const head = document.createElement('div');
    head.className = 'card-head';

    // Bara titeln (inte hela head-raden) är dragbar nu - annars skulle ett
    // klick på uppdateringsknappen nedan också trigga en drag-start.
    const titleWrap = document.createElement('div');
    titleWrap.className = 'card-head-drag';
    titleWrap.innerHTML = `<h2 class="section"><span class="drag-dots">⠿</span> ${mod.title}</h2>`;
    this.wireDrag(titleWrap, panel);
    head.appendChild(titleWrap);

    // Moduler med en egen live-datakälla (aktier, råvaror, valutor, ...) kan
    // ange onRefresh() för att få en egen uppdateringsknapp här istället för
    // en gemensam global "Uppdatera kurser"-knapp.
    if(mod.onRefresh){
      const refreshWrap = document.createElement('div');
      refreshWrap.className = 'module-refresh';
      const stamp = document.createElement('span');
      stamp.className = 'module-stamp';
      const btn = document.createElement('button');
      btn.className = 'btn icon-btn';
      btn.title = 'Uppdatera';
      btn.textContent = '↻';
      btn.onclick = async () => {
        btn.disabled = true;
        const prevText = btn.textContent;
        btn.textContent = '…';
        try{
          const result = await mod.onRefresh();
          const time = new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'});
          stamp.textContent = (result && result.fail) ? `${time} (${result.fail} fel)` : time;
        }catch(e){
          stamp.textContent = 'Fel';
        }finally{
          btn.disabled = false;
          btn.textContent = prevText;
        }
      };
      refreshWrap.appendChild(stamp);
      refreshWrap.appendChild(btn);
      head.appendChild(refreshWrap);
    }

    const body = document.createElement('div');
    body.className = 'card-body';

    card.appendChild(head);
    card.appendChild(body);
    panel.appendChild(card);

    const hHandle = document.createElement('div');
    hHandle.className = 'resize-handle';
    hHandle.title = 'Dra för att ändra bredd';
    this.wireResize(hHandle, panel, mod.id);
    panel.appendChild(hHandle);

    const vHandle = document.createElement('div');
    vHandle.className = 'resize-handle-v';
    vHandle.title = 'Dra för att ändra höjd (stående/liggande)';
    this.wireVerticalResize(vHandle, card, mod.id);
    panel.appendChild(vHandle);

    mod.build(body);
    return panel;
  },

  // Räknar om position/bredd/höjd för alla paneler. Körs efter renderAll(),
  // efter varje drag/resize, och på window-resize. No-op på mobil - där
  // sköter CSS multicol (column-count) packningen istället.
  relayout(){
    const columns = document.getElementById('columns');
    if(!columns) return;
    if(window.innerWidth <= this.MOBILE_BREAKPOINT) return;

    const containerWidth = columns.getBoundingClientRect().width;
    if(containerWidth < 50) return;

    const N = this.UNIT_COLS, GAP = this.GAP;
    const unitWidth = (containerWidth - (N - 1) * GAP) / N;
    const colHeights = new Array(N).fill(0);
    const panels = [...columns.querySelectorAll(':scope > .panel')];
    const widthOf = span => span * unitWidth + (span - 1) * GAP;

    // Pass 1: sätt bredden innan något mäts, så innehållet (t.ex. grid-list-
    // kolumner, radbrytningar) faktiskt renderar vid sin slutgiltiga bredd
    // innan vi läser av höjden - annars mäter vi fel höjd.
    const spans = panels.map(panel => {
      const id = panel.dataset.id;
      const mod = this.modules[id];
      const custom = State.layout.colSpans[id];
      const span = Math.max(1, Math.min(N, custom || this.defaultColSpan(mod)));
      panel.style.position = 'absolute';
      panel.style.width = widthOf(span) + 'px';
      return { span, custom: custom != null };
    });

    // Pass 2: mät faktisk höjd (nu med rätt bredd) och packa in i den kolumn
    // (av de span breda) som för tillfället är kortast - en riktig masonry,
    // ingen delad rad-höjd som lämnar tomma luckor.
    const placements = panels.map((panel, i) => {
      const span = spans[i].span;
      let bestStart = 0, bestTop = Infinity;
      for(let start = 0; start <= N - span; start++){
        let maxH = 0;
        for(let c = start; c < start + span; c++) maxH = Math.max(maxH, colHeights[c]);
        if(maxH < bestTop){ bestTop = maxH; bestStart = start; }
      }
      const h = panel.getBoundingClientRect().height;
      for(let c = bestStart; c < bestStart + span; c++) colHeights[c] = bestTop + h + GAP;
      return { panel, start: bestStart, span, top: bestTop, height: h };
    });

    // Pass 3: en panel utan egen (användarvald) bredd som råkar stå ensam i
    // sin "rad" - ingen annan panel delar dess kolumner i samma höjdintervall
    // - får fylla ut till närmaste verkliga granne istället för att lämna
    // resten av bredden tom. Löser t.ex. att bara Valutor synlig (allt annat
    // dolt i Inställningar) annars behåller sin smala standardbredd med en
    // stor tom yta bredvid, trots att inget annat kan stå där.
    placements.forEach((p, i) => {
      if(spans[i].custom) return; // respektera en bredd användaren själv dragit
      let maxReach = N;
      placements.forEach((other, j) => {
        if(j === i) return;
        const overlaps = other.top < p.top + p.height && other.top + other.height > p.top;
        if(overlaps && other.start >= p.start + p.span && other.start < maxReach) maxReach = other.start;
      });
      if(maxReach > p.start + p.span){
        p.span = maxReach - p.start;
        p.panel.style.width = widthOf(p.span) + 'px';
      }
    });

    placements.forEach(p => {
      p.panel.style.left = (p.start * (unitWidth + GAP)) + 'px';
      p.panel.style.top = p.top + 'px';
    });

    columns.style.height = Math.max(0, Math.max(0, ...colHeights) - GAP) + 'px';
  },

  // Egen drag-implementation via Pointer Events (istället för HTML5 drag-and-drop,
  // som inte stöder touch) - fungerar likadant med mus, penna och finger.
  wireDrag(handleEl, panel){
    let dragOverTarget = null;

    const findPanelAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const found = el ? el.closest('.panel') : null;
      if(found && found !== panel) return found;

      // Masonryn packar paneler efter sin egen höjd, så det finns dödyta
      // mellan kortare paneler i en kolumn där elementFromPoint bara
      // träffar #columns-behållaren - utan den här reserv-sökningen kunde
      // man aldrig släppa en panel där, vilket kändes som att dra inte
      // fungerade alls. Hitta då närmaste panel istället så drop alltid
      // landar någonstans så länge man är inom layout-ytan.
      const columns = document.getElementById('columns');
      const bounds = columns.getBoundingClientRect();
      if(x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null;

      let closest = null, bestDist = Infinity;
      columns.querySelectorAll(':scope > .panel').forEach(p => {
        if(p === panel) return;
        const r = p.getBoundingClientRect();
        const cx = Math.min(Math.max(x, r.left), r.right);
        const cy = Math.min(Math.max(y, r.top), r.bottom);
        const d = Math.hypot(cx - x, cy - y);
        if(d < bestDist){ bestDist = d; closest = p; }
      });
      return closest;
    };

    const onMove = e => {
      e.preventDefault();
      const target = findPanelAt(e.clientX, e.clientY);
      if(target !== dragOverTarget){
        if(dragOverTarget) dragOverTarget.classList.remove('drag-over');
        if(target) target.classList.add('drag-over');
        dragOverTarget = target;
      }
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      panel.classList.remove('dragging');

      if(dragOverTarget){
        dragOverTarget.classList.remove('drag-over');
        const order = State.layout.order;
        const from = order.indexOf(panel.dataset.id);
        const to = order.indexOf(dragOverTarget.dataset.id);
        dragOverTarget = null;
        if(from === -1 || to === -1 || from === to) return;
        order.splice(from, 1);
        order.splice(to, 0, panel.dataset.id);
        State.save();
        this.renderAll();
      }
    };

    handleEl.addEventListener('pointerdown', e => {
      if(e.button !== undefined && e.button !== 0) return;
      panel.classList.add('dragging');
      document.addEventListener('pointermove', onMove, { passive:false });
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
      e.preventDefault();
    });
  },

  // Höger kant: ändrar bredd (colSpan, 1-UNIT_COLS). Kör om hela masonry-
  // packningen live under dragningen så resten av layouten flyter med.
  wireResize(handle, panel, id){
    let startX, startWidth, unitWidth;
    const onMove = e => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const newWidth = Math.max(unitWidth * 2, startWidth + (clientX - startX));
      const span = Math.max(1, Math.min(Layout.UNIT_COLS, Math.round(newWidth / unitWidth)));
      State.layout.colSpans[id] = span;
      Layout.relayout();
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      State.save();
    };
    const onDown = e => {
      const columns = document.getElementById('columns');
      const containerWidth = columns.getBoundingClientRect().width;
      unitWidth = (containerWidth - (Layout.UNIT_COLS - 1) * Layout.GAP) / Layout.UNIT_COLS;
      startX = e.touches ? e.touches[0].clientX : e.clientX;
      startWidth = panel.getBoundingClientRect().width;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove);
      document.addEventListener('touchend', onUp);
      e.preventDefault();
    };
    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('touchstart', onDown);
  },

  // Nedre kant: ändrar höjd i px direkt på kortet (inte packningsalgoritmen),
  // med scroll inuti kortet om innehållet är högre än den valda höjden. Så
  // kan en modul göras "stående" (smal och hög) eller "liggande" (bred och
  // låg) oavsett hur mycket innehåll den råkar ha just nu. Körs om masonryn
  // live så moduler under den flyter med uppåt/nedåt.
  wireVerticalResize(handle, card, id){
    let startY, startHeight;
    const onMove = e => {
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const newHeight = Math.max(120, startHeight + (clientY - startY));
      card.style.height = newHeight + 'px';
      card.style.overflowY = 'auto';
      Layout.relayout();
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      const finalHeight = parseInt(card.style.height, 10);
      if(finalHeight){ State.layout.heights[id] = finalHeight; State.save(); }
    };
    const onDown = e => {
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      startHeight = card.getBoundingClientRect().height;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove);
      document.addEventListener('touchend', onUp);
      e.preventDefault();
    };
    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('touchstart', onDown);
  },

  // Anropas av en modul som bara vill rita om sig själv (t.ex. klockan i
  // Börsen-idag varje minut) utan att röra resten av sidan.
  refreshModule(id){
    const body = document.querySelector(`[data-id="${id}"] .card-body`);
    const mod = this.modules[id];
    if(body && mod){ body.innerHTML = ''; mod.build(body); }
    this.relayout();
  }
};

// Fönstret kan bli om- eller smalare/bredare (inklusive korsa mobil-
// brytpunkten) utan att sidan laddas om - räkna om masonryn då också.
(function(){
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => Layout.relayout(), 150);
  });
})();
