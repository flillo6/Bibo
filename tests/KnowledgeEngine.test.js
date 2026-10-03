import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { KnowledgeEngine } from '../js/knowledge/KnowledgeEngine.js';

test('KnowledgeEngine - Starter pack loads verified bilingual questions', () => {
  localStorage.clear();
  const ke = new KnowledgeEngine();

  assert.ok(ke.verifiedPool.length >= 10);
  
  // Test retrieval in Italian
  const quizIt = ke.getQuizForTopic('Chimica', 'it');
  assert.ok(quizIt !== null);
  assert.ok(quizIt.question.length > 0);
  assert.ok(quizIt.options.length >= 2);

  // Test retrieval in English
  const quizEn = ke.getQuizForTopic('Chemistry', 'en');
  assert.ok(quizEn !== null);
  assert.ok(quizEn.question.length > 0);
});

test('KnowledgeEngine - Byzantine Fault Tolerance (BFT 67% Rule)', () => {
  localStorage.clear();
  const ke = new KnowledgeEngine();

  // Create a candidate question
  ke.submitNotion('Fisica', 'Cosa misura il Joule?', 'Energia', 'it');
  const candidate = ke.candidateQueue.find(c => c.question === 'Cosa misura il Joule?');
  assert.ok(candidate !== null);

  // Cast 4 true votes out of 5 total (80% >= 67% consensus)
  ke.voteCandidate(candidate.id, 'true');
  ke.voteCandidate(candidate.id, 'true');
  ke.voteCandidate(candidate.id, 'true');
  ke.voteCandidate(candidate.id, 'false');

  // Candidate must now be PROMOTED to verifiedPool and purged from candidateQueue
  const promoted = ke.verifiedPool.find(q => q.id === candidate.id);
  assert.ok(promoted !== null, 'Candidate with 80% consensus must be promoted to verified pool');
  assert.equal(ke.candidateQueue.some(c => c.id === candidate.id), false);
});

test('KnowledgeEngine - Approccio 3 Translation Bounty Bridge', () => {
  localStorage.clear();
  const ke = new KnowledgeEngine();

  // Add a concept that only exists in Italian
  ke.verifiedPool.push({
    id: 'test_mono_01',
    topic: 'Biologia',
    question: { it: 'Qual è la cellula procariote?' },
    answer: { it: 'Un batterio' }
  });

  // Request review queue in Italian seeking English translation
  const transCandidate = ke.getCandidateForReview('it');
  
  // Submit English translation
  const success = ke.submitTranslation('test_mono_01', 'What is a prokaryotic cell?', 'A bacterium', 'en');
  assert.equal(success, true);

  // Verify the concept is now bilingual
  const updated = ke.verifiedPool.find(q => q.id === 'test_mono_01');
  assert.equal(updated.question.en, 'What is a prokaryotic cell?');
  assert.equal(updated.answer.en, 'A bacterium');
});
