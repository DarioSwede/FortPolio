/* storage.js
   Enda platsen i appen som pratar med window.storage / localStorage.
   Moduler ska aldrig anropa window.storage eller localStorage direkt -
   allt går via Storage.get / Storage.set nedan, så vi kan byta
   lagringsmetod i framtiden utan att röra resten av koden.
*/
const Storage = {
  async get(key){
    if(window.storage){
      try{ return await window.storage.get(key); }
      catch(e){ return null; }
    }
    try{
      const v = localStorage.getItem(key);
      return v ? { value:v } : null;
    }catch(e){ return null; }
  },

  async set(key, value, retry){
    try{
      if(window.storage){ return await window.storage.set(key, value); }
      localStorage.setItem(key, value);
      return { value };
    }catch(e){
      if(!retry){
        // Enstaka lagringsfel förekommer ibland - ett tyst återförsök brukar räcka.
        return new Promise(resolve => {
          setTimeout(() => resolve(this.set(key, value, true)), 800);
        });
      }
      return null;
    }
  }
};
