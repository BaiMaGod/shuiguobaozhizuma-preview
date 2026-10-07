(function(){const exports={};"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JuiceAudio = void 0;
exports.synthesizeJuiceSound = synthesizeJuiceSound;
/** Baked stereo transients: punch, wet pulp, droplets, then a short bright tail.
 * The same synthesis and playback code is exported to the web preview. */
function synthesizeJuiceSound(kind, sampleRate, strength = 1, combo = 1, pulse = 0, variant = 0) {
    const duration = kind === "win" ? 1.12 : kind === "lose" ? .68 :
        kind === "juice" ? .48 : kind === "shot" ? .24 : kind === "impact" ? .14 : .1;
    const count = Math.ceil(sampleRate * duration);
    const left = new Float32Array(count), right = new Float32Array(count);
    const power = Math.min(1.42, .92 + Math.max(0, strength - 1) * .16);
    const stage = Math.min(7, Math.max(0, combo - 1));
    const pitch = Math.pow(2, (stage * 2 + Math.min(4, pulse) * 1.5 + variant * .22) / 12);
    let seed = (variant + 1) * 9173 + combo * 37 + pulse * 109;
    let wetL = 0, wetR = 0, phase = 0;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return ((seed >>> 0) / 2147483648) - 1; };
    const tones = kind === "win" ? [523.25, 659.25, 783.99, 1046.5] : [261.63, 196, 130.81];
    for (let i = 0; i < count; i++) {
        const t = i / sampleRate;
        const nL = random(), nR = random();
        const filter = 1 - Math.exp(-Math.PI * 2 * (650 + 4400 * Math.exp(-t * 20)) / sampleRate);
        wetL += filter * (nL - wetL);
        wetR += filter * (nR - wetR);
        const attack = Math.min(1, t / .0018);
        let center = 0, sideL = 0, sideR = 0;
        if (kind === "shot") {
            phase += Math.PI * 2 * (72 + 460 * Math.exp(-t * 33)) / sampleRate;
            center = (Math.sin(phase) + .2 * Math.sin(phase * 2)) * Math.exp(-t * 23) * .56;
            const puff = .35 * Math.exp(-t * 42) + .1 * Math.exp(-Math.pow((t - .018) / .022, 2));
            sideL = wetL * puff + (nL - wetL) * .12 * Math.exp(-t * 100);
            sideR = wetR * puff + (nR - wetR) * .12 * Math.exp(-t * 100);
        }
        else if (kind === "juice" || kind === "impact") {
            const impact = kind === "impact";
            phase += Math.PI * 2 * (impact ? 110 + 300 * Math.exp(-t * 45) : 58 + 270 * Math.exp(-t * 26)) / sampleRate;
            center = (Math.sin(phase) + .24 * Math.sin(phase * 2)) * Math.exp(-t * (impact ? 37 : 19)) * (impact ? .32 : .63 * power);
            const crunch = Math.exp(-t * (impact ? 65 : 44)) * (impact ? .3 : .55 * power);
            const squirt = impact ? 0 : .24 * power * Math.exp(-t * 11) * (.5 + .5 * Math.sin(t * 105));
            sideL = wetL * (crunch + squirt) + (nL - wetL) * .19 * Math.exp(-t * 120);
            sideR = wetR * (crunch + squirt) + (nR - wetR) * .19 * Math.exp(-t * 120);
            if (!impact) {
                // Droplets stagger across the stereo field instead of a continuous hiss.
                for (let drop = 0; drop < 5; drop++) {
                    const u = t - (.025 + drop * .042);
                    if (u >= 0) {
                        const start = (590 + drop * 137) * pitch;
                        const dropPhase = Math.PI * 2 * (150 * u + (start - 150) * (1 - Math.exp(-u * 48)) / 48);
                        const bubble = Math.sin(dropPhase) * Math.exp(-u * 41) * Math.min(1, u / .002) * .19;
                        sideL += bubble * (drop % 2 ? .42 : .9);
                        sideR += bubble * (drop % 2 ? .9 : .42);
                    }
                }
                if (combo > 1 || pulse > 0) {
                    const chime = 587.33 * pitch;
                    const envelope = .12 * Math.exp(-t * 13);
                    center += envelope * (Math.sin(Math.PI * 2 * chime * t) + .32 * Math.sin(Math.PI * 4 * chime * t));
                }
            }
        }
        else if (kind === "swap") {
            phase += Math.PI * 2 * (460 - 210 * t / duration) / sampleRate;
            center = Math.sin(phase) * Math.exp(-t * 48) * .23;
            sideL = wetL * Math.exp(-t * 70) * .14;
            sideR = wetR * Math.exp(-t * 70) * .14;
        }
        else {
            for (let note = 0; note < tones.length; note++) {
                const u = t - note * (kind === "win" ? .13 : .14);
                if (u < 0)
                    continue;
                const envelope = Math.min(1, u / .004) * Math.exp(-u * (kind === "win" ? 7.5 : 11));
                const f = tones[note];
                center += envelope * .19 * (Math.sin(Math.PI * 2 * f * u) + .24 * Math.sin(Math.PI * 4 * f * u));
            }
            sideL = wetL * .12 * Math.exp(-t * 25);
            sideR = wetR * .12 * Math.exp(-t * 25);
        }
        const tail = Math.min(1, (duration - t) / .024);
        left[i] = Math.tanh((center + sideL) * attack * tail * 1.3) * .78;
        right[i] = Math.tanh((center + sideR) * attack * tail * 1.3) * .78;
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
                compressor.threshold.value = -16;
                compressor.knee.value = 16;
                compressor.ratio.value = 5;
                compressor.attack.value = .003;
                compressor.release.value = .14;
                const limiter = context.createWaveShaper(), curve = new Float32Array(1024);
                for (let i = 0; i < curve.length; i++)
                    curve[i] = Math.tanh((i / (curve.length - 1) * 2 - 1) * 1.2) * .9;
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
