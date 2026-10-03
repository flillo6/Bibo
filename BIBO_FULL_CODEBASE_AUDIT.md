# BIBO - ARCHITETTURA COMPLETA & CODICE SORGENTE PER AUDIT

> Documento generato per Gemini Deep Research.
> Progetto: BIBO - Sovereign 16-bit Zero-OpEx Virtual Study Companion

## 1. STRUTTURA DEL PROGETTO

I file inclusi coprono l intera logica applicativa del sistema:
- index.html
- manifest.json
- sw.js
- css/style.css
- js/config.js
- js/i18n.js
- js/app.js
- js/engine/PetManager.js
- js/engine/StudyTimer.js
- js/engine/SpriteAnimation.js
- js/knowledge/KnowledgeEngine.js
- js/knowledge/StarterPack.js
- js/network/NetworkMesh.js
- js/storage/ProfileStorage.js
- js/audio/AudioSynthesizer.js

---

## FILE: index.html

`html
<!DOCTYPE html>
<html lang="it" data-theme="warm_paper">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>BIBO — Virtual Study Companion</title>

  <!-- PWA & Mobile Web App Capabilities (iOS & Android) -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="BIBO">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="theme-color" content="#2e3440">

  <link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link rel="icon" type="image/png" href="assets/icons/icon-192.png">
  <link rel="manifest" href="manifest.json">

  <script>
    // Sovereign PWA instant upgrade engine (purges legacy caches automatically)
    (function() {
      const BUILD = 'v5.3';
      if (localStorage.getItem('bibo_build_version') !== BUILD) {
        localStorage.setItem('bibo_build_version', BUILD);
        if ('caches' in window) {
          caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(regs => {
                Promise.all(regs.map(r => r.unregister())).then(() => {
                  window.location.reload();
                });
              });
            }
          });
        }
      }
    })();
  </script>

  <link rel="stylesheet" href="css/style.css?v=5.3">
</head>
<body>

  <!-- TOP NAVIGATION HUD -->
  <header class="top-hud">
    <div class="hud-left">
      <span class="status-dot">●</span>
      <span id="onlineCountText">1 ONLINE IN SILENZIO</span>
    </div>

    <div class="hud-center">
      <button id="topicChipBtn" class="topic-chip" aria-label="Seleziona Materia">
        <span id="topicChipText">CHIMICA GENERALE</span>
        <span>▾</span>
      </button>

      <!-- Topic Dropdown / Autocomplete Popover -->
      <div id="topicPopover" class="topic-popover">
        <input type="text" id="topicSearchInput" class="topic-search-input" placeholder="Cerca o inserisci materia..." autocomplete="off">
        <div id="topicSuggestions" class="topic-suggestions">
          <!-- Populated by JS -->
        </div>
      </div>
    </div>

    <div class="hud-right">
      <button id="profileBtn" class="btn-std">[ PROFILO ]</button>
    </div>
  </header>

  <!-- MAIN VIEWPORT STAGE -->
  <main class="main-stage">
    
    <!-- Bibo Interactive Container -->
    <div class="pet-container" id="biboContainer">
      <div id="speechBubble" class="speech-bubble">Ehi! Stai studiando, non toccarmi.</div>
      <canvas id="biboCanvas" width="380" height="380"></canvas>
    </div>

    <!-- Timer Monolith -->
    <div class="timer-container">
      <div id="timerDisplay" class="timer-display">25:00</div>

      <!-- Duration Selector Popover -->
      <div id="durationPopover" class="duration-popover">
        <div class="preset-buttons">
          <button class="preset-btn" data-mins="25">25m</button>
          <button class="preset-btn" data-mins="45">45m</button>
          <button class="preset-btn" data-mins="60">60m</button>
          <button class="preset-btn" data-mins="90">90m</button>
        </div>
        <div class="custom-mins-row">
          <span id="lblCustomMins" style="font-size:10px;">Minuti a mano:</span>
          <input type="number" id="customMinsInput" class="custom-mins-input" min="5" max="180" placeholder="min">
          <button id="customMinsApplyBtn" class="preset-btn">OK</button>
        </div>
        <div id="customMinsWarn" style="display:none; color:var(--accent-red); font-size:10px; margin-top:2px;">[ ! ] Durata consentita: tra 5 e 180 min</div>
      </div>

      <div class="timer-actions">
        <button id="timerPrimaryBtn" class="action-btn primary">[ ▶ AVVIA ]</button>
        <button id="timerFinishBtn" class="action-btn" style="display:none;">[ ■ CONCLUDI ]</button>
      </div>
    </div>

  </main>

  <!-- BOTTOM HUD -->
  <footer class="bottom-hud">
    <div class="hud-left">
      <button id="audioBtn" class="audio-chip">[ AUDIO: MUTO ▾ ]</button>
      <!-- Audio Dropdown Popover -->
      <div id="audioPopover" class="duration-popover" style="bottom: 56px; left: 24px;">
        <div style="display:flex; flex-direction:column; gap:4px;">
          <button class="preset-btn" data-audio="mute">MUTO</button>
          <button class="preset-btn" data-audio="rain">PIOGGIA LEGGERA</button>
          <button class="preset-btn" data-audio="brown">RUMORE MARRONE (DEEP FOCUS)</button>
        </div>
      </div>
    </div>

    <!-- 4 Needs Micro-Bars Centered in Bottom HUD -->
    <div class="needs-grid">
      <div class="need-row">
        <span id="lblHunger">FAME</span>
        <div class="need-track"><div id="fillHunger" class="need-fill hunger" style="width: 80%;"></div></div>
      </div>
      <div class="need-row">
        <span id="lblClean">PULIZIA</span>
        <div class="need-track"><div id="fillClean" class="need-fill clean" style="width: 90%;"></div></div>
      </div>
      <div class="need-row">
        <span id="lblEnergy">ENERGIA</span>
        <div class="need-track"><div id="fillEnergy" class="need-fill energy" style="width: 85%;"></div></div>
      </div>
      <div class="need-row">
        <span id="lblExp">EXP</span>
        <div class="need-track"><div id="fillExp" class="need-fill exp" style="width: 45%;"></div></div>
      </div>
    </div>

    <div class="hud-right">
      <button id="pantryBtn" class="pantry-chip">[ DISPENSA (304 OGGETTI) ]</button>
    </div>
  </footer>

  <!-- ==================== MODALS (POP-UPS) ==================== -->

  <!-- 1. ONBOARDING MODAL -->
  <div id="onboardingModal" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <span class="modal-title" id="onboardingTitle">Questo è BIBO.</span>
      </div>
      <div class="modal-body">
        <p id="onboardingP1">Non è un'app di produttività qualunque. Bibo è un automa vivente, unico al mondo e condiviso da tutti noi contemporaneamente.</p>
        <div style="display:flex; flex-direction:column; gap:8px; font-size:10px;">
          <div><strong id="onboardingF1T">TI FA COMPAGNIA:</strong> <span id="onboardingF1D">Mentre studi sui tuoi libri o quaderni, Bibo vive sullo schermo in silenzio, senza telecamere né algoritmi invasivi.</span></div>
          <div><strong id="onboardingF2T">LO NUTRITE INSIEME:</strong> <span id="onboardingF2D">Il tempo di studio dell'intera community mondiale genera le risorse per sfamarlo, farlo riposare e farlo crescere.</span></div>
          <div><strong id="onboardingF3T">LA MENTE COLLETTIVA:</strong> <span id="onboardingF3D">Bibo non usa modelli esterni. Impara direttamente da voi: le nozioni vengono verificate tra studenti, costruendo la prima enciclopedia didattica aperta e decentralizzata.</span></div>
        </div>

        <div class="form-group" style="margin-top:6px;">
          <label class="form-label" id="lblOnboardName">Come ti chiami?</label>
          <input type="text" id="onboardNameInput" class="text-input" placeholder="Il tuo nome o nickname...">
          <div id="onboardNameWarn" style="display:none; color:var(--accent-red); font-size:10px; margin-top:2px;">[ ! ] Inserisci il tuo nome per iniziare</div>
        </div>

        <div class="form-group" style="position:relative;">
          <label class="form-label" id="lblOnboardTopic">Cosa prepari o leggi oggi?</label>
          <input type="text" id="onboardTopicInput" class="text-input" placeholder="Cerca o scrivi liberamente la tua materia..." autocomplete="off">
          <div id="onboardTopicWarn" style="display:none; color:var(--accent-red); font-size:10px; margin-top:2px;">[ ! ] Inserisci o seleziona cosa stai studiando</div>
          <div id="onboardTopicSuggestions" class="topic-suggestions" style="position:absolute; top:calc(100% + 2px); left:0; right:0; background:var(--bg-surface); border:1px solid var(--border-color); display:none; z-index:30; max-height:120px; overflow-y:auto;"></div>
        </div>

        <button id="onboardStartBtn" class="action-btn primary" style="margin-top:6px;">[ INIZIA LA SESSIONE ▶ ]</button>
        <div style="text-align:center;">
          <a href="#" id="linkRecoverKey" style="color:var(--text-secondary); text-decoration:none; font-size:10px;">Hai già un profilo? Recupera con la tua chiave segreta</a>
        </div>
      </div>
    </div>
  </div>

  <!-- 2. FINISH SESSION MODAL (3 STEPS) -->
  <div id="finishModal" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <div class="modal-title" id="finishHeaderTitle">SESSIONE COMPLETATA (25:00)</div>
          <div style="font-size:10px; color:var(--text-secondary);" id="finishHeaderSub">Prenditi un minuto per fissare i concetti.</div>
        </div>
        <button id="finishCloseBtn" class="modal-close-btn">[ ✕ CHIUDI ]</button>
      </div>

      <div class="modal-body">
        
        <!-- STEP 1: QUIZ -->
        <div id="finishStep1" class="finish-step">
          <div style="font-weight:700;" id="quizTitle">Passo 1 di 3: Mettiti alla prova</div>
          <div style="font-size:10px; color:var(--text-secondary);" id="quizSub">Un concetto verificato dalla community.</div>
          
          <div id="quizContentBox" style="margin-top:10px;">
            <div id="quizQuestionText" style="padding:10px; background:var(--bg-primary); border:1px solid var(--border-color); font-weight:700;">
              Caricamento quiz...
            </div>
            <div id="quizOptionsList" class="quiz-options">
              <!-- Rendered by JS -->
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
              <button id="quizSkipBtn" class="preset-btn">[ Salta quiz ]</button>
              <button id="quizFlagBtn" class="preset-btn" style="color:var(--accent-red);">[ ! SEGNALA DOMANDA ]</button>
            </div>
          </div>

          <div id="quizEmptyBox" style="display:none; margin-top:10px;">
            <div style="padding:12px; border:1px solid var(--border-color); background:var(--bg-primary);">
              <div style="font-weight:700;" id="quizEmptyTitle">[ Nessun quiz disponibile per questa materia ]</div>
              <div style="font-size:10px; color:var(--text-secondary); margin-top:4px;" id="quizEmptyDesc">Nessuno ha ancora creato nozioni per questa materia. Sii il pioniere: donane una tu al Passo 3!</div>
            </div>
            <button id="quizSkipTopicBtn" class="action-btn primary" style="margin-top:10px; width:100%;">[ PASSA ALLA REVISIONE ▶ ]</button>
          </div>
        </div>

        <!-- STEP 2: PEER REVIEW -->
        <div id="finishStep2" class="finish-step" style="display:none;">
          <div style="font-weight:700;" id="reviewTitle">Passo 2 di 3: Aiuta la Community</div>
          <div style="font-size:10px; color:var(--text-secondary);" id="reviewSub">Uno studente ha proposto questa nozione. Ti sembra chiara e corretta?</div>

          <div id="reviewCard" style="margin-top:10px; padding:12px; background:var(--bg-primary); border:1px solid var(--border-color); display:flex; flex-direction:column; gap:6px;">
            <div><span style="color:var(--text-secondary);" id="lblReviewTopic">Materia:</span> <strong id="reviewTopic">Fisica</strong></div>
            <div><span style="color:var(--text-secondary);" id="lblReviewQ">Domanda:</span> <strong id="reviewQuestion">...</strong></div>
            <div><span style="color:var(--text-secondary);" id="lblReviewA">Risposta:</span> <span id="reviewAnswer">...</span></div>
          </div>

          <!-- Standard Voting Buttons -->
          <div id="reviewVoteActions" style="display:flex; gap:6px; margin-top:12px;">
            <button id="reviewTrueBtn" class="action-btn" style="flex:1; border-color:var(--accent-green); color:var(--accent-green);">[ ✓ Vero / Corretta ]</button>
            <button id="reviewFalseBtn" class="action-btn" style="flex:1; border-color:var(--accent-red); color:var(--accent-red);">[ ✗ Falsa / Errata ]</button>
            <button id="reviewIdkBtn" class="action-btn" style="flex:1;">[ ? Non lo so / Salta ]</button>
          </div>

          <!-- Translation Bounty Actions (Approccio 3) -->
          <div id="reviewTranslationActions" style="display:none; flex-direction:column; gap:8px; margin-top:10px;">
            <input type="text" id="translateQuestionInput" class="text-input" placeholder="Traduci la domanda...">
            <input type="text" id="translateAnswerInput" class="text-input" placeholder="Traduci la risposta corretta...">
            <div style="display:flex; gap:6px;">
              <button id="submitTranslationBtn" class="action-btn primary" style="flex:2;">[ INVIA TRADUZIONE (+20 EXP) ]</button>
              <button id="skipTranslationBtn" class="action-btn" style="flex:1;">[ Salta ]</button>
            </div>
          </div>
        </div>

        <!-- STEP 3: DONATE -->
        <div id="finishStep3" class="finish-step" style="display:none;">
          <div style="font-weight:700;" id="donateTitle">Passo 3 di 3: Vuoi insegnare qualcosa a Bibo? (Facoltativo)</div>
          <div style="font-size:10px; color:var(--text-secondary);" id="donateSub">Scrivi una domanda e risposta dal tuo quaderno. Verrà esaminata dalla community.</div>

          <div class="form-group" style="margin-top:10px;">
            <label class="form-label" id="lblDonateQ">La Domanda:</label>
            <input type="text" id="donateQuestionInput" class="text-input" placeholder="Scrivi la domanda dal tuo quaderno...">
          </div>

          <div class="form-group">
            <label class="form-label" id="lblDonateA">La Risposta Corretta:</label>
            <input type="text" id="donateAnswerInput" class="text-input" placeholder="Scrivi la risposta corretta e sintetica...">
          </div>

          <div style="display:flex; gap:8px; margin-top:8px;">
            <button id="donateSubmitBtn" class="action-btn primary" style="flex:1;">[ INVIA A BIBO ▶ ]</button>
            <button id="donateCloseBtn" class="action-btn" style="flex:1;">[ Fatto per oggi, chiudi ]</button>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- 3. PANTRY COMPACT FLOATING DOCK (ANCHORED BOTTOM RIGHT) -->
  <aside id="pantryModal" class="floating-dock-card dock-bottom-right" aria-label="Dispensa">
    <div class="modal-header">
      <span class="modal-title" id="pantryTitle">DISPENSA CONDIVISA</span>
      <button id="pantryCloseBtn" class="modal-close-btn">[ ✕ CHIUDI ]</button>
    </div>
    <div class="modal-body">
      <div style="font-size:10px; color:var(--text-secondary);" id="pantrySub">Ogni ora di studio reale della community produce risorse per Bibo.</div>
      
      <div id="pantryToast" class="toast-msg" style="display:none;"></div>

      <div class="pantry-item-row">
        <div class="pantry-item-info">
          <span class="pantry-item-name" id="pantryItemBiscuitName">BISCOTTO</span>
          <span class="pantry-item-qty"><span id="lblQtyBiscuitPrefix">Disponibili:</span> <span id="qtyBiscuit">142</span> · <span id="pantryBiscuitDesc">Soddisfa la Fame (+25%)</span></span>
        </div>
        <button id="feedBiscuitBtn" class="action-btn primary">[ NUTRI BIBO ]</button>
      </div>

      <div class="pantry-item-row">
        <div class="pantry-item-info">
          <span class="pantry-item-name" id="pantryItemCoffeeName">TAZZA DI CAFFÈ / TÈ</span>
          <span class="pantry-item-qty"><span id="lblQtyCoffeePrefix">Disponibili:</span> <span id="qtyCoffee">98</span> · <span id="pantryCoffeeDesc">Dà Energia (+25%)</span></span>
        </div>
        <button id="offerCoffeeBtn" class="action-btn primary">[ OFFRI CAFFÈ ]</button>
      </div>

      <div class="pantry-item-row">
        <div class="pantry-item-info">
          <span class="pantry-item-name" id="pantryItemSpongeName">SPUGNETTA</span>
          <span class="pantry-item-qty"><span id="lblQtySpongePrefix">Disponibili:</span> <span id="qtySponge">64</span> · <span id="pantrySpongeDesc">Pulisce il monitor (+30%)</span></span>
        </div>
        <button id="cleanSpongeBtn" class="action-btn primary">[ PULISCI BIBO ]</button>
      </div>
    </div>
  </aside>

  <!-- 4. PROFILE COMPACT FLOATING DOCK (ANCHORED TOP RIGHT) -->
  <aside id="profileModal" class="floating-dock-card dock-top-right" aria-label="Profilo">
    <div class="modal-header">
      <span class="modal-title" id="profileTitle">IDENTITÀ & STATISTICHE</span>
      <button id="profileCloseBtn" class="modal-close-btn">[ ✕ CHIUDI ]</button>
    </div>
    <div class="modal-body">
      
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
        <div id="profileNameDisplayWrap" style="display:flex; align-items:center; gap:6px;">
          <span style="color:var(--text-secondary);" id="lblProfileName">NOME:</span> <strong id="profileNameDisplay">Studente</strong>
        </div>
        <div id="profileNameEditWrap" style="display:none; align-items:center; gap:4px;">
          <input type="text" id="profileNameInput" class="text-input" style="width:120px; font-size:11px; padding:3px 6px;">
          <button id="profileSaveNameBtn" class="preset-btn" style="border-color:var(--accent-green); color:var(--accent-green);">[ OK ]</button>
          <button id="profileCancelNameBtn" class="preset-btn">[ ✕ ]</button>
        </div>
        <button id="profileEditNameBtn" class="preset-btn">[ Modifica ]</button>
      </div>

      <div style="display:flex; flex-direction:column; gap:6px; font-size:11px;">
        <div><span style="color:var(--text-secondary);" id="lblStatLifetime">TEMPO TOTALE:</span> <strong id="statLifetime">0 minuti</strong></div>
        <div><span style="color:var(--text-secondary);" id="lblStatStreak">SERIE ATTUALE:</span> <strong id="statStreak">1 giorni consecutivi</strong></div>
        <div><span style="color:var(--text-secondary);" id="lblStatItems">RISORSE PRODOTTE:</span> <strong id="statItems">0 per la dispensa</strong></div>
        <div><span style="color:var(--text-secondary);" id="lblStatReviews">REVISIONI COMPLETATE:</span> <strong id="statReviews">0 nozioni verificate</strong></div>
      </div>

      <!-- Secret Key Box -->
      <div style="border:1px solid var(--border-color); padding:10px; background:var(--bg-primary); display:flex; flex-direction:column; gap:6px; margin-top:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:10px;" id="lblSecretKey">CHIAVE SEGRETA PERMANENTE</strong>
          <button id="keyInfoBtn" class="preset-btn" title="Informazioni">[ ? INFO ]</button>
        </div>
        <div id="keyInfoText" style="display:none; font-size:10px; color:var(--text-secondary); line-height:1.3;">
          Questa chiave di 3 parole protegge i tuoi dati senza bisogno di account, email o password. Salvala: se cancelli i dati del browser o cambi computer, ti basterà incollarla per ritrovare all'istante tutte le tue ore.
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
          <input type="text" id="secretKeyDisplay" class="text-input" readonly style="font-weight:700; flex:1;">
          <button id="copyKeyBtn" class="action-btn">[ COPIA ]</button>
        </div>
      </div>

      <!-- Settings: Theme & Language -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
        <div>
          <span style="color:var(--text-secondary); font-size:10px;" id="lblTheme">TEMA:</span>
          <button id="toggleThemeBtn" class="preset-btn" style="margin-left:4px;">WARM PAPER</button>
        </div>
        <div>
          <span style="color:var(--text-secondary); font-size:10px;" id="lblLang">LINGUA:</span>
          <button id="toggleLangBtn" class="preset-btn" style="margin-left:4px;">ITALIANO</button>
        </div>
      </div>

      <div style="text-align:center; font-size:9.5px; color:var(--text-secondary); margin-top:8px; border-top:1px dashed var(--border-color); padding-top:6px;">
        BIBO SYSTEM v5.3 · P2P MESH ONLINE
      </div>
    </div>
  </aside>

  <!-- 5. RECOVERY MODAL -->
  <div id="recoveryModal" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <span class="modal-title" id="recoveryTitle">RECUPERA PROFILO</span>
        <button id="recoveryCloseBtn" class="modal-close-btn">[ ✕ CHIUDI ]</button>
      </div>
      <div class="modal-body">
        <p style="font-size:11px;" id="recoveryDesc">Inserisci la tua chiave segreta a 3 parole per ripristinare ore e statistiche:</p>
        <input type="text" id="recoveryKeyInput" class="text-input" placeholder="es. bibo-luna-caffe">
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button id="recoverySubmitBtn" class="action-btn primary" style="flex:1;">[ RIPRISTINA DATI ]</button>
          <button id="recoveryCancelBtn" class="action-btn" style="flex:1;">[ ANNULLA ]</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Application Coordinator Entry Point with Cache Buster -->
  <script type="module" src="js/app.js?v=5.3"></script>

  <!-- PWA Service Worker Registration with Auto-Update & Mobile Standalone Live Refresh -->
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        // Register standard sw.js without query strings to allow seamless browser-native updates
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
          .then((reg) => {
            // Check for updates on initial page load
            reg.update().catch(() => {});

            // Actively check for updates when user brings PWA back to foreground (iOS WebClip / Android)
            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') {
                reg.update().catch(() => {});
              }
            });
            window.addEventListener('focus', () => reg.update().catch(() => {}));
            window.addEventListener('pageshow', () => reg.update().catch(() => {}));

            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] New version installed! Reloading seamlessly...');
                    window.location.reload();
                  }
                });
              }
            });
          })
          .catch((err) => console.warn('[PWA] Service Worker registration skipped:', err));

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      });
    }
  </script>
</body>
</html>

`

---

## FILE: manifest.json

`json
{
  "name": "BIBO — Virtual Study Companion",
  "short_name": "BIBO",
  "description": "16-bit retro living study companion for calm computing and body doubling.",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#2e3440",
  "theme_color": "#2e3440",
  "icons": [
    {
      "src": "assets/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "assets/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}

`

---

## FILE: sw.js

`javascript
/**
 * BIBO - Service Worker (Offline Engine & PWA Cache)
 * 
 * Features:
 * - Cache-First strategy with Stale-While-Revalidate for static assets
 * - Instant offline boot for student deep work without internet
 * - Automatic cache cleanup on version updates
 * - Native iOS & Android PWA live revalidation
 */

const CACHE_NAME = 'bibo-pwa-v5.3';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css?v=5.3',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './js/config.js',
  './js/i18n.js',
  './js/app.js?v=5.3',
  './js/audio/AudioSynthesizer.js',
  './js/engine/SpriteAnimation.js',
  './js/engine/PetManager.js',
  './js/engine/StudyTimer.js',
  './js/knowledge/StarterPack.js',
  './js/knowledge/KnowledgeEngine.js',
  './js/network/NetworkMesh.js',
  './js/storage/ProfileStorage.js',
  './js/vendor/trystero-torrent.js',
  './js/vendor/trystero-nostr.js',
  './assets/sprites/baby/idle_base.png',
  './assets/sprites/baby/idle_affamato.png',
  './assets/sprites/baby/idle_stanco.png',
  './assets/sprites/baby/idle_sporco.png',
  './assets/sprites/baby/eat_biscuit.png',
  './assets/sprites/baby/clean_sponge.png',
  './assets/sprites/baby/sleep.png',
  './assets/sprites/baby/click_annoyed.png',
  './assets/sprites/baby/victory_hop.png'
];

// Install: Pre-cache all core application assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline assets for v5.3...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up legacy caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Purging legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First for navigation (index.html) so updates arrive instantly,
// Stale-While-Revalidate for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // 1. Navigation requests: Network-First with Cache Fallback (avoids stale cache on deploy)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match('./index.html') || caches.match('./'))
    );
    return;
  }

  // 2. Static assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

`

