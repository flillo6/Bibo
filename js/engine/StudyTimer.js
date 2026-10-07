/**
 * BIBO Engine - Study Timer & Cumulative Time Verification
 * 
 * Manages study sessions, pause/resume, and verified study accumulation.
 * Anti-abuse: Tracks real monotonic elapsed seconds to calculate earned resources,
 * ensuring starting/stopping after 2 minutes cannot be exploited.
 */

import { CONFIG } from '../config.js';
import { MonotonicWorkerTimer } from './MonotonicWorkerTimer.js';

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
    this.lastProof = null;

    // Background monotonic Web Worker timer (anti-cheat + mobile lockscreen support)
    this.workerTimer = new MonotonicWorkerTimer(
      (elapsed, remaining) => {
        this.sessionElapsedSeconds = elapsed;
        this.remainingSeconds = remaining;
        this._emitTick();
      },
      (verifiedSecs, proof) => {
        this.lastProof = proof;
        this.completeSession();
      }
    );

    // Cumulative verified study seconds across lifetime
    this.lifetimeStudySeconds = 0;
    this.unclaimedResourceProgressSeconds = 0;

    // Modular cumulative progress counters (seconds toward next item)
    this.progressBiscuitSeconds = 0;
    this.progressCoffeeSeconds = 0;
    this.progressSpongeSeconds = 0;
  }

  /**
   * Initializes cumulative progress counters from persistent profile
   */
  initProgress(profile) {
    if (!profile) return;
    this.lifetimeStudySeconds = profile.lifetimeSeconds || 0;
    this.progressBiscuitSeconds = profile.progressBiscuitSeconds || 0;
    this.progressCoffeeSeconds = profile.progressCoffeeSeconds || 0;
    this.progressSpongeSeconds = profile.progressSpongeSeconds || 0;
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

    // Start background monotonic worker
    if (this.workerTimer) {
      this.workerTimer.start(this.durationMinutes, 'bibo_salt_' + Date.now());
    }

    // Standard interval loop (for immediate local fallback and synchronized UI ticks)
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
    if (this.workerTimer) this.workerTimer.pause();
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
    if (this.workerTimer) this.workerTimer.stop();
    this.state = 'COMPLETED';

    const verifiedSeconds = this.sessionElapsedSeconds;
    this.lifetimeStudySeconds += verifiedSeconds;
    this.unclaimedResourceProgressSeconds += verifiedSeconds;

    // Calculate resources earned modularly
    const targetBiscuitSec = (CONFIG.STUDY.MINUTES_PER_BISCUIT || 25) * 60;
    const targetCoffeeSec = (CONFIG.STUDY.MINUTES_PER_COFFEE || 30) * 60;
    const targetSpongeSec = (CONFIG.STUDY.MINUTES_PER_SPONGE || 50) * 60;

    this.progressBiscuitSeconds += verifiedSeconds;
    this.progressCoffeeSeconds += verifiedSeconds;
    this.progressSpongeSeconds += verifiedSeconds;

    const biscuitsEarned = Math.floor(this.progressBiscuitSeconds / targetBiscuitSec);
    this.progressBiscuitSeconds %= targetBiscuitSec;

    const coffeeEarned = Math.floor(this.progressCoffeeSeconds / targetCoffeeSec);
    this.progressCoffeeSeconds %= targetCoffeeSec;

    const spongesEarned = Math.floor(this.progressSpongeSeconds / targetSpongeSec);
    this.progressSpongeSeconds %= targetSpongeSec;

    const totalEarned = biscuitsEarned + coffeeEarned + spongesEarned;

    // Legacy fallback
    const legacyTargetSeconds = (CONFIG.STUDY.MINUTES_PER_RESOURCE || 25) * 60;
    const resourcesEarned = Math.floor(this.unclaimedResourceProgressSeconds / legacyTargetSeconds);
    this.unclaimedResourceProgressSeconds %= legacyTargetSeconds;

    const summary = {
      verifiedSeconds,
      verifiedMinutes: Math.floor(verifiedSeconds / 60),
      totalLifetimeSeconds: this.lifetimeStudySeconds,
      resourcesEarned: biscuitsEarned, // backwards compatible with code reading .resourcesEarned
      earnedItems: {
        biscuit: biscuitsEarned,
        coffee: coffeeEarned,
        sponge: spongesEarned,
        total: totalEarned
      },
      progressState: {
        progressBiscuitSeconds: this.progressBiscuitSeconds,
        progressCoffeeSeconds: this.progressCoffeeSeconds,
        progressSpongeSeconds: this.progressSpongeSeconds
      },
      formattedTime: this.formatSeconds(verifiedSeconds),
      proof: this.lastProof || 'local_verified'
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
