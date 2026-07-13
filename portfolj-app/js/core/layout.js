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
    const width = State.layout.widths[mod.id];
    if(width) panel.style.setProperty('--panel-basis', width + 'px');

    const card = document.createElement('div');
    card.className = 'card';

    const head = document.createElement('div');
    head.className = 'card-head';
    head.draggable = true;
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

  wireDrag(handleEl, panel){
    handleEl.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', panel.dataset.id);
      panel.classList.add('dragging');
    });
    handleEl.addEventListener('dragend', () => panel.classList.remove('dragging'));

    panel.addEventListener('dragover', e => {
      e.preventDefault();
      panel.classList.add('drag-over');
    });
    panel.addEventListener('dragleave', () => panel.classList.remove('drag-over'));
    panel.addEventListener('drop', e => {
      e.preventDefault();
      panel.classList.remove('drag-over');
      const draggedId = e.dataTransfer.getData('text/plain');
      const targetId = panel.dataset.id;
      if(draggedId === targetId) return;
      const order = State.layout.order;
      const from = order.indexOf(draggedId);
      const to = order.indexOf(targetId);
      if(from === -1 || to === -1) return;
      order.splice(from, 1);
      order.splice(to, 0, draggedId);
      State.save();
      this.renderAll();
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