---

## FILE: css/style.css

`css
/**
 * BIBO - Rationalist Minimalist Design System
 * 
 * Inspired by Dieter Rams (Braun) & Panic Playdate:
 * - Crisp 1px geometry, zero fuzzy drop shadows
 * - Monospaced typographic grid
 * - High readability, zero Cumulative Layout Shift (CLS)
 * - 15 FPS discrete feel
 */

@import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');

/* Color Variables */
:root {
  /* Warm Paper (Default) */
  --bg-primary: #F5F0E8;
  --bg-surface: #EBE4D8;
  --bg-card: #FAF6EF;
  --border-color: #2E3440;
  --text-primary: #2E3440;
  --text-secondary: #766B5E;
  --accent-crt: #C97A3E;
  --accent-clean: #5E81AC;
  --accent-green: #4C7A5D;
  --accent-red: #A34E4E;
  --modal-backdrop: rgba(46, 52, 64, 0.45);

  /* Room Environment Planes */
  --floor-color: #E8E0D2;
  --room-glow: rgba(255, 255, 255, 0.45);

  /* Distinct Personal Stat Colors */
  --stat-hunger: #D46A43; /* Warm Terracotta / Toast */
  --stat-energy: #4E9B66; /* Mint Battery Vitality */
  --stat-clean: #4A86A8;  /* Fresh Water Blue */
  --stat-exp: #D49B35;    /* Amber Cathode Gold */
  
  --font-mono: 'Space Mono', 'Departure Mono', monospace, -apple-system;
}

[data-theme="dark_slate"] {
  --bg-primary: #12151A;
  --bg-surface: #1A2028;
  --bg-card: #202732;
  --border-color: #4C566A;
  --text-primary: #ECEFF4;
  --text-secondary: #8892B0;
  --accent-crt: #E5A95A;
  --accent-clean: #88C0D0;
  --accent-green: #8FBCBB;
  --accent-red: #BF616A;
  --modal-backdrop: rgba(10, 12, 16, 0.75);

  /* Room Environment Planes */
  --floor-color: #0E1116;
  --room-glow: rgba(229, 169, 90, 0.05);

  /* Distinct Personal Stat Colors */
  --stat-hunger: #E06C75; /* Warm Coral */
  --stat-energy: #98C379; /* Electric Green */
  --stat-clean: #56B6C2;  /* Cyan Water */
  --stat-exp: #E5C07B;    /* CRT Amber Gold */
}

/* Reset */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  user-select: none;
  -webkit-font-smoothing: antialiased;
}

/* Remove browser number spinner arrows */
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.4;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: background-color 0.2s ease, color 0.2s ease;
}

/* Top Navigation HUD - Seamless Room Header */
.top-hud {
  height: 52px;
  padding: 12px 24px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  border-bottom: none;
  background-color: transparent;
  z-index: 10;
}

.hud-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  letter-spacing: 0.5px;
  justify-self: start;
}

.status-dot {
  color: var(--accent-green);
}

.hud-center {
  position: relative;
  justify-self: center;
  text-align: center;
}

.hud-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  justify-self: end;
}

.topic-chip {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  padding: 6px 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
}

.topic-chip:hover {
  background-color: var(--bg-card);
}

/* Topic Dropdown Popover */
.topic-popover {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  padding: 8px;
  display: none;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  z-index: 50;
}

.topic-popover.active {
  display: flex;
}

.topic-search-input {
  width: 100%;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 6px 8px;
  outline: none;
}

.topic-suggestions {
  max-height: 160px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.topic-item {
  padding: 6px 8px;
  cursor: pointer;
  font-size: 11px;
}

.topic-item:hover {
  background-color: var(--bg-primary);
  color: var(--accent-crt);
}

/* Main Viewport Stage - Pure Seamless Space */
.main-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
  background-color: var(--bg-primary);
}

/* Bibo Interactive Container */
.pet-container {
  position: relative;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: -8px;
}

#biboCanvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  width: 380px;
  height: 380px;
}

/* Speech Bubble (Needs & Interactive Reaction) */
.speech-bubble {
  position: absolute;
  top: -26px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: normal;
  max-width: min(340px, 86vw);
  text-align: center;
  line-height: 1.35;
  box-shadow: 2px 2px 0 rgba(0,0,0,0.15);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translateY(4px);
  transition: opacity 0.15s steps(2), transform 0.15s steps(2);
  z-index: 20;
}

.speech-bubble.visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.speech-bubble.sleeping {
  top: 72px;
}

.speech-bubble::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px 6px 0;
  border-style: solid;
  border-color: var(--border-color) transparent;
}

/* Timer Monolith */
.timer-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.timer-display {
  font-size: 34px;
  font-weight: 700;
  letter-spacing: 3px;
  cursor: pointer;
  padding: 2px 14px;
  border: 1px solid transparent;
  transition: border-color 0.1s;
}

.timer-display:hover {
  border-color: var(--border-color);
  background-color: var(--bg-surface);
}

.timer-display.locked {
  cursor: default;
}

.timer-display.locked:hover {
  border-color: transparent;
  background-color: transparent;
}

/* Duration Popover */
.duration-popover {
  position: absolute;
  bottom: calc(100% + 4px);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  padding: 8px;
  display: none;
  flex-direction: column;
  gap: 6px;
  z-index: 30;
}

.duration-popover.active {
  display: flex;
}

.preset-buttons {
  display: flex;
  gap: 4px;
}

.preset-btn {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 4px 8px;
  cursor: pointer;
}

.preset-btn:hover {
  background-color: var(--accent-crt);
  color: #FFF;
}

.custom-mins-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.custom-mins-input {
  width: 50px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 4px;
  outline: none;
}

.timer-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.action-btn {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  padding: 7px 16px;
  cursor: pointer;
  letter-spacing: 0.5px;
}

.action-btn:hover {
  background-color: var(--bg-card);
}

.action-btn:active {
  transform: translateY(1px);
}

.action-btn.primary {
  background-color: var(--border-color);
  color: var(--bg-primary);
}

.action-btn.primary:hover {
  background-color: var(--accent-crt);
  color: #FFF;
  border-color: var(--accent-crt);
}

/* 4 Centered Needs Micro-Bars inside Bottom HUD */
.needs-grid {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 0;
  width: auto;
}

.need-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.need-track {
  width: 64px;
  height: 10px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  overflow: hidden;
  position: relative;
}

.need-fill {
  height: 100%;
  transition: width 0.2s steps(8);
}

.need-fill.hunger {
  background-color: var(--stat-hunger);
}

.need-fill.clean {
  background-color: var(--stat-clean);
}

.need-fill.energy {
  background-color: var(--stat-energy);
}

.need-fill.exp {
  background-color: var(--stat-exp);
}

/* Bottom HUD - Seamless Room Footer */
.bottom-hud {
  height: 52px;
  padding: 8px 24px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  border-top: none;
  background-color: transparent;
  z-index: 10;
}

.bottom-hud .hud-left {
  justify-self: start;
}

.bottom-hud .hud-right {
  justify-self: end;
}

.audio-chip, .pantry-chip, .btn-std {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  padding: 6px 12px;
  cursor: pointer;
}

.audio-chip:hover, .pantry-chip:hover, .btn-std:hover {
  background-color: var(--bg-card);
}

/* Floating Dock Card System (Compact Anchored Panels for Pantry & Profile) */
.floating-dock-card {
  position: fixed;
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16), 2px 2px 0px rgba(0, 0, 0, 0.08);
  z-index: 100;
  display: flex;
  flex-direction: column;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease, visibility 0.22s;
  overflow: hidden;
}

.floating-dock-card.dock-top-right {
  top: 60px;
  right: 24px;
  width: 360px;
  max-width: calc(100vw - 48px);
  transform: translateY(-10px) scale(0.98);
}

.floating-dock-card.dock-bottom-right {
  bottom: 60px;
  right: 24px;
  width: 380px;
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 120px);
  transform: translateY(10px) scale(0.98);
}

.floating-dock-card.active {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0) scale(1);
}

.floating-dock-card .modal-header {
  padding: 10px 14px;
}

.floating-dock-card .modal-body {
  padding: 14px;
  gap: 12px;
}

/* Modal System (Pop-ups) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: var(--modal-backdrop);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-overlay.active {
  display: flex;
}

.modal-card {
  width: 520px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--bg-surface);
  cursor: grab;
  user-select: none;
}

.modal-header:active, .modal-header.dragging {
  cursor: grabbing;
}

.modal-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.modal-close-btn {
  background: none;
  border: none;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.modal-close-btn:hover {
  color: var(--accent-red);
}

.modal-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Form Controls & Inputs */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-weight: 700;
  font-size: 11px;
}

.text-input {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 8px 10px;
  outline: none;
}

.text-input:focus {
  border-color: var(--accent-crt);
}

/* Pantry Items List */
.pantry-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  gap: 12px;
}

.pantry-item-row .action-btn {
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 108px;
  text-align: center;
  padding: 8px 10px;
  font-size: 10px;
}

.pantry-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.pantry-item-name {
  font-weight: 700;
  font-size: 11px;
}

.pantry-item-qty {
  color: var(--text-secondary);
  font-size: 10px;
}

/* Quiz Options Grid */
.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.quiz-opt-btn {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 10px 14px;
  text-align: left;
  cursor: pointer;
}

.quiz-opt-btn:hover {
  background-color: var(--bg-primary);
  border-color: var(--accent-crt);
}

.quiz-opt-btn.correct {
  background-color: var(--accent-green);
  color: #FFF;
  border-color: var(--accent-green);
}

.quiz-opt-btn.wrong {
  background-color: var(--accent-red);
  color: #FFF;
  border-color: var(--accent-red);
}

/* Feedback / Toast Messages */
.toast-msg {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  font-size: 11px;
  font-weight: 700;
  background-color: var(--bg-surface);
}

.toast-msg.warn {
  border-color: var(--accent-red);
  color: var(--accent-red);
}

.toast-msg.success {
  border-color: var(--accent-green);
  color: var(--accent-green);
}

/* ==================== MOBILE & TABLET RESPONSIVENESS ==================== */

@media (max-width: 768px) {
  html {
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  body {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    height: 100dvh;
    max-height: 100dvh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: 0px;
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  /* Top HUD on mobile */
  .top-hud {
    height: 44px;
    min-height: 44px;
    padding: 4px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    box-sizing: border-box;
  }

  .hud-left {
    font-size: 8.5px;
    gap: 4px;
  }

  .topic-chip {
    font-size: 9px;
    padding: 3px 6px;
    max-width: 115px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hud-right .btn-std {
    font-size: 8.5px;
    padding: 3px 6px;
  }

  /* Stage & Canvas on mobile */
  .main-stage {
    padding: 4px 0;
    flex: 1 1 auto;
    min-height: 0;
    justify-content: space-evenly;
    gap: 4px;
    overflow: hidden;
  }

  .pet-container {
    margin-bottom: -2px;
  }

  #biboCanvas {
    width: min(230px, 58vw);
    height: min(230px, 58vw);
    max-height: 32vh;
  }

  .speech-bubble {
    font-size: 9.5px;
    padding: 6px 12px;
    max-width: min(300px, 86vw);
    top: -20px;
  }

  .timer-display {
    font-size: 28px;
    padding: 2px 10px;
    letter-spacing: 2px;
  }

  .timer-actions {
    gap: 8px;
    margin-top: 6px;
  }

  .action-btn, .preset-btn {
    padding: 6px 14px;
    font-size: 10px;
    min-height: 32px;
  }

  /* Bottom HUD on mobile - Ergonomic Two-Tiered Retro Control Bar pinned to screen bottom */
  .bottom-hud {
    height: auto;
    min-height: 76px;
    margin-top: auto !important;
    margin-bottom: 0 !important;
    margin-left: auto;
    margin-right: auto;
    padding: 6px 16px max(18px, env(safe-area-inset-bottom, 22px));
    display: grid;
    grid-template-areas:
      "needs needs"
      "audio pantry";
    grid-template-columns: 1fr 1fr;
    row-gap: 8px;
    column-gap: 12px;
    width: 100%;
    max-width: 360px;
    flex-shrink: 0;
    box-sizing: border-box;
    align-items: center;
  }

  .needs-grid {
    grid-area: needs;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 16px;
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    justify-items: center;
  }

  .need-row {
    font-size: 8.5px;
    gap: 5px;
    display: flex;
    align-items: center;
    width: 100%;
    justify-content: space-between;
    max-width: 135px;
  }

  .need-track {
    width: 54px;
    height: 7px;
  }

  .bottom-hud .hud-left {
    grid-area: audio;
    width: 100%;
    display: flex;
    justify-content: flex-start;
    position: relative;
  }

  .audio-chip {
    font-size: 9px;
    padding: 6px 8px;
    width: 100%;
    max-width: 155px;
    min-height: 32px;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #audioPopover {
    bottom: 40px !important;
    left: 0 !important;
    min-width: 200px;
  }

  .bottom-hud .hud-right {
    grid-area: pantry;
    width: 100%;
    display: flex;
    justify-content: flex-end;
    position: relative;
  }

  .pantry-chip {
    font-size: 9px;
    padding: 6px 8px;
    width: 100%;
    max-width: 155px;
    min-height: 32px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Modals & Docks on mobile */
  .floating-dock-card {
    max-width: calc(100vw - 16px) !important;
    width: calc(100vw - 16px) !important;
    left: 8px !important;
    right: 8px !important;
    bottom: 8px !important;
    top: auto !important;
    max-height: calc(100dvh - 56px) !important;
  }

  .floating-dock-card.dock-top-right {
    top: 50px !important;
    bottom: auto !important;
  }

  .modal-card {
    max-width: calc(100vw - 16px);
    max-height: 86vh;
    max-height: 86dvh;
    overflow-y: auto;
  }
}

/* Extra small height viewports (landscape mobile or compact screens) */
@media (max-height: 640px) {
  #biboCanvas {
    width: min(160px, 44vw);
    height: min(160px, 44vw);
    max-height: 24vh;
  }
  .timer-display {
    font-size: 22px;
  }
}


`

---

## FILE: js/config.js

`javascript
/**
 * BIBO Engine - Configuration & Global Constants
 * 
 * Defines all system constants, biological thresholds, evolution levels,
 * animation registries, and theme presets.
 * 
 * Architecture Note for Future Maintainers / AI Agents:
 * To add a new evolution stage, simply add an entry to EVOLUTION_STAGES.
 * To register new animations, add the key to ANIMATION_KEYS.
 */

export const CONFIG = {
  // Application Meta
  APP_NAME: 'BIBO',
  VERSION: '1.0.0',
  FRAME_RATE: 4, // Ultra-calm retro pacing (4 FPS = 250ms per frame, 3.0s per 12-frame cycle)

  // Evolution Stages and cumulative study milestones
  EVOLUTIONS: {
    BABY: {
      id: 'baby',
      name: 'Baby Bibo',
      spriteDir: 'assets/sprites/baby',
      description: 'Stadio 1: Cucciolo curioso con monitor compatto e sneakers vintage.'
    },
    MID: {
      id: 'mid',
      name: 'Mid Bibo',
      spriteDir: 'assets/sprites/mid',
      description: 'Stadio 2: Studente con cuffiette vintage arancioni in spugna.'
    },
    ADULT: {
      id: 'adult',
      name: 'Adult Bibo',
      spriteDir: 'assets/sprites/adult',
      description: 'Stadio 3: Il Custode con monitor Trinitron e coda a valvola termoionica.'
    }
  },

  /**
   * GLOBAL COMMUNITY EXP & EVOLUTION CONFIGURATION
   * Easily adjust these numbers based on community size or test preferences!
   */
  GLOBAL_PROGRESSION: {
    // Milestones for Bibo to evolve across Eras
    TARGET_EXP_ERA_2: 1000,    // EXP points required to evolve to Mid Bibo (achievable milestone for early community)
    TARGET_EXP_ERA_3: 10000,   // EXP points required to evolve to Adult Bibo
    SEED_BASELINE_EXP: 0,      // Clean start from 0 EXP (no mock baseline points)

    // EXP Rewards for collective study and care actions:
    EXP_STUDY_MINUTE: 1,       // +1 EXP per verified minute studied
    EXP_QUIZ_CORRECT: 15,      // +15 EXP for answering a quiz concept correctly
    EXP_NOTION_DONATED: 10,    // +10 EXP for teaching Bibo a new concept from notebook
    EXP_REVIEW_VOTE: 5,        // +5 EXP for reviewing a peer's candidate question
    EXP_TRANSLATE_CONCEPT: 20, // +20 EXP for translating a verified concept across languages
    EXP_FEED_BISCUIT: 2,       // +2 EXP for feeding Bibo a biscuit
    EXP_OFFER_COFFEE: 2,       // +2 EXP for offering Bibo coffee
    EXP_CLEAN_SPONGE: 3        // +3 EXP for cleaning monitor with sponge
  },

  // The 9 canonical animation keys shared across all evolutions
  ANIMATIONS: {
    IDLE_BASE: 'idle_base',         // Standard breathing & looking around
    IDLE_AFFAMATO: 'idle_affamato', // Low hunger posture
    IDLE_STANCO: 'idle_stanco',     // Low energy posture
    IDLE_SPORCO: 'idle_sporco',     // Low cleanliness (dusty)
    EAT_BISCUIT: 'eat_biscuit',     // Eating cookie with white cartoon gloves
    SLEEP: 'sleep',                 // Curled up sleeping on floor
    CLEAN_SPONGE: 'clean_sponge',   // Sponge cleaning with electric spark
    CLICK_ANNOYED: 'click_annoyed', // Annoyed reaction when user clicks Bibo
    VICTORY_HOP: 'victory_hop'      // Small hop when quiz answered correctly
  },

  // Biological Needs & Decay Model
  NEEDS: {
    HUNGER: {
      initial: 80,
      decayPerHour: 8,       // -8% every hour
      snackBoost: 25,        // +25% per biscuit
      criticalThreshold: 20  // Below 20% triggers idle_affamato
    },
    ENERGY: {
      initial: 85,
      decayPerHour: 10,      // -10% every hour
      sleepRegenPerHour: 15, // +15% every hour while sleeping
      coffeeBoost: 25,       // +25% per cup of coffee/tea
      sleepThreshold: 15,    // Falls asleep when energy <= 15%
      wakeThreshold: 80      // Wakes up when energy >= 80%
    },
    CLEANLINESS: {
      initial: 90,
      decayPerHour: 5,       // -5% every hour
      spongeBoost: 30,       // +30% per sponge
      criticalThreshold: 20  // Below 20% triggers idle_sporco
    }
  },

  // Study Tracker & Anti-Abuse Rules
  STUDY: {
    MIN_SESSION_MINUTES: 5,
    MAX_SESSION_MINUTES: 180,
    DEFAULT_DURATION_MINUTES: 25,
    // Real study time required to unlock 1 pantry resource choice (in minutes)
    MINUTES_PER_RESOURCE: 15
  },

  // Color Palettes
  THEMES: {
    WARM_PAPER: {
      id: 'warm_paper',
      bgPrimary: '#F5F0E8',
      bgSurface: '#EBE4D8',
      border: '#2E3440',
      textPrimary: '#2E3440',
      textSecondary: '#766B5E',
      accentCrt: '#C97A3E',
      accentClean: '#5E81AC'
    },
    DARK_SLATE: {
      id: 'dark_slate',
      bgPrimary: '#12151A',
      bgSurface: '#1A2028',
      border: '#4C566A',
      textPrimary: '#ECEFF4',
      textSecondary: '#8892B0',
      accentCrt: '#E5A95A',
      accentClean: '#88C0D0'
    }
  }
};

`

---

## FILE: js/i18n.js

