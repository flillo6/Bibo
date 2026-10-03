# BIBO — Specifica Tecnica & Guida Completa Animazioni e Sprite

Questo documento descrive in dettaglio tutte le animazioni di **BIBO**, la pipeline di generazione (Gemini Image/Video), le specifiche tecniche dei file e i prompt "camera-locked" calibrati per evitare oscillazioni, zoom indesiderati e disallineamenti di camera.

---

## 1. Architettura del Rendering & Fallback

Il motore di animazione (`js/engine/SpriteAnimation.js`) è progettato per garantire **continuità visiva assoluta**:
1. **Risoluzione a catena (Fallback Automatico)**:
   - Se un'animazione specifica non è ancora presente (es. `assets/sprites/baby/eat_biscuit.png`), il motore esegue il fallback automatico su `assets/sprites/baby/idle_base.png`.
   - Se un'animazione dello stadio `mid` o `adult` manca, esegue il fallback sullo stadio precedente o sulla base di Baby Bibo.
   - **Nessun crash, nessuna schermata nera, nessun warning invadente in console**.
2. **Clock bloccato a 15 FPS**:
   - Perfetto per estetica 16-bit retro computing.
   - Consumo CPU/GPU inferiore all'1%.
   - In abbinamento con la **Page Visibility API**, il loop si azzera (0.0% CPU) se la scheda del browser è in background o minimizzata.
3. **Ombra di contatto procedurale**:
   - Il motore proietta automaticamente sul canvas un'ellisse d'ombra semi-trasparente (`rgba(46, 52, 64, 0.16)`) ancorata alla base dei piedi di Bibo, garantendo che il personaggio risulti sempre saldamente appoggiato al suolo indipendentemente dall'animazione.

---

## 2. Le 3 Fasi Evolutive

| Stadio | Cartella Sprite | Descrizione Visiva | Trigger Sblocco |
| :--- | :--- | :--- | :--- |
| **Baby Bibo** | `assets/sprites/baby/` | Monitor CRT compatto azzurro, corpo in feltro blu soffice, guantoni bianchi stile cartoon anni '30, scarpe da ginnastica vintage rosse/bianche. | Livello base (0 ore) |
| **Mid Bibo** | `assets/sprites/mid/` | Monitor squadrato anni '90, proporzioni leggermente allungate, cuffiette vintage con spugna arancione sulle tempie, sneakers consumate da biblioteca. | 100.000 ore globali di studio |
| **Adult Bibo** | `assets/sprites/adult/` | Il Custode della Biblioteca: monitor Trinitron curvo con linee di scansione fosfori ambra/verdi, coda a valvola termoionica splendente (vacuum tube), sciarpetta accademica in lana scozzese. | 1.000.000 ore globali di studio |

---

## 3. Catalogo delle 9 Animazioni Canoniche (per ciascuna Evoluzione)

Ogni stadio evolutivo supporta esattamente le stesse 9 chiavi canoniche registrate in `CONFIG.ANIMATIONS`:

### 1. `idle_base.png` (Idle Principale)
- **Tipo**: Loop continuo.
- **Frame**: 12 frame a 12-15 FPS (~0.8s - 1.0s di ciclo).
- **Descrizione**: Bibo respira dolcemente con un leggero movimento verticale del torace/monitor (±4px), sbatte le palpebre dei display pixel e dondola impercettibilmente il peso del corpo tra i due piedi.
- **Stato**: ✅ Già estratto e funzionante per Baby Bibo (`assets/sprites/baby/idle_base.png`).

### 2. `idle_affamato.png` (Fame Critica < 20%)
- **Tipo**: Loop continuo.
- **Frame**: 12 frame.
- **Descrizione**: Bibo ha le mani sulla pancia, lo schermo mostra occhi tristi a mezz'asta o una ciotolina vuota pixelata, le ginocchia leggermente piegate.

