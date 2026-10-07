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
    this.peerExpHistory = new Map(); // sovereignPeerId -> { lastExp, lastTs }

    this.onPeerCountChange = null;
    this.onTopicsSync = null;
    this.onNotionSync = null;
    this.onVoteSync = null;
    this.getCustomTopics = null;

    this.roomMqtt = null;
    this.roomTorrent = null;
    this.roomNostr = null;

    this.nostrSockets = [];
    this.nostrRetryTimers = new Map();
    this.nostrFailureCounts = new Map();
    this.nostrCreateEvent = null;
    this.nostrTopic = 'bibo-global-gossip-v3';
    this.nostrKind = 22002;

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

    // 1. MQTT Public Brokers: 100% adblocker-proof & enterprise firewall resistant
    const mqttBrokers = [
      'wss://public:public@public.cloud.shiftr.io',
      'wss://broker.hivemq.com:8884/mqtt'
    ];

    // 2. High-uptime Tier-1 Nostr Relays: sub-400ms global latency
    const nostrRelays = [
      'wss://nos.lol',
      'wss://relay.damus.io',
      'wss://nostr.mom',
      'wss://relay.primal.net',
      'wss://bucket.coracle.social',
      'wss://purplerelay.com'
    ];

    // 3. WebTorrent Trackers: complementary fallback for open networks
    const torrentRelays = [
      'wss://tracker.openwebtorrent.com',
      'wss://tracker.webtorrent.dev',
      'wss://open.ftorrent.com'
    ];

    await Promise.allSettled([
      this._initStrategy('mqtt', '../vendor/trystero-mqtt.js', mqttBrokers, rtcConfig),
      this._initStrategy('nostr', '../vendor/trystero-nostr.js', nostrRelays, rtcConfig),
      this._initStrategy('torrent', '../vendor/trystero-torrent.js', torrentRelays, rtcConfig),
      this._initNostrBus(nostrRelays)
    ]);

    this._startHeartbeat();
    console.log('[NetworkMesh] Multi-signaling & Gossip engine initialized.');
  }

  async _initNostrBus(relays) {
    if (typeof WebSocket === 'undefined') return;
    this.nostrRelayUrls = relays;
    try {
      const { createEvent } = await import('../vendor/trystero-nostr.js');
      this.nostrCreateEvent = createEvent;

      for (const url of relays) {
        this._connectNostrRelay(url);
      }

      // Mobile PWA Lifecycle: Instant reconnect on foreground / unlock
      if (typeof window !== 'undefined') {
        const handleWake = () => {
          this._reconnectDeadSockets();
          this.broadcastState();
          this._emitGossip('REQUEST_SYNC', { senderId: this.localPeerId });
        };
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') handleWake();
        });
        window.addEventListener('focus', handleWake);
        window.addEventListener('pageshow', handleWake);
        window.addEventListener('online', handleWake);
      }
    } catch (err) {
      console.warn('[NetworkMesh] Nostr bus initialization skipped:', err?.message);
    }
  }

  _connectNostrRelay(url) {
    if (typeof WebSocket === 'undefined') return;

    // Guard: Do not reconnect if already open or connecting
    const existing = this.nostrSockets.find(s => s._url === url);
    if (existing && (existing.readyState === 0 || existing.readyState === 1)) {
      return;
    }

    // Clear any pending retry timer for this url
    if (this.nostrRetryTimers.has(url)) {
      clearTimeout(this.nostrRetryTimers.get(url));
      this.nostrRetryTimers.delete(url);
    }

    try {
      const ws = new WebSocket(url);
      ws._url = url;
      ws.onopen = () => {
        this.nostrFailureCounts.set(url, 0); // reset failure count on success
        console.log(`[NetworkMesh] Nostr Sovereign Bus connected: ${url}`);
        ws.send(JSON.stringify(['REQ', 'sub_bibo_bus', {
          kinds: [this.nostrKind],
          '#x': [this.nostrTopic]
        }]));
        this.broadcastState();
      };
      ws.onmessage = (e) => {
        try {
          const [verb, sub, ev] = JSON.parse(e.data);
          if (verb === 'EVENT' && ev && ev.content) {
            const packet = JSON.parse(ev.content);
            this._handleGossipPacket(packet, ev.pubkey);
          }
        } catch (_) {}
      };
      ws.onclose = () => {
        const idx = this.nostrSockets.indexOf(ws);
        if (idx !== -1) this.nostrSockets.splice(idx, 1);
        if (!this._isDestroyed) {
          const failures = (this.nostrFailureCounts.get(url) || 0) + 1;
          this.nostrFailureCounts.set(url, failures);

          // Exponential backoff: 5s, 15s, 30s, up to 120s max. Prevents hammering failing relays.
          const backoffMs = Math.min(120000, Math.pow(2, Math.min(failures, 5)) * 3000 + Math.random() * 2000);

          if (!this.nostrRetryTimers.has(url)) {
            const timer = setTimeout(() => {
              this.nostrRetryTimers.delete(url);
              this._connectNostrRelay(url);
            }, backoffMs);
            this.nostrRetryTimers.set(url, timer);
          }
        }
      };
      ws.onerror = () => {};
      this.nostrSockets.push(ws);
    } catch (_) {}
  }

  _reconnectDeadSockets() {
    if (!this.nostrRelayUrls) return;
    const activeUrls = new Set(this.nostrSockets.filter(s => s.readyState === 1 || s.readyState === 0).map(s => s._url));
    for (const url of this.nostrRelayUrls) {
      if (!activeUrls.has(url) && !this.nostrRetryTimers.has(url)) {
        this._connectNostrRelay(url);
      }
    }
  }

  async _initStrategy(type, modulePath, relays, rtcConfig) {
    try {
      const trystero = await import(modulePath);
      if (!trystero || !trystero.joinRoom) return;

      const config = {
        appId: 'bibo-16bit-sovereign-mesh',
        relayUrls: relays,
        relayConfig: { urls: relays, redundancy: 2 },
        rtcConfig,
        trickleIce: true
      };

      const room = trystero.joinRoom(config, this.roomId);
      if (type === 'mqtt') this.roomMqtt = room;
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
            // Only drop the sovereign peer if ALL transport connections (mqtt + torrent + nostr) have closed
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
      const activeMqttPeers = (this.roomMqtt && typeof this.roomMqtt.getPeers === 'function')
        ? Object.keys(this.roomMqtt.getPeers())
        : [];
      const activeTorrentPeers = (this.roomTorrent && typeof this.roomTorrent.getPeers === 'function')
        ? Object.keys(this.roomTorrent.getPeers())
        : [];
      const activeNostrPeers = (this.roomNostr && typeof this.roomNostr.getPeers === 'function')
        ? Object.keys(this.roomNostr.getPeers())
        : [];
      const liveTrysteroPeers = new Set([...activeMqttPeers, ...activeTorrentPeers, ...activeNostrPeers]);

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
    // 1. Direct WebRTC DataChannels (if P2P hole-punch succeeded across any transport)
    if (this.roomMqtt && this.roomMqtt._rawSend) {
      try { this.roomMqtt._rawSend(packet); } catch (_) {}
    }
    if (this.roomTorrent && this.roomTorrent._rawSend) {
      try { this.roomTorrent._rawSend(packet); } catch (_) {}
    }
    if (this.roomNostr && this.roomNostr._rawSend) {
      try { this.roomNostr._rawSend(packet); } catch (_) {}
    }

    // 2. Sovereign Decentralized Nostr WebSocket Bus (100% NAT-proof delivery across all carriers & devices)
    if (this.nostrCreateEvent && this.nostrSockets && this.nostrSockets.length > 0) {
      this.nostrCreateEvent(this.nostrTopic, JSON.stringify(packet)).then((eventJson) => {
        for (const ws of this.nostrSockets) {
          if (ws && ws.readyState === 1) { // 1 = OPEN
            try { ws.send(eventJson); } catch (_) {}
          }
        }
      }).catch(() => {});
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
      pantryCRDT: typeof this.pet.exportPantryCRDT === 'function' ? this.pet.exportPantryCRDT() : null,
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
    if (!payload || typeof payload !== 'object') return;
    let mutated = false;

    // 1. Monotonic EXP Accumulation with Anti-Cheat & Plausibility Clamping
    // Honest maximum realistic burst is ~250 EXP (allows multi-hour offline catch-up).
    // An outright impossible total (>50,000) or massive delta is clamped/throttled.
    const MAX_ALLOWED_EXP_DELTA = 250;
    const MAX_PLAUSIBLE_LIFETIME_EXP = 50000;

    if (
      typeof payload.globalExp === 'number' &&
      Number.isFinite(payload.globalExp) &&
      payload.globalExp > this.pet.globalExp &&
      payload.globalExp <= MAX_PLAUSIBLE_LIFETIME_EXP
    ) {
      let allowedExp = payload.globalExp;
      const rawDelta = payload.globalExp - this.pet.globalExp;

      // Clamp initial burst to MAX_ALLOWED_EXP_DELTA
      if (rawDelta > MAX_ALLOWED_EXP_DELTA) {
        allowedExp = this.pet.globalExp + MAX_ALLOWED_EXP_DELTA;
      }

      // Check per-peer streaming rate limit if peer already known
      const now = Date.now();
      const peerKey = sourceId || 'anonymous_peer';
      const history = this.peerExpHistory.get(peerKey);
      let permitSync = true;

      if (history) {
        const elapsedSec = Math.max(1, (now - history.lastTs) / 1000);
        // Realistic max generation rate: ~2 EXP/sec even during burst quizzes/translates
        const maxAllowedGain = Math.max(25, Math.ceil(elapsedSec * 2));
        if (allowedExp - history.lastExp > maxAllowedGain) {
          // Throttled: allow only up to maxAllowedGain from this peer
          allowedExp = Math.min(allowedExp, history.lastExp + maxAllowedGain);
          if (allowedExp <= this.pet.globalExp) {
            permitSync = false;
          }
        }
      }

      if (permitSync && allowedExp > this.pet.globalExp) {
        this.peerExpHistory.set(peerKey, { lastExp: allowedExp, lastTs: now });
        if (typeof this.pet.adoptGlobalExp === 'function') {
          this.pet.adoptGlobalExp(allowedExp);
        } else {
          this.pet.globalExp = allowedExp;
        }
        mutated = true;
      }
    }

    // 2. Pantry stock (True PN-Counter CRDT merge)
    if (payload.pantryCRDT && typeof this.pet.mergePantryCRDT === 'function') {
      const changed = this.pet.mergePantryCRDT(payload.pantryCRDT);
      if (changed) mutated = true;
    } else if (payload.pantry && typeof payload.pantry === 'object') {
      // Legacy scalar compatibility fallback with burst cap
      const MAX_PRODUCTION_BURST = 15;
      const p = payload.pantry;
      const b = Math.max(0, Math.floor(Number(p.biscuit) || 0));
      const c = Math.max(0, Math.floor(Number(p.coffee) || 0));
      const s = Math.max(0, Math.floor(Number(p.sponge) || 0));
      const curB = this.pet.pantry.biscuit;
      const curC = this.pet.pantry.coffee;
      const curS = this.pet.pantry.sponge;

      if (b > curB) {
        const deltaB = Math.min(b - curB, MAX_PRODUCTION_BURST);
        if (typeof this.pet.producePantryItem === 'function') {
          this.pet.producePantryItem('biscuit', deltaB, sourceId || 'legacy_peer');
        } else {
          this.pet.pantry.biscuit = curB + deltaB;
        }
        mutated = true;
      }
      if (c > curC) {
        const deltaC = Math.min(c - curC, MAX_PRODUCTION_BURST);
        if (typeof this.pet.producePantryItem === 'function') {
          this.pet.producePantryItem('coffee', deltaC, sourceId || 'legacy_peer');
        } else {
          this.pet.pantry.coffee = curC + deltaC;
        }
        mutated = true;
      }
      if (s > curS) {
        const deltaS = Math.min(s - curS, MAX_PRODUCTION_BURST);
        if (typeof this.pet.producePantryItem === 'function') {
          this.pet.producePantryItem('sponge', deltaS, sourceId || 'legacy_peer');
        } else {
          this.pet.pantry.sponge = curS + deltaS;
        }
        mutated = true;
      }
    }

    // 3. Vitals & State (Collective consensus via adoptRemoteState)
    // Anti-Cheat: Reject future timestamps (>60s clock drift)
    const MAX_FUTURE_DRIFT_MS = 60 * 1000;
    if (
      payload.timestamp &&
      typeof payload.timestamp === 'number' &&
      Number.isFinite(payload.timestamp) &&
      payload.timestamp <= Date.now() + MAX_FUTURE_DRIFT_MS
    ) {
      if (typeof this.pet.adoptRemoteState === 'function') {
        const adopted = this.pet.adoptRemoteState(payload);
        if (adopted) {
          this.lastVitalsSyncTimestamp = payload.timestamp;
          mutated = true;
        }
      } else if (payload.timestamp > (this.lastVitalsSyncTimestamp || 0)) {
        if (typeof payload.hunger === 'number' && Number.isFinite(payload.hunger)) {
          this.pet.hunger = Math.max(0, Math.min(100, payload.hunger));
        }
        if (typeof payload.energy === 'number' && Number.isFinite(payload.energy)) {
          this.pet.energy = Math.max(0, Math.min(100, payload.energy));
        }
        if (typeof payload.cleanliness === 'number' && Number.isFinite(payload.cleanliness)) {
          this.pet.cleanliness = Math.max(0, Math.min(100, payload.cleanliness));
        }
        if (payload.state && ['AWAKE', 'ASLEEP'].includes(payload.state)) {
          this.pet.state = payload.state;
        }
        this.lastVitalsSyncTimestamp = payload.timestamp;
        mutated = true;
      }
    }

    // 4. Custom topics synchronization with sanitization & length limits
    if (Array.isArray(payload.customTopics) && this.onTopicsSync) {
      const sanitized = payload.customTopics
        .slice(0, 20) // Cap to 20 topics max per sync
        .filter(t => typeof t === 'string')
        .map(t => t
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]*>?/gm, '')
          .trim()
          .substring(0, 40)) // Strip HTML/scripts, max 40 chars
        .filter(t => t.length > 0);
      if (sanitized.length > 0) {
        this.onTopicsSync(sanitized, sourceId);
      }
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

  destroy() {
    this._isDestroyed = true;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const timer of this.nostrRetryTimers.values()) {
      clearTimeout(timer);
    }
    this.nostrRetryTimers.clear();
    for (const ws of this.nostrSockets) {
      try { ws.close(); } catch (_) {}
    }
    this.nostrSockets = [];
    if (this.roomMqtt && typeof this.roomMqtt.leave === 'function') {
      try { this.roomMqtt.leave(); } catch (_) {}
    }
    if (this.roomTorrent && typeof this.roomTorrent.leave === 'function') {
      try { this.roomTorrent.leave(); } catch (_) {}
    }
    if (this.roomNostr && typeof this.roomNostr.leave === 'function') {
      try { this.roomNostr.leave(); } catch (_) {}
    }
    if (this.localChannel) {
      try { this.localChannel.close(); } catch (_) {}
    }
  }
}