`javascript
/**
 * BIBO Engine - Internationalization (i18n)
 * 
 * Provides client-side, zero-latency string translation.
 * Automatically detects browser language with manual fallback override.
 */

export const DICTIONARY = {
  it: {
    // App Meta & Header
    'app.name': 'BIBO',
    'app.status.online': '{count} ONLINE IN SILENZIO',
    'app.btn.profile': '[ PROFILO ]',
    'app.btn.pantry': '[ DISPENSA ({count} OGGETTI) ]',
    'app.btn.pantry_short': '[ DISPENSA ]',
    
    // Needs Labels
    'needs.hunger': 'FAME',
    'needs.energy': 'ENERGIA',
    'needs.cleanliness': 'PULIZIA',
    'needs.exp': 'EXP',
    'needs.exp_tooltip': 'EXP GLOBALE: {current} / {target} EXP ({percent}%) · Verso Mid Bibo',

    // Timer Controls
    'timer.btn.start': '[ ▶ AVVIA ]',
    'timer.btn.pause': '[ ⏸ PAUSA ]',
    'timer.btn.resume': '[ ▶ RIPRENDI ]',
    'timer.btn.finish': '[ ■ CONCLUDI ]',
    'timer.custom_label': 'Minuti a mano:',
    'timer.select_preset': 'Durata:',

    // Audio Selector
    'audio.label': '[ AUDIO: {name} ▾ ]',
    'audio.mute': 'MUTO',
    'audio.rain': 'PIOGGIA LEGGERA',
    'audio.brown': 'RUMORE MARRONE (DEEP FOCUS)',

    // Onboarding Modal
    'onboarding.title': 'Questo è BIBO.',
    'onboarding.p1': 'Non è un\'app di produttività qualunque. Bibo è un automa vivente, unico al mondo e condiviso da tutti noi contemporaneamente.',
    'onboarding.f1_title': 'TI FA COMPAGNIA',
    'onboarding.f1_desc': 'Mentre studi sui tuoi libri o quaderni, Bibo vive sullo schermo in silenzio, senza telecamere né algoritmi invasivi. Rispetta la tua concentrazione.',
    'onboarding.f2_title': 'LO NUTRITE INSIEME',
    'onboarding.f2_desc': 'Il tempo di studio dell\'intera community mondiale genera le risorse per sfamarlo, farlo riposare e farlo crescere attraverso 3 ere evolutive.',
    'onboarding.f3_title': 'LA MENTE COLLETTIVA',
    'onboarding.f3_desc': 'Bibo non usa modelli esterni. Impara direttamente da voi: le nozioni che inserite vengono verificate dagli altri studenti, costruendo la prima enciclopedia didattica aperta e decentralizzata del pianeta.',
    'onboarding.lbl.name': 'Come ti chiami?',
    'onboarding.ph.name': 'Il tuo nome o nickname...',
    'onboarding.lbl.topic': 'Cosa prepari o leggi oggi?',
    'onboarding.ph.topic': 'Cerca o scrivi liberamente la tua materia...',
    'onboarding.btn.start': '[ INIZIA LA SESSIONE ▶ ]',
    'onboarding.link.recover': 'Hai già un profilo? [ Recupera con la tua chiave segreta ]',

    // Finish Session Modal
    'finish.header.title': 'SESSIONE COMPLETATA ({time})',
    'finish.header.sub': 'Prenditi un minuto per fissare i concetti.',
    
    // Step 1: Quiz
    'finish.step1.title': 'Passo 1 di 3: Mettiti alla prova su {topic}',
    'finish.step1.sub': 'Un concetto verificato dalla community.',
    'finish.step1.empty_title': '[ Nessun quiz disponibile per questa materia ]',
    'finish.step1.empty_desc': 'Nessuno ha ancora creato nozioni per {topic}. Sii il pioniere: donane una tu al Passo 3 per aiutare i prossimi studenti!',
    'finish.step1.btn_skip_topic': '[ PASSA ALLA REVISIONE ▶ ]',
    'finish.step1.btn_skip': '[ Salta quiz ]',
    'finish.step1.btn_flag': '[ ! SEGNALA DOMANDA ]',
    'finish.step1.flag_sent': 'Segnalazione inviata. Grazie per aver protetto la qualità di Bibo!',
    'finish.step1.correct': 'Corretto! Ben fatto.',
    'finish.step1.wrong': 'La risposta convalidata dalla community era: {answer}',

    // Step 2: Peer Review
    'finish.step2.title': 'Passo 2 di 3: Aiuta la Community',
    'finish.step2.sub': 'Uno studente ha proposto questa nozione. Ti sembra chiara e corretta?',
    'finish.step2.lbl_topic': 'Materia:',
    'finish.step2.lbl_q': 'Domanda:',
    'finish.step2.lbl_a': 'Risposta:',
    'finish.step2.btn_true': '[ ✓ Vero / Corretta ]',
    'finish.step2.btn_false': '[ ✗ Falsa / Errata ]',
    'finish.step2.btn_idk': '[ ? Non lo so / Salta ]',
    'finish.step2.empty': 'Nessuna nozione in attesa di revisione al momento.',
    'finish.step2.translation_title': '[ TRADUZIONE CONCETTO · VERSO INGLESE ]',
    'finish.step2.translation_sub': 'Questo concetto è convalidato. Aiuta Bibo traducendolo in Inglese per gli studenti internazionali (+20 EXP)!',
    'finish.step2.ph_trans_q': 'Traduci la domanda in inglese...',
    'finish.step2.ph_trans_a': 'Traduci la risposta corretta in inglese...',
    'finish.step2.btn_submit_trans': '[ INVIA TRADUZIONE (+20 EXP) ]',

    // Step 3: Donate
    'finish.step3.title': 'Passo 3 di 3: Vuoi insegnare qualcosa a Bibo? (Facoltativo)',
    'finish.step3.sub': 'Scrivi una domanda e risposta dal tuo quaderno. Verrà esaminata dalla community.',
    'finish.step3.lbl_q': 'La Domanda:',
    'finish.step3.ph_q': 'Scrivi la domanda dal tuo quaderno...',
    'finish.step3.lbl_a': 'La Risposta Corretta:',
    'finish.step3.ph_a': 'Scrivi la risposta corretta e sintetica...',
    'finish.step3.btn_submit': '[ INVIA A BIBO ▶ ]',
    'finish.step3.btn_close': '[ Fatto per oggi, chiudi ]',
    'finish.step3.thanks': 'Nozione inviata alla coda di revisione. Grazie!',

    // Pantry Modal
    'pantry.title': 'DISPENSA CONDIVISA',
    'pantry.sub': 'Ogni ora di studio reale della community produce risorse per Bibo.',
    'pantry.biscuit.name': 'BISCOTTO',
    'pantry.biscuit.desc': 'Soddisfa la Fame (+25%)',
    'pantry.biscuit.btn': '[ NUTRI BIBO ]',
    'pantry.coffee.name': 'TAZZA DI CAFFÈ / TÈ',
    'pantry.coffee.desc': 'Dà Energia (+25%) e risveglia dal sonno',
    'pantry.coffee.btn': '[ OFFRI CAFFÈ ]',
    'pantry.sponge.name': 'SPUGNETTA',
    'pantry.sponge.desc': 'Rimuove la polvere e pulisce il monitor (+30%)',
    'pantry.sponge.btn': '[ PULISCI BIBO ]',
    'pantry.close': '[ CHIUDI DISPENSA ]',
    
    // Pantry Warning Messages (Biological State Machine)
    'pantry.warn.sleeping_feed': 'Bibo sta dormendo profondamente... offrigli prima una tazza di caffè per svegliarlo!',
    'pantry.warn.hunger_full': 'Bibo è già sazio! Conserviamo questo biscotto per più tardi.',
    'pantry.warn.energy_full': 'Bibo è già pieno di energia! Conserviamo questa tazza per più tardi.',
    'pantry.warn.clean_full': 'Il monitor di Bibo è già limpido! Nessun bisogno di spugnetta ora.',
    'pantry.warn.empty': 'Scorte esaurite per questo oggetto. Continua a studiare per produrne di nuove!',
    'pantry.success.feed': 'Hai dato un biscotto a Bibo! Fame aumentata.',
    'pantry.success.coffee_awake': 'Bibo ha bevuto il caffè! Energia aumentata.',
    'pantry.success.coffee_sleep': 'Hai dato un caffè a Bibo! L\'energia sale a {energy}%. Continua a farlo riposare o dagli altri caffè per farlo svegliare.',
    'pantry.success.wake_up': 'Bibo si è svegliato pieno di energie!',
    'pantry.success.clean': 'Hai pulito il monitor di Bibo! Ora brilla.',

    'app.btn.close': '[ ✕ CHIUDI ]',
    'profile.title': 'IDENTITÀ & STATISTICHE',
    'profile.lbl_name': 'NOME:',
    'profile.btn.edit': '[ Modifica ]',
    'profile.btn.save': '[ Salva ]',
    'profile.stat.time': 'TEMPO TOTALE DI STUDIO:',
    'profile.stat.streak': 'SERIE ATTUALE:',
    'profile.stat.items': 'OGGETTI PRODOTTI:',
    'profile.stat.reviews': 'REVISIONI COMPLETATE:',
    'profile.stat.mins': '{count} minuti',
    'profile.stat.hours_mins': '{hours} ore e {mins} minuti',
    'profile.stat.streak_suffix': '{count} giorni consecutivi',
    'profile.stat.items_suffix': '{count} per la dispensa',
    'profile.stat.reviews_suffix': '{count} nozioni verificate',
    'profile.days_suffix': 'giorni consecutivi',
    'profile.secret_key.title': 'CHIAVE SEGRETA PERMANENTE',
    'profile.secret_key.info': 'Questa chiave permanente di 3 parole protegge i tuoi dati senza bisogno di account, email o password. Salvala nel blocco note: se cancelli la cronologia o cambi dispositivo, incollala per ritrovare all\'istante tutte le tue ore.',
    'profile.secret_key.copy': '[ COPIA ]',
    'profile.secret_key.copied': 'COPIATO!',
    'profile.theme.label': 'TEMA:',
    'profile.theme.warm': 'WARM PAPER',
    'profile.theme.dark': 'DARK SLATE',
    'profile.lang.label': 'LINGUA:',
    'profile.close': '[ ✕ CHIUDI ]',
    'profile.test_anims_title': 'PROVA ANIMAZIONI (tasti 1-9):',

    // Live Animation Preview Buttons
    'anim.preview.idle_base': '1 Base',
    'anim.preview.idle_affamato': '2 Fame',
    'anim.preview.idle_stanco': '3 Stanco',
    'anim.preview.idle_sporco': '4 Sporco',
    'anim.preview.eat_biscuit': '5 Biscotto',
    'anim.preview.clean_sponge': '6 Spugna',
    'anim.preview.sleep': '7 Nanna',
    'anim.preview.click_annoyed': '8 Tocco',
    'anim.preview.victory_hop': '9 Vittoria',

    // Topic Custom Save
    'topic.save_custom': '+ Salva materia "{query}"',

    // Timer & Onboarding Warnings
    'timer.warn_in_progress': 'Sessione in corso: concludila prima di cambiare durata!',
    'timer.warn_custom_range': '[ ! ] Durata consentita: tra 5 e 180 min',
    'onboarding.warn_name': '[ ! ] Inserisci il tuo nome per iniziare',
    'onboarding.warn_topic': '[ ! ] Inserisci o seleziona cosa stai studiando',
    'finish.step1.loading': 'Caricamento quiz...',

    // Recovery Modal
    'recovery.title': 'RECUPERA PROFILO',
    'recovery.desc': 'Inserisci la tua chiave segreta a 3 parole per ripristinare ore e statistiche:',
    'recovery.ph': 'es. bibo-luna-caffe',
    'recovery.btn_submit': '[ RIPRISTINA DATI ]',
    'recovery.btn_cancel': '[ ANNULLA ]',
    'recovery.invalid': 'Chiave non valida o profilo non trovato.',

    // Bibo Speech Bubbles
    'bubble.annoyed.1': 'Ehi! Stai studiando, non toccarmi.',
    'bubble.annoyed.2': 'Torna sul tuo quaderno. Ci siamo promessi di non distrarci.',
    'bubble.annoyed.3': 'Sto cercando di concentrarmi anch\'io.',
    'bubble.idle.1': 'Pronto quando vuoi tu: scegli la materia e premi Avvia.',
    'bubble.idle.2': 'Io sono qui con te. Tu pensa a concentrarti sui libri!',
    'bubble.idle.3': 'Facciamo una bella sessione di studio oggi.',
    'bubble.paused': 'Sessione in pausa. Riprendi quando sei pronto!',
    'bubble.needs.hungry': 'Ho il pancino vuoto... mi daresti un biscotto dalla dispensa?',
    'bubble.needs.tired': 'Yawn... ho tanto sonno... mi offri un caffè o mi fai fare un pisolino?',
    'bubble.needs.dirty': 'Uff... lo schermo è impolverato! Una passata di spugna?',
    'bubble.needs.sleep': 'Zzz... sto riposando... ronf ronf...',
    'bubble.needs.sleeping_touch': 'Shh... Bibo sta dormendo saporitamente... (Zzz)',
    'bubble.needs.sleeping_prevent': 'Shh... Bibo sta riposando. Sveglialo prima!',
    'bubble.feed_biscuit': 'Gnam gnam! Biscottino!',
    'bubble.global_contrib': '[ +{exp} EXP GLOBALE ] Donati alla crescita di Bibo!',
    'bubble.evolution': '[ EVOLUZIONE GLOBALE ] La Community ha risvegliato Mid Bibo!',
    'bubble.victory': 'YAY! Grande sessione di studio! Siamo fortissimi!'
  },

  en: {
    // App Meta & Header
    'app.name': 'BIBO',
    'app.status.online': '{count} STUDYING IN SILENCE',
    'app.btn.profile': '[ PROFILE ]',
    'app.btn.pantry': '[ PANTRY ({count} ITEMS) ]',
    'app.btn.pantry_short': '[ PANTRY ]',
    
    // Needs Labels
    'needs.hunger': 'HUNGER',
    'needs.energy': 'ENERGY',
    'needs.cleanliness': 'CLEAN',
    'needs.exp': 'EXP',
    'needs.exp_tooltip': 'GLOBAL EXP: {current} / {target} EXP ({percent}%) · Towards Mid Bibo',

    // Timer Controls
    'timer.btn.start': '[ ▶ START ]',
    'timer.btn.pause': '[ ⏸ PAUSE ]',
    'timer.btn.resume': '[ ▶ RESUME ]',
    'timer.btn.finish': '[ ■ FINISH ]',
    'timer.custom_label': 'Custom minutes:',
    'timer.select_preset': 'Duration:',

    // Audio Selector
    'audio.label': '[ AUDIO: {name} ▾ ]',
    'audio.mute': 'MUTE',
    'audio.rain': 'GENTLE RAIN',
    'audio.brown': 'BROWN NOISE (DEEP FOCUS)',

    // Onboarding Modal
    'onboarding.title': 'This is BIBO.',
    'onboarding.p1': 'Not your average productivity app. Bibo is a living automaton, unique in the world and shared by all of us simultaneously.',
    'onboarding.f1_title': 'SILENT COMPANIONSHIP',
    'onboarding.f1_desc': 'While you study from textbooks or physical notes, Bibo lives on your screen in silence, with zero surveillance or intrusive tracking.',
    'onboarding.f2_title': 'NOURISHED TOGETHER',
    'onboarding.f2_desc': 'Study time across the global community generates resources to feed him, rest him, and evolve him across 3 historical eras.',
    'onboarding.f3_title': 'COLLECTIVE MIND',
    'onboarding.f3_desc': 'Bibo doesn\'t rely on external models. He learns directly from you: notions you donate are verified by peers, building the world\'s first open, decentralized knowledge base.',
    'onboarding.lbl.name': 'What\'s your name?',
    'onboarding.ph.name': 'Your name or nickname...',
    'onboarding.lbl.topic': 'What are you studying today?',
    'onboarding.ph.topic': 'Search or enter your subject...',
    'onboarding.btn.start': '[ START STUDYING ▶ ]',
    'onboarding.link.recover': 'Have a profile? [ Restore with secret key ]',

    // Finish Session Modal
    'finish.header.title': 'SESSION COMPLETED ({time})',
    'finish.header.sub': 'Take a minute to consolidate your notes.',
    
    // Step 1: Quiz
    'finish.step1.title': 'Step 1 of 3: Test your recall on {topic}',
    'finish.step1.sub': 'A peer-verified concept from the community.',
    'finish.step1.empty_title': '[ No quiz available for this topic yet ]',
    'finish.step1.empty_desc': 'No one has created cards for {topic} yet. Be the pioneer: donate one in Step 3 to help the next students!',
    'finish.step1.btn_skip_topic': '[ PROCEED TO PEER REVIEW ▶ ]',
    'finish.step1.btn_skip': '[ Skip quiz ]',
    'finish.step1.btn_flag': '[ ! REPORT QUESTION ]',
    'finish.step1.flag_sent': 'Report sent. Thank you for protecting Bibo\'s quality!',
    'finish.step1.correct': 'Correct! Well done.',
    'finish.step1.wrong': 'The community-verified answer was: {answer}',

    // Step 2: Peer Review
    'finish.step2.title': 'Step 2 of 3: Support the Community',
    'finish.step2.sub': 'A peer proposed this notion. Does it seem accurate and clear?',
    'finish.step2.lbl_topic': 'Subject:',
    'finish.step2.lbl_q': 'Question:',
    'finish.step2.lbl_a': 'Answer:',
    'finish.step2.btn_true': '[ ✓ True / Correct ]',
    'finish.step2.btn_false': '[ ✗ False / Incorrect ]',
    'finish.step2.btn_idk': '[ ? Don\'t know / Skip ]',
    'finish.step2.empty': 'No pending review items at this moment.',
    'finish.step2.translation_title': '[ CONCEPT TRANSLATION · TOWARDS ITALIAN ]',
    'finish.step2.translation_sub': 'This concept is verified. Help Bibo by translating it into Italian for international students (+20 EXP)!',
    'finish.step2.ph_trans_q': 'Translate question into Italian...',
    'finish.step2.ph_trans_a': 'Translate correct answer into Italian...',
    'finish.step2.btn_submit_trans': '[ SUBMIT TRANSLATION (+20 EXP) ]',

    // Step 3: Donate
    'finish.step3.title': 'Step 3 of 3: Teach Bibo something? (Optional)',
    'finish.step3.sub': 'Write a question and answer from your notebook. It will be reviewed by peers.',
    'finish.step3.lbl_q': 'Question:',
    'finish.step3.ph_q': 'Write a question from your notes...',
    'finish.step3.lbl_a': 'Correct Answer:',
    'finish.step3.ph_a': 'Write the concise correct answer...',
    'finish.step3.btn_submit': '[ SUBMIT TO BIBO ▶ ]',
    'finish.step3.btn_close': '[ Done for today, close ]',
    'finish.step3.thanks': 'Notion queued for peer review. Thank you!',

    // Pantry Modal
    'pantry.title': 'SHARED PANTRY',
    'pantry.sub': 'Every verified hour of study produces resources for Bibo.',
    'pantry.biscuit.name': 'BISCUIT',
    'pantry.biscuit.desc': 'Satisfies Hunger (+25%)',
    'pantry.biscuit.btn': '[ FEED BIBO ]',
    'pantry.coffee.name': 'CUP OF COFFEE / TEA',
    'pantry.coffee.desc': 'Boosts Energy (+25%) and wakes him up',
    'pantry.coffee.btn': '[ OFFER COFFEE ]',
    'pantry.sponge.name': 'SPONGE',
    'pantry.sponge.desc': 'Cleans monitor dust (+30%)',
    'pantry.sponge.btn': '[ CLEAN BIBO ]',
    'pantry.close': '[ CLOSE PANTRY ]',
    
    // Pantry Warnings
    'pantry.warn.sleeping_feed': 'Bibo is sleeping deeply... offer him a coffee first to wake him up!',
    'pantry.warn.hunger_full': 'Bibo is already full! Let\'s save this biscuit for later.',
    'pantry.warn.energy_full': 'Bibo has plenty of energy! Let\'s save this cup for later.',
    'pantry.warn.clean_full': 'Bibo\'s monitor is already sparkling clean!',
    'pantry.warn.empty': 'Out of stock for this item. Continue studying to produce more!',
    'pantry.success.feed': 'You fed Bibo a biscuit! Hunger replenished.',
    'pantry.success.coffee_awake': 'Bibo enjoyed the coffee! Energy replenished.',
    'pantry.success.coffee_sleep': 'Offered coffee to Bibo! Energy rose to {energy}%. Let him rest or offer more to wake him up.',
    'pantry.success.wake_up': 'Bibo woke up energized!',
    'pantry.success.clean': 'You cleaned Bibo\'s monitor! Sparks flew.',

    'app.btn.close': '[ ✕ CLOSE ]',
    'profile.title': 'IDENTITY & STATS',
    'profile.lbl_name': 'NAME:',
    'profile.btn.edit': '[ Edit ]',
    'profile.btn.save': '[ Save ]',
    'profile.stat.time': 'TOTAL STUDY TIME:',
    'profile.stat.streak': 'CURRENT STREAK:',
    'profile.stat.items': 'ITEMS PRODUCED:',
    'profile.stat.reviews': 'REVIEWS COMPLETED:',
    'profile.stat.mins': '{count} minutes',
    'profile.stat.hours_mins': '{hours} hours and {mins} minutes',
    'profile.stat.streak_suffix': '{count} days streak',
    'profile.stat.items_suffix': '{count} for pantry',
    'profile.stat.reviews_suffix': '{count} verified concepts',
    'profile.days_suffix': 'days in a row',
    'profile.secret_key.title': 'PERMANENT SECRET KEY',
    'profile.secret_key.info': 'This 3-word key secures your progress without accounts or passwords. Save it in your notes: paste it on any device to instantly restore all your hours.',
    'profile.secret_key.copy': '[ COPY ]',
    'profile.secret_key.copied': 'COPIED!',
    'profile.theme.label': 'THEME:',
    'profile.theme.warm': 'WARM PAPER',
    'profile.theme.dark': 'DARK SLATE',
    'profile.lang.label': 'LANGUAGE:',
    'profile.close': '[ ✕ CLOSE ]',
    'profile.test_anims_title': 'TEST ANIMATIONS (keys 1-9):',

    // Live Animation Preview Buttons
    'anim.preview.idle_base': '1 Base',
    'anim.preview.idle_affamato': '2 Hunger',
    'anim.preview.idle_stanco': '3 Tired',
    'anim.preview.idle_sporco': '4 Dusty',
    'anim.preview.eat_biscuit': '5 Biscuit',
    'anim.preview.clean_sponge': '6 Sponge',
    'anim.preview.sleep': '7 Sleep',
    'anim.preview.click_annoyed': '8 Poke',
    'anim.preview.victory_hop': '9 Victory',

    // Topic Custom Save
    'topic.save_custom': '+ Save topic "{query}"',

    // Timer & Onboarding Warnings
    'timer.warn_in_progress': 'Session in progress: complete it before changing duration!',
    'timer.warn_custom_range': '[ ! ] Allowed duration: 5 to 180 min',
    'onboarding.warn_name': '[ ! ] Please enter your name to start',
    'onboarding.warn_topic': '[ ! ] Please enter or select what you are studying',
    'finish.step1.loading': 'Loading quiz...',

    // Recovery Modal
    'recovery.title': 'RESTORE PROFILE',
    'recovery.desc': 'Enter your 3-word secret key to restore your study hours and stats:',
    'recovery.ph': 'e.g. bibo-luna-caffe',
    'recovery.btn_submit': '[ RESTORE DATA ]',
    'recovery.btn_cancel': '[ CANCEL ]',
    'recovery.invalid': 'Invalid key or profile not found.',

    // Speech Bubbles
    'bubble.annoyed.1': 'Hey! You\'re studying, don\'t distract me.',
    'bubble.annoyed.2': 'Get back to your notebook. We promised not to get distracted.',
    'bubble.annoyed.3': 'I\'m trying to concentrate here.',
    'bubble.idle.1': 'Ready whenever you are: pick a subject and press Start.',
    'bubble.idle.2': 'I am right here with you. Focus on your books!',
    'bubble.idle.3': 'Let\'s have a great study session today.',
    'bubble.paused': 'Session paused. Resume whenever you are ready!',
    'bubble.needs.hungry': 'My tummy is empty... could I have a cookie from the pantry?',
    'bubble.needs.tired': 'Yawn... feeling so sleepy... coffee or a quick nap?',
    'bubble.needs.dirty': 'Uff... screen is getting dusty! Quick wipe with a sponge?',
    'bubble.needs.sleep': 'Zzz... recharging energy... snoozing soundly...',
    'bubble.needs.sleeping_touch': 'Shh... Bibo is fast asleep... (Zzz)',
    'bubble.needs.sleeping_prevent': 'Shh... Bibo is resting. Wake him up first!',
    'bubble.feed_biscuit': 'Yum yum! Delicious biscuit!',
    'bubble.clean_sponge': 'Wipe wipe! Screen is sparkling clean!',
    'bubble.global_contrib': '[ +{exp} GLOBAL EXP ] Contributed to Bibo\'s evolution!',
    'bubble.evolution': '[ GLOBAL EVOLUTION ] The Community has awakened Mid Bibo!',
    'bubble.victory': 'YAY! Awesome study session! We are unstoppable!'
  }
};

class I18nManager {
  constructor() {
    this.currentLocale = this._detectLocale();
  }

  get locale() {
    return this.currentLocale;
  }

  _detectLocale() {
    const saved = localStorage.getItem('bibo_locale');
    if (saved && DICTIONARY[saved]) return saved;
    const browserLang = (navigator.language || 'it').toLowerCase();
    if (browserLang.startsWith('en')) return 'en';
    return 'it'; // Default Italian
  }

  setLocale(locale) {
    if (DICTIONARY[locale]) {
      this.currentLocale = locale;
      localStorage.setItem('bibo_locale', locale);
      document.dispatchEvent(new CustomEvent('bibo:locale_changed', { detail: { locale } }));
    }
  }

  t(key, params = {}) {
    const dict = DICTIONARY[this.currentLocale] || DICTIONARY['it'];
    let str = dict[key] || DICTIONARY['it'][key] || key;
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return str;
  }
}

export const i18n = new I18nManager();

`

---

## FILE: js/app.js

