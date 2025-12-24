import { SETTINGS } from '../main.js';

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.musicOscillator = null;
        this.musicGain = null;
    }
    
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('WebAudio not available');
        }
    }
    
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    
    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!SETTINGS.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
    
    playFootstep() {
        this.playTone(80 + Math.random() * 40, 0.08, 'triangle', 0.1);
    }
    
    playGeneratorZap() {
        if (!SETTINGS.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        
        // Electric zap sound
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.playTone(200 + Math.random() * 800, 0.05, 'sawtooth', 0.15);
            }, i * 30);
        }
    }
    
    // Smooth continuous charging sound for generator
    startGeneratorCharge() {
        if (!SETTINGS.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        if (this.chargeNodes) return; // Already playing
        
        // Prevent rapid restarts causing volume spikes
        const now = this.ctx.currentTime;
        if (this.lastChargeStopTime && now - this.lastChargeStopTime < 0.2) {
            return;
        }
        
        this.chargeNodes = [];
        
        // Master gain to control overall volume - use compressor for consistent levels
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-20, now);
        compressor.knee.setValueAtTime(10, now);
        compressor.ratio.setValueAtTime(12, now);
        compressor.attack.setValueAtTime(0, now);
        compressor.release.setValueAtTime(0.1, now);
        compressor.connect(this.ctx.destination);
        
        const masterGain = this.ctx.createGain();
        masterGain.gain.setValueAtTime(0.06, now); // Fixed master volume
        masterGain.connect(compressor);
        
        // Base electrical hum
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(120, now);
        gain1.gain.setValueAtTime(0.8, now); // Start at target volume, no ramp
        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc1.start();
        this.chargeNodes.push({ osc: osc1, gain: gain1, type: 'osc1' });
        
        // Higher harmonic for electric feel
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(240, now);
        gain2.gain.setValueAtTime(0.4, now); // Half volume relative to base
        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start();
        this.chargeNodes.push({ osc: osc2, gain: gain2, type: 'osc2' });
        
        // Subtle wobble/modulation
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(8, now); // 8Hz wobble
        lfoGain.gain.setValueAtTime(8, now); // Reduced modulation depth
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfo.start();
        this.chargeNodes.push({ osc: lfo, gain: lfoGain });
        
        this.chargeMasterGain = masterGain;
        this.chargeCompressor = compressor;
    }
    
    updateGeneratorChargePitch(progress) {
        if (!this.chargeNodes || !this.ctx) return;
        
        const now = this.ctx.currentTime;
        const freq1 = 120 + progress * 80; // Base freq
        const freq2 = 240 + progress * 160; // Harmonic freq
        
        for (const node of this.chargeNodes) {
            if (node.type === 'osc1' && node.osc) {
                node.osc.frequency.setValueAtTime(freq1, now);
            } else if (node.type === 'osc2' && node.osc) {
                node.osc.frequency.setValueAtTime(freq2, now);
            }
        }
    }
    
    stopGeneratorCharge() {
        if (!this.chargeNodes || !this.ctx) return;
        
        const now = this.ctx.currentTime;
        const nodesToStop = this.chargeNodes;
        const masterToStop = this.chargeMasterGain;
        const compressorToStop = this.chargeCompressor;
        
        // Record stop time to prevent rapid restarts
        this.lastChargeStopTime = now;
        
        // Clear immediately so new sounds can start
        this.chargeNodes = null;
        this.chargeMasterGain = null;
        this.chargeCompressor = null;
        
        // Fade out via master gain for clean cutoff
        if (masterToStop) {
            try {
                masterToStop.gain.cancelScheduledValues(now);
                masterToStop.gain.setValueAtTime(masterToStop.gain.value, now);
                masterToStop.gain.linearRampToValueAtTime(0.001, now + 0.1);
            } catch (e) {}
        }
        
        // Stop after fade
        setTimeout(() => {
            for (const node of nodesToStop) {
                try {
                    if (node.osc) node.osc.stop();
                    if (node.osc) node.osc.disconnect();
                    if (node.gain) node.gain.disconnect();
                } catch (e) {}
            }
            if (masterToStop) {
                try { masterToStop.disconnect(); } catch (e) {}
            }
            if (compressorToStop) {
                try { compressorToStop.disconnect(); } catch (e) {}
            }
        }, 150);
    }
    
    playGeneratorComplete() {
        if (!SETTINGS.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        
        // Rising chime
        this.playTone(400, 0.15, 'sine', 0.3);
        setTimeout(() => this.playTone(500, 0.15, 'sine', 0.3), 100);
        setTimeout(() => this.playTone(600, 0.2, 'sine', 0.3), 200);
    }
    
    playExitOpen() {
        if (!SETTINGS.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        
        // Triumphant chime
        this.playTone(523, 0.2, 'sine', 0.4);
        setTimeout(() => this.playTone(659, 0.2, 'sine', 0.4), 150);
        setTimeout(() => this.playTone(784, 0.3, 'sine', 0.4), 300);
    }
    
    playMonsterHit() {
        if (!SETTINGS.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        
        // Low scary hit
        this.playTone(80, 0.3, 'sawtooth', 0.5);
        this.playTone(60, 0.4, 'square', 0.3);
    }
    
    playHeartbeat() {
        if (!SETTINGS.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        
        // Double thump
        this.playTone(50, 0.1, 'sine', 0.4);
        setTimeout(() => this.playTone(40, 0.15, 'sine', 0.3), 120);
    }
    
    playDoorClose() {
        if (!SETTINGS.sfxEnabled) return;
        this.playTone(150, 0.15, 'square', 0.25);
        setTimeout(() => this.playTone(100, 0.1, 'square', 0.2), 50);
    }
    
    playCabinetEnter() {
        if (!SETTINGS.sfxEnabled) return;
        this.playTone(200, 0.1, 'triangle', 0.2);
        setTimeout(() => this.playTone(150, 0.15, 'sine', 0.3), 50);
    }
    
    playDecoyDrop() {
        if (!SETTINGS.sfxEnabled) return;
        this.playTone(300, 0.1, 'triangle', 0.3);
        this.playTone(250, 0.15, 'triangle', 0.2);
    }
    
    playWin() {
        if (!SETTINGS.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        
        const notes = [523, 587, 659, 784, 880];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.3), i * 120);
        });
    }
    
    playLose() {
        if (!SETTINGS.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        
        this.playTone(200, 0.4, 'sawtooth', 0.4);
        setTimeout(() => this.playTone(150, 0.5, 'sawtooth', 0.3), 200);
        setTimeout(() => this.playTone(100, 0.6, 'sawtooth', 0.2), 400);
    }
    
    playButtonClick() {
        this.playTone(400, 0.08, 'sine', 0.2);
    }
    
    playButtonHover() {
        this.playTone(300, 0.05, 'sine', 0.1);
    }
    
    startMusic() {
        if (!SETTINGS.musicEnabled) return;
        this.init();
        if (!this.ctx) return;
        if (this.musicNodes && this.musicNodes.length > 0) return; // Already playing
        
        this.musicNodes = [];
        const now = this.ctx.currentTime;
        
        // Base drone (Low A)
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(55, now);
        gain1.gain.setValueAtTime(0.12, now); // Increased from 0.08
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start();
        this.musicNodes.push(osc1, gain1);
        
        // Harmony drone (Fifth above - E)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(82.41, now);
        gain2.gain.setValueAtTime(0.04, now); // Increased from 0.02
        // Lowpass filter for darker tone
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);
        osc2.connect(filter);
        filter.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start();
        this.musicNodes.push(osc2, gain2, filter);
        
        // Slow LFO for modulation
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(0.1, now);
        lfoGain.gain.setValueAtTime(2, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfo.start();
        this.musicNodes.push(lfo, lfoGain);
    }
    
    stopMusic() {
        if (this.musicNodes) {
            this.musicNodes.forEach(node => {
                try {
                    if (node.stop) node.stop();
                    node.disconnect();
                } catch (e) {}
            });
            this.musicNodes = null;
        }
    }
    
    updateMusicState() {
        if (SETTINGS.musicEnabled) {
            this.startMusic();
        } else {
            this.stopMusic();
        }
    }
}
