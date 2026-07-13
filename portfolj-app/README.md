# Portfölj

En privat aktie/fond-tracker. Statisk sida, inget backend - allt körs i din webbläsare.

## Struktur

```
index.html              Skal: lås-skärm, header, laddar allt annat
css/styles.css           All design. Ändra utseende här - aldrig i JS.
js/data.js                Krypterad innehavsdata + öppen referensdata (råvaror, börser, OMX30-lista)
js/core/
  storage.js               Spara/läs (artifact-lagring eller localStorage)
  crypto.js                 AES-256-GCM kryptering/dekryptering
  format.js                 Kr/pris/procent-formattering
  state.js                   Delat state för hela appen
  market.js                   Nätverksanrop mot kursdata (med CORS-proxy-fallback)
  layout.js                    Ritar upp moduler i paneler, drag för ordning/bredd
  actions.js                    Funktioner som HTML:s onclick-attribut anropar
  lock.js                        Lås-skärm + "byt lösenord"
js/modules/
  aktier.js, fonder.js, ravaror.js, allokering.js, borsen.js,
  vinnareforlorare.js, veckanstips.js
js/main.js                Startpunkt, kopplar ihop header med State/Layout
```

## Lägga till en ny modul

1. Skapa `js/modules/dinmodul.js`:
   ```js
   Layout.register({
     id: 'dinmodul',
     title: 'Din Modul',
     build(container){
       container.innerHTML = '<p>Hej!</p>';
     }
   });
   ```
2. Lägg till `<script src="js/modules/dinmodul.js"></script>` i `index.html`, efter de andra modul-taggarna.
3. Klart. Modulen dyker upp sist i layouten (du kan dra den dit du vill) och sparas i din anpassade ordning.

Inget annat i appen behöver ändras - det är hela poängen med modulsystemet.

## Kryptering

Innehavsdatan (`js/data.js` -> `ENCRYPTED_HOLDINGS`) är krypterad med AES-256-GCM.
Lösenordet just nu är `byt-mig` - **byt det innan du publicerar**:

1. Öppna appen, lås upp med `byt-mig`.
2. Klicka "🔑 Byt lösenord" i headern.
3. Ange ditt nya lösenord två gånger, klicka "Kryptera om".
4. Kopiera texten som visas (`ENCRYPTED_HOLDINGS: { salt:..., iv:..., ct:... }`).
5. Klistra in den i `js/data.js`, ersätt hela det gamla `ENCRYPTED_HOLDINGS`-blocket.
6. Ladda upp den ändrade filen.

## Publicera på GitHub Pages

1. Skapa ett nytt repository på GitHub (publikt, gratis Pages kräver det).
2. Ladda upp **hela mappen** (`index.html`, `css/`, `js/` med undermappar) - inte bara en fil.
3. Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
4. Efter någon minut får du en länk i stil med `https://dittanvändarnamn.github.io/repo-namn/`.

## Kända begränsningar

- **Live-kurser**: fungerar inte i Claude-appens förhandsgranskning (nätverkssandlåda), men bör fungera när sidan körs på riktigt via GitHub Pages.
- **OMX30-listan** (`DATA.OMXS30_LIST` i `js/data.js`) balanseras om två gånger om året (jan/juli) - stäm av mot en aktuell källa då och då.
- **Veckans tips**: ingen bekräftad automatisk källa från Dagens PS hittades, så den modulen bygger på att du klistrar in text manuellt.
- **Lösenordsskydd**: skyddar innehållet (AES-256), men själva sidan (koden) är fortfarande synlig för vem som helst som besöker länken - de ser bara inte din data utan rätt lösenord.
