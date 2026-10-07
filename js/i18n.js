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
    'pantry.btn.info': '[ ? INFO ]',
    'pantry.info.heading': 'COME FUNZIONA LA DISPENSA:',
    'pantry.info.p1': '• Produzione Risorse: Il tempo di studio è cumulativo! Ogni 25 min ottieni +1 Biscotto, ogni 30 min +1 Caffè, e ogni 50 min (es. 2 Pomodori da 25 min) sblocchi +1 Spugnetta.',
    'pantry.info.p2': '• Cura Condivisa: Chiunque nel mondo può usare le scorte per nutrire Bibo, ricaricarlo o pulire il monitor CRT.',
    'pantry.info.p3': '• Sincronizzazione CRDT: Le risorse sono matematicamente sincronizzate via mesh P2P (PN-Counter) a zero conflitti.',
    
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
    'pantry.btn.info': '[ ? INFO ]',
    'pantry.info.heading': 'HOW THE PANTRY WORKS:',
    'pantry.info.p1': '• Resource Production: Study time is cumulative! Every 25 min yields +1 Biscuit, every 30 min +1 Coffee, and every 50 min (e.g. two 25-min Pomodoros) unlocks +1 Sponge.',
    'pantry.info.p2': '• Shared Care: Anyone in the world can use these supplies to feed Bibo, restore his energy, or clean his CRT monitor.',
    'pantry.info.p3': '• CRDT Convergence: Stock is mathematically synchronized via a zero-conflict P2P mesh (PN-Counter).',
    
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