### 3. `idle_stanco.png` (Energia Bassa < 20%)
- **Tipo**: Loop continuo.
- **Frame**: 12 frame.
- **Descrizione**: Bibo ciondola con la testa/monitor verso il basso, palpebre pesanti, sbadiglia periodicamente aprendo la griglia dello speaker.

### 4. `idle_sporco.png` (Pulizia Bassa < 20%)
- **Tipo**: Loop continuo.
- **Frame**: 12 frame.
- **Descrizione**: Schermo leggermente impolverato con macchioline pixelate statiche, Bibo si gratta la scocca o soffia via un granello di polvere.

### 5. `eat_biscuit.png` (Mangia Biscotto)
- **Tipo**: One-shot (termina e torna automaticamente a `idle_base`).
- **Frame**: 12-16 frame.
- **Descrizione**: Bibo tira fuori un biscotto rotondo dorato con gocce di cioccolato pixel, lo afferra a due mani con i guanti bianchi, dà 3 morsi felici con briciole pixelate che saltellano, ingoia soddisfatto e si pulisce la bocca.

### 6. `sleep.png` (Sonno / Recupero)
- **Tipo**: Loop continuo (finché energia < 80% o finché non riceve caffè).
- **Frame**: 12-16 frame.
- **Descrizione**: Bibo è accucciato o sdraiato sul pavimento in feltro, schermo CRT spento con una tenue riga di scansione orizzontale o due occhi chiusi stile `^ ^`. Dal retro del monitor fluttuano verso l'alto lettere pixelate `Z z z` a dissolvenza.

### 7. `clean_sponge.png` (Spugna & Lucidatura)
- **Tipo**: One-shot (termina e torna a `idle_base`).
- **Frame**: 12-16 frame.
- **Descrizione**: Una morbida spugnetta gialla passa sul vetro del monitor con una scia di bolle di sapone iridescenti pixelate; al terzo passaggio il vetro emette una scintilla bianca/azzurra a 4 punte ("pling!") e Bibo sorride radioso.

### 8. `click_annoyed.png` (Reazione a Click durante lo Studio)
- **Tipo**: One-shot (~2.5 secondi).
- **Frame**: 12 frame.
- **Descrizione**: Se l'utente clicca Bibo mentre il timer di studio è attivo, Bibo si gira di scatto verso l'utente, incrocia le braccia con fare imbronciato, lo schermo mostra due occhi a fessura seccati (`> <`), batte il piedino, poi si gira e riprende a studiare.
- **Fumetto a schermo**: Esce un messaggio random (es. *"Ehi! Stai studiando, non toccarmi.*" o *"Concentrati sui tuoi appunti!"*).

### 9. `victory_hop.png` (Salto Vittoria Quiz)
- **Tipo**: One-shot (~2 secondi).
- **Frame**: 12-16 frame.
- **Descrizione**: Quando l'utente supera un micro-quiz o completa una sessione, Bibo fa un piccolo balzo di gioia a braccia aperte in alto, con due stelline dorate pixelate che ruotano attorno al monitor, atterrando poi composto sulle sneakers.

---

## 4. Specifiche Tecniche dei File Grafici

Per garantire che ogni nuovo sprite si inserisca perfettamente nel canvas senza sfasamenti:

```
Dimensioni Frame:        426 x 768 px (o quadrato 512 x 512 px)
Formato File:            PNG-24 con canale alfa trasparente
Disposizione Strip:      Orizzontale [Frame 0][Frame 1]...[Frame N-1]
Larghezza Totale Strip:  (426 * 12) = 5112 px
Altezza Totale Strip:    768 px
Linea di Terra (Piedi):  Altezza Y fissa all'88% - 90% dell'altezza del frame
Sfondo Generato:         Verde chroma (#00FF00) o Magenta (#FF00FF) uniforme
```

---

## 5. Guida Prompt Gemini Image/Video: "Camera-Locked"

Il problema principale riscontrato nei video generati con AI è il **movimento di camera** (pan, tilt, carrello, zoom in/out) che rende i frame instabili.
Per forzare il generatore ad avere **camera fissa da studio**, includi sempre queste parole chiave all'inizio e alla fine del prompt:

