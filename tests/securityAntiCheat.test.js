import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { PetManager } from '../js/engine/PetManager.js';
import { NetworkMesh } from '../js/network/NetworkMesh.js';
import { KnowledgeEngine } from '../js/knowledge/KnowledgeEngine.js';

test('Security - Anti-Cheat: Outlier EXP injections are clamped or rejected', () => {
  localStorage.clear();
  const pet = new PetManager();
  pet.globalExp = 50;

  const mesh = new NetworkMesh(pet);

  // Attack 1: Peer sends astronomical EXP (DevTools cheat)
  mesh._handleIncomingMessage({
    type: 'STATE_SYNC',
    payload: {
      globalExp: 9999999,
      timestamp: Date.now()
    }
  }, 'cheater-node-1');

  assert.equal(pet.globalExp, 50, 'Astronomical EXP (>50000) must be discarded outright');

  // Attack 2: Peer sends large jump (e.g. 1500)
  mesh._handleIncomingMessage({
    type: 'STATE_SYNC',
    payload: {
      globalExp: 1500,
      timestamp: Date.now()
    }
  }, 'cheater-node-2');

  // Must be clamped to local (50) + MAX_ALLOWED_EXP_DELTA (250) = 300
  assert.equal(pet.globalExp, 300, 'Large EXP jump must be safely clamped to +250 max delta');

  // Attack 3: Same peer attempts rapid-fire burst 5ms later to bypass clamping
  mesh._handleIncomingMessage({
    type: 'STATE_SYNC',
    payload: {
      globalExp: 1500,
      timestamp: Date.now()
    }
  }, 'cheater-node-2');

  // Must be throttled by per-peer streaming rate limit
  assert.ok(pet.globalExp <= 325, 'Rapid streaming from same peer must be rate-limited');
});

test('Security - Anti-Inflation: Absurd pantry production leaps are clamped', () => {
  localStorage.clear();
  const pet = new PetManager();
  assert.equal(pet.pantry.biscuit, 0);

  // Attack 1: Remote CRDT claims 50,000 biscuits produced by an actor
  const fakeCRDT = {
    produced: { biscuit: { hacker_node: 50000 } },
    consumed: { biscuit: {} }
  };
  const mutated = pet.mergePantryCRDT(fakeCRDT);
  assert.equal(mutated, true);
  // Clamped to MAX_PRODUCTION_BURST (15)
  assert.equal(pet.pantry.biscuit, 15, 'CRDT production jump must be clamped to max 15 items');

  // Attack 2: Legacy scalar pantry injection via NetworkMesh
  const mesh = new NetworkMesh(pet);
  mesh._handleIncomingMessage({
    type: 'STATE_SYNC',
    payload: {
      pantry: { biscuit: 99999, coffee: 88888, sponge: 77777 },
      timestamp: Date.now()
    }
  }, 'legacy-hacker');

  assert.equal(pet.pantry.biscuit, 30, 'Legacy biscuit jump must be clamped (+15)');
  assert.equal(pet.pantry.coffee, 15, 'Legacy coffee jump must be clamped (+15)');
  assert.equal(pet.pantry.sponge, 15, 'Legacy sponge jump must be clamped (+15)');
});

test('Security - Anti-Time-Travel: Future timestamps are rejected from freezing vitals', () => {
  localStorage.clear();
  const pet = new PetManager();
  pet.hunger = 80;
  pet.lastActionTimestamp = Date.now() - 5000;

  // Attacker sends state with timestamp in year 2050 (Date.now() + 10 billion ms)
  const futureTimestamp = Date.now() + 10000000000;
  const adopted = pet.adoptRemoteState({
    hunger: 100,
    timestamp: futureTimestamp,
    lastActionTimestamp: futureTimestamp
  });

  assert.equal(adopted, false, 'Adoption must fail when remote timestamp is in future');
  assert.equal(pet.hunger, 80, 'Pet hunger must remain untouched');
  assert.ok(pet.lastActionTimestamp < Date.now(), 'lastActionTimestamp must NOT be set to future date');
});

