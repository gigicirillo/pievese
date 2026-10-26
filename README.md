# USD Pievese — Centenario 1927–2027

Sito statico HTML/CSS/JavaScript. **Al Campo alla Battaglia.**

Pubblicazione: https://gigicirillo.github.io/pievese/

## Impaginazione e contenuti
Il logo originale ad alta risoluzione è in `assets/logo-pievese.png`. Le prime due scene animano questo file originale, con luce e movimento continui: non ingrandiscono il logo ricostruito nei video. Lo sfondo del campo e il video del pallone occupano tutto lo schermo; il logo originale resta indipendente, definito e di dimensioni contenute. Lo stemma e il testo hanno aree distinte, affiancate su desktop e sovrapposte verticalmente su mobile. Il menu è fisso. La scritta di invito allo scroll scompare appena si scende.

Menu: La squadra, Scuola Calcio, Categorie, Classifica, Abbonamenti. Foto, rosa, categorie, classifica e prossimo match hanno segnaposto espliciti: non sono stati inventati giocatori, risultati, orari, avversari o prezzi. Le foto si sostituiscono nei blocchi `.photo-placeholder` di `index.html`. La scheda Prossimo match è in alto a destra, con vetro traslucido e chiusura tramite X; la scelta viene ricordata per la sessione. Il menu mobile si apre con un pulsante ed è navigabile da tastiera.

Titoli e navigazione usano Bebas Neue, ospitato in `assets/fonts/` con licenza OFL. Identificato come corrispondenza visiva al logo, non come fonte certificata del progetto grafico originale. I testi descrittivi usano un sans serif leggibile.

## Animazione e prestazioni
Una sola stage sticky, contenuta nella sezione cinema senza margini negativi: quando entra la fascia blu, tutta la stage sale e lascia il posto ai contenuti successivi. Nessun elemento video viene dipinto sopra alla fascia blu. La sequenza iniziale è stata accorciata da 660 a 334 altezze viewport su desktop (304 su mobile), con cambi di testo ravvicinati.

Il logo originale è animato tramite trasformazioni e luce. Per il pallone si usa ora la riproduzione video nativa continua, indipendente dalla velocità dello scroll: non vengono più richiesti o cercati singoli JPEG durante la visita. Il video si avvia entrando nella terza scena, si ferma uscendo e riparte dall'inizio quando si rientra. Sono disponibili MP4 e WebM a 1600×900 e 60 fps, derivati dalla sorgente a 24 fps con interpolazione di movimento locale. Non sono 60 fotogrammi originali né una garanzia di prestazioni identiche su qualsiasi dispositivo. Con riduzione movimento il video resta fermo.

I 720 JPEG delle tre sequenze originali sono conservati come archivio e poster; il front-end non li precarica. Il campo di sfondo è ricavato dal finale della clip, ritagliato per escludere il pallone.

## Media completati
Higgsfield: sweep `7acb5383-7bcf-4719-83bf-5257f35ad9ca`, opening `fcd7e3f6-c1a7-4361-8b75-b3cf3e60ab2a`, strike `8f9477b8-bb73-4793-8904-7455edb7e3c7`.
La terza clip è stata generata il 26 ottobre 2026 con 160 crediti autorizzati. Tutte le sorgenti sono 1920×1080, circa 10,04 secondi. Link e identificativi in `assets/generation-status.json`: non rigenerare questi media. Il nuovo layout e le nuove estrazioni non richiedono ulteriori crediti.

## Preparazione e pubblicazione
```sh
python3 scripts/resume-assets.py --source /percorso/ai/media
python3 scripts/verify-assets.py
python3 -m http.server 8000
```
`prepare-assets.py` verifica i master, estrae 240 JPEG per clip e prepara MP4 H.264 e WebM. `prepare-cinema.py` prepara il campo e le versioni interpolate a 60 fps e ne verifica formato, durata e risoluzione. `verify-assets.py` blocca la pubblicazione se mancano i 720 JPEG, logo o video.
Il workflow “Publish complete centenary website” parte su push a main o workflow_dispatch. Conserva i media verificati nella repository e pubblica solo i file del sito, compresi i font e la licenza.

## CTA e dati reali
Gli abbonamenti rimandano al profilo ufficiale Instagram per informazioni; nessun acquisto o invio email simulato. Il form si abilita configurando un endpoint HTTPS e l’informativa privacy in `assets/manifest.json`. Il prossimo match e la classifica vanno compilati con i dati ufficiali del club.

## Verifiche
Verifiche del layout immersivo: desktop 1440×900, mobile 390×844 e 375×667; nessuna sovrapposizione tra logo e titolo, nessun overflow orizzontale; menu fisso, invito allo scroll nascosto dopo il primo movimento, cambio testo entro un viewport; uscita della stage coincidente con il bordo della fascia blu; menu mobile e chiusura match funzionanti; nessun errore JavaScript. Dopo ogni deploy controllare nuovamente la pagina pubblica e le scene nel browser. Non dichiarare test su dispositivi fisici senza averli eseguiti.

## Aggiornamento sportivo Tuttocampo
Fonte unica: https://www.tuttocampo.it/Umbria/PrimaCategoria/GironeB/Risultati e le giornate pubbliche collegate.
I dati verificati sono salvati in `assets/tuttocampo.json`: 16 squadre del Girone B, Pievese identificata da teamId `770503`, un solo prossimo incontro futuro. Il front-end evidenzia la Pievese e mostra data di aggiornamento e link alla fonte. Una partita già trascorsa non viene più presentata come prossima. La X del riquadro viene ricordata per quella specifica partita e non nasconde i nuovi incontri.

Le richieste automatiche HTTP/Playwright da GitHub Actions hanno restituito 403 nel test del 26 ottobre 2026. Non aggirare le protezioni: consultare la pagina pubblica con il browser disponibile, senza accedere al calendario riservato. I link pubblici `#match_days_selection a[data-match-day-id]` permettono di leggere le giornate successive. L'attività settimanale ChatGPT aggiorna solo questo JSON via GitHub e il push pubblica il sito attraverso il workflow esistente. In caso di fonte inaccessibile o dati incoerenti conservare gli ultimi dati validi e segnalare il problema.

Contratto JSON: schemaVersion=1, sourceUrl, league, updatedAt (ISO UTC), standings[] con position, teamId (stringa), team, points, played, wins, draws, losses, goalsFor, goalsAgainst, goalDifference; nextMatch con home, away, homeId, awayId, round, date (YYYY-MM-DD), time (ora italiana), kickoff (ISO UTC), sourceUrl, oppure null se non è pubblicato alcun incontro futuro.
Validare unicità delle squadre, presenza della Pievese, G=V+N+P, DR=GF-GS, ordine della fonte; non dedurre risultati né inventare orari. I test sono in `scripts/test-tuttocampo.cjs`.