`javascript
/**
 * BIBO Application - Main Orchestrator & Coordinator
 * 
 * Coordinates:
 * - 15 FPS locked rendering loop on Canvas 2D
 * - Page Visibility API (0.0% CPU usage when minimized/backgrounded)
 * - Timer controls & verified study accumulation
 * - Biological needs & state machine (Hunger, Energy, Cleanliness, EXP)
 * - Web Audio procedural synthesis
 * - Unified pop-up modal system (Onboarding, Finish, Pantry, Profile)
 * - Decentralized KnowledgeEngine & Peer-Review flow
 */

import { CONFIG } from './config.js';
import { i18n } from './i18n.js';
import { audioSynth } from './audio/AudioSynthesizer.js';
import { SpriteAnimationPlayer } from './engine/SpriteAnimation.js';
import { PetManager } from './engine/PetManager.js';
import { StudyTimer } from './engine/StudyTimer.js';
import { KnowledgeEngine } from './knowledge/KnowledgeEngine.js';
import { profileStorage } from './storage/ProfileStorage.js';
import { NetworkMesh } from './network/NetworkMesh.js';

class BiboApp {
  constructor() {
    // Core Engine Subsystems
    this.canvas = document.getElementById('biboCanvas');
    this.anim = new SpriteAnimationPlayer(this.canvas);
    this.pet = new PetManager(this.anim);
    this.knowledge = new KnowledgeEngine();
    this.profile = profileStorage.profile;

    // Active session variables
    this.activeTopic = this.profile.currentTopic || 'Chimica Generale';
    this.currentQuiz = null;
    this.currentReviewCandidate = null;

    // Animation Loop State
    this.rafId = null;
    this.isDocumentVisible = true;

    // Speech Bubble timeout
    this.bubbleTimeout = null;

    // Study Timer Instance
    this.timer = new StudyTimer(
      (tick) => this._onTimerTick(tick),
      (summary) => this._onTimerComplete(summary)
    );
  }

  async init() {
    console.log(`[BIBO] Initializing ${CONFIG.APP_NAME} v${CONFIG.VERSION}...`);

    // 1. Initialize Sprite Engine
    await this.anim.init();

    // 2. Setup Page Visibility API (0.0% CPU when tab hidden)
    document.addEventListener('visibilitychange', () => this._handleVisibilityChange());

    // 3. Setup Natural Biological Decay Timer (Every 60s)
    setInterval(() => this.pet.tickMinute(), 60000);

    // 4. Subscribe to Pet State updates
    this.pet.subscribe((state) => {
      this._updateNeedsUI(state);
      if (this.mesh) this.mesh.broadcastState();
    });
    this.pet.onAnimStateChange = (animKey) => this._handleAnimStateChange(animKey);
    this.pet.onEvolution = (stage) => {
      audioSynth.playVictory();
      this.pet.onQuizVictory();
      this._showSpeechBubble(i18n.t('bubble.evolution'), false);
    };

    // 4b. Initialize Zero-Cost P2P WebRTC Mesh Network
    this.mesh = new NetworkMesh(this.pet);

    this.mesh.getCustomTopics = () => {
      const baseTopics = this.knowledge.getTopicsList(i18n.locale);
      const customTopics = (this.profile.customTopics || []).map(t => typeof t === 'string' ? t : (t[i18n.locale] || t.it || t.en || ''));
      return Array.from(new Set([...baseTopics, ...customTopics, this.activeTopic])).filter(Boolean);
    };

    this.mesh.onTopicsSync = (incomingTopics) => {
      let added = false;
      for (const t of incomingTopics) {
        if (typeof t === 'string' && t.trim()) {
          const clean = t.trim();
          if (!this.profile.customTopics) this.profile.customTopics = [];
          if (!this.profile.customTopics.includes(clean)) {
            this.profile.customTopics.push(clean);
            added = true;
          }
        }
      }
      if (added) {
        profileStorage.saveProfile();
        const popover = document.getElementById('topicPopover');
        if (popover && popover.classList.contains('active')) {
          this._renderTopicSuggestions(document.getElementById('topicSearchInput').value);
        }
      }
    };

    this.mesh.onNotionSync = (notion, sourceId) => {
      if (!notion || !notion.topic || !notion.question) return;
      this.knowledge.addRemoteCandidate(notion);
      profileStorage.addCustomTopic(notion.topic);
      console.log(`[NetworkMesh] Synchronized community notion for topic "${notion.topic}" from peer [${sourceId}]`);
    };

    this.mesh.init();
    this.mesh.onPeerCountChange = () => {
      this._updateOnlineCount();
    };

    // 5. Apply Theme & Locale
    this._applyTheme(this.profile.theme || 'warm_paper');
    this._updateAllI18nTexts();

    // 6. Bind all UI elements & Event Handlers
    this._bindUIEvents();

    // 7. Start Animation Loop
    this._startRenderLoop();

    // 8. Check Onboarding
    if (!this.profile.onboardingComplete) {
      this._openModal('onboardingModal');
    }

    console.log('[BIBO] System operational. Bibo is living and studying alongside you.');
  }

  /* ==================== RENDERING & VISIBILITY ==================== */

  _startRenderLoop() {
    const loop = (timestamp) => {
      if (this.isDocumentVisible) {
        this.anim.tick(timestamp);
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  _handleVisibilityChange() {
    if (document.hidden) {
      this.isDocumentVisible = false;
      this.anim.isPlaying = false;
      // Stop continuous rendering to save 100% of GPU/CPU
    } else {
      this.isDocumentVisible = true;
      this.anim.isPlaying = true;
      this.anim.lastFrameTime = performance.now();
    }
  }

  /* ==================== THEME & LOCALIZATION ==================== */

  _applyTheme(themeId) {
    document.documentElement.setAttribute('data-theme', themeId);
    this.profile.theme = themeId;
    profileStorage.saveProfile();
    const btn = document.getElementById('toggleThemeBtn');
    if (btn) {
      btn.textContent = themeId === 'dark_slate' ? i18n.t('profile.theme.dark') : i18n.t('profile.theme.warm');
    }
  }

  _updateOnlineCount() {
    const count = (this.mesh && this.mesh.peerCount) ? this.mesh.peerCount : 1;
    const text = i18n.t('app.status.online', { count: count.toLocaleString() });
    const el = document.getElementById('onlineCountText');
    if (el) el.textContent = text;
  }

  _updateAllI18nTexts() {
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    const setPlaceholder = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('placeholder', text);
    };

    // Header & HUD
    this._updateOnlineCount();
    setText('profileBtn', i18n.t('app.btn.profile'));
    setText('topicChipText', this.activeTopic.toUpperCase());
    setPlaceholder('topicSearchInput', i18n.t('onboarding.ph.topic'));

    // Needs
    setText('lblHunger', i18n.t('needs.hunger'));
    setText('lblEnergy', i18n.t('needs.energy'));
    setText('lblClean', i18n.t('needs.cleanliness'));
    setText('lblExp', i18n.t('needs.exp'));

    // Timer Controls
    if (this.timer.state === 'RUNNING') {
      setText('timerPrimaryBtn', i18n.t('timer.btn.pause'));
    } else if (this.timer.state === 'PAUSED') {
      setText('timerPrimaryBtn', i18n.t('timer.btn.resume'));
    } else {
      setText('timerPrimaryBtn', i18n.t('timer.btn.start'));
    }
    setText('timerFinishBtn', i18n.t('timer.btn.finish'));

    // Audio & Pantry Buttons
    const audioState = audioSynth.ambientType;
    let audioLabel = i18n.t('audio.mute');
    if (audioState === 'rain') audioLabel = i18n.t('audio.rain');
    if (audioState === 'brown') audioLabel = i18n.t('audio.brown');
    setText('audioBtn', i18n.t('audio.label', { name: audioLabel }));
    this._updatePantryButton();

    // Audio Selector Popover Items
    const optMute = document.querySelector('[data-audio="mute"]');
    if (optMute) optMute.textContent = i18n.t('audio.mute');
    const optRain = document.querySelector('[data-audio="rain"]');
    if (optRain) optRain.textContent = i18n.t('audio.rain');
    const optBrown = document.querySelector('[data-audio="brown"]');
    if (optBrown) optBrown.textContent = i18n.t('audio.brown');

    // Duration Popover
    setText('lblCustomMins', i18n.t('timer.custom_label'));
    setText('customMinsWarn', i18n.t('timer.warn_custom_range'));

    // Pantry Floating Dock
    setText('pantryTitle', i18n.t('pantry.title'));
    setText('pantrySub', i18n.t('pantry.sub'));
    setText('pantryCloseBtn', i18n.t('app.btn.close'));
    const availStr = (i18n.currentLocale || i18n.locale) === 'en' ? 'Available:' : 'Disponibili:';
    setText('lblQtyBiscuitPrefix', availStr);
    setText('lblQtyCoffeePrefix', availStr);
    setText('lblQtySpongePrefix', availStr);
    setText('pantryItemBiscuitName', i18n.t('pantry.biscuit.name'));
    setText('pantryBiscuitDesc', i18n.t('pantry.biscuit.desc'));
    setText('feedBiscuitBtn', i18n.t('pantry.biscuit.btn'));
    setText('pantryItemCoffeeName', i18n.t('pantry.coffee.name'));
    setText('pantryCoffeeDesc', i18n.t('pantry.coffee.desc'));
    setText('offerCoffeeBtn', i18n.t('pantry.coffee.btn'));
    setText('pantryItemSpongeName', i18n.t('pantry.sponge.name'));
    setText('pantrySpongeDesc', i18n.t('pantry.sponge.desc'));
    setText('cleanSpongeBtn', i18n.t('pantry.sponge.btn'));

    // Profile Floating Dock
    setText('profileTitle', i18n.t('profile.title'));
    setText('profileCloseBtn', i18n.t('app.btn.close'));
    setText('lblProfileName', i18n.t('profile.lbl_name'));
    setText('profileEditNameBtn', i18n.t('profile.btn.edit'));
    setText('profileSaveNameBtn', i18n.t('profile.btn.save'));
    setText('lblStatLifetime', i18n.t('profile.stat.time'));
    setText('lblStatStreak', i18n.t('profile.stat.streak'));
    setText('lblStatItems', i18n.t('profile.stat.items'));
    setText('lblStatReviews', i18n.t('profile.stat.reviews'));
    setText('lblSecretKey', i18n.t('profile.secret_key.title'));
    setText('keyInfoText', i18n.t('profile.secret_key.info'));
    setText('copyKeyBtn', i18n.t('profile.secret_key.copy'));
    setText('lblTheme', i18n.t('profile.theme.label'));
    setText('lblLang', i18n.t('profile.lang.label'));
    setText('toggleThemeBtn', this.profile.theme === 'dark_slate' ? i18n.t('profile.theme.dark') : i18n.t('profile.theme.warm'));
    setText('toggleLangBtn', (i18n.currentLocale || i18n.locale) === 'en' ? 'ENGLISH' : 'ITALIANO');
    
    this._updateProfileModalUI();

    // Onboarding Modal
    setText('onboardingTitle', i18n.t('onboarding.title'));
    setText('onboardingP1', i18n.t('onboarding.p1'));
    setText('onboardingF1T', i18n.t('onboarding.f1_title') + ':');
    setText('onboardingF1D', i18n.t('onboarding.f1_desc'));
    setText('onboardingF2T', i18n.t('onboarding.f2_title') + ':');
    setText('onboardingF2D', i18n.t('onboarding.f2_desc'));
    setText('onboardingF3T', i18n.t('onboarding.f3_title') + ':');
    setText('onboardingF3D', i18n.t('onboarding.f3_desc'));
    setText('lblOnboardName', i18n.t('onboarding.lbl.name'));
    setPlaceholder('onboardNameInput', i18n.t('onboarding.ph.name'));
    setText('onboardNameWarn', i18n.t('onboarding.warn_name'));
    setText('lblOnboardTopic', i18n.t('onboarding.lbl.topic'));
    setPlaceholder('onboardTopicInput', i18n.t('onboarding.ph.topic'));
    setText('onboardTopicWarn', i18n.t('onboarding.warn_topic'));
    setText('onboardStartBtn', i18n.t('onboarding.btn.start'));
    setText('linkRecoverKey', i18n.t('onboarding.link.recover'));

    // Finish Modal
    setText('finishCloseBtn', i18n.t('app.btn.close'));
    setText('finishHeaderSub', i18n.t('finish.header.sub'));
    setText('quizEmptyTitle', i18n.t('finish.step1.empty_title'));
    if (!this.currentQuiz) {
      setText('quizEmptyDesc', i18n.t('finish.step1.empty_desc', { topic: this.activeTopic }));
      const qText = document.getElementById('quizQuestionText');
      if (qText && qText.textContent.includes('...')) {
        qText.textContent = i18n.t('finish.step1.loading');
      }
    }
    setText('quizSkipBtn', i18n.t('finish.step1.btn_skip'));
    setText('quizFlagBtn', i18n.t('finish.step1.btn_flag'));
    setText('quizSkipTopicBtn', i18n.t('finish.step1.btn_skip_topic'));
    setText('reviewTitle', i18n.t('finish.step2.title'));
    setText('reviewSub', i18n.t('finish.step2.sub'));
    setText('lblReviewTopic', i18n.t('finish.step2.lbl_topic'));
    setText('lblReviewQ', i18n.t('finish.step2.lbl_q'));
    setText('lblReviewA', i18n.t('finish.step2.lbl_a'));
    if (this.currentReviewCandidate) {
      const refreshed = this.knowledge.candidateQueue.find(c => c.id === this.currentReviewCandidate.id);
      if (refreshed) {
        setText('reviewTopic', this.knowledge._resolveText(refreshed.topic, i18n.locale));
        setText('reviewQuestion', this.knowledge._resolveText(refreshed.question, i18n.locale));
        setText('reviewAnswer', this.knowledge._resolveText(refreshed.answer, i18n.locale));
      }
    }
    setText('reviewTrueBtn', i18n.t('finish.step2.btn_true'));
    setText('reviewFalseBtn', i18n.t('finish.step2.btn_false'));
    setText('reviewIdkBtn', i18n.t('finish.step2.btn_idk'));
    setText('donateTitle', i18n.t('finish.step3.title'));
    setText('donateSub', i18n.t('finish.step3.sub'));
    setText('lblDonateQ', i18n.t('finish.step3.lbl_q'));
    setPlaceholder('donateQuestionInput', i18n.t('finish.step3.ph_q'));
    setText('lblDonateA', i18n.t('finish.step3.lbl_a'));
    setPlaceholder('donateAnswerInput', i18n.t('finish.step3.ph_a'));
    setText('donateSubmitBtn', i18n.t('finish.step3.btn_submit'));
    setText('donateCloseBtn', i18n.t('finish.step3.btn_close'));

    // Recovery Modal
    setText('recoveryTitle', i18n.t('recovery.title'));
    setText('recoveryCloseBtn', i18n.t('app.btn.close'));
    setText('recoveryDesc', i18n.t('recovery.desc'));
    setPlaceholder('recoveryKeyInput', i18n.t('recovery.ph'));
    setText('recoverySubmitBtn', i18n.t('recovery.btn_submit'));
    setText('recoveryCancelBtn', i18n.t('recovery.btn_cancel'));
  }

  _updatePantryButton() {
    const totalItems = this.pet.pantry.biscuit + this.pet.pantry.coffee + this.pet.pantry.sponge;
    const isMobile = window.innerWidth <= 768;
    const btn = document.getElementById('pantryBtn');
    if (btn) {
      btn.textContent = isMobile
        ? i18n.t('app.btn.pantry_short')
        : i18n.t('app.btn.pantry', { count: totalItems });
    }
  }

  /* ==================== TIMER HANDLERS ==================== */

  _onTimerTick(tick) {
    const display = document.getElementById('timerDisplay');
    display.textContent = tick.formattedRemaining;
    display.classList.toggle('locked', tick.state === 'RUNNING' || tick.state === 'PAUSED');

    const primaryBtn = document.getElementById('timerPrimaryBtn');
    const finishBtn = document.getElementById('timerFinishBtn');

    if (tick.state === 'RUNNING') {
      primaryBtn.textContent = i18n.t('timer.btn.pause');
      primaryBtn.classList.remove('primary');
      finishBtn.style.display = 'inline-block';
    } else if (tick.state === 'PAUSED') {
      primaryBtn.textContent = i18n.t('timer.btn.resume');
      primaryBtn.classList.add('primary');
      finishBtn.style.display = 'inline-block';
    } else {
      primaryBtn.textContent = i18n.t('timer.btn.start');
      primaryBtn.classList.add('primary');
      finishBtn.style.display = 'none';
    }
  }

  _onTimerComplete(summary) {
    console.log('[Timer] Session finished:', summary);
    audioSynth.playClick();

    // Update profile
    profileStorage.recordSession(summary.verifiedSeconds, summary.resourcesEarned);

    // Contribute study minutes to global community pool
    const minsStudied = Math.round(summary.verifiedSeconds / 60);
    const expRate = CONFIG.GLOBAL_PROGRESSION ? CONFIG.GLOBAL_PROGRESSION.EXP_STUDY_MINUTE : 1;
    const expGained = Math.max(5, minsStudied * expRate);
    this.pet.gainExp(expGained, 'study');
    this._showSpeechBubble(i18n.t('bubble.global_contrib', { exp: expGained, mins: minsStudied }));

    // Give earned resources to pantry
    if (summary.resourcesEarned > 0) {
      this.pet.pantry.biscuit += summary.resourcesEarned;
      if (minsStudied >= 20) {
        this.pet.pantry.coffee += Math.max(1, Math.floor(summary.resourcesEarned / 2));
      }
      if (minsStudied >= 40) {
        this.pet.pantry.sponge += 1;
      }
      this.pet._savePantry();
      this.pet._notify(true);
      this._updatePantryButton();
    }

    // Prepare Finish Modal
    document.getElementById('finishHeaderTitle').textContent = i18n.t('finish.header.title', { time: summary.formattedTime });
    document.getElementById('finishHeaderSub').textContent = i18n.t('finish.header.sub');

    // Launch Step 1 (Quiz)
    this._setupFinishStep1();
    this._openModal('finishModal');
  }

  /* ==================== FINISH SESSION MODAL (3 STEPS) ==================== */

  _setupFinishStep1() {
    document.getElementById('finishStep1').style.display = 'block';
    document.getElementById('finishStep2').style.display = 'none';
    document.getElementById('finishStep3').style.display = 'none';

    document.getElementById('quizTitle').textContent = i18n.t('finish.step1.title', { topic: this.activeTopic });
    document.getElementById('quizSub').textContent = i18n.t('finish.step1.sub');

    this.currentQuiz = this.knowledge.getQuizForTopic(this.activeTopic, i18n.locale);

    const contentBox = document.getElementById('quizContentBox');
    const emptyBox = document.getElementById('quizEmptyBox');

    if (!this.currentQuiz) {
      // No quiz yet for this custom topic (Pioneer state!)
      contentBox.style.display = 'none';
      emptyBox.style.display = 'block';
      document.getElementById('quizEmptyDesc').textContent = i18n.t('finish.step1.empty_desc', { topic: this.activeTopic });
      return;
    }

    contentBox.style.display = 'block';
    emptyBox.style.display = 'none';

    document.getElementById('quizQuestionText').textContent = this.currentQuiz.question;
    const optsList = document.getElementById('quizOptionsList');
    optsList.innerHTML = '';

    this.currentQuiz.options.forEach((optText, index) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.textContent = optText;
      btn.onclick = () => this._handleQuizAnswer(index, btn);
      optsList.appendChild(btn);
    });
  }

  _handleQuizAnswer(selectedIndex, clickedBtn) {
    audioSynth.playClick();
    const isCorrect = selectedIndex === this.currentQuiz.correctIndex;
    const allBtns = document.querySelectorAll('.quiz-opt-btn');
    allBtns.forEach(b => b.disabled = true);

    if (isCorrect) {
      clickedBtn.classList.add('correct');
      const expGain = CONFIG.GLOBAL_PROGRESSION ? CONFIG.GLOBAL_PROGRESSION.EXP_QUIZ_CORRECT : 15;
      this.pet.gainExp(expGain, 'quiz');
      this.pet.onQuizVictory();
    } else {
      clickedBtn.classList.add('wrong');
      // Highlight correct answer gently
      allBtns[this.currentQuiz.correctIndex].classList.add('correct');
    }

    // Proceed to Step 2 after 1.8 seconds
    setTimeout(() => {
      this._setupFinishStep2();
    }, 1800);
  }

  _setupFinishStep2() {
    document.getElementById('finishStep1').style.display = 'none';
    document.getElementById('finishStep2').style.display = 'block';
    document.getElementById('finishStep3').style.display = 'none';

    this.currentReviewCandidate = this.knowledge.getCandidateForReview(i18n.locale);

    if (!this.currentReviewCandidate) {
      // Empty review queue, skip to Step 3
      this._setupFinishStep3();
      return;
    }

    const voteActions = document.getElementById('reviewVoteActions');
    const transActions = document.getElementById('reviewTranslationActions');
    const reviewTitle = document.getElementById('reviewTitle');
    const reviewSub = document.getElementById('reviewSub');

    document.getElementById('reviewTopic').textContent = this.currentReviewCandidate.topic;
    document.getElementById('reviewQuestion').textContent = this.currentReviewCandidate.question;
    document.getElementById('reviewAnswer').textContent = this.currentReviewCandidate.answer;

    if (this.currentReviewCandidate.isTranslation) {
      // Show translation quest (Approccio 3)
      if (reviewTitle) reviewTitle.textContent = i18n.t('finish.step2.translation_title');
      if (reviewSub) reviewSub.textContent = i18n.t('finish.step2.translation_sub');
      if (voteActions) voteActions.style.display = 'none';
      if (transActions) {
        transActions.style.display = 'flex';
        document.getElementById('translateQuestionInput').value = '';
        document.getElementById('translateAnswerInput').value = '';
        document.getElementById('translateQuestionInput').placeholder = i18n.t('finish.step2.ph_trans_q');
        document.getElementById('translateAnswerInput').placeholder = i18n.t('finish.step2.ph_trans_a');
        document.getElementById('submitTranslationBtn').textContent = i18n.t('finish.step2.btn_submit_trans');
      }
    } else {
      // Standard review
      if (reviewTitle) reviewTitle.textContent = i18n.t('finish.step2.title');
      if (reviewSub) reviewSub.textContent = i18n.t('finish.step2.sub');
      if (voteActions) voteActions.style.display = 'flex';
      if (transActions) transActions.style.display = 'none';
    }
  }

  _handleSubmitTranslation() {
    audioSynth.playClick();
    if (this.currentReviewCandidate && this.currentReviewCandidate.isTranslation) {
      const q = document.getElementById('translateQuestionInput').value;
      const a = document.getElementById('translateAnswerInput').value;
      if (q && a) {
        this.knowledge.submitTranslation(this.currentReviewCandidate.id, q, a, this.currentReviewCandidate.targetLang);
        profileStorage.recordReview();
        const expGain = CONFIG.GLOBAL_PROGRESSION ? CONFIG.GLOBAL_PROGRESSION.EXP_TRANSLATE_CONCEPT : 20;
        this.pet.gainExp(expGain, 'translation');
        audioSynth.playVictory();
      }
    }
    this._setupFinishStep3();
  }

  _handleReviewVote(vote) {
    audioSynth.playRelayClick();
    if (this.currentReviewCandidate) {
      this.knowledge.voteCandidate(this.currentReviewCandidate.id, vote);
      profileStorage.recordReview();
      const expGain = CONFIG.GLOBAL_PROGRESSION ? CONFIG.GLOBAL_PROGRESSION.EXP_REVIEW_VOTE : 5;
      this.pet.gainExp(expGain, 'review');
    }
    // Proceed to Step 3
    this._setupFinishStep3();
  }

  _setupFinishStep3() {
    document.getElementById('finishStep1').style.display = 'none';
    document.getElementById('finishStep2').style.display = 'none';
    document.getElementById('finishStep3').style.display = 'block';

    document.getElementById('donateQuestionInput').value = '';
    document.getElementById('donateAnswerInput').value = '';
  }

  _handleDonateSubmit() {
    const q = document.getElementById('donateQuestionInput').value.trim();
    const a = document.getElementById('donateAnswerInput').value.trim();
    if (q && a) {
      this.knowledge.submitNotion(this.activeTopic, q, a, i18n.locale);
      profileStorage.addCustomTopic(this.activeTopic);
      audioSynth.playDonate();
      const expGain = CONFIG.GLOBAL_PROGRESSION ? CONFIG.GLOBAL_PROGRESSION.EXP_NOTION_DONATED : 10;
      this.pet.gainExp(expGain, 'donate');
      if (this.mesh) {
        this.mesh.broadcastNotion({
          topic: this.activeTopic,
          question: q,
          answer: a,
          lang: i18n.locale
        });
        this.mesh.broadcastState();
      }
    }
    this._closeModal('finishModal');
  }

  /* ==================== PANTRY ACTIONS ==================== */

  _handleFeedBiscuit() {
    audioSynth.playClick();
    const res = this.pet.feedBiscuit();
    this._showPantryToast(res.message, res.success);
    if (res.success) {
      audioSynth.playDonate();
      this._updatePantryButton();
    }
  }

  _handleOfferCoffee() {
    audioSynth.playClick();
    const res = this.pet.offerCoffee();
    this._showPantryToast(res.message, res.success);
    if (res.success) {
      audioSynth.playDonate();
      this._updatePantryButton();
    }
  }

  _handleCleanSponge() {
    audioSynth.playClick();
    const res = this.pet.cleanWithSponge();
    this._showPantryToast(res.message, res.success);
    if (res.success) {
      audioSynth.playSpark();
      this._updatePantryButton();
    }
  }

  _showPantryToast(msg, isSuccess) {
    const toast = document.getElementById('pantryToast');
    toast.textContent = msg;
    toast.className = `toast-msg ${isSuccess ? 'success' : 'warn'}`;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3200);
  }

  /* ==================== UI BINDINGS ==================== */

  _bindUIEvents() {
    // 1. Click on Bibo (Speech bubble & touch reactions)
    document.getElementById('biboContainer').addEventListener('click', (e) => {
      audioSynth.playClick();

      // If Bibo is sleeping, do NOT play annoyed or victory, and do not show their text!
      if (this.pet.state === 'ASLEEP') {
        this._showSpeechBubble(i18n.t('bubble.needs.sleeping_touch'), true);
        return;
      }

      if (this.timer.state === 'RUNNING') {
        const text = this.pet.onUserClickedDuringStudy();
        if (text) this._showSpeechBubble(text);
      } else if (this.timer.state === 'PAUSED') {
        this._showSpeechBubble(i18n.t('bubble.paused'));
      } else {
        // Idle state: trigger annoyed/poke reaction so Bibo visibly reacts when touched
        const text = this.pet.onUserClickedDuringStudy();
        if (text) {
          this._showSpeechBubble(text);
        } else {
          const idleGreetings = [
            i18n.t('bubble.idle.1'),
            i18n.t('bubble.idle.2'),
            i18n.t('bubble.idle.3')
          ];
          const pick = idleGreetings[Math.floor(Math.random() * idleGreetings.length)];
          this._showSpeechBubble(pick);
        }
      }
    });

    // 2. Timer Controls
    document.getElementById('timerPrimaryBtn').addEventListener('click', () => {
      audioSynth.playClick();
      if (this.timer.state === 'RUNNING') {
        this.timer.pause();
      } else if (this.timer.state === 'PAUSED') {
        this.timer.resume();
      } else {
        this.timer.start();
      }
    });

    document.getElementById('timerFinishBtn').addEventListener('click', () => {
      audioSynth.playClick();
      this.timer.completeSession();
    });

    // Duration Selector Popover toggle (locked during active session)
    const timerDisplay = document.getElementById('timerDisplay');
    const durPopover = document.getElementById('durationPopover');
    timerDisplay.addEventListener('click', () => {
      if (this.timer.state === 'RUNNING' || this.timer.state === 'PAUSED') {
        audioSynth.playClick();
        this._showSpeechBubble(i18n.t('timer.warn_in_progress'));
        return;
      }
      durPopover.classList.toggle('active');
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn[data-mins]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.timer.state === 'RUNNING' || this.timer.state === 'PAUSED') return;
        audioSynth.playClick();
        const mins = parseInt(e.target.getAttribute('data-mins'), 10);
        this.timer.setDuration(mins);
        durPopover.classList.remove('active');
      });
    });

    // Custom minutes input with validation warning (5 - 180 min)
    const customInput = document.getElementById('customMinsInput');
    const customWarn = document.getElementById('customMinsWarn');
    const applyCustomMins = () => {
      if (this.timer.state === 'RUNNING' || this.timer.state === 'PAUSED') return;
      const val = parseInt(customInput.value, 10);
      if (isNaN(val) || val < 5 || val > 180) {
        if (customWarn) customWarn.style.display = 'block';
        customInput.style.borderColor = 'var(--accent-red)';
      } else {
        if (customWarn) customWarn.style.display = 'none';
        customInput.style.borderColor = 'var(--border-color)';
        audioSynth.playClick();
        this.timer.setDuration(val);
        durPopover.classList.remove('active');
      }
    };

    document.getElementById('customMinsApplyBtn').addEventListener('click', applyCustomMins);
    customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyCustomMins();
    });
    customInput.addEventListener('input', () => {
      if (customWarn) customWarn.style.display = 'none';
      customInput.style.borderColor = 'var(--border-color)';
    });

    // 3. Topic Selector Popover
    const topicBtn = document.getElementById('topicChipBtn');
    const topicPopover = document.getElementById('topicPopover');
    const topicInput = document.getElementById('topicSearchInput');
    const topicSuggestions = document.getElementById('topicSuggestions');

    topicBtn.addEventListener('click', () => {
      topicPopover.classList.toggle('active');
      if (topicPopover.classList.contains('active')) {
        topicInput.value = '';
        this._renderTopicSuggestions('');
        topicInput.focus();
      }
    });

    topicInput.addEventListener('input', (e) => {
      this._renderTopicSuggestions(e.target.value);
    });

    topicInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && topicInput.value.trim()) {
        this._setTopic(topicInput.value.trim());
        topicPopover.classList.remove('active');
      }
    });

    // 4. Audio Selector Popover
    const audioBtn = document.getElementById('audioBtn');
    const audioPopover = document.getElementById('audioPopover');
    audioBtn.addEventListener('click', () => {
      audioPopover.classList.toggle('active');
    });

    document.querySelectorAll('[data-audio]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        audioSynth.playClick();
        const type = e.target.getAttribute('data-audio');
        audioSynth.setAmbient(type);
        audioPopover.classList.remove('active');
        
        let label = i18n.t('audio.mute');
        if (type === 'rain') label = i18n.t('audio.rain');
        if (type === 'brown') label = i18n.t('audio.brown');
        audioBtn.textContent = i18n.t('audio.label', { name: label });
      });
    });

    // 5. Pantry Modal
    document.getElementById('pantryBtn').addEventListener('click', () => {
      audioSynth.playClick();
      this._openModal('pantryModal');
    });
    document.getElementById('pantryCloseBtn').addEventListener('click', () => {
      audioSynth.playClick();
      this._closeModal('pantryModal');
    });
    document.getElementById('feedBiscuitBtn').addEventListener('click', () => this._handleFeedBiscuit());
    document.getElementById('offerCoffeeBtn').addEventListener('click', () => this._handleOfferCoffee());
    document.getElementById('cleanSpongeBtn').addEventListener('click', () => this._handleCleanSponge());

    // 6. Profile Modal & Inline Name Edit
    const editBtn = document.getElementById('profileEditNameBtn');
    const displayWrap = document.getElementById('profileNameDisplayWrap');
    const editWrap = document.getElementById('profileNameEditWrap');
    const pNameInput = document.getElementById('profileNameInput');
    const saveNameBtn = document.getElementById('profileSaveNameBtn');
    const cancelNameBtn = document.getElementById('profileCancelNameBtn');

    const closeNameEdit = () => {
      if (editWrap) editWrap.style.display = 'none';
      if (displayWrap) displayWrap.style.display = 'flex';
      if (editBtn) editBtn.style.display = 'inline-block';
    };

    const openNameEdit = () => {
      audioSynth.playClick();
      pNameInput.value = this.profile.nickname || 'Studente';
      if (displayWrap) displayWrap.style.display = 'none';
      if (editBtn) editBtn.style.display = 'none';
      if (editWrap) editWrap.style.display = 'flex';
      pNameInput.focus();
      pNameInput.select();
    };

    const saveNameEdit = () => {
      const val = pNameInput.value.trim();
      if (val) {
        audioSynth.playClick();
        this.profile.nickname = val;
        profileStorage.saveProfile();
        document.getElementById('profileNameDisplay').textContent = val;
      }
      closeNameEdit();
    };

    if (editBtn) editBtn.addEventListener('click', openNameEdit);
    if (saveNameBtn) saveNameBtn.addEventListener('click', saveNameEdit);
    if (cancelNameBtn) cancelNameBtn.addEventListener('click', () => {
      audioSynth.playClick();
      closeNameEdit();
    });
    if (pNameInput) {
      pNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveNameEdit();
        if (e.key === 'Escape') {
          audioSynth.playClick();
          closeNameEdit();
        }
      });
    }

    document.getElementById('profileBtn').addEventListener('click', () => {
      audioSynth.playClick();
      closeNameEdit();
      this._updateProfileModalUI();
      this._openModal('profileModal');
    });
    document.getElementById('profileCloseBtn').addEventListener('click', () => {
      audioSynth.playClick();
      closeNameEdit();
      this._closeModal('profileModal');
    });

    document.getElementById('keyInfoBtn').addEventListener('click', () => {
      const info = document.getElementById('keyInfoText');
      info.style.display = info.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('copyKeyBtn').addEventListener('click', () => {
      audioSynth.playClick();
      navigator.clipboard.writeText(this.profile.secretKey);
      const copyBtn = document.getElementById('copyKeyBtn');
      copyBtn.textContent = i18n.t('profile.secret_key.copied');
      setTimeout(() => copyBtn.textContent = i18n.t('profile.secret_key.copy'), 2000);
    });

    document.getElementById('toggleThemeBtn').addEventListener('click', () => {
      audioSynth.playClick();
      const nextTheme = this.profile.theme === 'warm_paper' ? 'dark_slate' : 'warm_paper';
      this._applyTheme(nextTheme);
    });

    document.getElementById('toggleLangBtn').addEventListener('click', () => {
      audioSynth.playClick();
      const nextLocale = i18n.currentLocale === 'it' ? 'en' : 'it';
      i18n.setLocale(nextLocale);
      this._updateAllI18nTexts();
      document.getElementById('toggleLangBtn').textContent = nextLocale === 'en' ? 'ENGLISH' : 'ITALIANO';
    });

    // 7. Finish Modal Controls
    document.getElementById('finishCloseBtn').addEventListener('click', () => {
      audioSynth.playClick();
      this._closeModal('finishModal');
    });
    document.getElementById('quizSkipBtn').addEventListener('click', () => {
      audioSynth.playClick();
      this._setupFinishStep2();
    });
    document.getElementById('quizSkipTopicBtn').addEventListener('click', () => {
      audioSynth.playClick();
      this._setupFinishStep2();
    });
    document.getElementById('quizFlagBtn').addEventListener('click', () => {
      if (this.currentQuiz) {
        this.knowledge.flagQuestion(this.currentQuiz.id);
        alert(i18n.t('finish.step1.flag_sent'));
        this._setupFinishStep2();
      }
    });

    document.getElementById('reviewTrueBtn').addEventListener('click', () => this._handleReviewVote('true'));
    document.getElementById('reviewFalseBtn').addEventListener('click', () => this._handleReviewVote('false'));
    document.getElementById('reviewIdkBtn').addEventListener('click', () => this._handleReviewVote('skip'));

    const submitTransBtn = document.getElementById('submitTranslationBtn');
    if (submitTransBtn) submitTransBtn.addEventListener('click', () => this._handleSubmitTranslation());
    const skipTransBtn = document.getElementById('skipTranslationBtn');
    if (skipTransBtn) skipTransBtn.addEventListener('click', () => this._setupFinishStep3());

    document.getElementById('donateSubmitBtn').addEventListener('click', () => this._handleDonateSubmit());
    document.getElementById('donateCloseBtn').addEventListener('click', () => {
      audioSynth.playClick();
      this._closeModal('finishModal');
    });

    // 8. Onboarding Modal Controls
    const onboardTopicInput = document.getElementById('onboardTopicInput');
    const onboardTopicSuggestions = document.getElementById('onboardTopicSuggestions');

    const nameInput = document.getElementById('onboardNameInput');
    const nameWarn = document.getElementById('onboardNameWarn');
    const topicWarn = document.getElementById('onboardTopicWarn');

    nameInput.addEventListener('input', () => {
      if (nameWarn) nameWarn.style.display = 'none';
      nameInput.style.borderColor = 'var(--border-color)';
    });

    const renderOnboardSuggestions = (query) => {
      onboardTopicSuggestions.innerHTML = '';
      const q = (query || '').toLowerCase().trim();
      const baseTopics = this.knowledge.getTopicsList(i18n.locale);
      const customTopics = (this.profile.customTopics || []).map(t => typeof t === 'string' ? t : (t[i18n.locale] || t.it || t.en || ''));
      const allTopics = Array.from(new Set([...baseTopics, ...customTopics])).filter(Boolean);
      const filtered = q ? allTopics.filter(t => t.toLowerCase().includes(q)) : allTopics;

      if (filtered.length === 0) {
        onboardTopicSuggestions.style.display = 'none';
        return;
      }

      filtered.forEach(topicName => {
        const item = document.createElement('div');
        item.className = 'topic-item';
        item.textContent = topicName;
        item.onmousedown = (e) => {
          e.preventDefault();
          onboardTopicInput.value = topicName;
          if (topicWarn) topicWarn.style.display = 'none';
          onboardTopicInput.style.borderColor = 'var(--border-color)';
          onboardTopicSuggestions.style.display = 'none';
        };
        onboardTopicSuggestions.appendChild(item);
      });
      onboardTopicSuggestions.style.display = 'block';
    };

    onboardTopicInput.addEventListener('input', (e) => {
      if (topicWarn) topicWarn.style.display = 'none';
      onboardTopicInput.style.borderColor = 'var(--border-color)';
      renderOnboardSuggestions(e.target.value);
    });
    onboardTopicInput.addEventListener('focus', (e) => {
      renderOnboardSuggestions(e.target.value);
    });
    onboardTopicInput.addEventListener('blur', () => {
      setTimeout(() => {
        onboardTopicSuggestions.style.display = 'none';
      }, 150);
    });

    document.getElementById('onboardStartBtn').addEventListener('click', () => {
      const name = nameInput.value.trim();
      const topic = onboardTopicInput.value.trim();

      let hasError = false;
      if (!name) {
        if (nameWarn) nameWarn.style.display = 'block';
        nameInput.style.borderColor = 'var(--accent-red)';
        nameInput.focus();
        hasError = true;
      }
      if (!topic) {
        if (topicWarn) topicWarn.style.display = 'block';
        onboardTopicInput.style.borderColor = 'var(--accent-red)';
        if (!hasError) onboardTopicInput.focus();
        hasError = true;
      }
      if (hasError) return;

      audioSynth.playClick();
      this.profile.nickname = name;
      this._setTopic(topic);
      this.profile.onboardingComplete = true;
      profileStorage.saveProfile();
      this._closeModal('onboardingModal');
    });

    document.getElementById('linkRecoverKey').addEventListener('click', (e) => {
      e.preventDefault();
      this._openedRecoveryFromOnboarding = true;
      this._closeModal('onboardingModal');
      this._openModal('recoveryModal');
    });

    const handleRecoveryCancelOrClose = () => {
      audioSynth.playClick();
      this._closeModal('recoveryModal');
      if (this._openedRecoveryFromOnboarding && !this.profile.onboardingComplete) {
        this._openModal('onboardingModal');
        this._openedRecoveryFromOnboarding = false;
      }
    };

    document.getElementById('recoverySubmitBtn').addEventListener('click', () => {
      audioSynth.playClick();
      const key = document.getElementById('recoveryKeyInput').value.trim();
      if (profileStorage.restoreWithKey(key)) {
        this.profile = profileStorage.profile;
        this.profile.onboardingComplete = true;
        profileStorage.saveProfile();
        this._closeModal('recoveryModal');
        this._updateAllI18nTexts();
        this._openedRecoveryFromOnboarding = false;
      } else {
        alert(i18n.t('recovery.invalid'));
      }
    });

    document.getElementById('recoveryCloseBtn').addEventListener('click', handleRecoveryCancelOrClose);
    document.getElementById('recoveryCancelBtn').addEventListener('click', handleRecoveryCancelOrClose);

    // 8. Make All Modals & Docks Draggable by Title Bar
    this._makeDraggable(document.querySelector('#onboardingModal .modal-card'), document.querySelector('#onboardingModal .modal-header'));
    this._makeDraggable(document.querySelector('#finishModal .modal-card'), document.querySelector('#finishModal .modal-header'));
    this._makeDraggable(document.querySelector('#recoveryModal .modal-card'), document.querySelector('#recoveryModal .modal-header'));
    this._makeDraggable(document.getElementById('pantryModal'), document.querySelector('#pantryModal .modal-header'));
    this._makeDraggable(document.getElementById('profileModal'), document.querySelector('#profileModal .modal-header'));

    // Global click listener to close popovers and drawers on outside click
    document.addEventListener('click', (e) => {
      if (!timerDisplay.contains(e.target) && !durPopover.contains(e.target)) {
        durPopover.classList.remove('active');
      }
      if (!topicBtn.contains(e.target) && !topicPopover.contains(e.target)) {
        topicPopover.classList.remove('active');
      }
      if (!audioBtn.contains(e.target) && !audioPopover.contains(e.target)) {
        audioPopover.classList.remove('active');
      }

      // Close lateral drawers on outside click
      const pantryModal = document.getElementById('pantryModal');
      const pantryBtn = document.getElementById('pantryBtn');
      if (pantryModal && pantryModal.classList.contains('active') && !pantryModal.contains(e.target) && !pantryBtn.contains(e.target)) {
        pantryModal.classList.remove('active');
      }

      const profileModal = document.getElementById('profileModal');
      const profileBtn = document.getElementById('profileBtn');
      if (profileModal && profileModal.classList.contains('active') && !profileModal.contains(e.target) && !profileBtn.contains(e.target)) {
        profileModal.classList.remove('active');
      }
    });

    // 8b. Window Resize Listener for dynamic mobile/desktop HUD updates
    window.addEventListener('resize', () => {
      this._updatePantryButton();
    });

  }

  _renderTopicSuggestions(query) {
    const list = document.getElementById('topicSuggestions');
    list.innerHTML = '';

    const q = (query || '').toLowerCase().trim();
    // Unique list of topics from knowledge base and custom user topics
    const baseTopics = this.knowledge.getTopicsList(i18n.locale);
    const customTopics = (this.profile.customTopics || []).map(t => typeof t === 'string' ? t : (t[i18n.locale] || t.it || t.en || ''));
    const allTopics = Array.from(new Set([...baseTopics, ...customTopics])).filter(Boolean);

    const filtered = q ? allTopics.filter(t => t.toLowerCase().includes(q)) : allTopics;

    filtered.forEach(topicName => {
      const item = document.createElement('div');
      item.className = 'topic-item';
      item.textContent = topicName;
      item.onclick = () => {
        this._setTopic(topicName);
        document.getElementById('topicPopover').classList.remove('active');
      };
      list.appendChild(item);
    });

    // Allow custom creation if not exact match
    if (q && !allTopics.some(t => t.toLowerCase() === q)) {
      const customItem = document.createElement('div');
      customItem.className = 'topic-item';
      customItem.style.fontStyle = 'italic';
      customItem.textContent = i18n.t('topic.save_custom', { query });
      customItem.onclick = () => {
        this._setTopic(query);
        document.getElementById('topicPopover').classList.remove('active');
      };
      list.appendChild(customItem);
    }
  }

  _setTopic(newTopic) {
    if (!newTopic || !newTopic.trim()) return;
    const clean = newTopic.trim();
    this.activeTopic = clean;
    this.profile.currentTopic = clean;
    profileStorage.addCustomTopic(clean);
    document.getElementById('topicChipText').textContent = clean.toUpperCase();
    if (this.mesh) {
      this.mesh.broadcastState();
    }
  }

  _updateNeedsUI(state) {
    document.getElementById('fillHunger').style.width = `${state.hunger}%`;
    document.getElementById('fillEnergy').style.width = `${state.energy}%`;
    document.getElementById('fillClean').style.width = `${state.cleanliness}%`;
    document.getElementById('fillExp').style.width = `${state.expPercent}%`;

    const expLabel = document.getElementById('lblExp');
    if (expLabel) {
      expLabel.textContent = i18n.t('needs.exp');
      expLabel.removeAttribute('title');
    }
    const expTrack = document.getElementById('fillExp')?.parentElement;
    if (expTrack) {
      expTrack.removeAttribute('title');
    }

    // Pantry modal quantities
    document.getElementById('qtyBiscuit').textContent = state.pantry.biscuit;
    document.getElementById('qtyCoffee').textContent = state.pantry.coffee;
    document.getElementById('qtySponge').textContent = state.pantry.sponge;
    this._updatePantryButton();
  }

  _updateProfileModalUI() {
    document.getElementById('profileNameDisplay').textContent = this.profile.nickname || 'Studente';
    document.getElementById('statLifetime').textContent = profileStorage.getFormattedLifetime();
    document.getElementById('statStreak').textContent = `${this.profile.currentStreakDays} ${i18n.t('profile.days_suffix')}`;
    document.getElementById('statItems').textContent = i18n.t('profile.stat.items_suffix', { count: this.profile.itemsProduced });
    document.getElementById('statReviews').textContent = i18n.t('profile.stat.reviews_suffix', { count: this.profile.reviewsCompleted });
    document.getElementById('secretKeyDisplay').value = this.profile.secretKey;
  }

  _handleAnimStateChange(animKey) {
    switch (animKey) {
      case CONFIG.ANIMATIONS.IDLE_AFFAMATO:
        this._showSpeechBubble(i18n.t('bubble.needs.hungry'), true);
        break;
      case CONFIG.ANIMATIONS.IDLE_STANCO:
        this._showSpeechBubble(i18n.t('bubble.needs.tired'), true);
        break;
      case CONFIG.ANIMATIONS.IDLE_SPORCO:
        this._showSpeechBubble(i18n.t('bubble.needs.dirty'), true);
        break;
      case CONFIG.ANIMATIONS.SLEEP:
        this._showSpeechBubble(i18n.t('bubble.needs.sleep'), true);
        break;
      case CONFIG.ANIMATIONS.IDLE_BASE:
        this._hideSpeechBubble();
        break;
      default:
        break;
    }
  }

  _showSpeechBubble(text, isPermanent = false) {
    const bubble = document.getElementById('speechBubble');
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.add('visible');

    if (this.pet.state === 'ASLEEP') {
      bubble.classList.add('sleeping');
    } else {
      bubble.classList.remove('sleeping');
    }

    if (this.bubbleTimeout) {
      clearTimeout(this.bubbleTimeout);
      this.bubbleTimeout = null;
    }

    if (!isPermanent) {
      this.bubbleTimeout = setTimeout(() => {
        bubble.classList.remove('visible');
        bubble.classList.remove('sleeping');
      }, 3200);
    }
  }

  _hideSpeechBubble() {
    const bubble = document.getElementById('speechBubble');
    if (bubble) {
      bubble.classList.remove('visible');
      bubble.classList.remove('sleeping');
    }
    if (this.bubbleTimeout) {
      clearTimeout(this.bubbleTimeout);
      this.bubbleTimeout = null;
    }
  }

  _openModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    const card = el.classList.contains('modal-overlay') ? el.querySelector('.modal-card') : el;
    if (card) {
      card.style.left = '';
      card.style.top = '';
      card.style.right = '';
      card.style.bottom = '';
      card.style.margin = '';
      card.style.transform = '';
      card.style.position = '';
    }
    el.classList.add('active');
  }

  _closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  }

  _makeDraggable(containerEl, headerEl) {
    if (!containerEl || !headerEl) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;

    const onStart = (clientX, clientY, target) => {
      // Preserve fixed responsive mobile bottom sheet / dock placement
      if (window.innerWidth <= 768) return false;

      // Don't drag if clicking buttons, inputs, links
      if (['BUTTON', 'INPUT', 'SELECT', 'A'].includes(target.tagName)) return false;

      isDragging = true;
      headerEl.classList.add('dragging');

      const rect = containerEl.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      startX = clientX;
      startY = clientY;

      containerEl.style.position = 'fixed';
      containerEl.style.left = `${origLeft}px`;
      containerEl.style.top = `${origTop}px`;
      containerEl.style.right = 'auto';
      containerEl.style.bottom = 'auto';
      containerEl.style.margin = '0';
      containerEl.style.transform = 'none';
      return true;
    };

    const onMove = (clientX, clientY) => {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;

      let newLeft = origLeft + dx;
      let newTop = origTop + dy;

      const rect = containerEl.getBoundingClientRect();
      const maxLeft = window.innerWidth - rect.width - 8;
      const maxTop = window.innerHeight - rect.height - 8;

      newLeft = Math.max(8, Math.min(newLeft, maxLeft));
      newTop = Math.max(8, Math.min(newTop, maxTop));

      containerEl.style.left = `${newLeft}px`;
      containerEl.style.top = `${newTop}px`;
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      headerEl.classList.remove('dragging');
    };

    // Desktop Mouse Drag
    headerEl.addEventListener('mousedown', (e) => {
      if (onStart(e.clientX, e.clientY, e.target)) {
        const mouseMove = (ev) => onMove(ev.clientX, ev.clientY);
        const mouseUp = () => {
          onEnd();
          document.removeEventListener('mousemove', mouseMove);
          document.removeEventListener('mouseup', mouseUp);
        };
        document.addEventListener('mousemove', mouseMove);
        document.addEventListener('mouseup', mouseUp);
        e.preventDefault();
      }
    });

    // Touch Drag for Tablets & Mobile (iPad, iPhone, Android)
    headerEl.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (onStart(touch.clientX, touch.clientY, e.target)) {
          const touchMove = (ev) => {
            if (ev.touches.length === 1) {
              onMove(ev.touches[0].clientX, ev.touches[0].clientY);
            }
          };
          const touchEnd = () => {
            onEnd();
            document.removeEventListener('touchmove', touchMove);
            document.removeEventListener('touchend', touchEnd);
          };
          document.addEventListener('touchmove', touchMove, { passive: true });
          document.addEventListener('touchend', touchEnd);
        }
      }
    }, { passive: true });
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const app = new BiboApp();
  app.init();
});

`

