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
    this.candidateQueue = [
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

    const newId = `user_${Date.now()}`;
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

    console.log(`[KnowledgeEngine] New candidate submitted for topic "${cleanTopic}" [${lang}].`);
  }

  _promoteCandidate(cand) {
    // Generate 3 simple plausible distractors or cloze choices
    const distractors = ['Opzione A', 'Opzione B', 'Opzione C'];
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
}
