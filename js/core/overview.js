/* overview.js
   De tre cirkeldiagrammen (allokering, sektor, geografi) samlade högst upp
   på sidan, centrerat. Återanvänder donut-byggarna i allokering.js/aktier.js
   istället för att duplicera logiken - den här filen bara placerar dem.
*/
const Overview = {
  render(){
    const container = document.getElementById('overviewDonuts');
    if(!container) return;

    const hidden = new Set(State.hiddenModules || []);
    if(hidden.has('overview')){
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');
    container.innerHTML = '';

    const aktierMod = Layout.modules.aktier;
    const allokeringMod = Layout.modules.allokering;
    if(!aktierMod || !allokeringMod) return;

    container.appendChild(allokeringMod.distBlock());
    container.appendChild(aktierMod.distBlock('Sektor', aktierMod.sectorEntries()));
    container.appendChild(aktierMod.distBlock('Geografi', aktierMod.landEntries()));
  }
};
