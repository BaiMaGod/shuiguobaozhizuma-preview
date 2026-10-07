(function(){const exports={};"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JuiceAudio = void 0;
exports.limitJuiceMix = limitJuiceMix;
exports.synthesizeJuiceSound = synthesizeJuiceSound;
function limitJuiceMix(x) {
    const a = Math.abs(x);
    return Math.sign(x) * (a <= .75 ? a : .75 + .13 * Math.tanh((a - .75) / .13));
}
/** Fresh v0.7 palette: soft seed-pop, short pulp crack, liquid droplets and
 * a wooden/marimba reward. No long bass sweep or continuously modulated hiss.
 * Seeded stereo PCM is shared by the preview, Laya and offline review clips. */
function synthesizeJuiceSound(kind, sampleRate, strength = 1, combo = 1, pulse = 0, variant = 0) {
    const duration = kind === "win" ? .82 : kind === "lose" ? .48 :
        kind === "juice" ? .32 : kind === "shot" ? .12 : kind === "impact" ? .095 : .10;
    const count = Math.ceil(sampleRate * duration);
    const left = new Float32Array(count), right = new Float32Array(count);
    const notes = [0, 2, 4, 7, 9, 12, 14, 16];
    const pitch = Math.pow(2, (notes[Math.min(7, Math.max(0, Math.floor(combo - 1)))] + variant * .12) / 12);
    const power = Math.min(1.22, 1 + Math.max(0, strength - 1) * .075);
    let seed = (variant + 1) * 9173 + combo * 37 + pulse * 109;
    let lowL = 0, lowR = 0, smoothL = 0, smoothR = 0;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return ((seed >>> 0) / 2147483648) - 1; };
    const envelope = (u, decay) => u < 0 ? 0 : (1 - Math.exp(-u * 700)) * Math.exp(-u * decay);
    const plop = (u, from, to, decay) => {
        if (u < 0)
            return 0;
        const phase = Math.PI * 2 * (to * u + (from - to) * (1 - Math.exp(-u * 65)) / 65);
        return Math.sin(phase) * envelope(u, decay);
    };
    const wood = (u, f, decay = 22) => {
        if (u < 0)
            return 0;
        return envelope(u, decay) * (Math.sin(Math.PI * 2 * f * u) +
            .24 * Math.sin(Math.PI * 2 * f * 2.76 * u) * Math.exp(-u * 32) +
            .10 * Math.sin(Math.PI * 2 * f * 5.4 * u) * Math.exp(-u * 65));
    };
    const lp = 1 - Math.exp(-Math.PI * 2 * 3200 / sampleRate);
    const hp = 1 - Math.exp(-Math.PI * 2 * 260 / sampleRate);
    for (let i = 0; i < count; i++) {
        const t = i / sampleRate;
        smoothL += lp * (random() - smoothL);
        smoothR += lp * (random() - smoothR);
        lowL += hp * (smoothL - lowL);
        lowR += hp * (smoothR - lowR);
        const wetL = smoothL - lowL, wetR = smoothR - lowR;
        let center = 0, sideL = 0, sideR = 0;
        if (kind === "shot") {
            center = .38 * plop(t, 470, 240, 52) + .08 * wood(t, 720, 66);
            sideL = wetL * .18 * envelope(t, 75);
            sideR = wetR * .18 * envelope(t, 75);
        }
        else if (kind === "impact") {
            center = .28 * plop(t, 590, 310, 72) + .12 * wood(t, 820, 70);
            sideL = wetL * .19 * envelope(t, 90);
            sideR = wetR * .19 * envelope(t, 90);
        }
        else if (kind === "juice") {
            // A compact crack followed by three discrete sprays, not one noisy tail.
            center = .27 * power * plop(t, 380, 185, 46);
            const spray = .64 * envelope(t, 95) + .32 * envelope(t - .023, 78) + .17 * envelope(t - .048, 72);
            sideL = wetL * spray * power;
            sideR = wetR * spray * power;
            for (let drop = 0; drop < 4; drop++) {
                const u = t - (.018 + drop * .037 + variant * .002);
                const bubble = .15 * plop(u, (980 + drop * 125) * (1 + pulse * .035), 430 + drop * 90, 58);
                sideL += bubble * (drop % 2 ? .5 : 1);
                sideR += bubble * (drop % 2 ? 1 : .5);
            }
            // A dry wooden note makes elimination readable, without a piercing bell.
            center += .17 * wood(t - .007, 523.25 * pitch, 24);
            if (combo >= 2 && pulse === 0)
                center += .08 * wood(t - .074, 659.25 * pitch, 30);
            if (pulse > 0)
                center += .10 * wood(t - .032, 783.99 * Math.min(pitch, 1.7), 32);
        }
        else if (kind === "swap") {
            center = .28 * wood(t, 660, 65) + .20 * wood(t - .025, 880, 65);
            sideL = wetL * .07 * envelope(t, 100);
            sideR = wetR * .07 * envelope(t, 100);
        }
        else {
            const tones = kind === "win" ? [523.25, 659.25, 783.99, 1046.5] : [392, 329.63, 261.63];
            for (let note = 0; note < tones.length; note++)
                center += .27 * wood(t - note * .095, tones[note], kind === "win" ? 12 : 21);
            sideL = wetL * .08 * envelope(t, 80);
            sideR = wetR * .08 * envelope(t, 80);
        }
        const tail = Math.min(1, (duration - t) / .018);
        left[i] = (center + sideL) * tail;
        right[i] = (center + sideR) * tail;
    }
    // Preserve clean transients instead of clipping each voice with saturation.
    let peak = 0;
    for (let i = 0; i < count; i++)
        peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    const ceiling = kind === "juice" ? (pulse > 0 ? .55 : .62) : kind === "shot" ? .38 : kind === "impact" ? .31 : .46;
    const gain = peak > ceiling ? ceiling / peak : 1;
    for (let i = 0; i < count; i++) {
        left[i] *= gain;
        right[i] *= gain;
    }
    return [left, right];
}
class JuiceAudio {
    constructor() {
        this.context = null;
        this.master = null;
        this.input = null;
        this.buffers = new Map();
        this.voices = [];
        this.muted = false;
        this.variation = 0;
    }
    /** Called from a user gesture; no sound or context is created on page load. */
    unlock() {
        try {
            if (!this.context) {
                const Audio = window.AudioContext || window.webkitAudioContext;
                if (!Audio)
                    return;
                const context = new Audio({ latencyHint: "interactive" });
                this.context = context;
                const compressor = context.createDynamicsCompressor();
                compressor.threshold.value = -12;
                compressor.knee.value = 12;
                compressor.ratio.value = 2.5;
                compressor.attack.value = .003;
                compressor.release.value = .14;
                const limiter = context.createWaveShaper(), curve = new Float32Array(1024);
                for (let i = 0; i < curve.length; i++)
                    curve[i] = limitJuiceMix(i / (curve.length - 1) * 2 - 1);
                limiter.curve = curve;
                limiter.oversample = "2x";
                this.master = context.createGain();
                this.master.gain.value = this.muted ? 0 : .72;
                compressor.connect(limiter);
                limiter.connect(this.master);
                this.master.connect(context.destination);
                // Buffer sources enter the compressor; the limiter bounds summed peaks.
                this.input = compressor;
            }
            if (this.context.state === "suspended")
                void this.context.resume().catch(() => { });
        }
        catch (_) { /* Optional audio must never interrupt a shot or match. */ }
    }
    setMuted(value) {
        this.muted = value;
        if (value)
            this.stopAll();
        if (this.context && this.master) {
            this.master.gain.cancelScheduledValues(this.context.currentTime);
            this.master.gain.setTargetAtTime(value ? 0 : .72, this.context.currentTime, .008);
        }
        if (!value && this.context)
            this.unlock();
    }
    stopAll() {
        for (const voice of this.voices.splice(0)) {
            try {
                voice.stop();
            }
            catch (_) { }
            voice.disconnect();
        }
    }
    playShot() { this.play("shot"); }
    playImpact() { this.play("impact"); }
    playSwap() { this.play("swap"); }
    playJuice(strength = 1, combo = 1, pulse = 0) { this.play("juice", strength, combo, pulse); }
    playResult(win) { this.play(win ? "win" : "lose"); }
    play(kind, strength = 1, combo = 1, pulse = 0) {
        if (this.muted)
            return;
        this.unlock();
        const context = this.context;
        if (!context || !this.master)
            return;
        try {
            const variant = this.variation++ % 3;
            const boundedCombo = Math.min(8, combo), boundedPulse = Math.min(4, pulse);
            const key = `${kind}:${boundedCombo}:${boundedPulse}:${Math.round(Math.min(4, strength) * 10)}:${variant}`;
            let buffer = this.buffers.get(key);
            if (!buffer) {
                const samples = synthesizeJuiceSound(kind, context.sampleRate, strength, boundedCombo, boundedPulse, variant);
                buffer = context.createBuffer(2, samples[0].length, context.sampleRate);
                buffer.getChannelData(0).set(samples[0]);
                buffer.getChannelData(1).set(samples[1]);
                if (this.buffers.size >= 40)
                    this.buffers.delete(this.buffers.keys().next().value);
                this.buffers.set(key, buffer);
            }
            while (this.voices.length >= 6) {
                const old = this.voices.shift();
                old.stop();
                old.disconnect();
            }
            const voice = context.createBufferSource();
            voice.buffer = buffer;
            voice.connect(this.input);
            this.voices.push(voice);
            voice.onended = () => { const index = this.voices.indexOf(voice); if (index >= 0)
                this.voices.splice(index, 1); voice.disconnect(); };
            voice.start();
        }
        catch (_) { /* A failed audio node leaves gameplay intact. */ }
    }
}
exports.JuiceAudio = JuiceAudio;

window.JuiceAudio=exports.JuiceAudio;})();