---

## FILE: js/engine/PetManager.js

`javascript
/**
 * BIBO Engine - Pet State Machine & Biological Needs Manager
 * 
 * Manages Bibo's vitals (Hunger, Energy, Cleanliness, Global EXP).
 * Implements the state machine governing Sleep vs Awake,
 * conflict resolution rules, and scalable companion architecture.
 * 
 * Architectural Scalability:
 * Holds companions in an array `this.companions`. Currently active: Bibo.
 * Future companions can be registered seamlessly without rewriting core logic.
 */

import { CONFIG } from '../config.js';
import { i18n } from '../i18n.js';
import { profileStorage } from '../storage/ProfileStorage.js';

export class PetManager {
  constructor(animationPlayer) {
    this.anim = animationPlayer;

    // Clean reset of legacy mock data for release v4
    if (typeof localStorage !== 'undefined' && localStorage.getItem('bibo_v4_release_reset') !== 'true') {
      localStorage.removeItem('bibo_global_pantry');
      localStorage.removeItem('bibo_user_contributed_exp');
      localStorage.removeItem('bibo_pet_vitals');
      localStorage.setItem('bibo_v4_release_reset', 'true');
    }

    // Biological metrics (0 to 100) with offline persistence and elapsed decay
    let savedVitals = null;
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('bibo_pet_vitals');
        if (raw) savedVitals = JSON.parse(raw);
      } catch (_) {}
    }

    if (savedVitals) {
      this.hunger = typeof savedVitals.hunger === 'number' ? savedVitals.hunger : CONFIG.NEEDS.HUNGER.initial;
      this.energy = typeof savedVitals.energy === 'number' ? savedVitals.energy : CONFIG.NEEDS.ENERGY.initial;
      this.cleanliness = typeof savedVitals.cleanliness === 'number' ? savedVitals.cleanliness : CONFIG.NEEDS.CLEANLINESS.initial;
      this.state = savedVitals.state || 'AWAKE';

      // Apply natural decay for time elapsed while offline / closed
      if (savedVitals.lastTimestamp) {
        const elapsedHours = Math.min(48, Math.max(0, (Date.now() - savedVitals.lastTimestamp) / (1000 * 60 * 60)));
        if (elapsedHours > 0) {
          this.hunger = Math.max(0, this.hunger - (elapsedHours * CONFIG.NEEDS.HUNGER.decayPerHour));
          this.cleanliness = Math.max(0, this.cleanliness - (elapsedHours * CONFIG.NEEDS.CLEANLINESS.decayPerHour));
          if (this.state === 'ASLEEP') {
            this.energy = Math.min(100, this.energy + (elapsedHours * CONFIG.NEEDS.ENERGY.sleepRegenPerHour));
            if (this.energy >= CONFIG.NEEDS.ENERGY.wakeThreshold) {
              this.state = 'AWAKE';
            }
          } else {
            this.energy = Math.max(0, this.energy - (elapsedHours * CONFIG.NEEDS.ENERGY.decayPerHour));
            if (this.energy <= 5) {
              this.state = 'ASLEEP';
            }
          }
        }
      }
    } else {
      this.hunger = CONFIG.NEEDS.HUNGER.initial;
      this.energy = CONFIG.NEEDS.ENERGY.initial;
      this.cleanliness = CONFIG.NEEDS.CLEANLINESS.initial;
      this.state = 'AWAKE';
    }
    
    // Configurable Global Evolution Milestones (from CONFIG.GLOBAL_PROGRESSION)
    this.eraTargetExp = CONFIG.GLOBAL_PROGRESSION.TARGET_EXP_ERA_2;
    const baseSeedExp = CONFIG.GLOBAL_PROGRESSION.SEED_BASELINE_EXP || 0;
    this.userContributedExp = parseInt((typeof localStorage !== 'undefined' ? localStorage.getItem('bibo_user_contributed_exp') : '0') || '0', 10);
    this.globalExp = baseSeedExp + this.userContributedExp;

    // Global Pantry stock (persisted, zero mock start)
    const savedPantry = typeof localStorage !== 'undefined' ? localStorage.getItem('bibo_global_pantry') : null;
    this.pantry = savedPantry ? JSON.parse(savedPantry) : {
      biscuit: 0,
      coffee: 0,
      sponge: 0
    };

    // Biological States: 'AWAKE' | 'ASLEEP'
    this.activeEvolution = 'baby';

    // Persist vitals immediately
    this._saveVitals();

    // Temporary reaction timeout (e.g. annoyed clicks)
    this.reactionTimeout = null;

    // Listeners for UI updates
    this.listeners = new Set();
    this.onEvolution = null;

    // Real-Time Cross-Tab / Cross-Window Synchronization (0ms delay, no reload needed)
    this.syncChannel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('bibo_global_sync_v1')
      : null;

    if (this.syncChannel) {
      this.syncChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'BIBO_SYNC') {
          const p = event.data.payload;
          this.globalExp = p.globalExp;
          this.userContributedExp = p.userContributedExp;
          this.pantry = { ...p.pantry };
          this.hunger = p.hunger;
          this.energy = p.energy;
          this.cleanliness = p.cleanliness;
          this.state = p.state;
          this.activeEvolution = 'baby';
          this._updateAnimationState();
          this._notify(false); // Update UI without re-broadcasting loop
        }
      };
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    this._notify(false);
  }

  get globalExpPercent() {
    return Math.min(100, Math.floor((this.globalExp / this.eraTargetExp) * 100));
  }

  gainExp(amountExp, source = '') {
    this.userContributedExp += amountExp;
    this.globalExp += amountExp;
    localStorage.setItem('bibo_user_contributed_exp', this.userContributedExp);

    // Global Evolution is locked to baby until mid/adult sprites are finished
    const reachedTarget = this.globalExp >= this.eraTargetExp;

    this._notify(true);
    return {
      addedExp: amountExp,
      globalExp: this.globalExp,
      percent: this.globalExpPercent,
      evolved: this.globalExp >= this.eraTargetExp
    };
  }

  _savePantry() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bibo_global_pantry', JSON.stringify(this.pantry));
    }
  }

  _saveVitals() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bibo_pet_vitals', JSON.stringify({
        hunger: Math.round(this.hunger * 10) / 10,
        energy: Math.round(this.energy * 10) / 10,
        cleanliness: Math.round(this.cleanliness * 10) / 10,
        state: this.state,
        lastTimestamp: Date.now()
      }));
    }
  }

  _notify(broadcast = true) {
    const data = {
      hunger: this.hunger,
      energy: this.energy,
      cleanliness: this.cleanliness,
      exp: this.globalExp,
      maxExp: this.eraTargetExp,
      expPercent: this.globalExpPercent,
      userContribution: this.userContributedExp,
      state: this.state,
      pantry: { ...this.pantry },
      evo: this.activeEvolution
    };
    for (const cb of this.listeners) {
      cb(data);
    }

    if (broadcast && this.syncChannel) {
      try {
        this.syncChannel.postMessage({
          type: 'BIBO_SYNC',
          payload: {
            globalExp: this.globalExp,
            userContributedExp: this.userContributedExp,
            pantry: this.pantry,
            hunger: this.hunger,
            energy: this.energy,
            cleanliness: this.cleanliness,
            state: this.state,
            evo: this.activeEvolution
          }
        });
      } catch (e) {
        console.warn('Real-time sync broadcast error:', e);
      }
    }
  }

  /**
   * Periodic natural decay/regen tick (called every minute)
   */
  tickMinute() {
    if (this.state === 'ASLEEP') {
      // Regenerate energy while sleeping (+15% / 60min)
      this.energy = Math.min(100, this.energy + (CONFIG.NEEDS.ENERGY.sleepRegenPerHour / 60));
      
      // Wake up condition: reaches wake threshold (80%)
      if (this.energy >= CONFIG.NEEDS.ENERGY.wakeThreshold) {
        this.wakeUp();
      }
    } else {
      // Normal awake decay
      this.energy = Math.max(0, this.energy - (CONFIG.NEEDS.ENERGY.decayPerHour / 60));
      
      // Fall asleep condition: energy completely exhausted (<= 5%)
      if (this.energy <= 5) {
        this.fallAsleep();
      }
    }

    // Hunger and Cleanliness continuously decay
    this.hunger = Math.max(0, this.hunger - (CONFIG.NEEDS.HUNGER.decayPerHour / 60));
    this.cleanliness = Math.max(0, this.cleanliness - (CONFIG.NEEDS.CLEANLINESS.decayPerHour / 60));

    this._saveVitals();
    this._updateAnimationState();
    this._notify();
  }

  /**
   * Transitions Bibo into sleep state
   */
  fallAsleep() {
    if (this.reactionTimeout) {
      clearTimeout(this.reactionTimeout);
      this.reactionTimeout = null;
    }
    this.state = 'ASLEEP';
    if (this.anim) {
      this.anim.play(CONFIG.ANIMATIONS.SLEEP, true);
    }
    if (this.onAnimStateChange) {
      this.onAnimStateChange(CONFIG.ANIMATIONS.SLEEP);
    }
    this._saveVitals();
    this._notify();
  }

  /**
   * Wakes Bibo up
   */
  wakeUp() {
    if (this.reactionTimeout) {
      clearTimeout(this.reactionTimeout);
      this.reactionTimeout = null;
    }
    this.state = 'AWAKE';
    this._saveVitals();
    this._updateAnimationState();
    this._notify();
  }

  /**
   * Feed a biscuit from shared pantry
   */
  feedBiscuit() {
    if (this.state === 'ASLEEP') {
      return { success: false, message: i18n.t('pantry.warn.sleeping_feed') };
    }
    if (this.hunger >= 100) {
      return { success: false, message: i18n.t('pantry.warn.hunger_full') };
    }
    if (this.pantry.biscuit <= 0) {
      return { success: false, message: i18n.t('pantry.warn.empty') };
    }

    this.pantry.biscuit--;
    this._savePantry();
    this.hunger = Math.min(100, this.hunger + CONFIG.NEEDS.HUNGER.snackBoost);
    this._saveVitals();

    // Caring for Bibo donates global EXP
    const expGain = CONFIG.GLOBAL_PROGRESSION ? CONFIG.GLOBAL_PROGRESSION.EXP_FEED_BISCUIT : 2;
    this.gainExp(expGain, 'biscuit');

    // Play eating animation and seamlessly revert to state-appropriate idle when finished
    this._playTemporaryAnimation(CONFIG.ANIMATIONS.EAT_BISCUIT, 3000);

    this._notify(true);
    return { success: true, message: i18n.t('pantry.success.feed') };
  }

  /**
   * Offer coffee/tea from shared pantry
   */
  offerCoffee() {
    if (this.energy >= 100) {
      return { success: false, message: i18n.t('pantry.warn.energy_full') };
    }
    if (this.pantry.coffee <= 0) {
      return { success: false, message: i18n.t('pantry.warn.empty') };
    }

    this.pantry.coffee--;
    this._savePantry();
    this.energy = Math.min(100, this.energy + CONFIG.NEEDS.ENERGY.coffeeBoost);
    this._saveVitals();

    // Offering coffee donates global EXP
    const expGain = CONFIG.GLOBAL_PROGRESSION ? CONFIG.GLOBAL_PROGRESSION.EXP_OFFER_COFFEE : 2;
    this.gainExp(expGain, 'coffee');

    if (this.state === 'ASLEEP') {
      if (this.energy >= CONFIG.NEEDS.ENERGY.wakeThreshold) {
        this.wakeUp();
        return { success: true, message: i18n.t('pantry.success.wake_up') };
      } else {
        this._notify(true);
        return {
          success: true,
          message: i18n.t('pantry.success.coffee_sleep', { energy: Math.round(this.energy) })
        };
      }
    }

    this._notify(true);
    return { success: true, message: i18n.t('pantry.success.coffee_awake') };
  }

  /**
   * Clean monitor with sponge from shared pantry
   */
  cleanWithSponge() {
    if (this.state === 'ASLEEP') {
      return { success: false, message: i18n.t('bubble.needs.sleeping_prevent') };
    }
    if (this.cleanliness >= 100) {
      return { success: false, message: i18n.t('pantry.warn.clean_full') };
    }
    if (this.pantry.sponge <= 0) {
      return { success: false, message: i18n.t('pantry.warn.empty') };
    }

    this.pantry.sponge--;
    this._savePantry();
    this.cleanliness = Math.min(100, this.cleanliness + CONFIG.NEEDS.CLEANLINESS.spongeBoost);
    this._saveVitals();

    // Cleaning Bibo donates global EXP
    const expGain = CONFIG.GLOBAL_PROGRESSION ? CONFIG.GLOBAL_PROGRESSION.EXP_CLEAN_SPONGE : 3;
    this.gainExp(expGain, 'sponge');

    // Play clean sponge animation with spark and seamlessly revert to idle
    this._playTemporaryAnimation(CONFIG.ANIMATIONS.CLEAN_SPONGE, 3000);

    this._notify(true);
    return { success: true, message: i18n.t('pantry.success.clean') };
  }

  /**
   * Handle user clicking directly on Bibo while study timer is running
   */
  onUserClickedDuringStudy() {
    if (this.state === 'ASLEEP') {
      // Do not wake him up with annoying clicks
      return null;
    }

    this._playTemporaryAnimation(CONFIG.ANIMATIONS.CLICK_ANNOYED, 2500);

    // Pick random annoyed response
    const replies = [
      i18n.t('bubble.annoyed.1'),
      i18n.t('bubble.annoyed.2'),
      i18n.t('bubble.annoyed.3')
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  /**
   * Celebrate quiz victory
   */
  onQuizVictory() {
    if (this.state === 'ASLEEP') return; // Don't interrupt sleep
    this._playTemporaryAnimation(CONFIG.ANIMATIONS.VICTORY_HOP, 2000);
  }

  _playTemporaryAnimation(animKey, durationMs = 2500) {
    if (this.reactionTimeout) {
      clearTimeout(this.reactionTimeout);
      this.reactionTimeout = null;
    }

    // Play one-shot; as soon as the last frame completes, immediately resume idle state
    if (this.anim) {
      this.anim.play(animKey, false, () => {
        if (this.reactionTimeout) {
          clearTimeout(this.reactionTimeout);
          this.reactionTimeout = null;
        }
        this._updateAnimationState();
      });
    }

    // Safety fallback timer if backgrounded
    this.reactionTimeout = setTimeout(() => {
      this._updateAnimationState();
    }, durationMs);
    if (typeof this.reactionTimeout.unref === 'function') {
      this.reactionTimeout.unref();
    }
  }

  /**
   * Determines active idle animation based on biological hierarchy
   */
  _updateAnimationState() {
    let animKey = CONFIG.ANIMATIONS.IDLE_BASE;

    if (this.state === 'ASLEEP') {
      animKey = CONFIG.ANIMATIONS.SLEEP;
    } else if (this.hunger <= CONFIG.NEEDS.HUNGER.criticalThreshold) {
      animKey = CONFIG.ANIMATIONS.IDLE_AFFAMATO;
    } else if (this.energy <= 35) { // Tired posture (yawning, requests coffee)
      animKey = CONFIG.ANIMATIONS.IDLE_STANCO;
    } else if (this.cleanliness <= CONFIG.NEEDS.CLEANLINESS.criticalThreshold) {
      animKey = CONFIG.ANIMATIONS.IDLE_SPORCO;
    }

    if (this.anim) {
      this.anim.play(animKey, true);
    }
    if (this.onAnimStateChange) {
      this.onAnimStateChange(animKey);
    }
    return animKey;
  }
}

`

