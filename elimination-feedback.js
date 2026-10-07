(function(){const exports={},require=()=>({FEEDBACK_CONFIG:window.FruitFeedback});"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EliminationFeedback = void 0;
const FeedbackConfig_1 = require("../config/FeedbackConfig");
/** One counter per cascade, shared by the Laya and canvas presentations. */
class EliminationFeedback {
    constructor() {
        this.total = 0;
        this.combo = 0;
        this.age = 0;
        this.life = 0;
        this.badgeAge = 0;
        this.badgeLife = 0;
        this.x = 360;
        this.y = 520;
        this.chainActive = false;
    }
    match(count, combo, x, y) {
        if (combo <= 1 || !this.chainActive) {
            this.total = 0;
            this.x = Math.max(95, Math.min(625, x));
            this.y = Math.max(180, Math.min(950, y - 86));
        }
        this.chainActive = true;
        this.total += count;
        this.combo = combo;
        this.age = 0;
        this.life = FeedbackConfig_1.FEEDBACK_CONFIG.countLife;
        this.badgeAge = 0;
        this.badgeLife = combo >= 2 ? FeedbackConfig_1.FEEDBACK_CONFIG.comboBadgeLife : 0;
    }
    pulse() {
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
    get countOffsetY() { return -Math.sin(Math.min(1, this.age / .32) * Math.PI) * 15; }
    get countAlpha() { return Math.min(1, this.life / .24); }
    get badgeScale() { return 1 + .18 * Math.sin(Math.min(1, this.badgeAge / .28) * Math.PI); }
    get badgeAlpha() { return Math.min(1, this.badgeLife / .18); }
    clear() {
        this.total = this.combo = this.life = this.badgeLife = this.age = this.badgeAge = 0;
        this.chainActive = false;
    }
}
exports.EliminationFeedback = EliminationFeedback;

window.EliminationFeedback=exports.EliminationFeedback;})();
