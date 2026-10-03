import test from 'node:test';
import assert from 'node:assert/strict';
import { PetManager } from '../js/engine/PetManager.js';
import { NetworkMesh } from '../js/network/NetworkMesh.js';

test('NetworkMesh - Monotonic EXP and CRDT vitals reconciliation', () => {
  const pet = new PetManager();
  pet.globalExp = 100;
  pet.hunger = 80;
  pet.energy = 50;

  const mesh = new NetworkMesh(pet);

  // Incoming sync message with higher EXP and updated vitals
  mesh._handleIncomingMessage({
    type: 'BIBO_P2P_SYNC',
    payload: {
      globalExp: 250,
      hunger: 95,
      energy: 85,
      cleanliness: 90,
      state: 'AWAKE',
      customTopics: ['Musica', 'Filosofia'],
      timestamp: Date.now()
    }
  }, 'peer-test-1');

  assert.equal(pet.globalExp, 250, 'Global EXP should monotonically update to the higher value');
  assert.equal(pet.hunger, 95, 'Hunger should update to remote value');
  assert.equal(pet.energy, 85, 'Energy should update to remote value');
});

test('NetworkMesh - Triggers onTopicsSync callback on receiving custom topics', () => {
  const pet = new PetManager();
  const mesh = new NetworkMesh(pet);

  let syncedTopics = null;
  mesh.onTopicsSync = (topics) => {
    syncedTopics = topics;
  };

  mesh._handleIncomingMessage({
    type: 'BIBO_P2P_SYNC',
    payload: {
      customTopics: ['Musica', 'Biochimica'],
      timestamp: Date.now()
    }
  }, 'peer-test-2');

  assert.ok(syncedTopics, 'onTopicsSync callback should be called');
  assert.deepEqual(syncedTopics, ['Musica', 'Biochimica'], 'Topics list should match payload');
});

test('NetworkMesh - Collective Memory: Stale offline peer cannot overwrite newer peer feeding', () => {
  const pet = new PetManager();
  const now = Date.now();
  const t0 = now - 7200000; // 2 hours ago
  pet.lastVitalsTimestamp = t0;
  pet.hunger = 40;

  const mesh = new NetworkMesh(pet);

  // User B fed Bibo at t1 (10 seconds ago) to hunger 100
  const t1 = now - 10000;
  mesh._handleIncomingMessage({
    type: 'STATE_SYNC',
    payload: {
      hunger: 100,
      energy: 90,
      cleanliness: 95,
      state: 'AWAKE',
      timestamp: t1
    }
  }, 'user-b');

  // Pet adopted User B's state
  assert.ok(pet.hunger > 80, 'Pet hunger should be updated from User B interaction');

  // Now an outdated message from an old client arrives with timestamp t0 - 500
  mesh._handleIncomingMessage({
    type: 'STATE_SYNC',
    payload: {
      hunger: 20,
      timestamp: t0 - 500
    }
  }, 'outdated-peer');

  // Outdated message must NOT overwrite
  assert.ok(pet.hunger > 80, 'Stale offline peer must not overwrite fresh state');
});

test('NetworkMesh - Synchronizes peer review votes across GossipSub overlay', () => {
  const pet = new PetManager();
  const mesh = new NetworkMesh(pet);

  let receivedVote = null;
  mesh.onVoteSync = (data) => {
    receivedVote = data;
  };

  mesh._handleIncomingMessage({
    type: 'VOTE_BROADCAST',
    payload: {
      notionId: 'cand_test_99',
      voterKey: 'peer_verona_01',
      vote: 'true',
      studyMinutes: 45
    }
  }, 'peer_verona_01');

  assert.ok(receivedVote !== null, 'onVoteSync should receive remote peer vote');
  assert.equal(receivedVote.notionId, 'cand_test_99');
  assert.equal(receivedVote.vote, 'true');
  assert.equal(receivedVote.studyMinutes, 45);
});


