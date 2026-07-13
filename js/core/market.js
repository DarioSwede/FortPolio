/* market.js
   Enda platsen som gör nätverksanrop mot kursdata. Försöker direkt mot
   Yahoo Finance, och faller tillbaka på två gratis CORS-proxies om
   direktanropet blockeras (t.ex. i vissa förhandsgranskningsmiljöer).
*/
const Market = {
  async fetchQuote(symbol){
    const target = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
    const attempts = [
      target,
      'https://corsproxy.io/?url=' + encodeURIComponent(target),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(target),
    ];
    let lastErr;
    for(const url of attempts){
      try{
        const res = await fetch(url);
        if(!res.ok) throw new Error('http ' + res.status);
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if(!meta || meta.regularMarketPrice == null) throw new Error('inget pris i svar');
        return meta;
      }catch(e){ lastErr = e; }
    }
    throw lastErr || new Error('alla försök misslyckades');
  },

  async fetchQuoteWithFallbacks(symbols){
    for(const sym of symbols){
      try{ return { meta: await this.fetchQuote(sym), symbolUsed: sym }; }
      catch(e){ /* prova nästa */ }
    }
    throw new Error('alla symboler misslyckades');
  },

  stockholmNow(){
    return new Date(new Date().toLocaleString('en-US', { timeZone:'Europe/Stockholm' }));
  },

  exchangeStatus(ex){
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: ex.tz }));
    const day = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const isWeekday = day >= 1 && day <= 5;
    const isOpen = isWeekday && minutes >= ex.open[0] && minutes < ex.open[1];
    return { isOpen, localTime: now.toLocaleTimeString('sv-SE', { hour:'2-digit', minute:'2-digit' }) };
  }
};
