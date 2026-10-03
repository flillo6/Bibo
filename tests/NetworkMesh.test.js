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
