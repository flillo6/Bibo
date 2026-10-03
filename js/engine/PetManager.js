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
   * Set active evolution stage for testing and progression
   */
  setEvolutionStage(evoKey) {
    if (['baby', 'mid', 'adult'].includes(evoKey)) {
      this.activeEvolution = evoKey;
      if (this.anim) {
        this.anim.setEvolution(evoKey);
      }
      this._updateAnimationState();
      this._notify(true);
    }
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
