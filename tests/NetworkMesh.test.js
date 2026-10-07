import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { PetManager } from '../js/engine/PetManager.js';
import { NetworkMesh } from '../js/network/NetworkMesh.js';

test('NetworkMesh - Monotonic EXP and CRDT vitals reconciliation', () => {
  localStorage.clear();
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
  localStorage.clear();
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
  localStorage.clear();
  const pet = new PetManager();
  const now = Date.now();
  const t0 = now - 7200000; // 2 hours ago
  pet.lastVitalsTimestamp = t0;
  pet.lastActionTimestamp = t0;
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

test('NetworkMesh - PN-Counter CRDT prevents item resurrection across multi-device sync', () => {
  localStorage.clear();
  const phonePet = new PetManager();
  phonePet.nodeId = 'device_phone';
  phonePet.hunger = 50;
  phonePet.cleanliness = 50;
  phonePet.producePantryItem('biscuit', 3, 'device_phone');
  phonePet.producePantryItem('sponge', 1, 'device_phone');

  const pcPet = new PetManager();
  pcPet.nodeId = 'device_pc';
  pcPet.hunger = 50;
  pcPet.cleanliness = 50;

  const phoneMesh = new NetworkMesh(phonePet);
  phoneMesh.localPeerId = 'peer_phone';

  const pcMesh = new NetworkMesh(pcPet);
  pcMesh.localPeerId = 'peer_pc';

  // 1. Initial sync from phone to PC
  pcMesh._handleIncomingMessage({
    type: 'STATE_SYNC',
    payload: {
      senderId: 'peer_phone',
      globalExp: phonePet.globalExp,
      pantry: { ...phonePet.pantry },
      pantryCRDT: phonePet.exportPantryCRDT(),
      timestamp: Date.now()
    }
  }, 'peer_phone');

  assert.equal(phonePet.pantry.biscuit, 3, 'Phone should start with 3 biscuits');
  assert.equal(pcPet.pantry.biscuit, 3, 'PC should receive 3 biscuits from sync');
  assert.equal(phonePet.pantry.sponge, 1, 'Phone should start with 1 sponge');
  assert.equal(pcPet.pantry.sponge, 1, 'PC should receive 1 sponge from sync');

  // 2. User eats a biscuit on Phone: drops from 3 to 2
  const feedRes = phonePet.feedBiscuit();
  assert.equal(feedRes.success, true);
  assert.equal(phonePet.pantry.biscuit, 2, 'Phone biscuit count drops to 2');

  // 3. Phone broadcasts STATE_SYNC with new CRDT state to PC
  pcMesh._handleIncomingMessage({
    type: 'STATE_SYNC',
    payload: {
      senderId: 'peer_phone',
      globalExp: phonePet.globalExp,
      pantry: { ...phonePet.pantry },
      pantryCRDT: phonePet.exportPantryCRDT(),
      timestamp: Date.now()
    }
  }, 'peer_phone');

  assert.equal(pcPet.pantry.biscuit, 2, 'PC adopts consumed biscuit: drops to 2');

  // 4. PC heartbeats back to Phone (the previous BUG: Math.max resurrected biscuit back to 3)
  phoneMesh._handleIncomingMessage({
    type: 'STATE_SYNC',
    payload: {
      senderId: 'peer_pc',
      globalExp: pcPet.globalExp,
      pantry: { ...pcPet.pantry },
      pantryCRDT: pcPet.exportPantryCRDT(),
      timestamp: Date.now()
    }
  }, 'peer_pc');

  assert.equal(phonePet.pantry.biscuit, 2, 'Phone biscuit count MUST stay at 2 (no resurrection!)');

  // 5. User cleans with sponge on Phone (1 -> 0)
  const spongeRes = phonePet.cleanWithSponge();
  assert.equal(spongeRes.success, true);
  assert.equal(phonePet.pantry.sponge, 0, 'Phone sponge drops to 0');

  // Sync sponge consumption to PC
  pcMesh._handleIncomingMessage({
    type: 'STATE_SYNC',
    payload: {
      senderId: 'peer_phone',
      globalExp: phonePet.globalExp,
      pantry: { ...phonePet.pantry },
      pantryCRDT: phonePet.exportPantryCRDT(),
      timestamp: Date.now()
    }
  }, 'peer_phone');

  assert.equal(pcPet.pantry.sponge, 0, 'PC sponge drops to 0');

  // PC attempts to use sponge when depleted
  const pcSpongeRes = pcPet.cleanWithSponge();
  assert.equal(pcSpongeRes.success, false, 'PC cannot use depleted sponge');
});

test('NetworkMesh - PN-Counter CRDT converges under concurrent multi-peer consumption (1000+ peers scenario)', () => {
  localStorage.clear();
  const peerA = new PetManager();
  peerA.nodeId = 'node_A';
  peerA.producePantryItem('biscuit', 10, 'node_A');

  const peerB = new PetManager();
  peerB.nodeId = 'node_B';
  const peerC = new PetManager();
  peerC.nodeId = 'node_C';

  const meshB = new NetworkMesh(peerB);
  const meshC = new NetworkMesh(peerC);
  const meshA = new NetworkMesh(peerA);

  // Sync initial 10 biscuits to B and C
  const initialPayload = {
    senderId: 'peer_A',
    globalExp: peerA.globalExp,
    pantry: { ...peerA.pantry },
    pantryCRDT: peerA.exportPantryCRDT(),
    timestamp: Date.now()
  };
  meshB._handleIncomingMessage(initialPayload, 'peer_A');
  meshC._handleIncomingMessage(initialPayload, 'peer_A');

  assert.equal(peerA.pantry.biscuit, 10);
  assert.equal(peerB.pantry.biscuit, 10);
  assert.equal(peerC.pantry.biscuit, 10);

  // Concurrent consumption:
  // Node A eats 2 biscuits
  peerA.consumePantryItem('biscuit', 2, 'node_A');
  // Node B eats 3 biscuits
  peerB.consumePantryItem('biscuit', 3, 'node_B');
  // Node C eats 1 biscuit
  peerC.consumePantryItem('biscuit', 1, 'node_C');

  // Total consumed concurrently: 2 + 3 + 1 = 6 biscuits.
  // Remaining should be 10 - 6 = 4 biscuits across all nodes once synced.

  // Gossip propagation:
  meshA._handleIncomingMessage({ type: 'STATE_SYNC', payload: { pantryCRDT: peerB.exportPantryCRDT(), timestamp: Date.now() } }, 'peer_B');
  meshA._handleIncomingMessage({ type: 'STATE_SYNC', payload: { pantryCRDT: peerC.exportPantryCRDT(), timestamp: Date.now() } }, 'peer_C');

  meshB._handleIncomingMessage({ type: 'STATE_SYNC', payload: { pantryCRDT: peerA.exportPantryCRDT(), timestamp: Date.now() } }, 'peer_A');
  meshB._handleIncomingMessage({ type: 'STATE_SYNC', payload: { pantryCRDT: peerC.exportPantryCRDT(), timestamp: Date.now() } }, 'peer_C');

  meshC._handleIncomingMessage({ type: 'STATE_SYNC', payload: { pantryCRDT: peerA.exportPantryCRDT(), timestamp: Date.now() } }, 'peer_A');
  meshC._handleIncomingMessage({ type: 'STATE_SYNC', payload: { pantryCRDT: peerB.exportPantryCRDT(), timestamp: Date.now() } }, 'peer_B');

  assert.equal(peerA.pantry.biscuit, 4, 'Peer A should converge to 4 biscuits');
  assert.equal(peerB.pantry.biscuit, 4, 'Peer B should converge to 4 biscuits');
  assert.equal(peerC.pantry.biscuit, 4, 'Peer C should converge to 4 biscuits');
});

test('NetworkMesh - Multi-transport architecture and clean lifecycle destroy', () => {
  const pet = new PetManager();
  const mesh = new NetworkMesh(pet);

  assert.equal(mesh.roomMqtt, null);
  assert.equal(mesh.roomTorrent, null);
  assert.equal(mesh.roomNostr, null);
  assert.equal(mesh.peerCount, 1);

  // Calling destroy cleans up timers, sockets, and local channels
  mesh.destroy();
  assert.equal(mesh._isDestroyed, true);
  assert.equal(mesh.heartbeatTimer, null);
  assert.equal(mesh.nostrSockets.length, 0);
});

test('NetworkMesh - Converges vitals across 3 devices (Friend Phone, User Phone, PC)', () => {
  localStorage.clear();
  // 1. Friend Phone joins for the first time: default 80% hunger, 0 action ts
  const friendPet = new PetManager();
  friendPet.hunger = 80;
  friendPet.lastActionTimestamp = 0;
  const friendMesh = new NetworkMesh(friendPet);

  // 2. User Phone was offline for a while: decayed to 25% hunger, 0 action ts
  const userPhonePet = new PetManager();
  userPhonePet.hunger = 25;
  userPhonePet.lastActionTimestamp = 0;
  const userPhoneMesh = new NetworkMesh(userPhonePet);

  // 3. User PC was open: 45% hunger, 0 action ts
  const pcPet = new PetManager();
  pcPet.hunger = 45;
  pcPet.lastActionTimestamp = 0;
  const pcMesh = new NetworkMesh(pcPet);

  // Synchronize User Phone state to Friend and PC
  const phonePayload = {
    senderId: 'user_phone',
    hunger: userPhonePet.hunger,
    energy: userPhonePet.energy,
    cleanliness: userPhonePet.cleanliness,
    lastActionTimestamp: 0,
    timestamp: Date.now()
  };
  friendMesh._handleIncomingMessage({ type: 'STATE_SYNC', payload: phonePayload }, 'user_phone');
  pcMesh._handleIncomingMessage({ type: 'STATE_SYNC', payload: phonePayload }, 'user_phone');

  // Both Friend and PC must converge down to the decayed companion state (25%)
  assert.equal(friendPet.hunger, 25, 'Friend phone should align to decayed companion vitals');
  assert.equal(pcPet.hunger, 25, 'PC should align to decayed companion vitals');
  assert.equal(userPhonePet.hunger, 25, 'User phone stays at 25%');

  // 4. Friend feeds Bibo (+25% hunger to 50%)
  const now = Date.now();
  friendPet.producePantryItem('biscuit', 2, 'friend');
  friendPet.feedBiscuit();
  assert.equal(friendPet.hunger, 50, 'Friend pet hunger increases to 50');
  assert.ok(friendPet.lastActionTimestamp >= now, 'Action timestamp updated');

  // Friend broadcasts action to User Phone and PC
  const feedPayload = {
    senderId: 'friend',
    hunger: friendPet.hunger,
    energy: friendPet.energy,
    cleanliness: friendPet.cleanliness,
    lastActionTimestamp: friendPet.lastActionTimestamp,
    timestamp: Date.now()
  };
  userPhoneMesh._handleIncomingMessage({ type: 'STATE_SYNC', payload: feedPayload }, 'friend');
  pcMesh._handleIncomingMessage({ type: 'STATE_SYNC', payload: feedPayload }, 'friend');

  // All 3 devices are now 100% identical!
  assert.equal(userPhonePet.hunger, 50, 'User phone adopts friend feeding (50)');
  assert.equal(pcPet.hunger, 50, 'PC adopts friend feeding (50)');
  assert.equal(friendPet.hunger, 50, 'Friend stays at 50');
});

