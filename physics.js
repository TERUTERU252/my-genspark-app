// ===================================
// 電車でGO!風 - Web Audio API サウンド
// ===================================

class AudioManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.runningOsc = null;
        this.runningGain = null;
        this.masterGain = null;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // 走行音（速度に応じた連続音）
    updateRunningSound(speed) {
        if (!this.initialized) return;
        
        if (speed < 1) {
            this.stopRunningSound();
            return;
        }

        if (!this.runningOsc) {
            this.runningOsc = this.ctx.createOscillator();
            this.runningGain = this.ctx.createGain();
            
            // ノイズ的な音を作る
            this.runningOsc.type = 'sawtooth';
            this.runningGain.gain.value = 0;
            
            this.runningOsc.connect(this.runningGain);
            this.runningGain.connect(this.masterGain);
            this.runningOsc.start();
        }

        // 速度に応じて音の周波数と音量を変化
        const normalizedSpeed = Math.min(speed / 120, 1);
        const freq = 40 + normalizedSpeed * 80; // 40-120Hz
        const vol = Math.min(normalizedSpeed * 0.15, 0.12);
        
        this.runningOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
        this.runningGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
    }

    stopRunningSound() {
        if (this.runningGain) {
            this.runningGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
        }
    }

    // ブレーキ音
    playBrakeSound(intensity) {
        if (!this.initialized) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        filter.type = 'bandpass';
        filter.frequency.value = 2000 + intensity * 500;
        filter.Q.value = 2;
        
        osc.type = 'sawtooth';
        osc.frequency.value = 200 + intensity * 100;
        
        gain.gain.value = 0.03 + intensity * 0.02;
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    // 警笛
    playHorn() {
        if (!this.initialized) return;

        const now = this.ctx.currentTime;
        
        // 2音の和音で警笛を表現
        [440, 554].forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'square';
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
            gain.gain.setValueAtTime(0.12, now + 0.6);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 1.0);
        });
    }

    // 駅到着チャイム
    playStationChime() {
        if (!this.initialized) return;
        
        const now = this.ctx.currentTime;
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const start = now + i * 0.15;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.1, start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(start);
            osc.stop(start + 0.4);
        });
    }

    // ドア開閉音
    playDoorSound() {
        if (!this.initialized) return;
        
        const now = this.ctx.currentTime;
        
        // プシュー音
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
        }
        
        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        source.buffer = buffer;
        filter.type = 'bandpass';
        filter.frequency.value = 3000;
        filter.Q.value = 1;
        
        gain.gain.value = 0.15;
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start(now);
    }

    // スコア加算音
    playScoreSound() {
        if (!this.initialized) return;
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    // 警告音（速度超過）
    playWarningBeep() {
        if (!this.initialized) return;
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.value = 880;
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.setValueAtTime(0, now + 0.1);
        gain.gain.setValueAtTime(0.08, now + 0.2);
        gain.gain.setValueAtTime(0, now + 0.3);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    destroy() {
        this.stopRunningSound();
        if (this.runningOsc) {
            this.runningOsc.stop();
            this.runningOsc = null;
        }
        if (this.ctx) {
            this.ctx.close();
        }
        this.initialized = false;
    }
}

const audioManager = new AudioManager();