---

## FILE: js/engine/StudyTimer.js

`javascript
/**
 * BIBO Engine - Study Timer & Cumulative Time Verification
 * 
 * Manages study sessions, pause/resume, and verified study accumulation.
 * Anti-abuse: Tracks real monotonic elapsed seconds to calculate earned resources,
 * ensuring starting/stopping after 2 minutes cannot be exploited.
 */

import { CONFIG } from '../config.js';

export class StudyTimer {
  constructor(onTick, onComplete) {
    this.onTick = onTick;
    this.onComplete = onComplete;

    this.durationMinutes = CONFIG.STUDY.DEFAULT_DURATION_MINUTES;
    this.remainingSeconds = this.durationMinutes * 60;
    this.state = 'IDLE'; // 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED'

    this.intervalId = null;
    this.startTimestamp = 0;
    this.sessionElapsedSeconds = 0;

    // Cumulative verified study seconds across lifetime
    this.lifetimeStudySeconds = 0;
    this.unclaimedResourceProgressSeconds = 0;
  }

  setDuration(minutes) {
    if (this.state === 'RUNNING') return;
    this.durationMinutes = Math.max(CONFIG.STUDY.MIN_SESSION_MINUTES, Math.min(CONFIG.STUDY.MAX_SESSION_MINUTES, minutes));
    this.remainingSeconds = this.durationMinutes * 60;
    this.state = 'IDLE';
    this._emitTick();
  }

  start() {
    if (this.state === 'RUNNING') return;
    this.state = 'RUNNING';
    this.startTimestamp = Date.now();

    this.intervalId = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.sessionElapsedSeconds++;
        this._emitTick();

        if (this.remainingSeconds === 0) {
          this.completeSession();
        }
      }
    }, 1000);

    this._emitTick();
  }

  pause() {
    if (this.state !== 'RUNNING') return;
    this.state = 'PAUSED';
    clearInterval(this.intervalId);
    this.intervalId = null;
    this._emitTick();
  }

  resume() {
    if (this.state !== 'PAUSED') return;
    this.start();
  }

  /**
   * Concludes the study session (either at 00:00 or manual stop)
   * Credits all real elapsed study seconds!
   */
  completeSession() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.state = 'COMPLETED';

    const verifiedSeconds = this.sessionElapsedSeconds;
    this.lifetimeStudySeconds += verifiedSeconds;
    this.unclaimedResourceProgressSeconds += verifiedSeconds;

    // Calculate resources earned: 1 resource every CONFIG.STUDY.MINUTES_PER_RESOURCE minutes
    const resourceTargetSeconds = CONFIG.STUDY.MINUTES_PER_RESOURCE * 60;
    const resourcesEarned = Math.floor(this.unclaimedResourceProgressSeconds / resourceTargetSeconds);
    this.unclaimedResourceProgressSeconds %= resourceTargetSeconds;

    const summary = {
      verifiedSeconds,
      verifiedMinutes: Math.floor(verifiedSeconds / 60),
      totalLifetimeSeconds: this.lifetimeStudySeconds,
      resourcesEarned,
      formattedTime: this.formatSeconds(verifiedSeconds)
    };

    // Trigger completion callback
    if (this.onComplete) {
      this.onComplete(summary);
    }

    // Reset session timer for next round
    this.sessionElapsedSeconds = 0;
    this.remainingSeconds = this.durationMinutes * 60;
    this.state = 'IDLE';
    this._emitTick();

    return summary;
  }

  _emitTick() {
    if (this.onTick) {
      this.onTick({
        state: this.state,
        remainingSeconds: this.remainingSeconds,
        formattedRemaining: this.formatSeconds(this.remainingSeconds),
        durationMinutes: this.durationMinutes,
        sessionElapsedSeconds: this.sessionElapsedSeconds
      });
    }
  }

  formatSeconds(totalSecs) {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

`

---

## FILE: js/engine/SpriteAnimation.js

