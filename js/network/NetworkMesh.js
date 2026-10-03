/**
 * js/network/NetworkMesh.js
 * Sovereign Zero-OpEx P2P Engine: Hybrid Signaling, Fallback TURN, Gossip Overlay & CRDT
 */

export class NetworkMesh {
  constructor(petManager, roomId = 'bibo-global-collective-v2') {
    this.pet = petManager;
    this.roomId = roomId;

    this.localPeerId = this._generatePeerId();
    this.activePeers = new Map(); // sovereignPeerId -> { lastSeen, trysteroIds: Set }
    this.peerTransports = new Map(); // trysteroPeerId -> sovereignPeerId
    this.seenMessages = new Set();
    this.messageHistory = [];
    this.maxSeenCache = 1000;

    this.peerCount = 1;
    this.maxDegree = 8;
    this.heartbeatIntervalMs = 10000;
    this.heartbeatTimer = null;
    this.lastVitalsSyncTimestamp = 0;

    this.onPeerCountChange = null;
    this.onTopicsSync = null;
    this.onNotionSync = null;
    this.onVoteSync = null;
    this.getCustomTopics = null;

    this.roomTorrent = null;
    this.roomNostr = null;

    this.localChannel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('bibo_mesh_local_v2')
      : null;

    if (this.localChannel) {
      this.localChannel.onmessage = (e) => this._handleLocalBroadcast(e);
    }
  }

