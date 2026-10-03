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

    // Byzantine Weighted Peer Vote Registry: notionId -> Map(voterKey -> { vote, weight })
    this.voterRegistry = new Map();
  }

  /**
   * Canonical topic normalizer:
   * Strips accents, unifies casing, trims whitespace, and maps common aliases
   */
  normalizeTopic(topic) {
    if (!topic || typeof topic !== 'string') return '';
    const clean = topic
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    // Alias mapping for common variations
    const aliasMap = {
      'medicina': 'medicina',
      'medicine': 'medicina',
      'med': 'medicina',
      'fisica': 'fisica',
      'physics': 'fisica',
      'chimica': 'chimica generale',
      'chemistry': 'chimica generale',
      'chimica generale': 'chimica generale',
      'informatica': 'informatica',
      'computer science': 'informatica',
      'biologia': 'biologia',
      'biology': 'biologia',
      'diritto': 'diritto privato',
      'diritto privato': 'diritto privato',
      'economia': 'economia',
      'economics': 'economia',
      'storia': 'storia',
      'history': 'storia',
      'matematica': 'matematica',
      'math': 'matematica'
    };

    if (aliasMap[clean]) return aliasMap[clean];

    // Check fuzzy match against known aliases
    for (const [alias, canonical] of Object.entries(aliasMap)) {
      if (this._levenshteinDistance(clean, alias) <= 1 && Math.abs(clean.length - alias.length) <= 1) {
        return canonical;
      }
    }

    return clean;
  }

  _levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
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
    const map = new Map();
    const l = (locale === 'en') ? 'en' : 'it';
    this.verifiedPool.forEach(item => {
      const resolved = this._resolveText(item.topic, l);
      if (resolved && resolved.trim()) {
        const norm = this.normalizeTopic(resolved);
        if (!map.has(norm)) {
          map.set(norm, resolved.trim());
        }
      }
    });
    return Array.from(map.values());
  }

  /**
   * Retrieves a verified quiz matching the given topic and language
   */
  getQuizForTopic(topicName, locale = (i18n ? i18n.locale : 'it')) {
    if (!topicName) return null;
    const normalized = this.normalizeTopic(topicName);
    const l = (locale === 'en') ? 'en' : 'it';

    // Match questions where normalized topic matches
    const matches = this.verifiedPool.filter(q => {
      const rawIt = typeof q.topic === 'object' ? (q.topic.it || '') : (q.topic || '');
      const rawEn = typeof q.topic === 'object' ? (q.topic.en || '') : (q.topic || '');
      const normIt = this.normalizeTopic(rawIt);
      const normEn = this.normalizeTopic(rawEn);

      return normIt === normalized || normEn === normalized ||
             normIt.includes(normalized) || normalized.includes(normIt) ||
             normEn.includes(normalized) || normalized.includes(normEn);
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
   * Computes deterministic SHA-256 Notion ID from canonical content
   */
  async computeNotionId(canonicalTopic, question, answer) {
    const content = `${canonicalTopic}|${question.trim().toLowerCase()}|${answer.trim().toLowerCase()}`;
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i);
      hash |= 0;
    }
    return 'notion_' + Math.abs(hash).toString(16);
  }

  /**
   * Verifies Proof-of-Work anti-spam solution
   */
  async verifyProofOfWork(notionId, nonce, difficultyBits = 14) {
    const targetPrefix = '0'.repeat(Math.floor(difficultyBits / 4));
    const raw = `${notionId}:${nonce}`;
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
      const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
      return hex.startsWith(targetPrefix);
    }
    return true;
  }

  /**
   * Solves Proof-of-Work anti-spam puzzle client-side (1-2s computation)
   */
  async solveProofOfWork(notionId, difficultyBits = 14) {
    const targetPrefix = '0'.repeat(Math.floor(difficultyBits / 4));
    let nonce = 0;
    const encoder = new TextEncoder();
    while (true) {
      const raw = `${notionId}:${nonce}`;
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const digest = await crypto.subtle.digest('SHA-256', encoder.encode(raw));
        const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
        if (hex.startsWith(targetPrefix)) {
          return nonce;
        }
      } else {
        return nonce;
      }
      nonce++;
      if (nonce > 100000) return nonce; // Safety guard
    }
  }

  /**
   * Cast a vote on a candidate: 'true' | 'false' | 'skip'
   * Implements Byzantine 67% qualification rule with optional peer weighting.
   */
  voteCandidate(candidateId, vote, voterKey = 'local_user', studyMinutes = 0) {
    const cand = this.candidateQueue.find(c => c.id === candidateId);
    if (!cand) return;

    if (vote === 'skip') return; // Non lo so / Salta -> zero bias

    if (vote === 'true') {
      cand.votesTrue++;
    } else if (vote === 'false') {
      cand.votesFalse++;
    }

    // Register into Byzantine weighted registry
    this.registerPeerVote(candidateId, voterKey, vote, studyMinutes);

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
   * Registers a peer vote weighted by verified study time (Proof-of-Study weight)
   */
  registerPeerVote(notionId, voterKey, vote, studyMinutes = 0) {
    const cand = this.candidateQueue.find(c => c.id === notionId);
    if (!cand) return;

    if (!this.voterRegistry) this.voterRegistry = new Map();
    if (!this.voterRegistry.has(notionId)) {
      this.voterRegistry.set(notionId, new Map());
    }
    const votesMap = this.voterRegistry.get(notionId);

    // 1 weight per 15 minutes of verified study, bounded [1, 100]
    const weight = Math.max(1, Math.min(100, Math.floor((studyMinutes || 0) / 15)));
    votesMap.set(voterKey, { vote, weight });

    let totalWeightTrue = 0;
    let totalWeightFalse = 0;

    for (const entry of votesMap.values()) {
      if (entry.vote === 'true') totalWeightTrue += entry.weight;
      if (entry.vote === 'false') totalWeightFalse += entry.weight;
    }

    const totalWeight = totalWeightTrue + totalWeightFalse;

    if (totalWeight >= 15) {
      const ratio = totalWeightTrue / totalWeight;
      if (ratio >= 0.67) {
        this._promoteCandidate(cand);
      } else if (totalWeightFalse / totalWeight >= 0.34) {
        this.candidateQueue = this.candidateQueue.filter(c => c.id !== notionId);
        this._saveCandidateQueue();
      }
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
