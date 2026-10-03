/**
 * js/engine/MonotonicWorkerTimer.js
 * Anti-cheat timing engine running in a background Web Worker via Blob URL
 * Immune to browser tab throttling on mobile and backgrounding.
 */

export class MonotonicWorkerTimer {
  constructor(onTick, onSessionValid) {
    this.onTick = onTick;
    this.onSessionValid = onSessionValid;
    this.worker = null;
    this.fallbackTimer = null;
    this.isWorkerSupported = typeof Worker !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
    this._initWorker();
  }

  _initWorker() {
    if (!this.isWorkerSupported) return;

    try {
      const workerCode = `
        let startTime = 0;
        let targetSeconds = 0;
        let elapsedSeconds = 0;
        let timerId = null;
        let hashChain = '0000000000000000';

        async function sha256(str) {
          if (typeof crypto !== 'undefined' && crypto.subtle) {
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
            return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
          }
          return str;
        }

        self.onmessage = async function(e) {
          const { action, payload } = e.data;
          if (action === 'START') {
            targetSeconds = payload.durationSeconds;
            elapsedSeconds = 0;
            startTime = performance.now();
            hashChain = payload.sessionSalt;

            clearInterval(timerId);
            timerId = setInterval(async () => {
              const now = performance.now();
              const realElapsed = Math.floor((now - startTime) / 1000);
              
              if (realElapsed > elapsedSeconds) {
                elapsedSeconds = realElapsed;
                hashChain = await sha256(hashChain + '_' + elapsedSeconds);
                
                self.postMessage({
                  type: 'TICK',
                  elapsedSeconds,
                  remainingSeconds: Math.max(0, targetSeconds - elapsedSeconds)
                });

                if (elapsedSeconds >= targetSeconds) {
                  clearInterval(timerId);
                  self.postMessage({
                    type: 'COMPLETE',
                    verifiedSeconds: elapsedSeconds,
                    finalProof: hashChain
                  });
                }
              }
            }, 500);
          } else if (action === 'PAUSE') {
            clearInterval(timerId);
          } else if (action === 'STOP') {
            clearInterval(timerId);
            self.postMessage({
              type: 'ABORTED',
              verifiedSeconds: elapsedSeconds,
              finalProof: hashChain
            });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));

      this.worker.onmessage = (e) => {
        const data = e.data;
        if (data.type === 'TICK' && this.onTick) {
          this.onTick(data.elapsedSeconds, data.remainingSeconds);
        } else if (data.type === 'COMPLETE' && this.onSessionValid) {
          this.onSessionValid(data.verifiedSeconds, data.finalProof);
        }
      };
    } catch (err) {
      console.warn('[MonotonicWorkerTimer] Worker init failed, using monotonic fallback:', err);
      this.isWorkerSupported = false;
    }
  }

  start(durationMinutes, salt) {
    if (this.isWorkerSupported && this.worker) {
      this.worker.postMessage({
        action: 'START',
        payload: {
          durationSeconds: durationMinutes * 60,
          sessionSalt: salt || Math.random().toString(36)
        }
      });
      return;
    }

    // Monotonic fallback for environments without Web Worker (e.g. Node.js unit tests)
    const targetSeconds = durationMinutes * 60;
    let elapsedSeconds = 0;
    const startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    clearInterval(this.fallbackTimer);
    this.fallbackTimer = setInterval(() => {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const realElapsed = Math.floor((now - startTime) / 1000);
      if (realElapsed > elapsedSeconds) {
        elapsedSeconds = realElapsed;
        if (this.onTick) {
          this.onTick(elapsedSeconds, Math.max(0, targetSeconds - elapsedSeconds));
        }
        if (elapsedSeconds >= targetSeconds) {
          clearInterval(this.fallbackTimer);
          if (this.onSessionValid) {
            this.onSessionValid(elapsedSeconds, 'fallback_proof');
          }
        }
      }
    }, 500);
  }

  pause() {
    if (this.isWorkerSupported && this.worker) {
      this.worker.postMessage({ action: 'PAUSE' });
    }
    clearInterval(this.fallbackTimer);
  }

  stop() {
    if (this.isWorkerSupported && this.worker) {
      this.worker.postMessage({ action: 'STOP' });
    }
    clearInterval(this.fallbackTimer);
  }
}
