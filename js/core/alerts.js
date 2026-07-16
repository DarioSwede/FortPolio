/* alerts.js
   Prisalarm - funkar bara medan appen är öppen i en flik (ingen backend att
   skicka riktiga push-notiser från). Vid uppdaterade kurser jämförs priset
   mot State.priceAlerts[id], och en webbläsar-notis skickas vid ny korsning.
*/
const Alerts = {
  async ensurePermission(){
    if(!('Notification' in window)) return false;
    if(Notification.permission === 'granted') return true;
    if(Notification.permission === 'denied') return false;
    try{ return (await Notification.requestPermission()) === 'granted'; }
    catch(e){ return false; }
  },

  // Returnerar true om alarmet just nu är utlöst (för att visa en 🔔-badge),
  // och skickar en notis bara vid nykorsning (inte varje uppdatering).
  check(id, label, price){
    const alert = State.priceAlerts[id];
    if(!alert || price == null) return false;
    const hitAbove = alert.above != null && price >= alert.above;
    const hitBelow = alert.below != null && price <= alert.below;
    const isTriggered = hitAbove || hitBelow;
    if(isTriggered && !alert.triggered){
      this.fire(`🔔 ${label}`, hitAbove ? `Över ${alert.above} (nu ${price})` : `Under ${alert.below} (nu ${price})`);
    }
    alert.triggered = isTriggered;
    return isTriggered;
  },

  fire(title, body){
    if('Notification' in window && Notification.permission === 'granted'){
      try{ new Notification(title, { body }); }
      catch(e){ /* vissa webbläsare kräver en service worker för Notification() - hoppa tyst över */ }
    }
  }
};
