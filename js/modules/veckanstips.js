/* modules/veckanstips.js
   Jag hittade ingen bekräftad RSS/API från Dagens PS för "Veckans tips"-
   kolumnen, så istället för att bygga en skrapning som kan sluta fungera
   utan förvarning används samma klistra-in-mönster som resten av appen:
   pålitligt, och du har full koll på källan.
*/
Layout.register({
  id: 'veckanstips',
  title: 'Dagens tips',

  build(container){
    const saved = State.veckansTips || [];
    if(saved.length === 0){
      const empty = document.createElement('div'); empty.className = 'empty-note';
      empty.textContent = 'Inga tips inlagda idag - klistra in nedan.';
      container.appendChild(empty);
    } else {
      const list = document.createElement('div'); list.className = 'grid-list';
      saved.forEach(tip => {
        const row = document.createElement('div'); row.className = 'row';
        row.innerHTML = `
          <div class="row-top"><span class="ticker">${tip.bolag}</span></div>
          <div class="name">${tip.kommentar || ''}</div>
          <div class="meta">${tip.datum || ''}</div>
        `;
        list.appendChild(row);
      });
      container.appendChild(list);
    }

    const box = document.createElement('div'); box.className = 'text-box';
    box.innerHTML = `
      <h3>Klistra in dagens tips</h3>
      <p>Kopiera texten från Signallistan (eller annan källa) hit, en rad per bolag: <code>Bolag - kommentar</code>. Ersätter gårdagens tips.</p>
      <textarea id="tipsInput" class="field" placeholder="t.ex. Atlas Copco A - stark orderingång enligt Di"></textarea>
      <div class="actions-row"><button class="btn btn-gold" onclick="ModuleActions.parseTips()">Spara tips</button></div>
    `;
    container.appendChild(box);
  }
});

// Egen action-funktion för denna modul (läggs till i ModuleActions vid start).
Object.assign(ModuleActions, {
  parseTips(){
    const raw = document.getElementById('tipsInput').value;
    const today = new Date().toLocaleDateString('sv-SE');
    const newTips = raw.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const [bolag, ...rest] = line.split(' - ');
      return { bolag: bolag.trim(), kommentar: rest.join(' - ').trim(), datum: today };
    });
    // Dagens tips ersätter gårdagens - det är ett dagligt utdrag, inte en logg.
    State.veckansTips = newTips.slice(0, 30);
    State.save();
    Layout.refreshModule('veckanstips');
  }
});
