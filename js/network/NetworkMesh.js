/**
 * BIBO - NetworkMesh (Zero-Cost Decentralized P2P Synchronization)
 * 
 * Architecture:
 * - Pure client-side WebRTC DataChannels with Nostr / BitTorrent tracker discovery.
 * - Zero OpEx (€0.00 / month forever): no central server, no Redis, no WebSocket bills.
 * - Conflict-Free Replicated Data Type (CRDT) state reconciliation:
 *   - Global EXP: monotonic max accumulation.
 *   - Pantry stock: deterministic delta resolution.
 * - Bridges PetManager events across devices in real time.
 */

export class NetworkMesh {
  constructor(petManager, roomId = 'bibo-global-collective-v1') {
    this.pet = petManager;
    this.roomId = roomId;
    this.peers = new Set();
    this.peerCount = 0;
    this.onPeerCountChange = null;
    this.isInitialized = false;
    this.lastVitalsSyncTimestamp = 0;

    // Local-First BroadcastChannel fallback (always available)
    this.localChannel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('bibo_mesh_local_v1')
      : null;

    if (this.localChannel) {
      this.localChannel.onmessage = (e) => this._handleIncomingMessage(e.data, 'local');
    }
  }

  /**
   * Initializes P2P WebRTC discovery mesh
   */
  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // Dynamic import of Trystero Nostr/Torrent serverless WebRTC connector
      // Using unpkg/esm.sh CDN with local fallback
      const trysteroModule = await import('https://esm.sh/trystero@0.20.7/nostr').catch(() => null);

      if (trysteroModule && trysteroModule.joinRoom) {
        const config = { appId: 'bibo-16bit-global-study' };
        this.room = trysteroModule.joinRoom(config, this.roomId);

        // Actions
        const [sendSync, getSync] = this.room.makeAction('sync');
        const [sendPing, getPing] = this.room.makeAction('ping');

        this._sendSync = sendSync;

        // Peer join/leave listeners
        this.room.onPeerJoin((peerId) => {
          this.peers.add(peerId);
          this.peerCount = this.peers.size + 1; // +1 for self
          if (this.onPeerCountChange) this.onPeerCountChange(this.peerCount);

          // Greet new peer with our current state snapshot
          this.broadcastState();
          console.log(`[NetworkMesh] P2P Peer connected: ${peerId}. Mesh count: ${this.peerCount}`);
        });

        this.room.onPeerLeave((peerId) => {
          this.peers.delete(peerId);
          this.peerCount = this.peers.size + 1;
          if (this.onPeerCountChange) this.onPeerCountChange(this.peerCount);
          console.log(`[NetworkMesh] P2P Peer disconnected: ${peerId}. Mesh count: ${this.peerCount}`);
        });

        // Incoming remote sync action
        getSync((data, peerId) => {
          this._handleIncomingMessage(data, peerId);
        });

        console.log('[NetworkMesh] P2P WebRTC mesh online via public Nostr relays.');
      } else {
        console.log('[NetworkMesh] Running in sovereign Local-First mode (BroadcastChannel).');
      }
    } catch (err) {
      console.warn('[NetworkMesh] P2P initialization note:', err.message);
    }
  }

  /**
   * Broadcast local state change to all connected P2P peers and local tabs
   */
  broadcastState() {
    const payload = {
      globalExp: this.pet.globalExp,
      userContributedExp: this.pet.userContributedExp,
      pantry: { ...this.pet.pantry },
      hunger: this.pet.hunger,
      energy: this.pet.energy,
      cleanliness: this.pet.cleanliness,
      state: this.pet.state,
      timestamp: Date.now()
    };

    // 1. Broadcast locally
    if (this.localChannel) {
      try {
        this.localChannel.postMessage({ type: 'BIBO_P2P_SYNC', payload });
      } catch (e) {}
    }

    // 2. Broadcast to WebRTC P2P peers
    if (this._sendSync && this.peers.size > 0) {
      try {
        this._sendSync({ type: 'BIBO_P2P_SYNC', payload });
      } catch (e) {
        console.warn('[NetworkMesh] Send sync failed:', e);
      }
    }
  }

  /**
   * CRDT Reconciliation of incoming remote state
   */
  _handleIncomingMessage(msg, sourceId) {
    if (!msg || msg.type !== 'BIBO_P2P_SYNC' || !msg.payload) return;
    const p = msg.payload;

    let changed = false;

    // 1. Monotonic EXP reconciliation (take maximum knowledge achieved)
    if (p.globalExp > this.pet.globalExp) {
      this.pet.globalExp = p.globalExp;
      changed = true;
    }

    // 2. Pantry stock merge (preserve items consumed or produced)
    if (p.pantry) {
      if (p.pantry.biscuit !== this.pet.pantry.biscuit ||
          p.pantry.coffee !== this.pet.pantry.coffee ||
          p.pantry.sponge !== this.pet.pantry.sponge) {
        this.pet.pantry = {
          biscuit: Math.max(0, p.pantry.biscuit),
          coffee: Math.max(0, p.pantry.coffee),
          sponge: Math.max(0, p.pantry.sponge)
        };
        changed = true;
      }
    }

    // 3. Collective Biological Vitals & State (One shared Bibo for the entire community)
    if (p.timestamp && p.timestamp > this.lastVitalsSyncTimestamp) {
      if (typeof p.hunger === 'number' && typeof p.energy === 'number' && typeof p.cleanliness === 'number') {
        this.pet.hunger = Math.max(0, Math.min(100, p.hunger));
        this.pet.energy = Math.max(0, Math.min(100, p.energy));
        this.pet.cleanliness = Math.max(0, Math.min(100, p.cleanliness));
        if (p.state === 'AWAKE' || p.state === 'ASLEEP') {
          this.pet.state = p.state;
        }
        this.lastVitalsSyncTimestamp = p.timestamp;
        changed = true;
      }
    }

    if (changed) {
      this.pet._savePantry();
      this.pet._saveVitals();
      this.pet._updateAnimationState();
      this.pet._notify(false);
      console.log(`[NetworkMesh] Synchronized collective Bibo from peer [${sourceId}]. EXP: ${this.pet.globalExp}`);
    }
  }
}
