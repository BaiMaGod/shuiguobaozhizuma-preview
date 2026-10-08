(function(){const exports={},require=()=>({FEEDBACK_CONFIG:window.FruitFeedback,SCENE_LAYOUT:window.FruitLayout});"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EliminationFeedback = void 0;
const FeedbackConfig_1 = require("../config/FeedbackConfig");
const SceneLayout_1 = require("../config/SceneLayout");
/** One counter per cascade, shared by the Laya and canvas presentations. */
class EliminationFeedback {
    constructor() {
        this.total = 0;
        this.combo = 0;
        this.age = 0;
        this.life = 0;
        this.badgeAge = 0;
        this.badgeLife = 0;
        this.glowAge = 0;
        this.x = SceneLayout_1.SCENE_LAYOUT.elimination.x;
        this.y = SceneLayout_1.SCENE_LAYOUT.elimination.y;
        this.chainActive = false;
    }
    match(count, combo, _x, _y) {
        if (combo <= 1 || !this.chainActive) {
            this.total = 0;
        }
        this.chainActive = true;
        this.total += count;
        this.combo = combo;
        this.age = 0;
        this.glowAge = 0;
        this.life = FeedbackConfig_1.FEEDBACK_CONFIG.countLife;
        this.badgeAge = 0;
        this.badgeLife = combo >= 2 ? FeedbackConfig_1.FEEDBACK_CONFIG.comboBadgeLife : 0;
    }
    pulse() {
        this.glowAge = 0;
        this.badgeAge = 0;
        if (this.combo >= 2 && this.chainActive)
            this.badgeLife = FeedbackConfig_1.FEEDBACK_CONFIG.comboBadgeLife;
        this.life = Math.max(this.life, .65);
    }
    finishChain() {
        this.chainActive = false;
        this.badgeLife = 0;
    }
    update(dt) {
        this.age += dt;
        this.glowAge += dt;
        this.badgeAge += dt;
        this.life = Math.max(0, this.life - dt);
        this.badgeLife = Math.max(0, this.badgeLife - dt);
    }
    get countVisible() { return this.total > 0 && this.life > 0; }
    get badgeVisible() { return this.chainActive && this.combo >= 2 && this.badgeLife > 0; }
    get countScale() {
        if (this.age < .12)
            return .72 + .62 * Math.sin(this.age / .12 * Math.PI / 2);
        if (this.age < .32)
            return 1 + .34 * Math.pow(1 - (this.age - .12) / .20, 2);
        return 1;
    }
    get countOffsetY() { return -Math.sin(Math.min(1, this.age / .32) * Math.PI) * 10; }
    get label() { return this.combo >= 2 ? "连消" : "消除"; }
    get glowPulse() { return .68 + .32 * Math.exp(-this.glowAge * 7); }
    get juiceDrops() {
        const t = Math.min(1, this.glowAge / .60);
        if (t >= 1)
            return [];
        const colors = ["#ffba32", "#fff06b", "#ff646d"];
        return Array.from({ length: 10 }, (_, i) => {
            const a = i * 2.39996;
            return { x: Math.cos(a) * (54 + t * 25), y: 18 + Math.sin(a) * (18 + t * 14) + t * t * 8,
                radius: 2.6 + i % 3, alpha: .85 * Math.pow(1 - t, .8), color: colors[i % 3] };
        });
    }
    get countAlpha() { return Math.min(1, this.life / .24); }
    get badgeScale() { return 1 + .18 * Math.sin(Math.min(1, this.badgeAge / .28) * Math.PI); }
    get badgeAlpha() { return Math.min(1, this.badgeLife / .18); }
    clear() {
        this.total = this.combo = this.life = this.badgeLife = this.age = this.badgeAge = 0;
        this.glowAge = 0;
        this.chainActive = false;
    }
}
exports.EliminationFeedback = EliminationFeedback;

window.EliminationFeedback=exports.EliminationFeedback;})();
