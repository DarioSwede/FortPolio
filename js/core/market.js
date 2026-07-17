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

  // Delad hämtningsloop - App.refresh*() i main.js var fem nästan identiska
  // varv av "hoppa över om ingen symbol, försök hämta, räkna ok/fail".
  // Körs sekventiellt (inte Promise.all) med flit: samtidiga anrop skulle
  // slå igenom mot Yahoo/de fria CORS-proxyerna snabbare och öka risken för
  // rate-limiting, se kommentaren i App.refreshAllMarketData().
  // worker(item) gör själva hämtningen och sätter fälten på item - kastar
  // vid fel. onFail(item) är valfri och får chansen att t.ex. sätta en
  // status-flagga som modulen visar ("Ej tillgänglig").
  async fetchEach(items, worker, onFail){
    let ok = 0, fail = 0;
    for(const item of items){
      if(!item.symbol) continue;
      try{ await worker(item); ok++; }
      catch(e){ fail++; if(onFail) onFail(item, e); }
    }
    return { ok, fail };
  },

  // Yahoo rapporterar London-noterade aktier (t.ex. ENQ.L) i pence (valuta
  // "GBp"/"GBX"), inte pund - annars ser man ett pris som är 100x för högt
  // och en helt absurd förändring i % jämfört med en GAV inmatad i pund.
  // Allt pris/kurs-data ska gå igenom den här innan det sparas i State.
  normalizeQuote(meta){
    const isPence = meta.currency === 'GBp' || meta.currency === 'GBX';
    const divisor = isPence ? 100 : 1;
    const prevRaw = meta.chartPreviousClose ?? meta.previousClose;
    return {
      price: meta.regularMarketPrice != null ? meta.regularMarketPrice / divisor : null,
      prevClose: prevRaw != null ? prevRaw / divisor : null,
      currency: isPence ? 'GBP' : meta.currency
    };
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
        const isPence = result.meta?.currency === 'GBp' || result.meta?.currency === 'GBX';
        const divisor = isPence ? 100 : 1;
        return closes.filter(v => v != null).map(v => v / divisor);
      }catch(e){ lastErr = e; }
    }
    throw lastErr || new Error('alla försök misslyckades');
  },

  // Historiska utdelningar via samma chart-endpoint som redan används för
  // kurser/historik (events=div) - mycket mer pålitlig genom CORS-proxyn än
  // quoteSummary nedan, eftersom det är samma beprövade endpoint-form.
  async fetchDividendHistory(symbol){
    const target = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d&events=div`;
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
        if(!result) throw new Error('inget svar för symbolen');
        const divs = result.events?.dividends;
        if(!divs) return [];
        return Object.values(divs)
          .map(d => ({ date: d.date, amount: d.amount }))
          .sort((a,b) => b.date - a.date);
      }catch(e){ lastErr = e; }
    }
    throw lastErr || new Error('alla försök misslyckades');
  },

  // Yahoos quoteSummary-endpoint för kommande ex-dag/direktavkastning. Mindre
  // pålitlig än chart-endpointen ovan (stödjer inte alltid samma CORS-proxies),
  // så det här är bästa-försök: kastar fel som modulen fångar och visar tydligt.
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
