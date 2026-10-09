# USD Pievese — Centenario 1927–2027

Sito statico HTML/CSS/JavaScript. **Al Campo alla Battaglia.**

## Stato reale

Logo originale del centenario recuperato e presente in `assets/logo-pievese.png`. Anchor Higgsfield basata sul logo originale generata e presente in `assets/anchor.jpg`.

Due clip Higgsfield avviate il 9 ottobre 2026: sweep `7acb5383-7bcf-4719-83bf-5257f35ad9ca`, opening `fcd7e3f6-c1a7-4361-8b75-b3cf3e60ab2a`. Attendere queste generazioni senza inviarle nuovamente. La richiesta strike è stata respinta prima dell’avvio: **crediti Higgsfield esauriti** (`Out of credits on plus (monthly) plan in Private workspace.`). Il file `assets/generation-status.json` conserva gli identificativi reali e lo stato del lavoro. **Sito non pubblicato**: restano necessari la terza clip, l’estrazione dei 450 fotogrammi e la verifica finale.

La verifica di pubblicazione fallisce intenzionalmente finché gli asset originali non sono completi. Non dichiarare verificati la scansione luminosa, l’apertura dello stemma, il colpo in macro, il campo finale o 60fps su dispositivi reali prima del controllo dei media e del browser.

## Contenuti

Profilo pubblico consultato il 9 ottobre 2026: https://www.instagram.com/usd.pievese/. Bio verificata: “L’albiceleste dell’Umbria”. I singoli post richiedono accesso e non sono stati usati per ricostruire rosa, risultati, prezzi o dati del club. Centenario 1927–2027 e tagline provengono dal brief.

I riferimenti a piano, tasti, corde, martelletti e regolazione tonale sono stati adattati al calcio: stemma, appartenenza, pallone, campo. Non sono stati trasformati in caratteristiche inventate della squadra.

## Motore

Tre capitoli con stage sticky a 100svh. Su desktop, lo scroll controlla esattamente 150 fotogrammi per clip, dipinti su canvas a tutto schermo. Tutti i JPEG vengono precaricati con sei richieste concorrenti; al massimo dodici bitmap decodificate rimangono in memoria. `requestAnimationFrame`, interpolazione indipendente dalla frequenza dello schermo, repaint canvas soltanto al cambio di frame. Nessun Three.js. Lenis via CDN, con scroll nativo se il CDN non risponde.

Mobile usa MP4 muted in loop; con riduzione movimento il video rimane fermo, rispettando la preferenza dell’utente. Il loader raggiunge 100% quando l’inizializzazione termina e non si blocca su errori di rete. Se la sequenza manca, entra in fallback senza richieste a 450 URL inesistenti. Questo comportamento difensivo non sostituisce gli asset richiesti.

## Completare i media

Preparare in una directory: `logo-pievese.png` (logo originale), `anchor.jpg` (16:9), `sweep.mp4`, `opening.mp4`, `strike.mp4` (ciascuno 1920×1080 e 10 secondi). Tutte le clip devono usare la stessa anchor come riferimento. Il colpo deve essere macro; la clip opening deve sollevare lo stemma e rivelare il campo con le luci accese.

```sh
python3 scripts/prepare-assets.py --source /percorso/ai/media
python3 scripts/verify-assets.py
python3 -m http.server 8000
```

L’estrazione usa ffmpeg: `fps=15,scale=1600:-2`, `-frames:v 150`, `-q:v 3`, `-start_number 1`. Percorsi: `frames/sweep/frame_0001.jpg` e analoghi per opening/strike. Il comando verifica prima file, durata e risoluzione originali. `ready` rimane false in caso di errore.

## CTA e dati

Attualmente “Abbonati ora” apre il profilo ufficiale per chiedere informazioni al club. Non raccoglie email né simula una sottoscrizione. Il form email è già implementato ma diventa visibile soltanto configurando un vero `membershipEndpoint` HTTPS e una vera `privacyUrl` in `assets/manifest.json`. L’endpoint deve accettare POST JSON e registrare email e consenso. Non è stato inventato un indirizzo email del club.

## Pubblicazione e verifica finale

Solo dopo la revisione visiva: impostare Pages su GitHub Actions e avviare “Publish complete centenary website”. Il workflow verifica tutti i 450 JPEG, le dimensioni 1600×900, gli MP4, anchor e logo. Pubblica soltanto i file pubblici, senza script e documentazione di lavoro. L’URL effettivo deve essere letto dall’esito del deploy, poi aperto e verificato su desktop/mobile, scroll inverso, loader e console.
