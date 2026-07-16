/* layout.js
   Modul-registret och själva "fönster-motorn": ritar upp paneler i ett
   rutnät på GRID_COLS kolumner. Varje modul har en colSpan (bredd) och en
   valfri fast height (annars auto efter innehåll) - fri placering via
   drag-och-släpp (byt plats i State.layout.order) och fri form via de två
   kant-handtagen (bredd till höger, höjd nedtill). En modul behöver bara
   anropa Layout.register(...) - den här filen sköter allt kring placering.
*/
const Layout = {
  modules: {},
  GRID_COLS: 48,

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
  },

  defaultColSpan(mod){
    // Bygger vidare på det gamla pixel-tänket (defaultWidth) så befintliga
    // moduler får en rimlig startbredd i det nya 48-kolumners rutnätet.
    if(!mod.defaultWidth) return 16;
    return Math.max(6, Math.min(this.GRID_COLS, Math.round(mod.defaultWidth / 1900 * this.GRID_COLS)));
  },

  buildPanel(mod){
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.dataset.id = mod.id;
    const colSpan = State.layout.colSpans[mod.id] || this.defaultColSpan(mod);
    panel.style.gridColumn = `span ${colSpan}`;

    const card = document.createElement('div');
    card.className = 'card';
    const height = State.layout.heights[mod.id];
    if(height){ card.style.height = height + 'px'; card.style.overflowY = 'auto'; }

    const head = document.createElement('div');
    head.className = 'card-head';
    head.innerHTML = `<h2 class="section"><span class="drag-dots">⠿</span> ${mod.title}</h2>`;
    this.wireDrag(head, panel);

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

  // Egen drag-implementation via Pointer Events (istället för HTML5 drag-and-drop,
  // som inte stöder touch) - fungerar likadant med mus, penna och finger.
  wireDrag(handleEl, panel){
    let dragOverTarget = null;

    const findPanelAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const found = el ? el.closest('.panel') : null;
      return found && found !== panel ? found : null;
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

  // Höger kant: ändrar bredd (colSpan i rutnätet, 1-48).
  wireResize(handle, panel, id){
    let startX, startWidth, gridUnit;
    const onMove = e => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const newWidth = Math.max(gridUnit * 4, startWidth + (clientX - startX));
      const span = Math.max(4, Math.min(Layout.GRID_COLS, Math.round(newWidth / gridUnit)));
      panel.style.gridColumn = `span ${span}`;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      const span = parseInt(panel.style.gridColumn.replace('span ', ''), 10);
      if(span){ State.layout.colSpans[id] = span; State.save(); }
    };
    const onDown = e => {
      const columns = document.getElementById('columns');
      const containerWidth = columns.getBoundingClientRect().width;
      gridUnit = containerWidth / Layout.GRID_COLS;
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

  // Nedre kant: ändrar höjd i px direkt på kortet (inte rutnätsraden), med
  // scroll inuti kortet om innehållet är högre än den valda höjden. Så kan
  // en modul göras "stående" (smal och hög) eller "liggande" (bred och låg)
  // oavsett hur mycket innehåll den råkar ha just nu.
  wireVerticalResize(handle, card, id){
    let startY, startHeight;
    const onMove = e => {
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const newHeight = Math.max(120, startHeight + (clientY - startY));
      card.style.height = newHeight + 'px';
      card.style.overflowY = 'auto';
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
  }
};