### Template Fondamentale Prompt Video (Gemini / Veo / Runway)
```text
FIXED TRIPOD CAMERA, ABSOLUTE ZERO CAMERA MOVEMENT, LOCKED WIDE SHOT.
A 16-bit retro pixel art living companion character named Bibo.
Front-facing view centered on screen.
Bibo features a vintage compact blue CRT monitor for a head with dark charcoal screen showing pixel facial features, a soft textured cobalt-blue felt body, cartoon 1930s white gloved hands, and red vintage retro sneakers.
The character stands firmly on a static flat ground plane at the lower third of the screen.
BACKGROUND: Solid pure flat magenta (#FF00FF) chroma-key background, completely plain, zero props, zero shadows on background.
ACTION: [INSERIRE QUI L'AZIONE SPECIFICA].
LIGHTING: Flat retro video game lighting, crisp silhouette, no camera drift, no zoom, static framing.
```

### Prompt Specifici per le Animazioni:

#### A. Mangia Biscotto (`eat_biscuit`)
> `FIXED TRIPOD CAMERA, ZERO CAMERA MOVEMENT, LOCKED CENTERED SHOT. A 16-bit retro pixel art character Bibo with blue CRT monitor head and white cartoon gloves. Bibo holds a round golden chocolate-chip cookie with both hands. Bibo takes three energetic nibbles, pixel crumbs fly gently, then Bibo swallows with a joyful smile on the CRT screen and wipes mouth with glove. Feet remain completely planted in the exact same spot on the floor. Solid pure magenta #FF00FF background.`

#### B. Sonno (`sleep`)
> `FIXED TRIPOD CAMERA, ZERO CAMERA MOVEMENT, LOCKED GROUNDED SHOT. A 16-bit retro pixel art character Bibo curled up peacefully asleep on the floor. The blue CRT monitor head is tilted down resting on folded arms, screen shows gentle sleeping eyes '^ ^'. Small translucent white pixel letters 'Z' 'z' float rhythmically upward from behind the monitor and fade out. Gentle slow rhythmic breathing motion. Feet and body remain grounded on the floor. Solid pure magenta #FF00FF background.`

#### C. Pulizia con Spugna (`clean_sponge`)
> `FIXED TRIPOD CAMERA, ZERO CAMERA MOVEMENT, LOCKED CENTERED SHOT. A 16-bit retro pixel art character Bibo with blue CRT monitor head. A floating yellow cartoon sponge moves across the glass screen in circular motions, wiping it clean. Light soap bubbles appear and pop. On the final wipe, a brilliant 4-point pixel spark gleams on the corner of the monitor. Bibo stands happily with hands on hips, feet grounded in place. Solid pure magenta #FF00FF background.`

#### D. Reazione Infastidito Click (`click_annoyed`)
> `FIXED TRIPOD CAMERA, ZERO CAMERA MOVEMENT, LOCKED CENTERED SHOT. A 16-bit retro pixel art character Bibo. Bibo suddenly crosses white-gloved arms, turns slightly toward viewer with a grumpy, annoyed expression on the CRT monitor (eyes showing furrowed '>' and '<' pixels), taps one red sneaker impatiently twice on the ground, then returns to neutral upright posture. No camera movement, static framing. Solid pure magenta #FF00FF background.`

---

## 6. Procedura di Inserimento Sprite nel Progetto

Quando crei una nuova animazione:
1. Posiziona il file PNG della strip in `assets/sprites/<evo>/<animazione>.png` (es: `assets/sprites/baby/eat_biscuit.png`).
2. Se il file ha sfondo magenta (`#FF00FF`) o verde, puoi eseguire lo script Node di rimozione automatica trasparenza.
3. Se vuoi specificare dimensioni o offset particolari per quel file, inserisci la voce in `assets/sprites/<evo>/atlas.json`.
4. Ricarica la pagina: il motore la caricherà istantaneamente e la riprodurrà alla prima azione corrispondente.
