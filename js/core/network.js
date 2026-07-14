/* network.js
   Enkel anslutningsstatus i inställningar: är sidan laddad över HTTPS,
   och (bästa försök) vilken publik IP webbläsaren just nu syns med.
   Ingen VPN-detektion - det finns inget pålitligt sätt att avgöra det
   client-side, så vi låtsas inte kunna det.
*/
const NetworkInfo = {
  isHttps(){
    return location.protocol === 'https:';
  },

  async fetchIPs(){
    const results = { v4: null, v6: null };
    try{
      const r4 = await fetch('https://api.ipify.org?format=json');
      if(r4.ok){ results.v4 = (await r4.json()).ip; }
    }catch(e){ /* inget v4-svar - t.ex. utan internet eller blockerat */ }
    try{
      const r6 = await fetch('https://api6.ipify.org?format=json');
      if(r6.ok){ results.v6 = (await r6.json()).ip; }
    }catch(e){ /* inget v6-svar - vanligt om nätverket saknar v6 */ }
    return results;
  }
};
