/* layout.js
   Modul-registret och själva "fönster-motorn": ritar upp paneler i den
   ordning/bredd som State.layout säger, och hanterar drag för att flytta
   och dra-i-kanten för att ändra bredd. En modul behöver bara anropa
   Layout.register(...) - den här filen sköter allt kring placering.
*/
const Layout = {
  modules: {},

  register(mod){
    // mod: { id, title, build(container), refresh?(container) }
    this.modules[mod.id] = mod;
    if(!State.layout.order.includes(mod.id)) State.layout.order.push(mod.id);
  },

  renderAll(){
    const columns = document.getElementById('columns');
    columns.innerHTML = '';
    State.layout.order.forEach(id => {
      const mod = this.modules[id];
      if(!mod) return; // modul kan saknas om man tagit bort en fil
      columns.appendChild(this.buildPanel(mod));
    });
  },

  buildPanel(mod){
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.dataset.id = mod.id;
    const width = State.layout.widths[mod.id] || mod.defaultWidth;
    if(width) panel.style.setProperty('--panel-basis', width + 'px');

    const card = document.createElement('div');
    card.className = 'card';

    const head = document.createElement('div');
    head.className = 'card-head';
    head.innerHTML = `<h2 class="section"><span class="drag-dots">⠿</span> ${mod.title}</h2>`;
    this.wireDrag(head, panel);

    const body = document.createElement('div');
    body.className = 'card-body';

    card.appendChild(head);
    card.appendChild(body);
    panel.appendChild(card);

    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    this.wireResize(handle, panel, mod.id);
    panel.appendChild(handle);

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

  wireResize(handle, panel, id){
    let startX, startWidth;
    const onMove = e => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const newWidth = Math.max(260, startWidth + (clientX - startX));
      panel.style.setProperty('--panel-basis', newWidth + 'px');
    };
    const onUp = e => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      const finalWidth = parseInt(panel.style.getPropertyValue('--panel-basis'));
      if(finalWidth){ State.layout.widths[id] = finalWidth; State.save(); }
    };
    const onDown = e => {
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

  // Anropas av en modul som bara vill rita om sig själv (t.ex. klockan i
  // Börsen-idag varje minut) utan att röra resten av sidan.
  refreshModule(id){
    const panel = document.querySelector(`.panel[data-id="${id}"] .card-body`);
    const mod = this.modules[id];
    if(panel && mod){ panel.innerHTML = ''; mod.build(panel); }
  }
};