test('Security - Knowledge Engine: XSS stripping, Sybil vote cap, and queue limit', () => {
  localStorage.clear();
  const ke = new KnowledgeEngine();

  // 1. Input sanitization: Strip HTML and scripts
  ke.addRemoteCandidate({
    topic: '<b>Hacked Topic</b>',
    question: '<script>alert("xss")</script>Che cos è la fotosintesi?',
    answer: '<i>Processo clorofilliano</i>',
    lang: 'it'
  });

  const cand = ke.candidateQueue.find(c => c.topic === 'Hacked Topic');
  assert.ok(cand, 'Candidate should be ingested with stripped topic');
  assert.equal(cand.topic, 'Hacked Topic', 'HTML tags in topic must be stripped');
  assert.equal(cand.question, 'Che cos è la fotosintesi?', 'Scripts and HTML in question must be stripped');
  assert.equal(cand.answer, 'Processo clorofilliano', 'HTML tags in answer must be stripped');

  // 2. Sybil vote resistance: 1 attacker with 999,999 study minutes has capped weight (3 points max)
  ke.registerPeerVote(cand.id, 'cheater_actor', 'true', 999999);
  const entry = ke.voterRegistry.get(cand.id).get('cheater_actor');
  assert.equal(entry.weight, 3, 'Individual voter weight must be capped at 3 regardless of claimed study minutes');

  // 3. Queue flood limit: Fill queue up to 50 items
  for (let i = 0; i < 60; i++) {
    ke.addRemoteCandidate({
      topic: `Topic ${i}`,
      question: `Domanda valida numero ${i}?`,
      answer: `Risposta ${i}`,
      lang: 'it'
    });
  }

  assert.ok(ke.candidateQueue.length <= 50, `Candidate queue must never exceed 50 items (current: ${ke.candidateQueue.length})`);
});

test('Security - Causal Invariant: Self-healing detects local tamper and restores sanity', async () => {
  localStorage.clear();
  const { profileStorage } = await import('../js/storage/ProfileStorage.js');
  profileStorage.loadProfile();
  profileStorage.profile.lifetimeSeconds = 0;
  profileStorage.profile.itemsProduced = 0;
  profileStorage.saveProfile();

  const pet = new PetManager();

  // Attacker sets 200 biscuits via DevTools console injection without study
  pet._pnPantry.produced.biscuit[pet.nodeId] = 200;
  const healed = pet.healPantryInvariants();

  assert.equal(healed, true, 'Self-healing should detect discrepancy between 0 study time and 200 biscuits');
  // Clamped to max plausible starter baseline (15)
  assert.ok(pet.pantry.biscuit <= 15, 'Fabricated biscuits must be auto-healed down to plausible baseline');
});

test('Security - Proof-of-Study: Legitimate student with 80 hours of study retains all 200 biscuits', async () => {
  localStorage.clear();
  const { profileStorage } = await import('../js/storage/ProfileStorage.js');
  profileStorage.loadProfile();

  // Student studied 80 hours (288,000s) over 2 months (60 days)
  const twoMonthsAgo = Date.now() - (60 * 24 * 3600 * 1000);
  profileStorage.profile.createdAt = twoMonthsAgo;
  profileStorage.profile.lifetimeSeconds = 288000; // ~4800 minutes
  profileStorage.profile.itemsProduced = 192;
  profileStorage.saveProfile();

  const pet = new PetManager();
  // Legitimate production of 190 biscuits
  pet.producePantryItem('biscuit', 190, pet.nodeId);
  const healed = pet.healPantryInvariants();

  assert.equal(healed, false, 'No healing needed: student has mathematical proof of 80 hours of study');
  assert.equal(pet.pantry.biscuit, 190, 'Honest student must keep all 190 biscuits without loss');
});
