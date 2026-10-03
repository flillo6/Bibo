/**
 * BIBO Engine - 15 FPS Sprite Animation System
 * 
 * Manages frame playback, texture mapping, and canvas rendering.
 * Locked at exactly 15 FPS for passive body doubling and calm computing.
 * 
 * Scalability Architecture:
 * - Supports any evolution stage ('baby', 'mid', 'adult').
 * - Automatic Fallback: If a specialized animation sprite is pending or missing,
 *   it gracefully falls back to 'idle_base' without visual disruption.
 */

import { CONFIG } from '../config.js';

export class SpriteAnimationPlayer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Configure crisp pixel art rendering
    this.ctx.imageSmoothingEnabled = false;

    this.currentEvo = 'baby';
    this.currentAnim = CONFIG.ANIMATIONS.IDLE_BASE;
    this.currentFrame = 0;
    
    // Animation clock (Locked to CONFIG.FRAME_RATE = 8 FPS for calm retro pacing)
    this.frameInterval = 1000 / CONFIG.FRAME_RATE;
    this.lastFrameTime = 0;
    this.isPlaying = true;
    this.onComplete = null;

    // Loaded image cache: map of `${evo}:${anim}` -> { img, atlas }
    this.cache = new Map();
    this.isLoaded = false;
  }

  /**
   * Initialize and load default sprite sheets
   */
  async init() {
    // 1. Load canonical Baby Bibo Base Idle (512x512, 12 frames)
    await this.loadSprite('baby', CONFIG.ANIMATIONS.IDLE_BASE, 'assets/sprites/baby/idle_base.png', {
      frameCount: 12,
      frameWidth: 512,
      frameHeight: 512,
      fps: CONFIG.FRAME_RATE,
      loop: true,
      loopStartFrame: 0,
      yOffset: 0,
      scale: 1.0
    });

    // 2. Pre-register all canonical animations across all 3 evolutions (baby, mid, adult)
    const allEvos = ['baby', 'mid', 'adult'];
    const allAnims = Object.values(CONFIG.ANIMATIONS);

    for (const evo of allEvos) {
      for (const anim of allAnims) {
        if (evo === 'baby' && anim === CONFIG.ANIMATIONS.IDLE_BASE) continue;
        const isLoop = anim !== CONFIG.ANIMATIONS.EAT_BISCUIT && 
                       anim !== CONFIG.ANIMATIONS.CLEAN_SPONGE && 
                       anim !== CONFIG.ANIMATIONS.CLICK_ANNOYED && 
                       anim !== CONFIG.ANIMATIONS.VICTORY_HOP;
        const isSleep = anim === CONFIG.ANIMATIONS.SLEEP;
        const loopStartFrame = isSleep ? 9 : 0;
        const isBaby = (evo === 'baby');
        
        // Scale and vertical offsets tailored to each evolution's frame proportions
        const scale = isBaby ? 1.0 : 0.90;
        const yOffset = isBaby ? (isSleep ? 30 : 0) : (isSleep ? -5 : -10);
        const groundY = isBaby ? (isSleep ? 437 : 452) : (isSleep ? 495 : 490);
        const shadowScaleX = isSleep ? 0.44 : (isBaby ? 0.33 : 0.38);
        const shadowScaleY = isSleep ? 12 : (isBaby ? 9 : 11);

        this.loadSprite(evo, anim, `assets/sprites/${evo}/${anim}.png`, {
          frameCount: 12,
          frameWidth: 512,
          frameHeight: 512,
          fps: CONFIG.FRAME_RATE,
          loop: isLoop,
          loopStartFrame: loopStartFrame,
          scale: scale,
          yOffset: yOffset,
          groundY: groundY,
          shadowScaleX: shadowScaleX,
          shadowScaleY: shadowScaleY,
          silentFallback: true
        });
      }
    }

    this.isLoaded = true;
    console.log('[SpriteAnimation] Animation pipeline initialized with all 9 canonical animations at 5 FPS.');
  }

  /**
   * Load a sprite sheet with its atlas metadata
   */
  loadSprite(evo, animKey, imgUrl, meta = {}) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const frameCount = meta.frameCount || 12;
        // Strictly auto-compute frame dimensions directly from the actual loaded image geometry
        const frameWidth = Math.round(img.width / frameCount);
        const frameHeight = img.height;

        this.cache.set(`${evo}:${animKey}`, {
          img,
          meta: {
            frameCount,
            frameWidth,
            frameHeight,
            fps: meta.fps || CONFIG.FRAME_RATE,
            loop: meta.loop !== false,
            loopStartFrame: meta.loopStartFrame || 0,
            yOffset: meta.yOffset || 0,
            groundY: meta.groundY || 452,
            shadowScaleX: meta.shadowScaleX || 0.33,
            shadowScaleY: meta.shadowScaleY || 9,
            scale: meta.scale || 1.0
          }
        });
        resolve(true);
      };
      img.onerror = () => {
        if (!meta.silentFallback) {
          console.warn(`[SpriteAnimation] Sprite ${imgUrl} not found. Routing to fallback.`);
        }
        resolve(false);
      };
      img.src = `${imgUrl}?v=5.5`;
    });
  }

  /**
   * Set the active evolution stage ('baby' | 'mid' | 'adult')
   */
  setEvolution(evoKey) {
    if (this.currentEvo !== evoKey) {
      this.currentEvo = evoKey;
      this.currentFrame = 0;
    }
  }

  /**
   * Change current animation with seamless fallback and onComplete callback
   */
  play(animKey, loop = true, onComplete = null) {
    if (this.currentAnim === animKey && this.isPlaying && this.isLooping === loop) return;

    this.currentAnim = animKey;
    this.currentFrame = 0;
    this.isLooping = loop;
    this.onComplete = onComplete;
    this.isPlaying = true;
  }

  /**
   * Main render tick locked at CONFIG.FRAME_RATE (8 FPS)
   */
  tick(timestamp) {
    if (!this.isPlaying || !this.isLoaded) return;

    if (timestamp - this.lastFrameTime >= this.frameInterval) {
      this.lastFrameTime = timestamp;

      // Resolve active sprite or fallback chain:
      let entry = this.cache.get(`${this.currentEvo}:${this.currentAnim}`);
      if (!entry) {
        entry = this.cache.get(`${this.currentEvo}:${CONFIG.ANIMATIONS.IDLE_BASE}`);
      }
      if (!entry) {
        entry = this.cache.get(`baby:${this.currentAnim}`);
      }
      if (!entry) {
        entry = this.cache.get(`baby:${CONFIG.ANIMATIONS.IDLE_BASE}`);
      }

      if (entry) {
        const { img, meta } = entry;
        const totalFrames = meta.frameCount || 1;
        const loopStart = meta.loopStartFrame !== undefined ? meta.loopStartFrame : 0;
        
        if (this.currentFrame + 1 >= totalFrames) {
          if (this.isLooping && meta.loop !== false) {
            // Loop smoothly from loopStartFrame (e.g. snoozing breathing cycle 9..11)
            this.currentFrame = loopStart;
          } else {
            // One-shot animation completed its final frame!
            this.currentFrame = totalFrames - 1;
            if (this.onComplete) {
              const cb = this.onComplete;
              this.onComplete = null;
              cb();
              return;
            }
          }
        } else {
          this.currentFrame += 1;
        }

        this._renderFrame(img, meta, this.currentFrame);
      }
    }
  }

  /**
   * Draw the frame onto canvas with grounding soft shadow
   */
  _renderFrame(img, meta, frameIndex) {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Frame slice coordinates
    const fw = meta.frameWidth;
    const fh = meta.frameHeight;
    const sx = frameIndex * fw;
    const sy = 0;

    // Target display size (preserve aspect ratio, scale up +8% for better presence)
    const scale = (meta.scale || 1.0) * 1.08;
    const targetHeight = (height * 0.88) * scale;
    const targetWidth = ((fw / fh) * targetHeight);
    const dx = (width - targetWidth) / 2;
    const yOffset = meta.yOffset || 0;
    
    // Position Bibo with yOffset
    const dy = ((height - targetHeight) * 0.5) + 16 + yOffset;

    // Contact point of sneakers or sleeping body in 512 frame
    const groundY = meta.groundY || 452;
    const sneakerGroundY = dy + (targetHeight * (groundY / fh));

    // 1. Crisp grounding ellipse shadow placed precisely under Bibo (firmly on canvas floor)
    const isSleep = (meta.groundY === 437 || meta.groundY === 495);
    const shadowX = width / 2;
    const isBaby = (meta.groundY === 452 || meta.groundY === 437);
    // User requirement: For Evo 2 (mid) and Evo 3 (adult), shadow must go lower down (+14px under contact)
    const evoOffsetY = isSleep ? 0 : (isBaby ? 3 : 14);
    const shadowY = Math.min(height - 10, sneakerGroundY + evoOffsetY);
    const shadowRadiusX = targetWidth * (meta.shadowScaleX || 0.33);
    const shadowRadiusY = meta.shadowScaleY || 9;

    // 1. Draw sprite frame first
    this.ctx.drawImage(img, sx, sy, fw, fh, dx, dy, targetWidth, targetHeight);

    // 2. Crisp grounding ellipse shadow placed under sneakers on canvas floor
    // Using source-over or destination-over
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-over'; // Draw shadow UNDER sprite without ever being clipped or covered
    this.ctx.beginPath();
    this.ctx.ellipse(shadowX, shadowY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(46, 52, 64, 0.32)'; // Crisp grounding shadow
    this.ctx.fill();
    this.ctx.restore();
  }
}
