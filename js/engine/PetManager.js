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
      this.lastVitalsTimestamp = typeof savedVitals.lastTimestamp === 'number' ? savedVitals.lastTimestamp : Date.now();
      this.lastActionTimestamp = typeof savedVitals.lastActionTimestamp === 'number' ? savedVitals.lastActionTimestamp : 0;

      // Apply natural decay for time elapsed while offline / closed
      if (savedVitals.lastTimestamp) {
        this._applyElapsedDecay(savedVitals.lastTimestamp);
      }
    } else {
      this.hunger = CONFIG.NEEDS.HUNGER.initial;
      this.energy = CONFIG.NEEDS.ENERGY.initial;
      this.cleanliness = CONFIG.NEEDS.CLEANLINESS.initial;
      this.state = 'AWAKE';
      this.lastVitalsTimestamp = Date.now();
      this.lastActionTimestamp = 0;
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
    if (this.globalExp >= CONFIG.GLOBAL_PROGRESSION.TARGET_EXP_ERA_3) {
      this.activeEvolution = 'adult';
    } else if (this.globalExp >= CONFIG.GLOBAL_PROGRESSION.TARGET_EXP_ERA_2) {
      this.activeEvolution = 'mid';
    } else {
      this.activeEvolution = 'baby';
    }
    this.isTestEvoLocked = false;

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
          if (p.evo && ['baby', 'mid', 'adult'].includes(p.evo)) {
            this.activeEvolution = p.evo;
            if (this.anim) this.anim.setEvolution(p.evo);
          }
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

    // Dynamic Evolution Progression (respected unless user is manually testing evo)
    let nextEvo = this.activeEvolution;
    if (!this.isTestEvoLocked) {
      nextEvo = 'baby';
      if (this.globalExp >= CONFIG.GLOBAL_PROGRESSION.TARGET_EXP_ERA_3) {
        nextEvo = 'adult';
      } else if (this.globalExp >= CONFIG.GLOBAL_PROGRESSION.TARGET_EXP_ERA_2) {
        nextEvo = 'mid';
      }

      if (nextEvo !== this.activeEvolution) {
        this.activeEvolution = nextEvo;
        if (this.anim) {
          this.anim.setEvolution(nextEvo);
        }
        if (this.onEvolution) {
          this.onEvolution(nextEvo);
        }
      }
    }

    this._notify(true);
    return {
      addedExp: amountExp,
      globalExp: this.globalExp,
      percent: this.globalExpPercent,
      evolved: nextEvo !== 'baby'
    };
  }

  _savePantry() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bibo_global_pantry', JSON.stringify(this.pantry));
    }
  }

  _saveVitals() {
    this.lastVitalsTimestamp = Date.now();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bibo_pet_vitals', JSON.stringify({
        hunger: Math.round(this.hunger * 10) / 10,
        energy: Math.round(this.energy * 10) / 10,
        cleanliness: Math.round(this.cleanliness * 10) / 10,
        state: this.state,
        lastTimestamp: this.lastVitalsTimestamp,
        lastActionTimestamp: this.lastActionTimestamp || 0
      }));
    }
  }

  /**
   * Adopts remote collective state based on user care interaction timestamp (CRDT consensus).
   * If remote has a newer user care action, adopts remote values and applies elapsed decay to now.
   * If equal, aligns to the lowest vitals (consensus on decay) so peers do not diverge.
   */
  adoptRemoteState(remote) {
    if (!remote || typeof remote !== 'object') return false;
    const remoteActionTs = typeof remote.lastActionTimestamp === 'number'
      ? remote.lastActionTimestamp
      : (typeof remote.timestamp === 'number' ? remote.timestamp : 0);
    const localActionTs = this.lastActionTimestamp || 0;

    // A. Remote has a fresher user care interaction: remote is authoritative!
    if (remoteActionTs > localActionTs) {
      if (typeof remote.hunger === 'number') this.hunger = Math.max(0, Math.min(100, remote.hunger));
      if (typeof remote.energy === 'number') this.energy = Math.max(0, Math.min(100, remote.energy));
      if (typeof remote.cleanliness === 'number') this.cleanliness = Math.max(0, Math.min(100, remote.cleanliness));
      if (remote.state) this.state = remote.state;
      this.lastActionTimestamp = remoteActionTs;

      // Apply decay strictly from the remote action timestamp to now
      this._applyElapsedDecay(remoteActionTs);
      this._saveVitals();
      this._updateAnimationState();
      this._notify(false);
      return true;
    }

    // B. Both have equal action timestamps (e.g. neither has interacted since boot):
    // Align with the peer with lower vitals (older/more decayed companion) to prevent divergence
    if (remoteActionTs === localActionTs) {
      let changed = false;
      if (typeof remote.hunger === 'number' && remote.hunger < this.hunger) {
        this.hunger = remote.hunger;
        changed = true;
      }
      if (typeof remote.cleanliness === 'number' && remote.cleanliness < this.cleanliness) {
        this.cleanliness = remote.cleanliness;
        changed = true;
      }
      if (typeof remote.energy === 'number' && remote.energy < this.energy) {
        this.energy = remote.energy;
        changed = true;
      }
      if (changed) {
        this._saveVitals();
        this._updateAnimationState();
        this._notify(false);
        return true;
      }
    }

    return false;
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
   * Applies continuous decay based on elapsed timestamp (offline or tab backgrounded)
   */
  _applyElapsedDecay(fromTimestamp) {
    if (!fromTimestamp) return;
    const elapsedHours = Math.min(72, Math.max(0, (Date.now() - fromTimestamp) / (1000 * 60 * 60)));
    if (elapsedHours <= 0.005) return; // Ignore sub-15-second blips

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

  /**
   * Refreshes decay when user returns to foreground / unlocks phone
   */
  refreshOfflineDecay() {
    let saved = null;
    try {
      const raw = localStorage.getItem('bibo_pet_vitals');
      if (raw) saved = JSON.parse(raw);
    } catch (_) {}

    if (saved && saved.lastTimestamp) {
      this._applyElapsedDecay(saved.lastTimestamp);
      this._saveVitals();
      this._updateAnimationState();
      this._notify();
    }
  }

  /**
   * Periodic natural decay/regen tick (called every minute)
   */
  tickMinute() {
    if (this.state === 'ASLEEP') {
      // Regenerate energy while sleeping
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

    // Notify speech bubble of critical needs if awake
    if (this.state === 'AWAKE' && this.onAnimStateChange) {
      if (this.hunger <= CONFIG.NEEDS.HUNGER.criticalThreshold) {
        this.onAnimStateChange(CONFIG.ANIMATIONS.IDLE_AFFAMATO);
      } else if (this.energy <= 25) {
        this.onAnimStateChange(CONFIG.ANIMATIONS.IDLE_STANCO);
      } else if (this.cleanliness <= CONFIG.NEEDS.CLEANLINESS.criticalThreshold) {
        this.onAnimStateChange(CONFIG.ANIMATIONS.IDLE_SPORCO);
      }
    }
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
    this.lastActionTimestamp = Date.now();
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
    this.lastActionTimestamp = Date.now();
    this._saveVitals();
    this._updateAnimationState();
    this._notify();
  }

  /**
   * Set active evolution stage for testing and progression
   */
  setEvolutionStage(evoKey) {
    if (['baby', 'mid', 'adult'].includes(evoKey)) {
      this.isTestEvoLocked = true;
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
    this.lastActionTimestamp = Date.now();
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
    this.lastActionTimestamp = Date.now();
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
    this.lastActionTimestamp = Date.now();
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

    // Safety fallback timer if backgrounded (ensure it never truncates the 3000ms 12-frame playback)
    const timeoutMs = Math.max(durationMs, 3500);
    this.reactionTimeout = setTimeout(() => {
      this._updateAnimationState();
    }, timeoutMs);
    if (typeof this.reactionTimeout.unref === 'function') {
      this.reactionTimeout.unref();
    }
  }

  /**
   * Determines active idle animation based on biological hierarchy
   * (Stanco, affamato e sporco usano IDLE_BASE per semplicità visiva, comunicando via fumetto)
   */
  _updateAnimationState() {
    let animKey = CONFIG.ANIMATIONS.IDLE_BASE;

    if (this.state === 'ASLEEP') {
      animKey = CONFIG.ANIMATIONS.SLEEP;
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