  _generatePeerId() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const raw = crypto.getRandomValues(new Uint8Array(8));
      return 'bibo_' + Array.from(raw, b => b.toString(16).padStart(2, '0')).join('');
    }
    return 'bibo_' + Math.random().toString(36).slice(2, 10);
  }

  async init() {
    console.log(`[NetworkMesh] Starting Sovereign P2P Stack. Self ID: ${this.localPeerId}`);

    const rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' }
      ],
      iceCandidatePoolSize: 4
    };

    const torrentRelays = [
      'wss://tracker.openwebtorrent.com',
      'wss://tracker.webtorrent.dev',
      'wss://open.ftorrent.com'
    ];

    const nostrRelays = [
      'wss://nos.lol',
      'wss://nostr.mom',
      'wss://relay.primal.net',
      'wss://purplerelay.com',
      'wss://relay.snort.social'
    ];

    await Promise.allSettled([
      this._initStrategy('torrent', '../vendor/trystero-torrent.js', torrentRelays, rtcConfig),
      this._initStrategy('nostr', '../vendor/trystero-nostr.js', nostrRelays, rtcConfig)
    ]);

    this._startHeartbeat();
    console.log('[NetworkMesh] Multi-signaling & Gossip engine initialized.');
  }

  async _initStrategy(type, modulePath, relays, rtcConfig) {
    try {
      const trystero = await import(modulePath);
      if (!trystero || !trystero.joinRoom) return;

      const config = {
        appId: 'bibo-16bit-sovereign-mesh',
        relayUrls: relays,
        relayConfig: { urls: relays },
        rtcConfig,
        trickleIce: true
      };

      const room = trystero.joinRoom(config, this.roomId);
      if (type === 'torrent') this.roomTorrent = room;
      if (type === 'nostr') this.roomNostr = room;

      const gossipAction = room.makeAction('gossip');
      let sendGossip;

      if (Array.isArray(gossipAction)) {
        sendGossip = gossipAction[0];
        gossipAction[1]((data, senderId) => this._handleGossipPacket(data, senderId));
      } else if (gossipAction && typeof gossipAction.send === 'function') {
        sendGossip = (data) => gossipAction.send(data);
        gossipAction.onMessage = (data, meta) => {
          const senderId = (typeof meta === 'string') ? meta : (meta?.peerId || meta?.sender || 'peer');
          this._handleGossipPacket(data, senderId);
        };
      }

      room._rawSend = sendGossip;

      const handleJoin = (trysteroPeerId) => {
        console.log(`[NetworkMesh] WebRTC channel joined on ${type}: ${trysteroPeerId}`);
        // Immediately broadcast full state and request sync so sovereign ID is registered
        this.broadcastState();
        this._emitGossip('REQUEST_SYNC', { senderId: this.localPeerId });

        setTimeout(() => {
          this.broadcastState();
        }, 400);
      };

      const handleLeave = (trysteroPeerId) => {
        console.log(`[NetworkMesh] WebRTC channel left on ${type}: ${trysteroPeerId}`);
        const sovereignId = this.peerTransports.get(trysteroPeerId);
        if (sovereignId) {
          this.peerTransports.delete(trysteroPeerId);
          const peer = this.activePeers.get(sovereignId);
          if (peer && peer.trysteroIds) {
            peer.trysteroIds.delete(trysteroPeerId);
            // Only drop the sovereign peer if ALL transport connections (torrent + nostr) have closed
            if (peer.trysteroIds.size === 0) {
              this.activePeers.delete(sovereignId);
              this._updatePeerMetrics();
            }
          }
        }
      };

      if (typeof room.onPeerJoin === 'function') room.onPeerJoin(handleJoin);
      else room.onPeerJoin = handleJoin;

      if (typeof room.onPeerLeave === 'function') room.onPeerLeave(handleLeave);
      else room.onPeerLeave = handleLeave;

    } catch (err) {
      console.warn(`[NetworkMesh] Strategy ${type} initialization skipped:`, err.message);
    }
  }

  _startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatIntervalMs = 8000;
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      let changed = false;

      // Check active peers against 45s timeout and active RTCPeerConnection health
      const activeTorrentPeers = (this.roomTorrent && typeof this.roomTorrent.getPeers === 'function')
        ? Object.keys(this.roomTorrent.getPeers())
        : [];
      const activeNostrPeers = (this.roomNostr && typeof this.roomNostr.getPeers === 'function')
        ? Object.keys(this.roomNostr.getPeers())
        : [];
      const liveTrysteroPeers = new Set([...activeTorrentPeers, ...activeNostrPeers]);

      for (const [peerId, meta] of this.activePeers.entries()) {
        // Prune peer if inactive for 20 seconds
        if (now - meta.lastSeen > 20000) {
          if (meta.trysteroIds) {
            for (const tid of meta.trysteroIds) {
              this.peerTransports.delete(tid);
            }
          }
          this.activePeers.delete(peerId);
          changed = true;
        }
      }
      if (changed) {
        this._updatePeerMetrics();
      }

      this._emitGossip('HEARTBEAT', { senderId: this.localPeerId, timestamp: now });

      // When solo in mesh, periodically broadcast state and request sync to catch asynchronous joins
      if (this.activePeers.size === 0 && (!this._lastSoloSync || now - this._lastSoloSync > 16000)) {
        this._lastSoloSync = now;
        this.broadcastState();
        this._emitGossip('REQUEST_SYNC', { senderId: this.localPeerId });
      }
    }, this.heartbeatIntervalMs);

    // Register beforeunload and pagehide to broadcast instant peer departure
    if (typeof window !== 'undefined') {
      const handleUnload = () => {
        this._emitGossip('PEER_LEAVE', { senderId: this.localPeerId });
      };
      window.addEventListener('beforeunload', handleUnload);
      window.addEventListener('pagehide', handleUnload);
    }
  }

  _updatePeerMetrics() {
    this.peerCount = this.activePeers.size + 1;
    if (this.onPeerCountChange) {
      this.onPeerCountChange(this.peerCount);
    }
  }

  _emitGossip(type, payload) {
    const messageId = `${this.localPeerId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const packet = { id: messageId, type, payload, ttl: 4 };

    this._markAsSeen(messageId);
    this._dispatchToOverlay(packet);

    if (this.localChannel) {
      this.localChannel.postMessage({ type: 'BIBO_LOCAL_RELAY', packet });
    }
  }

  _dispatchToOverlay(packet) {
    if (this.roomTorrent && this.roomTorrent._rawSend) {
      try { this.roomTorrent._rawSend(packet); } catch (_) {}
    }
    if (this.roomNostr && this.roomNostr._rawSend) {
      try { this.roomNostr._rawSend(packet); } catch (_) {}
    }
  }

  _handleGossipPacket(packet, senderId) {
    if (!packet || !packet.id || this.seenMessages.has(packet.id)) return;
    this._markAsSeen(packet.id);

    const actualSender = (packet.payload && packet.payload.senderId) || senderId || 'peer';
    if (actualSender && actualSender !== this.localPeerId) {
      if (senderId) {
        this.peerTransports.set(senderId, actualSender);
      }
      const existing = this.activePeers.get(actualSender);
      if (existing) {
        existing.lastSeen = Date.now();
        if (senderId && existing.trysteroIds) existing.trysteroIds.add(senderId);
      } else {
        const trysteroIds = new Set();
        if (senderId) trysteroIds.add(senderId);
        this.activePeers.set(actualSender, {
          lastSeen: Date.now(),
          trysteroIds
        });
        this._updatePeerMetrics();
      }
    }

    switch (packet.type) {
      case 'HEARTBEAT':
        break;
      case 'PEER_LEAVE':
        if (actualSender && this.activePeers.has(actualSender)) {
          const peer = this.activePeers.get(actualSender);
          if (peer && peer.trysteroIds) {
            for (const tid of peer.trysteroIds) {
              this.peerTransports.delete(tid);
            }
          }
          this.activePeers.delete(actualSender);
          this._updatePeerMetrics();
        }
        break;
      case 'REQUEST_SYNC':
        this.broadcastState();
        break;
      case 'STATE_SYNC':
      case 'BIBO_P2P_SYNC':
        this._mergeCRDTState(packet.payload, actualSender);
        break;
      case 'NOTION_BROADCAST':
      case 'BIBO_P2P_NOTION':
        if (this.onNotionSync) this.onNotionSync(packet.payload, actualSender);
        break;
      case 'VOTE_BROADCAST':
        if (this.onVoteSync) this.onVoteSync(packet.payload, actualSender);
        break;
    }

    if (packet.ttl && packet.ttl > 1) {
      const relayPacket = { ...packet, ttl: packet.ttl - 1 };
      this._dispatchToOverlay(relayPacket);
    }
  }

  /**
   * Compatibility method for test suite and direct invocations
   */
  _handleIncomingMessage(data, peerId) {
    if (!data) return;
    if (data.type === 'BIBO_P2P_SYNC' || data.type === 'STATE_SYNC') {
      this._mergeCRDTState(data.payload || data, peerId);
    } else if (data.type === 'BIBO_P2P_NOTION' || data.type === 'NOTION_BROADCAST') {
      if (this.onNotionSync) this.onNotionSync(data.payload || data, peerId);
    } else if (data.type === 'VOTE_BROADCAST') {
      if (this.onVoteSync) this.onVoteSync(data.payload || data, peerId);
    } else {
      this._handleGossipPacket(data, peerId);
    }
  }

  _markAsSeen(id) {
    this.seenMessages.add(id);
    this.messageHistory.push(id);
    if (this.messageHistory.length > this.maxSeenCache) {
      const purged = this.messageHistory.shift();
      this.seenMessages.delete(purged);
    }
  }

  broadcastState() {
    const customTopics = this.getCustomTopics ? this.getCustomTopics() : [];
    const payload = {
      senderId: this.localPeerId,
      globalExp: this.pet.globalExp,
      pantry: { ...this.pet.pantry },
      hunger: this.pet.hunger,
      energy: this.pet.energy,
      cleanliness: this.pet.cleanliness,
      state: this.pet.state,
      customTopics,
      lastActionTimestamp: this.pet.lastActionTimestamp || 0,
      timestamp: Date.now()
    };
    this._emitGossip('STATE_SYNC', payload);
  }

  broadcastNotion(notion) {
    this._emitGossip('NOTION_BROADCAST', notion);
  }

  broadcastVote(voteData) {
    this._emitGossip('VOTE_BROADCAST', voteData);
  }

  _mergeCRDTState(payload, sourceId) {
    if (!payload) return;
    let mutated = false;

    // 1. Monotonic EXP Accumulation (G-Counter)
    if (typeof payload.globalExp === 'number' && payload.globalExp > this.pet.globalExp) {
      this.pet.globalExp = payload.globalExp;
      mutated = true;
    }

    // 2. Pantry stock (PN-Counter merge)
    if (payload.pantry) {
      const p = payload.pantry;
      const b = Math.max(this.pet.pantry.biscuit, p.biscuit || 0);
      const c = Math.max(this.pet.pantry.coffee, p.coffee || 0);
      const s = Math.max(this.pet.pantry.sponge, p.sponge || 0);

      if (b !== this.pet.pantry.biscuit || c !== this.pet.pantry.coffee || s !== this.pet.pantry.sponge) {
        this.pet.pantry = { biscuit: b, coffee: c, sponge: s };
        mutated = true;
      }
    }

    // 3. Vitals & State (Collective consensus via adoptRemoteState)
    if (payload.timestamp) {
      if (typeof this.pet.adoptRemoteState === 'function') {
        const adopted = this.pet.adoptRemoteState(payload);
        if (adopted) {
          this.lastVitalsSyncTimestamp = payload.timestamp;
          mutated = true;
        }
      } else if (payload.timestamp > (this.lastVitalsSyncTimestamp || 0)) {
        if (typeof payload.hunger === 'number') this.pet.hunger = Math.max(0, Math.min(100, payload.hunger));
        if (typeof payload.energy === 'number') this.pet.energy = Math.max(0, Math.min(100, payload.energy));
        if (typeof payload.cleanliness === 'number') this.pet.cleanliness = Math.max(0, Math.min(100, payload.cleanliness));
        if (payload.state) this.pet.state = payload.state;
        this.lastVitalsSyncTimestamp = payload.timestamp;
        mutated = true;
      }
    }

    // 4. Custom topics synchronization
    if (Array.isArray(payload.customTopics) && this.onTopicsSync) {
      this.onTopicsSync(payload.customTopics, sourceId);
    }

    if (mutated) {
      this.pet._savePantry();
      this.pet._saveVitals();
      this.pet._updateAnimationState();
      this.pet._notify(false);
    }
  }

  _handleLocalBroadcast(e) {
    if (e.data && e.data.type === 'BIBO_LOCAL_RELAY') {
      this._handleGossipPacket(e.data.packet, 'local_tab');
    }
  }
}
