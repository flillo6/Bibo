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

  // Biological Needs & Decay Model (Responsive pace for rewarding pet care)
  NEEDS: {
    HUNGER: {
      initial: 80,
      decayPerHour: 18,      // -18% every hour (gets hungry in ~3-4 hours if unattended)
      snackBoost: 25,        // +25% per biscuit
      criticalThreshold: 25  // Below 25% shows hungry status
    },
    ENERGY: {
      initial: 85,
      decayPerHour: 14,      // -14% every hour (gets tired across ~4-5 hours)
      sleepRegenPerHour: 30, // +30% every hour while sleeping (restores full energy in ~3 hours)
      coffeeBoost: 25,       // +25% per cup of coffee/tea
      sleepThreshold: 15,    // Falls asleep when energy <= 15%
      wakeThreshold: 80      // Wakes up when energy >= 80%
    },
    CLEANLINESS: {
      initial: 90,
      decayPerHour: 12,      // -12% every hour (needs sponge cleaning every few hours)
      spongeBoost: 30,       // +30% per sponge
      criticalThreshold: 25  // Below 25% shows dusty status
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
