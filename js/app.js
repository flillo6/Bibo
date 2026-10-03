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
    this.mesh.init();
    this.mesh.onPeerCountChange = (count) => {
      const el = document.getElementById('onlineCountText');
      if (el && count > 1) {
        el.textContent = `[●] ${count} DISPOSITIVI P2P`;
      }
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
    setText('onlineCountText', i18n.t('app.status.online', { count: '1.482' }));
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
    
    // Animation Live Test Bar in Profile
    setText('lblAnimTestTitle', i18n.t('profile.test_anims_title'));
    document.querySelectorAll('[data-preview-anim]').forEach(btn => {
      const animKey = btn.getAttribute('data-preview-anim');
      if (animKey) {
        btn.textContent = i18n.t(`anim.preview.${animKey}`);
      }
    });

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
    const q = document.getElementById('donateQuestionInput').value;
    const a = document.getElementById('donateAnswerInput').value;
    if (q && a) {
      this.knowledge.submitNotion(this.activeTopic, q, a, i18n.locale);
      audioSynth.playDonate();
      const expGain = CONFIG.GLOBAL_PROGRESSION ? CONFIG.GLOBAL_PROGRESSION.EXP_NOTION_DONATED : 10;
      this.pet.gainExp(expGain, 'donate');
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

      // Shift + Click: Instant Victory Celebration Preview
      if (e.shiftKey) {
        this.pet.onQuizVictory();
        this._showSpeechBubble(i18n.t('bubble.victory'));
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

    // 9. Animation Live Preview Buttons (Profile Modal) & Hotkeys 1-9
    const animMap = {
      '1': 'idle_base',
      '2': 'idle_affamato',
      '3': 'idle_stanco',
      '4': 'idle_sporco',
      '5': 'eat_biscuit',
      '6': 'clean_sponge',
      '7': 'sleep',
      '8': 'click_annoyed',
      '9': 'victory_hop'
    };

    const triggerPreviewAnim = (animKey) => {
      audioSynth.playClick();

      // If Bibo is sleeping, block all other animations unless user specifically wakes him with 'idle_base'!
      if (this.pet.state === 'ASLEEP' && animKey !== 'idle_base' && animKey !== 'sleep') {
        this._showSpeechBubble(i18n.t('bubble.needs.sleeping_prevent'), true);
        return;
      }

      // Clear any pending temporary reaction timeouts
      if (this.pet.reactionTimeout) {
        clearTimeout(this.pet.reactionTimeout);
        this.pet.reactionTimeout = null;
      }

      switch (animKey) {
        case 'idle_base':
          this.pet.state = 'AWAKE';
          this.pet.hunger = Math.max(80, this.pet.hunger);
          this.pet.energy = Math.max(80, this.pet.energy);
          this.pet.cleanliness = Math.max(80, this.pet.cleanliness);
          this.anim.play(CONFIG.ANIMATIONS.IDLE_BASE, true);
          this._hideSpeechBubble();
          this.pet._notify();
          break;

        case 'idle_affamato':
          this.pet.state = 'AWAKE';
          this.pet.hunger = 10;
          this.anim.play(CONFIG.ANIMATIONS.IDLE_AFFAMATO, true);
          this._showSpeechBubble(i18n.t('bubble.needs.hungry'), true);
          this.pet._notify();
          break;

        case 'idle_stanco':
          this.pet.state = 'AWAKE';
          this.pet.energy = 10;
          this.anim.play(CONFIG.ANIMATIONS.IDLE_STANCO, true);
          this._showSpeechBubble(i18n.t('bubble.needs.tired'), true);
          this.pet._notify();
          break;

        case 'idle_sporco':
          this.pet.state = 'AWAKE';
          this.pet.cleanliness = 10;
          this.anim.play(CONFIG.ANIMATIONS.IDLE_SPORCO, true);
          this._showSpeechBubble(i18n.t('bubble.needs.dirty'), true);
          this.pet._notify();
          break;

        case 'sleep':
          this.pet.fallAsleep();
          this._showSpeechBubble(i18n.t('bubble.needs.sleep'), true);
          break;

        case 'eat_biscuit':
          this._showSpeechBubble(i18n.t('bubble.feed_biscuit'));
          this.pet._playTemporaryAnimation(CONFIG.ANIMATIONS.EAT_BISCUIT, 3000);
          break;

        case 'clean_sponge':
          this._showSpeechBubble(i18n.t('bubble.clean_sponge'));
          this.pet._playTemporaryAnimation(CONFIG.ANIMATIONS.CLEAN_SPONGE, 3000);
          break;

        case 'click_annoyed':
          const annoyedText = this.pet.onUserClickedDuringStudy() || i18n.t('bubble.annoyed.1');
          this._showSpeechBubble(annoyedText);
          break;

        case 'victory_hop':
          this.pet.onQuizVictory();
          this._showSpeechBubble(i18n.t('bubble.victory'));
          break;

        default:
          this.anim.play(animKey, true);
          break;
      }
    };

    document.querySelectorAll('[data-preview-anim]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const anim = e.currentTarget.getAttribute('data-preview-anim');
        if (anim) triggerPreviewAnim(anim);
      });
    });

    // 10. Global Hotkeys 1-9 to quickly test all 9 animations
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (animMap[e.key]) {
        triggerPreviewAnim(animMap[e.key]);
      }
    });

    // 11. Expose to window for instant dev testing in console
    window.bibo = this;
    window.playAnim = (name) => triggerPreviewAnim(name);
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
