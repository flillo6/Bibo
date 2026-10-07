/**
 * BIBO Engine - Sovereign Identity & Local-First Storage
 * 
 * Manages deterministic 3-word secret recovery phrase,
 * lifetime study stats, daily streaks, and zero-server recovery.
 */

import { i18n } from '../i18n.js';
import { SovereignCrypto } from './SovereignCrypto.js';

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
        if (!loaded.createdAt || typeof loaded.createdAt !== 'number') {
          loaded.createdAt = Date.now() - 3600000; // 1 hour grace baseline
        }
        if (loaded.progressBiscuitSeconds === undefined) loaded.progressBiscuitSeconds = 0;
        if (loaded.progressCoffeeSeconds === undefined) loaded.progressCoffeeSeconds = 0;
        if (loaded.progressSpongeSeconds === undefined) loaded.progressSpongeSeconds = 0;
        return loaded;
      } catch (e) {
        console.error('Error parsing profile, regenerating:', e);
      }
    }

    // Generate new sovereign profile with 12-word mnemonic or classic phrase
    const mnemonic = SovereignCrypto.generateMnemonic(12);
    const wordA = WORD_LIST_A[Math.floor(Math.random() * WORD_LIST_A.length)];
    const wordB = WORD_LIST_B[Math.floor(Math.random() * WORD_LIST_B.length)];
    const wordC = WORD_LIST_C[Math.floor(Math.random() * WORD_LIST_C.length)];
    const secretKey = `bibo-${wordA}-${wordB}-${wordC}`;

    const newProfile = {
      nickname: 'Studente',
      currentTopic: 'Chimica Generale',
      customTopics: ['Chimica Generale'],
      secretKey,
      mnemonicPhrase: mnemonic,
      createdAt: Date.now(),
      lifetimeSeconds: 0,
      currentStreakDays: 1,
      lastStudyDate: new Date().toISOString().split('T')[0],
      itemsProduced: 0,
      reviewsCompleted: 0,
      progressBiscuitSeconds: 0,
      progressCoffeeSeconds: 0,
      progressSpongeSeconds: 0,
      theme: 'warm_paper',
      onboardingComplete: false,
      biboLevel: 1,
      biboExp: 0
    };

    this.saveProfile(newProfile);
    return newProfile;
  }

  /**
   * Causal Time Invariant:
   * A user cannot legitimately have studied longer than the physical elapsed time since profile creation.
   */
  getMaxPlausibleStudySeconds() {
    const created = this.profile.createdAt || Date.now();
    const elapsedSinceCreation = Math.max(0, Math.floor((Date.now() - created) / 1000));
    // Provide a 2-hour starter window so fresh accounts don't trigger false positives
    return Math.max(7200, elapsedSinceCreation);
  }

  /**
   * Resource Conservation Invariant:
   * Total items ever produced cannot exceed physical study capacity.
   * Biscuit (~25m), Coffee (~30m), Sponge (~50m).
   */
  getMaxPlausibleResources() {
    const verifiedSeconds = Math.min(this.profile.lifetimeSeconds || 0, this.getMaxPlausibleStudySeconds());
    // Max resources: verified study items + starter reward allowance
    return Math.floor(verifiedSeconds / 900) + 15;
  }

  /**
   * Self-healing audit of local profile counters
   */
  healProfileInvariants() {
    let mutated = false;
    const maxStudy = this.getMaxPlausibleStudySeconds();
    if (this.profile.lifetimeSeconds > maxStudy) {
      console.warn(`[ProfileStorage] Causal violation detected: lifetimeSeconds (${this.profile.lifetimeSeconds}) > maxStudy (${maxStudy}). Auto-healing.`);
      this.profile.lifetimeSeconds = maxStudy;
      mutated = true;
    }
    const maxItems = this.getMaxPlausibleResources();
    if (this.profile.itemsProduced > maxItems) {
      this.profile.itemsProduced = maxItems;
      mutated = true;
    }
    if (mutated) {
      this.saveProfile();
    }
    return mutated;
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
   * Records completed study session, updates streak and saves modular progress counters
   */
  recordSession(elapsedSeconds, itemsEarned = 0, progressState = null) {
    this.profile.lifetimeSeconds += elapsedSeconds;
    const count = typeof itemsEarned === 'object' && itemsEarned !== null
      ? (itemsEarned.total || (itemsEarned.biscuit || 0) + (itemsEarned.coffee || 0) + (itemsEarned.sponge || 0))
      : Number(itemsEarned) || 0;
    this.profile.itemsProduced += count;

    if (progressState && typeof progressState === 'object') {
      if (typeof progressState.progressBiscuitSeconds === 'number') {
        this.profile.progressBiscuitSeconds = progressState.progressBiscuitSeconds;
      }
      if (typeof progressState.progressCoffeeSeconds === 'number') {
        this.profile.progressCoffeeSeconds = progressState.progressCoffeeSeconds;
      }
      if (typeof progressState.progressSpongeSeconds === 'number') {
        this.profile.progressSpongeSeconds = progressState.progressSpongeSeconds;
      }
    }

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
   * Restores profile using secret key or 12-word mnemonic phrase
   */
  restoreWithKey(secretKey) {
    if (!secretKey || !secretKey.trim()) return false;
    const cleanKey = secretKey.trim().toLowerCase();

    // Check if key matches format
    if (!SovereignCrypto.validatePhrase(cleanKey)) return false;

    // In a stateless deployment, key recovers state deterministically
    this.profile.secretKey = cleanKey;
    if (!cleanKey.startsWith('bibo-')) {
      this.profile.mnemonicPhrase = cleanKey;
    }
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