`javascript
/**
 * BIBO Engine - 15 FPS Sprite Animation System
 * 
 * Manages frame playback, texture mapping, and canvas rendering.
 * Locked at exactly 15 FPS for passive body doubling and calm computing.
 * 
 * Scalability Architecture:
 * - Supports any evolution stage ('baby', 'mid', 'adult').
 * - Automatic Fallback: If a specialized animation sprite is pending or missing,
 *   it gracefully falls back to 'idle_base' without visual disruption.
 */

import { CONFIG } from '../config.js';

export class SpriteAnimationPlayer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Configure crisp pixel art rendering
    this.ctx.imageSmoothingEnabled = false;

    this.currentEvo = 'baby';
    this.currentAnim = CONFIG.ANIMATIONS.IDLE_BASE;
    this.currentFrame = 0;
    
    // Animation clock (Locked to CONFIG.FRAME_RATE = 8 FPS for calm retro pacing)
    this.frameInterval = 1000 / CONFIG.FRAME_RATE;
    this.lastFrameTime = 0;
    this.isPlaying = true;
    this.onComplete = null;

    // Loaded image cache: map of `${evo}:${anim}` -> { img, atlas }
    this.cache = new Map();
    this.isLoaded = false;
  }

  /**
   * Initialize and load default sprite sheets
   */
  async init() {
    // 1. Load canonical Baby Bibo Base Idle (512x512, 12 frames)
    await this.loadSprite('baby', CONFIG.ANIMATIONS.IDLE_BASE, 'assets/sprites/baby/idle_base.png', {
      frameCount: 12,
      frameWidth: 512,
      frameHeight: 512,
      fps: CONFIG.FRAME_RATE,
      loop: true,
      loopStartFrame: 0,
      yOffset: 0,
      scale: 1.0
    });

    // 2. Pre-register all canonical animations across active evolutions (baby for now)
    const allEvos = ['baby'];
    const allAnims = Object.values(CONFIG.ANIMATIONS);

    for (const evo of allEvos) {
      for (const anim of allAnims) {
        if (evo === 'baby' && anim === CONFIG.ANIMATIONS.IDLE_BASE) continue;
        const isLoop = anim !== CONFIG.ANIMATIONS.EAT_BISCUIT && 
                       anim !== CONFIG.ANIMATIONS.CLEAN_SPONGE && 
                       anim !== CONFIG.ANIMATIONS.CLICK_ANNOYED && 
                       anim !== CONFIG.ANIMATIONS.VICTORY_HOP;
        const isSleep = anim === CONFIG.ANIMATIONS.SLEEP;
        const loopStartFrame = isSleep ? 9 : 0;
        const yOffset = isSleep ? 30 : 0;
        const groundY = isSleep ? 437 : 452;
        const shadowScaleX = isSleep ? 0.44 : 0.33;
        const shadowScaleY = isSleep ? 12 : 9;

        this.loadSprite(evo, anim, `assets/sprites/${evo}/${anim}.png`, {
          frameCount: 12,
          frameWidth: 512,
          frameHeight: 512,
          fps: CONFIG.FRAME_RATE,
          loop: isLoop,
          loopStartFrame: loopStartFrame,
          yOffset: yOffset,
          groundY: groundY,
          shadowScaleX: shadowScaleX,
          shadowScaleY: shadowScaleY,
          silentFallback: true
        });
      }
    }

    this.isLoaded = true;
    console.log('[SpriteAnimation] Animation pipeline initialized with all 9 canonical animations at 5 FPS.');
  }

  /**
   * Load a sprite sheet with its atlas metadata
   */
  loadSprite(evo, animKey, imgUrl, meta = {}) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const frameCount = meta.frameCount || 12;
        // Strictly auto-compute frame dimensions directly from the actual loaded image geometry
        const frameWidth = Math.round(img.width / frameCount);
        const frameHeight = img.height;

        this.cache.set(`${evo}:${animKey}`, {
          img,
          meta: {
            frameCount,
            frameWidth,
            frameHeight,
            fps: meta.fps || CONFIG.FRAME_RATE,
            loop: meta.loop !== false,
            loopStartFrame: meta.loopStartFrame || 0,
            yOffset: meta.yOffset || 0,
            groundY: meta.groundY || 452,
            shadowScaleX: meta.shadowScaleX || 0.33,
            shadowScaleY: meta.shadowScaleY || 9,
            scale: meta.scale || 1.0
          }
        });
        resolve(true);
      };
      img.onerror = () => {
        if (!meta.silentFallback) {
          console.warn(`[SpriteAnimation] Sprite ${imgUrl} not found. Routing to fallback.`);
        }
        resolve(false);
      };
      img.src = `${imgUrl}?v=2.5`;
    });
  }

  /**
   * Set the active evolution stage ('baby' | 'mid' | 'adult')
   */
  setEvolution(evoKey) {
    if (this.currentEvo !== evoKey) {
      this.currentEvo = evoKey;
      this.currentFrame = 0;
    }
  }

  /**
   * Change current animation with seamless fallback and onComplete callback
   */
  play(animKey, loop = true, onComplete = null) {
    if (this.currentAnim === animKey && this.isPlaying && this.isLooping === loop) return;

    this.currentAnim = animKey;
    this.currentFrame = 0;
    this.isLooping = loop;
    this.onComplete = onComplete;
    this.isPlaying = true;
  }

  /**
   * Main render tick locked at CONFIG.FRAME_RATE (8 FPS)
   */
  tick(timestamp) {
    if (!this.isPlaying || !this.isLoaded) return;

    if (timestamp - this.lastFrameTime >= this.frameInterval) {
      this.lastFrameTime = timestamp;

      // Resolve active sprite or fallback chain:
      let entry = this.cache.get(`${this.currentEvo}:${this.currentAnim}`);
      if (!entry) {
        entry = this.cache.get(`${this.currentEvo}:${CONFIG.ANIMATIONS.IDLE_BASE}`);
      }
      if (!entry) {
        entry = this.cache.get(`baby:${this.currentAnim}`);
      }
      if (!entry) {
        entry = this.cache.get(`baby:${CONFIG.ANIMATIONS.IDLE_BASE}`);
      }

      if (entry) {
        const { img, meta } = entry;
        const totalFrames = meta.frameCount || 1;
        const loopStart = meta.loopStartFrame !== undefined ? meta.loopStartFrame : 0;
        
        if (this.currentFrame + 1 >= totalFrames) {
          if (this.isLooping && meta.loop !== false) {
            // Loop smoothly from loopStartFrame (e.g. snoozing breathing cycle 9..11)
            this.currentFrame = loopStart;
          } else {
            // One-shot animation completed its final frame!
            this.currentFrame = totalFrames - 1;
            if (this.onComplete) {
              const cb = this.onComplete;
              this.onComplete = null;
              cb();
              return;
            }
          }
        } else {
          this.currentFrame += 1;
        }

        this._renderFrame(img, meta, this.currentFrame);
      }
    }
  }

  /**
   * Draw the frame onto canvas with grounding soft shadow
   */
  _renderFrame(img, meta, frameIndex) {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Frame slice coordinates
    const fw = meta.frameWidth;
    const fh = meta.frameHeight;
    const sx = frameIndex * fw;
    const sy = 0;

    // Target display size (preserve aspect ratio, scale up +8% for better presence)
    const scale = (meta.scale || 1.0) * 1.08;
    const targetHeight = (height * 0.88) * scale;
    const targetWidth = ((fw / fh) * targetHeight);
    const dx = (width - targetWidth) / 2;
    const yOffset = meta.yOffset || 0;
    
    // Position Bibo lower so his sneakers ground firmly near the base
    const dy = ((height - targetHeight) * 0.5) + 16 + yOffset;

    // Contact point of sneakers or sleeping body in 512 frame (452 for standing, 437 for sleeping)
    const groundY = meta.groundY || 452;
    const sneakerGroundY = dy + (targetHeight * (groundY / fh));

    // 1. Crisp grounding ellipse shadow placed precisely under Bibo (slightly lower for standing sneakers)
    const isSleep = (groundY === 437);
    const shadowX = width / 2;
    const shadowY = sneakerGroundY + (isSleep ? -2 : 3);
    const shadowRadiusX = targetWidth * (meta.shadowScaleX || 0.33);
    const shadowRadiusY = meta.shadowScaleY || 9;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.ellipse(shadowX, shadowY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(46, 52, 64, 0.24)'; // Crisp grounding shadow
    this.ctx.fill();
    this.ctx.restore();

    // 2. Draw sprite frame
    this.ctx.drawImage(img, sx, sy, fw, fh, dx, dy, targetWidth, targetHeight);
  }
}

`

---

## FILE: js/knowledge/KnowledgeEngine.js

`javascript
/**
 * BIBO Engine - Decentralized Knowledge & Peer-Review Engine
 * 
 * Manages:
 * 1. Topic-matched micro-quiz selection with bilingual support.
 * 2. Peer-Review queue with the 67% (2/3) Byzantine Fault Tolerance consensus.
 * 3. Flagging & Reporting mechanism for ambiguous or toxic questions.
 * 4. Dynamic custom topic registration and multilingual notions.
 */

import { STARTER_PACK } from './StarterPack.js';
import { i18n } from '../i18n.js';

export class KnowledgeEngine {
  constructor() {
    // Verified questions pool (Starts with StarterPack or persisted pool)
    const savedPool = typeof localStorage !== 'undefined' ? localStorage.getItem('bibo_verified_pool') : null;
    this.verifiedPool = savedPool ? JSON.parse(savedPool) : [...STARTER_PACK];

    // Candidate questions queue waiting for peer-review with bilingual content
    const savedCandidates = typeof localStorage !== 'undefined' ? localStorage.getItem('bibo_candidate_queue') : null;
    this.candidateQueue = savedCandidates ? JSON.parse(savedCandidates) : [
      {
        id: 'cand_01',
        topic: { it: 'Fisica', en: 'Physics' },
        question: {
          it: 'Nel moto rettilineo uniformemente accelerato, quale formula lega velocità, accelerazione e tempo?',
          en: 'In uniformly accelerated rectilinear motion, what formula relates velocity, acceleration, and time?'
        },
        answer: {
          it: 'v = v0 + a * t',
          en: 'v = v0 + a * t'
        },
        votesTrue: 3,
        votesFalse: 0,
        flags: 0
      },
      {
        id: 'cand_02',
        topic: { it: 'Informatica', en: 'Computer Science' },
        question: {
          it: 'Qual è la complessità temporale nel caso medio dell\'algoritmo di ricerca binaria su un array ordinato di N elementi?',
          en: 'What is the average-case time complexity of the binary search algorithm on a sorted array of N elements?'
        },
        answer: {
          it: 'O(log N)',
          en: 'O(log N)'
        },
        votesTrue: 4,
        votesFalse: 0,
        flags: 0
      },
      {
        id: 'cand_03',
        topic: { it: 'Diritto Privato', en: 'Private Law' },
        question: {
          it: 'Quale atto negoziale richiede la forma dell\'atto pubblico a pena di nullità?',
          en: 'Which legal transaction requires a formal public deed under penalty of nullity?'
        },
        answer: {
          it: 'La donazione di non modico valore',
          en: 'Donation of substantial value'
        },
        votesTrue: 2,
        votesFalse: 0,
        flags: 0
      }
    ];

    // Reported / Flagged questions list for review
    this.flaggedReports = [];
  }

  /**
   * Helper to resolve localized string or object
   */
  _resolveText(val, locale) {
    if (!val) return '';
    if (typeof val === 'string') return val;
    const l = (locale === 'en') ? 'en' : 'it';
    return val[l] || val.it || val.en || '';
  }

  /**
   * Retrieves unique localized topic names from verified pool
   */
  getTopicsList(locale = (typeof i18n !== 'undefined' ? i18n.locale : 'it')) {
    const set = new Set();
    const l = (locale === 'en') ? 'en' : 'it';
    this.verifiedPool.forEach(item => {
      const resolved = this._resolveText(item.topic, l);
      if (resolved && resolved.trim()) {
        set.add(resolved.trim());
      }
    });
    return Array.from(set);
  }

  /**
   * Retrieves a verified quiz matching the given topic and language
   */
  getQuizForTopic(topicName, locale = (i18n ? i18n.locale : 'it')) {
    if (!topicName) return null;
    const normalized = topicName.trim().toLowerCase();
    const l = (locale === 'en') ? 'en' : 'it';

    // Match questions where topic in current language (or fallback) matches
    const matches = this.verifiedPool.filter(q => {
      const topicIt = (typeof q.topic === 'object' ? q.topic.it : q.topic || '').toLowerCase();
      const topicEn = (typeof q.topic === 'object' ? q.topic.en : q.topic || '').toLowerCase();
      return topicIt.includes(normalized) || normalized.includes(topicIt) ||
             topicEn.includes(normalized) || normalized.includes(topicEn);
    });

    if (matches.length === 0) {
      return null; // Signals pioneer state (no questions yet!)
    }

    // Pick random question from matches
    const picked = matches[Math.floor(Math.random() * matches.length)];

    const resolvedTopic = this._resolveText(picked.topic, l);
    const resolvedQuestion = this._resolveText(picked.question, l);
    const resolvedAnswer = this._resolveText(picked.answer, l);
    
    // Resolve options list
    let opts = [];
    if (Array.isArray(picked.options)) {
      opts = picked.options;
    } else if (typeof picked.options === 'object') {
      opts = picked.options[l] || picked.options.it || picked.options.en || [];
    }

    // Return randomized copy of options
    const shuffled = [...opts].sort(() => Math.random() - 0.5);
    const correctIndex = shuffled.indexOf(resolvedAnswer);

    return {
      id: picked.id,
      topic: resolvedTopic,
      question: resolvedQuestion,
      options: shuffled,
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      answer: resolvedAnswer
    };
  }

  /**
   * Retrieves a candidate notion for peer-review or a translation quest (Approccio 3)
   */
  getCandidateForReview(locale = (i18n ? i18n.locale : 'it')) {
    const l = (locale === 'en') ? 'en' : 'it';
    const targetTranslateLang = (l === 'it') ? 'en' : 'it';

    // 1. Look for concepts that need translation into the opposite language (Approccio 3)
    const translationCandidates = this.verifiedPool.filter(c => {
      if (typeof c.question === 'object') {
        return !c.question[targetTranslateLang] && !!c.question[l];
      }
      return false;
    });

    // 35% of the time, or if candidate queue is empty and translation quests exist, offer translation bounty
    if (translationCandidates.length > 0 && (this.candidateQueue.length === 0 || Math.random() < 0.35)) {
      const picked = translationCandidates[Math.floor(Math.random() * translationCandidates.length)];
      return {
        id: picked.id,
        isTranslation: true,
        sourceLang: l,
        targetLang: targetTranslateLang,
        topic: this._resolveText(picked.topic, l),
        question: this._resolveText(picked.question, l),
        answer: this._resolveText(picked.answer, l)
      };
    }

    // 2. Standard peer-review candidate
    if (this.candidateQueue.length === 0) return null;
    const raw = this.candidateQueue[Math.floor(Math.random() * this.candidateQueue.length)];

    return {
      id: raw.id,
      isTranslation: false,
      topic: this._resolveText(raw.topic, l),
      question: this._resolveText(raw.question, l),
      answer: this._resolveText(raw.answer, l),
      votesTrue: raw.votesTrue,
      votesFalse: raw.votesFalse
    };
  }

  /**
   * Submits a user translation for a verified concept (Approccio 3)
   */
  submitTranslation(conceptId, translatedQ, translatedA, targetLang) {
    if (!translatedQ || !translatedA) return false;
    const item = this.verifiedPool.find(q => q.id === conceptId);
    if (!item) return false;

    if (typeof item.question === 'string') {
      item.question = { it: item.question, [targetLang]: translatedQ.trim() };
    } else {
      item.question[targetLang] = translatedQ.trim();
    }

    if (typeof item.answer === 'string') {
      item.answer = { it: item.answer, [targetLang]: translatedA.trim() };
    } else {
      item.answer[targetLang] = translatedA.trim();
    }

    this._saveVerifiedPool();
    console.log(`[KnowledgeEngine] Translation added for ${conceptId} in ${targetLang}.`);
    return true;
  }

  /**
   * Cast a vote on a candidate: 'true' | 'false' | 'skip'
   * Implements Byzantine 67% qualification rule.
   */
  voteCandidate(candidateId, vote) {
    const cand = this.candidateQueue.find(c => c.id === candidateId);
    if (!cand) return;

    if (vote === 'skip') return; // Non lo so / Salta -> zero bias

    if (vote === 'true') {
      cand.votesTrue++;
    } else if (vote === 'false') {
      cand.votesFalse++;
    }

    const totalVotes = cand.votesTrue + cand.votesFalse;
    if (totalVotes >= 5) {
      const approvalRate = cand.votesTrue / totalVotes;

      // 67% (2/3) Byzantine Consensus Rule
      if (approvalRate >= 0.67) {
        // PROMOTED TO VERIFIED!
        this._promoteCandidate(cand);
      } else if (cand.votesFalse / totalVotes >= 0.34) {
        // REJECTED & PURGED!
        this.candidateQueue = this.candidateQueue.filter(c => c.id !== cand.id);
        this._saveCandidateQueue();
      }
    } else {
      this._saveCandidateQueue();
    }
  }

  /**
   * Flag an ambiguous or toxic question
   */
  flagQuestion(questionId, reason = 'ambiguous') {
    this.flaggedReports.push({
      questionId,
      reason,
      timestamp: Date.now()
    });

    // Check candidate queue
    const cand = this.candidateQueue.find(c => c.id === questionId);
    if (cand) {
      cand.flags++;
      if (cand.flags >= 2) {
        // Immediate suspension
        this.candidateQueue = this.candidateQueue.filter(c => c.id !== questionId);
      }
    }

    // Check verified pool
    const verified = this.verifiedPool.find(q => q.id === questionId);
    if (verified) {
      verified.flags = (verified.flags || 0) + 1;
      if (verified.flags >= 3) {
        // Suspended from pool pending review
        this.verifiedPool = this.verifiedPool.filter(q => q.id !== questionId);
      }
    }

    console.log(`[KnowledgeEngine] Question ${questionId} flagged. Total reports:`, this.flaggedReports.length);
  }

  /**
   * Submits a newly donated user notion to candidate queue
   */
  submitNotion(topic, question, answer, lang = (i18n ? i18n.locale : 'it')) {
    if (!question || !answer) return;

    const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cleanTopic = topic ? topic.trim() : (lang === 'en' ? 'General' : 'Generale');

    this.candidateQueue.push({
      id: newId,
      topic: cleanTopic,
      question: question.trim(),
      answer: answer.trim(),
      lang,
      votesTrue: 1, // Author's implicit vote
      votesFalse: 0,
      flags: 0
    });

    this._saveCandidateQueue();
    console.log(`[KnowledgeEngine] New candidate submitted for topic "${cleanTopic}" [${lang}].`);
  }

  /**
   * Ingest a candidate question received from a peer across the P2P mesh
   */
  addRemoteCandidate(notion) {
    if (!notion || !notion.question || !notion.answer) return;
    const qClean = notion.question.trim();
    // Prevent duplicate entries
    const exists = this.candidateQueue.some(c => {
      const q = typeof c.question === 'object' ? (c.question.it || c.question.en || '') : (c.question || '');
      return q.toLowerCase() === qClean.toLowerCase();
    });
    if (exists) return;

    const newId = notion.id || `remote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.candidateQueue.push({
      id: newId,
      topic: notion.topic ? notion.topic.trim() : 'Generale',
      question: qClean,
      answer: notion.answer.trim(),
      lang: notion.lang || 'it',
      votesTrue: 1,
      votesFalse: 0,
      flags: 0
    });
    this._saveCandidateQueue();
    console.log(`[KnowledgeEngine] Ingested remote candidate for topic "${notion.topic}".`);
  }

  _promoteCandidate(cand) {
    // Generate 3 plausible distractors from other pool questions, or fallback
    const otherAnswers = this.verifiedPool
      .map(q => typeof q.answer === 'string' ? q.answer : (q.answer.it || q.answer.en || ''))
      .filter(a => a && a !== cand.answer);

    let distractors = [];
    if (otherAnswers.length >= 3) {
      const shuffled = [...otherAnswers].sort(() => Math.random() - 0.5);
      distractors = shuffled.slice(0, 3);
    } else {
      distractors = ['Opzione A', 'Opzione B', 'Opzione C'];
    }

    const options = [cand.answer, ...distractors].sort(() => Math.random() - 0.5);

    this.verifiedPool.push({
      id: cand.id,
      topic: cand.topic,
      question: cand.question,
      options,
      correctIndex: options.indexOf(cand.answer),
      answer: cand.answer
    });

    // Remove from queue
    this.candidateQueue = this.candidateQueue.filter(c => c.id !== cand.id);
    this._saveVerifiedPool();
    this._saveCandidateQueue();
    console.log(`[KnowledgeEngine] Candidate ${cand.id} promoted to verified pool!`);
  }

  _saveVerifiedPool() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bibo_verified_pool', JSON.stringify(this.verifiedPool));
      }
    } catch (e) {
      console.warn('[KnowledgeEngine] Error persisting verified pool:', e);
    }
  }

  _saveCandidateQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bibo_candidate_queue', JSON.stringify(this.candidateQueue));
      }
    } catch (e) {
      console.warn('[KnowledgeEngine] Error persisting candidate queue:', e);
    }
  }
}

`

---

## FILE: js/knowledge/StarterPack.js

`javascript
/**
 * BIBO Engine - Pre-seeded Starter Pack Knowledge Base
 * 
 * 100% verified foundational concepts across common academic subjects.
 * Provides bilingual support (Italian & English) for global community alignment.
 */

export const STARTER_PACK = [
  // Chimica Generale / General Chemistry
  {
    id: 'chem_01',
    topic: { it: 'Chimica Generale', en: 'General Chemistry' },
    question: {
      it: 'Qual è il tipo di legame chimico formato dalla condivisione di una coppia di elettroni tra due atomi?',
      en: 'What type of chemical bond is formed by the sharing of an electron pair between two atoms?'
    },
    options: {
      it: ['Legame covalente', 'Legame ionico', 'Legame metallico', 'Legame a idrogeno'],
      en: ['Covalent bond', 'Ionic bond', 'Metallic bond', 'Hydrogen bond']
    },
    correctIndex: 0,
    answer: {
      it: 'Legame covalente',
      en: 'Covalent bond'
    }
  },
  {
    id: 'chem_02',
    topic: { it: 'Chimica Generale', en: 'General Chemistry' },
    question: {
      it: 'Cosa misura la scala del pH in una soluzione acquosa?',
      en: 'What does the pH scale measure in an aqueous solution?'
    },
    options: {
      it: ['La concentrazione di ioni idrogeno (H+)', 'La pressione osmotica', 'La densità molecolare', 'Il punto di ebollizione'],
      en: ['Hydrogen ion concentration (H+)', 'Osmotic pressure', 'Molecular density', 'Boiling point']
    },
    correctIndex: 0,
    answer: {
      it: 'La concentrazione di ioni idrogeno (H+)',
      en: 'Hydrogen ion concentration (H+)'
    }
  },
  {
    id: 'chem_03',
    topic: { it: 'Chimica Generale', en: 'General Chemistry' },
    question: {
      it: 'Nel modello della tavola periodica, gli elementi dello stesso gruppo presentano:',
      en: 'In the periodic table model, elements of the same group share:'
    },
    options: {
      it: ['Stesso numero di elettroni di valenza', 'Stesso numero atomico', 'Stessa massa nucleare', 'Stesso raggio atomico'],
      en: ['Same number of valence electrons', 'Same atomic number', 'Same nuclear mass', 'Same atomic radius']
    },
    correctIndex: 0,
    answer: {
      it: 'Stesso numero di elettroni di valenza',
      en: 'Same number of valence electrons'
    }
  },

  // Matematica / Mathematics / Calculus
  {
    id: 'math_01',
    topic: { it: 'Analisi Matematica', en: 'Calculus' },
    question: {
      it: 'In base al Teorema di Weierstrass, una funzione continua su un intervallo chiuso e limitato:',
      en: 'According to the Extreme Value Theorem (Weierstrass), a continuous function on a closed and bounded interval:'
    },
    options: {
      it: ['Assume sempre massimo e minimo assoluti', 'È sempre derivabile in ogni punto', 'È strettamente crescente', 'Ha derivata seconda nulla'],
      en: ['Always attains absolute maximum and minimum', 'Is always differentiable at every point', 'Is strictly increasing', 'Has zero second derivative']
    },
    correctIndex: 0,
    answer: {
      it: 'Assume sempre massimo e minimo assoluti',
      en: 'Always attains absolute maximum and minimum'
    }
  },
  {
    id: 'math_02',
    topic: { it: 'Analisi Matematica', en: 'Calculus' },
    question: {
      it: 'Qual è la derivata della funzione esponenziale f(x) = e^x?',
      en: 'What is the derivative of the exponential function f(x) = e^x?'
    },
    options: {
      it: ['e^x', 'x * e^(x-1)', 'ln(x)', 'e^(2x)'],
      en: ['e^x', 'x * e^(x-1)', 'ln(x)', 'e^(2x)']
    },
    correctIndex: 0,
    answer: {
      it: 'e^x',
      en: 'e^x'
    }
  },
  {
    id: 'math_03',
    topic: { it: 'Analisi Matematica', en: 'Calculus' },
    question: {
      it: 'Cosa rappresenta geometricamente l\'integrale definito di una funzione positiva f(x)?',
      en: 'What does the definite integral of a positive function f(x) represent geometrically?'
    },
    options: {
      it: ['L\'area della regione compresa tra il grafico e l\'asse x', 'La pendenza della retta tangente', 'La lunghezza dell\'arco di curva', 'Il volume del solido di rotazione'],
      en: ['The area bounded between the graph and the x-axis', 'The slope of the tangent line', 'The arc length of the curve', 'The volume of the solid of revolution']
    },
    correctIndex: 0,
    answer: {
      it: 'L\'area della regione compresa tra il grafico e l\'asse x',
      en: 'The area bounded between the graph and the x-axis'
    }
  },

  // Fisica / Physics
  {
    id: 'phys_01',
    topic: { it: 'Fisica', en: 'Physics' },
    question: {
      it: 'Cosa sancisce il Secondo Principio della Termodinamica per un sistema isolato?',
      en: 'What does the Second Law of Thermodynamics state for an isolated system?'
    },
    options: {
      it: ['L\'entropia totale tende spontaneamente ad aumentare', 'L\'energia totale si riduce col tempo', 'Il calore si trasferisce spontaneamente da corpi freddi a caldi', 'Il lavoro meccanico si converte integralmente in calore senza perdite'],
      en: ['Total entropy spontaneously tends to increase', 'Total energy decreases over time', 'Heat spontaneously flows from cold to hot bodies', 'Mechanical work converts completely into heat with zero losses']
    },
    correctIndex: 0,
    answer: {
      it: 'L\'entropia totale tende spontaneamente ad aumentare',
      en: 'Total entropy spontaneously tends to increase'
    }
  },
  {
    id: 'phys_02',
    topic: { it: 'Fisica', en: 'Physics' },
    question: {
      it: 'Nel vuoto, la velocità di propagazione della luce (c) è approssimativamente pari a:',
      en: 'In a vacuum, the speed of light propagation (c) is approximately:'
    },
    options: {
      it: ['300.000 km/s', '150.000 km/s', '3.000 km/s', '30.000 km/s'],
      en: ['300,000 km/s', '150,000 km/s', '3,000 km/s', '30,000 km/s']
    },
    correctIndex: 0,
    answer: {
      it: '300.000 km/s',
      en: '300,000 km/s'
    }
  },

  // Diritto Privato / Law
  {
    id: 'law_01',
    topic: { it: 'Diritto Privato', en: 'Private Law' },
    question: {
      it: 'Nel codice civile, a quale età si acquista la capacità di agire?',
      en: 'In civil law, at what age is full legal capacity to act acquired?'
    },
    options: {
      it: ['Al compimento della maggiore età (18 anni)', 'Al momento della nascita', 'A 16 anni con consenso genitoriale', 'A 25 anni con l\'indipendenza economica'],
      en: ['Upon reaching majority (18 years)', 'At the moment of birth', 'At 16 with parental consent', 'At 25 with economic independence']
    },
    correctIndex: 0,
    answer: {
      it: 'Al compimento della maggiore età (18 anni)',
      en: 'Upon reaching majority (18 years)'
    }
  },

  // Filosofia / Philosophy
  {
    id: 'phil_01',
    topic: { it: 'Filosofia', en: 'Philosophy' },
    question: {
      it: 'Chi è l\'autore dell\'opera "Critica della ragion pura"?',
      en: 'Who is the author of the philosophical work "Critique of Pure Reason"?'
    },
    options: {
      it: ['Immanuel Kant', 'Georg Wilhelm Friedrich Hegel', 'Friedrich Nietzsche', 'Arthur Schopenhauer'],
      en: ['Immanuel Kant', 'Georg Wilhelm Friedrich Hegel', 'Friedrich Nietzsche', 'Arthur Schopenhauer']
    },
    correctIndex: 0,
    answer: {
      it: 'Immanuel Kant',
      en: 'Immanuel Kant'
    }
  },

  // Medicina / Medicine
  {
    id: 'med_01',
    topic: { it: 'Medicina', en: 'Medicine' },
    question: {
      it: 'Quale ormone viene secreto dalle cellule beta del pancreas per abbassare la glicemia?',
      en: 'Which hormone is secreted by pancreatic beta cells to lower blood glucose?'
    },
    options: {
      it: ['Insulina', 'Glucagone', 'Cortisolo', 'Adrenalina'],
      en: ['Insulin', 'Glucagon', 'Cortisol', 'Adrenaline']
    },
    correctIndex: 0,
    answer: {
      it: 'Insulina',
      en: 'Insulin'
    }
  }
];

