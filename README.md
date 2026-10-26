# USD Pievese — Centenario 1927–2027

Sito statico HTML/CSS/JavaScript. **Al Campo alla Battaglia.**

Pubblicazione: https://gigicirillo.github.io/pievese/

## Impaginazione e contenuti
Il logo originale ad alta risoluzione è in `assets/logo-pievese.png`. Le prime due scene animano questo file originale, con luce e movimento continui: non ingrandiscono il logo ricostruito nei video. Lo stemma e il testo hanno aree distinte, affiancate su desktop e sovrapposte verticalmente su mobile.

Menu: La squadra, Scuola Calcio, Categorie, Classifica, Abbonamenti. Foto, rosa, categorie, classifica e prossimo match hanno segnaposto espliciti: non sono stati inventati giocatori, risultati, orari, avversari o prezzi. Le foto si sostituiscono nei blocchi `.photo-placeholder` di `index.html`. La scheda Prossimo match è in alto a destra, con vetro traslucido e chiusura tramite X; la scelta viene ricordata per la sessione. Il menu mobile si apre con un pulsante ed è navigabile da tastiera.

Titoli e navigazione usano Bebas Neue, ospitato in `assets/fonts/` con licenza OFL. Identificato come corrispondenza visiva al logo, non come fonte certificata del progetto grafico originale. I testi descrittivi usano un sans serif leggibile.

## Animazione e prestazioni
Niente Lenis o doppia interpolazione dello scroll. Il movimento usa un unico ciclo requestAnimationFrame, interpolazione dipendente dal tempo e trasformazioni del logo senza ricampionare immagini a ogni scroll.

Le tre clip originali sono conservate con 240 fotogrammi ciascuna a 24 fps (720 JPEG, 1600×900), rispettando la cadenza originale, invece dei precedenti 150 fotogrammi a 15 fps. Il colpo sul pallone usa la sequenza canvas su desktop: carica prioritariamente i frame intorno alla posizione corrente, prepara quelli vicini, mantiene al massimo 20 bitmap decodificate e fonde i due fotogrammi adiacenti. Non scarica più tutte le sequenze prima di mostrare la pagina.

Mobile e risparmio dati usano i video compatibili H.264 / WebM per la terza scena. Con riduzione movimento il video resta fermo e lo stemma non si muove. Questo non costituisce una garanzia di 60 fps su ogni dispositivo: le sorgenti video sono 24 fps.

## Media completati
Higgsfield: sweep `7acb5383-7bcf-4719-83bf-5257f35ad9ca`, opening `fcd7e3f6-c1a7-4361-8b75-b3cf3e60ab2a`, strike `8f9477b8-bb73-4793-8904-7455edb7e3c7`.
La terza clip è stata generata il 26 ottobre 2026 con 160 crediti autorizzati. Tutte le sorgenti sono 1920×1080, circa 10,04 secondi. Link e identificativi in `assets/generation-status.json`: non rigenerare questi media. Il nuovo layout e le nuove estrazioni non richiedono ulteriori crediti.

## Preparazione e pubblicazione
```sh
python3 scripts/resume-assets.py --source /percorso/ai/media
python3 scripts/verify-assets.py
python3 -m http.server 8000
```
`prepare-assets.py` verifica i master, estrae 240 JPEG per clip e prepara MP4 H.264 e WebM. `verify-assets.py` blocca la pubblicazione se mancano i 720 JPEG, logo o video.
Il workflow “Publish complete centenary website” parte su push a main o workflow_dispatch. Conserva i media verificati nella repository e pubblica solo i file del sito, compresi i font e la licenza.

## CTA e dati reali
Gli abbonamenti rimandano al profilo ufficiale Instagram per informazioni; nessun acquisto o invio email simulato. Il form si abilita configurando un endpoint HTTPS e l’informativa privacy in `assets/manifest.json`. Il prossimo match e la classifica vanno compilati con i dati ufficiali del club.

## Verifiche
Prepubblicazione: desktop 1440×900, mobile 390×844 e 375×667; nessuna sovrapposizione tra logo e titolo, nessun overflow orizzontale; menu mobile e chiusura match funzionanti; nessun errore JavaScript. Dopo ogni deploy controllare nuovamente la pagina pubblica e le scene nel browser. Non dichiarare test su dispositivi fisici senza averli eseguiti.
