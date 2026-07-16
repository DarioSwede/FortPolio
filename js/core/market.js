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

  // Historiska stängningskurser för en liten sparkline. range/interval är
  // Yahoos egna parameternamn (samma chart-endpoint som fetchQuote).
  async fetchHistory(symbol, range = '1mo', interval = '1d'){
    const target = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
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
        const result = data?.chart?.result?.[0];
        const closes = result?.indicators?.quote?.[0]?.close;
        if(!closes || !closes.length) throw new Error('ingen historik i svar');
        return closes.filter(v => v != null);
      }catch(e){ lastErr = e; }
    }
    throw lastErr || new Error('alla försök misslyckades');
  },

  // Yahoos quoteSummary-endpoint för utdelningskalender. Mindre pålitlig än
  // chart-endpointen (stödjer inte alltid samma CORS-proxies), så det här
  // är bästa-försök: kastar fel som modulen fångar och visar tydligt.
  async fetchDividendCalendar(symbol){
    const target = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=calendarEvents,summaryDetail`;
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
        const result = data?.quoteSummary?.result?.[0];
        if(!result) throw new Error('inget svar för symbolen');
        const exDiv = result.calendarEvents?.exDividendDate?.fmt || null;
        const payDate = result.calendarEvents?.dividendDate?.fmt || null;
        const yieldPct = result.summaryDetail?.dividendYield?.fmt || null;
        const rate = result.summaryDetail?.dividendRate?.fmt || null;
        return { exDiv, payDate, yieldPct, rate };
      }catch(e){ lastErr = e; }
    }
    throw lastErr || new Error('alla försök misslyckades');
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