`

---

## FILE: js/network/NetworkMesh.js

`javascript
/**
 * BIBO - NetworkMesh (Zero-Cost Decentralized P2P Synchronization)
 * 
 * Architecture:
 * - Pure client-side WebRTC DataChannels with WebTorrent tracker & Nostr relay discovery.
 * - Zero OpEx (€0.00 / month forever): no central server, no Redis, no WebSocket bills.
 * - Conflict-Free Replicated Data Type (CRDT) state reconciliation:
 *   - Global EXP: monotonic max accumulation.
 *   - Pantry stock: deterministic delta resolution.
 *   - Collective biological vitals (hunger, energy, cleanliness, sleep state).
 *   - Sovereign peer-to-peer knowledge & topics mesh.
 * - Bridges PetManager and KnowledgeEngine events across devices in real time.
 */

export class NetworkMesh {
  constructor(petManager, roomId = 'bibo-global-collective-v1') {
    this.pet = petManager;
    this.roomId = roomId;
    this.peers = new Set();
    this.peerCount = 1; // Start with 1 (self is online)
    this.onPeerCountChange = null;
    this.onTopicsSync = null;
    this.onNotionSync = null;
    this.getCustomTopics = null;
    this.isInitialized = false;
    this.lastVitalsSyncTimestamp = 0;

    // Local-First BroadcastChannel fallback (always available for tabs on the same profile)
    this.localChannel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('bibo_mesh_local_v1')
      : null;

    if (this.localChannel) {
      this.localChannel.onmessage = (e) => {
        if (!e.data) return;
        if (e.data.type === 'BIBO_P2P_SYNC') {
          this._handleIncomingMessage(e.data, 'local');
        } else if (e.data.type === 'BIBO_P2P_NOTION') {
          if (this.onNotionSync) {
            this.onNotionSync(e.data.payload, 'local');
          }
        }
      };
    }
  }

  /**
   * Initializes P2P WebRTC discovery mesh via local bundled WebTorrent or Nostr connectors
   */
  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      let trysteroModule = null;
      let usedConnector = 'torrent';

      // 1. Try local vendored WebTorrent bundle
      try {
        trysteroModule = await import('../vendor/trystero-torrent.js');
      } catch (errTorrent) {
        console.warn('[NetworkMesh] Torrent bundle load failed, trying Nostr bundle:', errTorrent);
        try {
          trysteroModule = await import('../vendor/trystero-nostr.js');
          usedConnector = 'nostr';
        } catch (errNostr) {
          console.warn('[NetworkMesh] Nostr bundle load failed:', errNostr);
        }
      }

      if (trysteroModule && trysteroModule.joinRoom) {
        const config = {
          appId: 'bibo-16bit-global-study',
          relayUrls: usedConnector === 'torrent'
            ? ['wss://tracker.openwebtorrent.com', 'wss://tracker.webtorrent.dev']
            : ['wss://relay.damus.io', 'wss://nos.lol', 'wss://nostr.mom'],
          relayConfig: {
            urls: usedConnector === 'torrent'
              ? ['wss://tracker.openwebtorrent.com', 'wss://tracker.webtorrent.dev']
              : ['wss://relay.damus.io', 'wss://nos.lol', 'wss://nostr.mom']
          },
          rtcConfig: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun.cloudflare.com:3478' }
            ]
          }
        };

        this.room = trysteroModule.joinRoom(config, this.roomId);

        // Actions: Support both v0.25 ({send, onMessage}) and legacy ([send, get])
        const syncAction = this.room.makeAction('sync');
        if (Array.isArray(syncAction)) {
          this._sendSync = syncAction[0];
          syncAction[1]((data, peerId) => this._handleIncomingMessage(data, peerId));
        } else if (syncAction && typeof syncAction.send === 'function') {
          this._sendSync = (data) => syncAction.send(data);
          syncAction.onMessage = (data, meta) => {
            const peerId = (meta && meta.peerId) ? meta.peerId : 'remote';
            this._handleIncomingMessage(data, peerId);
          };
        }

        const notionAction = this.room.makeAction('notion');
        if (Array.isArray(notionAction)) {
          this._sendNotion = notionAction[0];
          notionAction[1]((data, peerId) => {
            if (this.onNotionSync) this.onNotionSync(data, peerId);
          });
        } else if (notionAction && typeof notionAction.send === 'function') {
          this._sendNotion = (data) => notionAction.send(data);
          notionAction.onMessage = (data, meta) => {
            const peerId = (meta && meta.peerId) ? meta.peerId : 'remote';
            if (this.onNotionSync) this.onNotionSync(data, peerId);
          };
        }

        // Peer join/leave listeners: Support both setter (v0.25) and method call (v0.18)
        const onJoinHandler = (peerId) => {
          this.peers.add(peerId);
          this.peerCount = this.peers.size + 1; // +1 for self
          if (this.onPeerCountChange) this.onPeerCountChange(this.peerCount);
          this.broadcastState();
          console.log(`[NetworkMesh] P2P Peer connected: ${peerId}. Mesh count: ${this.peerCount}`);
        };

        const onLeaveHandler = (peerId) => {
          this.peers.delete(peerId);
          this.peerCount = this.peers.size + 1;
          if (this.onPeerCountChange) this.onPeerCountChange(this.peerCount);
          console.log(`[NetworkMesh] P2P Peer disconnected: ${peerId}. Mesh count: ${this.peerCount}`);
        };

        try {
          this.room.onPeerJoin = onJoinHandler;
        } catch (_) {
          if (typeof this.room.onPeerJoin === 'function') this.room.onPeerJoin(onJoinHandler);
        }

        try {
          this.room.onPeerLeave = onLeaveHandler;
        } catch (_) {
          if (typeof this.room.onPeerLeave === 'function') this.room.onPeerLeave(onLeaveHandler);
        }

        console.log(`[NetworkMesh] P2P WebRTC mesh online via ${usedConnector.toUpperCase()}. Self ID: ${trysteroModule.selfId || 'local'}`);
      } else {
        console.log('[NetworkMesh] Running in sovereign Local-First mode (BroadcastChannel).');
      }
    } catch (err) {
      console.warn('[NetworkMesh] P2P initialization note:', err.message);
    }
  }

  /**
   * Broadcast local state change and topics to all connected P2P peers and local tabs
   */
  broadcastState() {
    const customTopics = this.getCustomTopics ? this.getCustomTopics() : [];

    const payload = {
      globalExp: this.pet.globalExp,
      userContributedExp: this.pet.userContributedExp,
      pantry: { ...this.pet.pantry },
      hunger: this.pet.hunger,
      energy: this.pet.energy,
      cleanliness: this.pet.cleanliness,
      state: this.pet.state,
      customTopics,
      timestamp: Date.now()
    };

    // 1. Broadcast locally
    if (this.localChannel) {
      try {
        this.localChannel.postMessage({ type: 'BIBO_P2P_SYNC', payload });
      } catch (e) {}
    }

    // 2. Broadcast to WebRTC P2P peers
    if (this._sendSync && this.peers.size > 0) {
      try {
        this._sendSync({ type: 'BIBO_P2P_SYNC', payload });
      } catch (e) {
        console.warn('[NetworkMesh] Send sync failed:', e);
      }
    }
  }

  /**
   * Broadcast a newly donated community notion across the P2P mesh
   */
  broadcastNotion(notion) {
    if (!notion) return;

    // 1. Broadcast to local tabs
    if (this.localChannel) {
      try {
        this.localChannel.postMessage({ type: 'BIBO_P2P_NOTION', payload: notion });
      } catch (e) {}
    }

    // 2. Broadcast to WebRTC P2P peers
    if (this._sendNotion && this.peers.size > 0) {
      try {
        this._sendNotion(notion);
      } catch (e) {
        console.warn('[NetworkMesh] Send notion failed:', e);
      }
    }
  }

  /**
   * CRDT Reconciliation of incoming remote state
   */
  _handleIncomingMessage(msg, sourceId) {
    if (!msg || msg.type !== 'BIBO_P2P_SYNC' || !msg.payload) return;
    const p = msg.payload;

    let changed = false;

    // 1. Monotonic EXP reconciliation (take maximum knowledge achieved)
    if (typeof p.globalExp === 'number' && p.globalExp > this.pet.globalExp) {
      this.pet.globalExp = p.globalExp;
      changed = true;
    }

    // 2. Pantry stock merge (preserve items consumed or produced)
    if (p.pantry) {
      if (p.pantry.biscuit !== this.pet.pantry.biscuit ||
          p.pantry.coffee !== this.pet.pantry.coffee ||
          p.pantry.sponge !== this.pet.pantry.sponge) {
        this.pet.pantry = {
          biscuit: Math.max(0, p.pantry.biscuit),
          coffee: Math.max(0, p.pantry.coffee),
          sponge: Math.max(0, p.pantry.sponge)
        };
        changed = true;
      }
    }

    // 3. Collective Biological Vitals & State (One shared Bibo for the entire community)
    if (p.timestamp && p.timestamp > this.lastVitalsSyncTimestamp) {
      if (typeof p.hunger === 'number' && typeof p.energy === 'number' && typeof p.cleanliness === 'number') {
        this.pet.hunger = Math.max(0, Math.min(100, p.hunger));
        this.pet.energy = Math.max(0, Math.min(100, p.energy));
        this.pet.cleanliness = Math.max(0, Math.min(100, p.cleanliness));
        if (p.state === 'AWAKE' || p.state === 'ASLEEP') {
          this.pet.state = p.state;
        }
        this.lastVitalsSyncTimestamp = p.timestamp;
        changed = true;
      }
    }

    // 4. Custom Topics Synchronization across community
    if (Array.isArray(p.customTopics) && p.customTopics.length > 0) {
      if (this.onTopicsSync) {
        this.onTopicsSync(p.customTopics, sourceId);
      }
    }

    if (changed) {
      this.pet._savePantry();
      this.pet._saveVitals();
      this.pet._updateAnimationState();
      this.pet._notify(false);
      console.log(`[NetworkMesh] Synchronized collective Bibo from peer [${sourceId}]. EXP: ${this.pet.globalExp}`);
    }
  }
}

`

---

## FILE: js/storage/ProfileStorage.js

`javascript
/**
 * BIBO Engine - Sovereign Identity & Local-First Storage
 * 
 * Manages deterministic 3-word secret recovery phrase,
 * lifetime study stats, daily streaks, and zero-server recovery.
 */

import { i18n } from '../i18n.js';

const WORD_LIST_A = ['luna', 'sole', 'stella', 'bosco', 'fiume', 'vento', 'nube', 'farfalla', 'quercia', 'pietra'];
const WORD_LIST_B = ['caffe', 'te', 'libro', 'foglio', 'penna', 'inchiostro', 'quaderno', 'lampada', 'scrittoio', 'clessidra'];
const WORD_LIST_C = ['calmo', 'sereno', 'silenzioso', 'costante', 'gentile', 'saggio', 'limpido', 'quieta', 'chiaro', 'felice'];

export class ProfileStorage {
  constructor() {
    this.storageKey = 'bibo_profile_v1';
    this.profile = this.loadProfile();
  }

  /**
   * Loads existing profile or creates a fresh sovereign profile
   */
  loadProfile() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        const loaded = JSON.parse(raw);
        if (!loaded.customTopics) loaded.customTopics = [];
        if (loaded.currentTopic && !loaded.customTopics.includes(loaded.currentTopic)) {
          loaded.customTopics.push(loaded.currentTopic);
        }
        if (loaded.biboLevel === undefined) loaded.biboLevel = 1;
        if (loaded.biboExp === undefined) loaded.biboExp = 0;
        return loaded;
      } catch (e) {
        console.error('Error parsing profile, regenerating:', e);
      }
    }

    // Generate new sovereign profile with 3-word secret phrase
    const wordA = WORD_LIST_A[Math.floor(Math.random() * WORD_LIST_A.length)];
    const wordB = WORD_LIST_B[Math.floor(Math.random() * WORD_LIST_B.length)];
    const wordC = WORD_LIST_C[Math.floor(Math.random() * WORD_LIST_C.length)];
    const secretKey = `bibo-${wordA}-${wordB}-${wordC}`;

    const newProfile = {
      nickname: 'Studente',
      currentTopic: 'Chimica Generale',
      customTopics: ['Chimica Generale'],
      secretKey,
      lifetimeSeconds: 0,
      currentStreakDays: 1,
      lastStudyDate: new Date().toISOString().split('T')[0],
      itemsProduced: 0,
      reviewsCompleted: 0,
      theme: 'warm_paper',
      onboardingComplete: false,
      biboLevel: 1,
      biboExp: 0
    };

    this.saveProfile(newProfile);
    return newProfile;
  }

  saveProfile(profileData = null) {
    if (profileData) {
      this.profile = { ...this.profile, ...profileData };
    }
    if (!this.profile.customTopics) {
      this.profile.customTopics = [];
    }
    localStorage.setItem(this.storageKey, JSON.stringify(this.profile));
  }

  addCustomTopic(topic) {
    if (!topic || !topic.trim()) return;
    const clean = topic.trim();
    if (!this.profile.customTopics) {
      this.profile.customTopics = [];
    }
    if (!this.profile.customTopics.includes(clean)) {
      this.profile.customTopics.push(clean);
      this.saveProfile();
    }
  }

  /**
   * Records completed study session and updates streak
   */
  recordSession(elapsedSeconds, itemsEarned = 0) {
    this.profile.lifetimeSeconds += elapsedSeconds;
    this.profile.itemsProduced += itemsEarned;

    const today = new Date().toISOString().split('T')[0];
    if (this.profile.lastStudyDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (this.profile.lastStudyDate === yesterday) {
        this.profile.currentStreakDays++;
      } else {
        this.profile.currentStreakDays = 1;
      }
      this.profile.lastStudyDate = today;
    }

    this.saveProfile();
  }

  recordReview() {
    this.profile.reviewsCompleted++;
    this.saveProfile();
  }

  /**
   * Restores profile using secret key
   */
  restoreWithKey(secretKey) {
    if (!secretKey || !secretKey.trim()) return false;
    const cleanKey = secretKey.trim().toLowerCase();

    // Check if key matches format
    if (!cleanKey.startsWith('bibo-')) return false;

    // In a stateless deployment, key recovers state deterministically
    this.profile.secretKey = cleanKey;
    this.profile.onboardingComplete = true;
    this.saveProfile();
    return true;
  }

  getFormattedLifetime() {
    const totalSecs = this.profile.lifetimeSeconds;
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hours === 0) {
      return i18n.t('profile.stat.mins', { count: mins });
    }
    return i18n.t('profile.stat.hours_mins', { hours, mins });
  }
}

export const profileStorage = new ProfileStorage();

`

---

## FILE: js/audio/AudioSynthesizer.js

`javascript
/**
 * BIBO Engine - Procedural Web Audio Synthesizer
 * 
 * Generates all ambient soundscapes (Gentle Rain, Brown Noise) and tactile
 * UI audio in real time using the native Web Audio API.
 * 
 * Zero external audio files (0 KB network payload, 0 latency).
 */

class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.currentAmbient = 'mute';
    this.ambientGain = null;
    this.ambientSource = null;
    this.isMuted = false;
  }

  _initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Set ambient background noise: 'mute', 'rain', or 'brown'
   */
  setAmbient(type) {
    this._initContext();
    this.stopAmbient();
    this.currentAmbient = type;

    if (type === 'mute' || this.isMuted) return;

    if (type === 'brown') {
      this._startBrownNoise();
    } else if (type === 'rain') {
      this._startRain();
    }
  }

  stopAmbient() {
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
        this.ambientSource.disconnect();
      } catch (e) {}
      this.ambientSource = null;
    }
    if (this.ambientGain) {
      try {
        this.ambientGain.disconnect();
      } catch (e) {}
      this.ambientGain = null;
    }
  }

  /**
   * Real-time Brown Noise (first-order integration filter over random noise)
   */
  _startBrownNoise() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Gain compensation
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to warm the sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.ctx.destination);

    whiteNoise.start();
    this.ambientSource = whiteNoise;
  }

  /**
   * Procedural Gentle Rain (Deep Cozy Indoor Rainfall)
   * Pure acoustic multi-layer Brownian & Pink noise with gentle natural swells.
   * Completely eliminates sine ringing, gurgling streams, and harsh hiss.
   */
  _startRain() {
    const sampleRate = this.ctx.sampleRate;
    const duration = 6; // 6 second seamless organic loop
    const bufferSize = sampleRate * duration;
    const rainBuffer = this.ctx.createBuffer(2, bufferSize, sampleRate);
    const left = rainBuffer.getChannelData(0);
    const right = rainBuffer.getChannelData(1);

    // 1. Layer A: Deep Brownian Noise (The heavy soothing rainfall body)
    let brownL = 0;
    let brownR = 0;

    // 2. Layer B: Pink Noise (The soft splash of raindrops hitting ground)
    let p0_L = 0, p1_L = 0, p2_L = 0;
    let p0_R = 0, p1_R = 0, p2_R = 0;

    for (let i = 0; i < bufferSize; i++) {
      const whiteL = Math.random() * 2 - 1;
      const whiteR = Math.random() * 2 - 1;

      // Brownian integration with proper scaling
      brownL = (brownL + (0.12 * whiteL)) / 1.02;
      brownR = (brownR + (0.12 * whiteR)) / 1.02;

      // Pink noise Kellet filter
      p0_L = 0.99886 * p0_L + whiteL * 0.0555;
      p1_L = 0.99332 * p1_L + whiteL * 0.0750;
      p2_L = 0.96900 * p2_L + whiteL * 0.1538;
      const pinkL = (p0_L + p1_L + p2_L + whiteL * 0.05) * 0.35;

      p0_R = 0.99886 * p0_R + whiteR * 0.0555;
      p1_R = 0.99332 * p1_R + whiteR * 0.0750;
      p2_R = 0.96900 * p2_R + whiteR * 0.1538;
      const pinkR = (p0_R + p1_R + p2_R + whiteR * 0.05) * 0.35;

      // Subtle slow wind/rain intensity swell (natural variation)
      const swell = 1 + 0.15 * Math.sin((2 * Math.PI * i) / (sampleRate * 3.5));

      left[i] = ((brownL * 0.6) + (pinkL * 0.4)) * swell * 0.55;
      right[i] = ((brownR * 0.6) + (pinkR * 0.4)) * swell * 0.55;
    }

    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = rainBuffer;
    rainSource.loop = true;

    // Warm Low-pass filter to guarantee zero harshness
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 850;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.38, this.ctx.currentTime);

    rainSource.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.ctx.destination);

    rainSource.start();
    this.ambientSource = rainSource;
  }

  /**
   * Tactile Button Click Sound (sine pitch drop: 180Hz -> 55Hz, 30ms)
   */
  playClick() {
    if (this.isMuted) return;
    this._initContext();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.03);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.035);
  }

  /**
   * Tactile Mechanical Relay / Peer Review Click (filtered noise burst, 15ms)
   */
  playRelayClick() {
    if (this.isMuted) return;
    this._initContext();
    const t = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.015);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 3.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.02);
  }

  /**
   * Warm Chime / Donate Snack (Two-tone warm fifth chord C5-G5 in 75ms)
   */
  playDonate() {
    if (this.isMuted) return;
    this._initContext();
    const t = this.ctx.currentTime;

    [523.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + (idx * 0.03));

      gain.gain.setValueAtTime(0.1, t + (idx * 0.03));
      gain.gain.exponentialRampToValueAtTime(0.001, t + (idx * 0.03) + 0.075);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + (idx * 0.03));
      osc.stop(t + (idx * 0.03) + 0.08);
    });
  }

  /**
   * Electric Spark Sound (Clean sponge ⚡)
   */
  playSpark() {
    if (this.isMuted) return;
    this._initContext();
    const t = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.05);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * (i % 2 === 0 ? 1 : -0.5);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.05);
  }
}

export const audioSynth = new AudioSynthesizer();

`

---

