/**
 * BIBO - NetworkMesh (Zero-Cost Decentralized P2P Synchronization)
 * 
 * Architecture:
 * - Pure client-side WebRTC DataChannels with WebTorrent tracker & Nostr relay discovery.
 * - Zero OpEx (€0.00 / month forever): no central server, no Redis, no WebSocket bills.
 * - Conflict-Free Replicated Data Type (CRDT) state reconciliation:
 *   - Global EXP: monotonic max accumulation.
 *   - Pantry stock: deterministic delta resolution.
 *   - Collective biological vitals (hunger, energy, cleanliness, sleep state).
 *   - Sovereign peer-to-peer knowledge & topics mesh.
 * - Bridges PetManager and KnowledgeEngine events across devices in real time.
 */

export class NetworkMesh {
  constructor(petManager, roomId = 'bibo-global-collective-v1') {
    this.pet = petManager;
    this.roomId = roomId;
    this.peers = new Set();
    this.peerCount = 1; // Start with 1 (self is online)
    this.onPeerCountChange = null;
    this.onTopicsSync = null;
    this.onNotionSync = null;
    this.getCustomTopics = null;
    this.isInitialized = false;
    this.lastVitalsSyncTimestamp = 0;

    // Local-First BroadcastChannel fallback (always available for tabs on the same profile)
    this.localChannel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('bibo_mesh_local_v1')
      : null;

    if (this.localChannel) {
      this.localChannel.onmessage = (e) => {
        if (!e.data) return;
        if (e.data.type === 'BIBO_P2P_SYNC') {
          this._handleIncomingMessage(e.data, 'local');
        } else if (e.data.type === 'BIBO_P2P_NOTION') {
          if (this.onNotionSync) {
            this.onNotionSync(e.data.payload, 'local');
          }
        }
      };
    }
  }

  /**
   * Initializes P2P WebRTC discovery mesh via local bundled WebTorrent or Nostr connectors
   */
  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      let trysteroModule = null;
      let usedConnector = 'torrent';

      // 1. Try local vendored WebTorrent bundle
      try {
        trysteroModule = await import('../vendor/trystero-torrent.js');
      } catch (errTorrent) {
        console.warn('[NetworkMesh] Torrent bundle load failed, trying Nostr bundle:', errTorrent);
        try {
          trysteroModule = await import('../vendor/trystero-nostr.js');
          usedConnector = 'nostr';
        } catch (errNostr) {
          console.warn('[NetworkMesh] Nostr bundle load failed:', errNostr);
        }
      }

      if (trysteroModule && trysteroModule.joinRoom) {
        const config = {
          appId: 'bibo-16bit-global-study',
          relayUrls: usedConnector === 'torrent'
            ? ['wss://tracker.openwebtorrent.com', 'wss://tracker.webtorrent.dev']
            : ['wss://relay.damus.io', 'wss://nos.lol', 'wss://nostr.mom'],
          relayConfig: {
            urls: usedConnector === 'torrent'
              ? ['wss://tracker.openwebtorrent.com', 'wss://tracker.webtorrent.dev']
              : ['wss://relay.damus.io', 'wss://nos.lol', 'wss://nostr.mom']
          },
          rtcConfig: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun.cloudflare.com:3478' }
            ]
          }
        };

        this.room = trysteroModule.joinRoom(config, this.roomId);

        // Actions: Support both v0.25 ({send, onMessage}) and legacy ([send, get])
        const syncAction = this.room.makeAction('sync');
        if (Array.isArray(syncAction)) {
          this._sendSync = syncAction[0];
          syncAction[1]((data, peerId) => this._handleIncomingMessage(data, peerId));
        } else if (syncAction && typeof syncAction.send === 'function') {
          this._sendSync = (data) => syncAction.send(data);
          syncAction.onMessage = (data, meta) => {
            const peerId = (meta && meta.peerId) ? meta.peerId : 'remote';
            this._handleIncomingMessage(data, peerId);
          };
        }

        const notionAction = this.room.makeAction('notion');
        if (Array.isArray(notionAction)) {
          this._sendNotion = notionAction[0];
          notionAction[1]((data, peerId) => {
            if (this.onNotionSync) this.onNotionSync(data, peerId);
          });
        } else if (notionAction && typeof notionAction.send === 'function') {
          this._sendNotion = (data) => notionAction.send(data);
          notionAction.onMessage = (data, meta) => {
            const peerId = (meta && meta.peerId) ? meta.peerId : 'remote';
            if (this.onNotionSync) this.onNotionSync(data, peerId);
          };
        }

        // Peer join/leave listeners: Support both setter (v0.25) and method call (v0.18)
        const onJoinHandler = (peerId) => {
          this.peers.add(peerId);
          this.peerCount = this.peers.size + 1; // +1 for self
          if (this.onPeerCountChange) this.onPeerCountChange(this.peerCount);
          this.broadcastState();
          console.log(`[NetworkMesh] P2P Peer connected: ${peerId}. Mesh count: ${this.peerCount}`);
        };

        const onLeaveHandler = (peerId) => {
          this.peers.delete(peerId);
          this.peerCount = this.peers.size + 1;
          if (this.onPeerCountChange) this.onPeerCountChange(this.peerCount);
          console.log(`[NetworkMesh] P2P Peer disconnected: ${peerId}. Mesh count: ${this.peerCount}`);
        };

        try {
          this.room.onPeerJoin = onJoinHandler;
        } catch (_) {
          if (typeof this.room.onPeerJoin === 'function') this.room.onPeerJoin(onJoinHandler);
        }

        try {
          this.room.onPeerLeave = onLeaveHandler;
        } catch (_) {
          if (typeof this.room.onPeerLeave === 'function') this.room.onPeerLeave(onLeaveHandler);
        }

        console.log(`[NetworkMesh] P2P WebRTC mesh online via ${usedConnector.toUpperCase()}. Self ID: ${trysteroModule.selfId || 'local'}`);
      } else {
        console.log('[NetworkMesh] Running in sovereign Local-First mode (BroadcastChannel).');
      }
    } catch (err) {
      console.warn('[NetworkMesh] P2P initialization note:', err.message);
    }
  }

  /**
   * Broadcast local state change and topics to all connected P2P peers and local tabs
   */
  broadcastState() {
    const customTopics = this.getCustomTopics ? this.getCustomTopics() : [];

    const payload = {
      globalExp: this.pet.globalExp,
      userContributedExp: this.pet.userContributedExp,
      pantry: { ...this.pet.pantry },
      hunger: this.pet.hunger,
      energy: this.pet.energy,
      cleanliness: this.pet.cleanliness,
      state: this.pet.state,
      customTopics,
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
   * Broadcast a newly donated community notion across the P2P mesh
   */
  broadcastNotion(notion) {
    if (!notion) return;

    // 1. Broadcast to local tabs
    if (this.localChannel) {
      try {
        this.localChannel.postMessage({ type: 'BIBO_P2P_NOTION', payload: notion });
      } catch (e) {}
    }

    // 2. Broadcast to WebRTC P2P peers
    if (this._sendNotion && this.peers.size > 0) {
      try {
        this._sendNotion(notion);
      } catch (e) {
        console.warn('[NetworkMesh] Send notion failed:', e);
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
    if (typeof p.globalExp === 'number' && p.globalExp > this.pet.globalExp) {
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

    // 4. Custom Topics Synchronization across community
    if (Array.isArray(p.customTopics) && p.customTopics.length > 0) {
      if (this.onTopicsSync) {
        this.onTopicsSync(p.customTopics, sourceId);
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
