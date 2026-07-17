/* quote-row.js
   Delad radmall för Råvaror och Valutor - båda listar poster med samma
   grundform (badge, ticker+pris, valfri underrad, förändring, expanderbar
   symbolredigerare) men räknar fram priset/förändringen på helt olika sätt.
   Egen fil så själva radlayouten bara behöver ändras på ett ställe.
*/
const QuoteRow = {
  build({ id, badge, name, priceText, subLabel, changeText, changeClass, isOpen, symbolValue, symbolOnChange, onToggle }){
    const row = document.createElement('div');
    row.className = 'row row-clickable';
    row.dataset.id = id;
    row.onclick = onToggle;
    row.innerHTML = `
      <div class="row-category">${badge}</div>
      <div class="row-top">
        <span class="ticker">${name}</span>
        <span class="price">${priceText}</span>
      </div>
      ${subLabel ? `<div class="unit-suffix" style="margin-top:-2px;">${subLabel}</div>` : ''}
      <span class="change ${changeClass}">${changeText}</span>
      ${isOpen ? `
      <div class="meta" onclick="event.stopPropagation()">
        <span>Symbol:</span>
        <input class="field" type="text" value="${symbolValue}" onchange="${symbolOnChange}">
      </div>` : ''}
    `;
    return row;
  }
};
