export class AudioManager {
  constructor() {
    this.ctx = null;
    this.volume = 0.5;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
  }

  _ensure() {
    if (!this.ctx && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playTone(freq, duration = 0.14, type = 'sine', gainScale = 0.25) {
    this._ensure();
    if (!this.ctx || this.volume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(this.volume * gainScale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playEvent(name) {
    switch (name) {
      case 'mote_picked':
        this.playTone(660, 0.1, 'sine', 0.2);
        break;
      case 'lantern_lit':
        this.playTone(523.25, 0.18, 'triangle', 0.3);
        setTimeout(() => this.playTone(659.25, 0.25, 'triangle', 0.3), 90);
        break;
      case 'pulse':
        this.playTone(440, 0.22, 'sine', 0.35);
        break;
      case 'dash':
        this.playTone(580, 0.08, 'triangle', 0.18);
        break;
      case 'charm_picked':
        this.playTone(784, 0.2, 'triangle', 0.3);
        break;
      case 'shade_spawned':
        this.playTone(110, 0.28, 'sine', 0.18);
        break;
      case 'player_hit':
        this.playTone(150, 0.25, 'sawtooth', 0.25);
        break;
      case 'game_over':
        this.playTone(392, 0.35, 'triangle', 0.3);
        break;
      default:
        break;
    }
  }
}
