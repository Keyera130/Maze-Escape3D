// sound.js — Audio manager using Web Audio API + WAV files
class SoundManager {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.footstepTimer = 0;
    this.footstepInterval = 0.38;
    this.torchSource = null;
    this.masterGain = null;
    this.enabled = true;
  }

  async init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.ctx.destination);
      await Promise.all([
        this._load('footstep', 'sounds/footstep.wav'),
        this._load('collect',  'sounds/collect.wav'),
        this._load('win',      'sounds/win.wav'),
        this._load('unlock',   'sounds/unlock.wav'),
        this._load('torch',    'sounds/torch.wav'),
      ]);
    } catch(e) {
      console.warn('Audio init failed:', e);
    }
  }

  async _load(name, url) {
    try {
      const res = await fetch(url);
      const ab  = await res.arrayBuffer();
      this.buffers[name] = await this.ctx.decodeAudioData(ab);
    } catch(e) { console.warn('Could not load sound:', url); }
  }

  play(name, volume=1.0, loop=false) {
    if (!this.enabled || !this.ctx || !this.buffers[name]) return null;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const src  = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = this.buffers[name];
    src.loop   = loop;
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(this.masterGain);
    src.start();
    return src;
  }

  startTorchAmbient() {
    if (this.torchSource) return;
    this.torchSource = this.play('torch', 0.18, true);
  }

  stopTorchAmbient() {
    if (this.torchSource) { try { this.torchSource.stop(); } catch(e){} this.torchSource = null; }
  }

  // Call every frame with dt and whether player is moving
  tickFootsteps(dt, isMoving) {
    if (!isMoving) { this.footstepTimer = 0; return; }
    this.footstepTimer += dt;
    if (this.footstepTimer >= this.footstepInterval) {
      this.footstepTimer = 0;
      this.play('footstep', 0.35 + Math.random() * 0.15);
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.masterGain) this.masterGain.gain.value = this.enabled ? 0.7 : 0;
    return this.enabled;
  }
}

const sound = new SoundManager();