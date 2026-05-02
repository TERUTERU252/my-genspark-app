// ===================================
// 電車でGO!風 - 物理演算エンジン v2
// カーブ・勾配・300km/h対応
// ===================================

class PhysicsEngine {
    constructor() { this.reset(); }

    reset() {
        this.speed = 0;
        this.position = 0;
        this.masconLevel = 0;
        this.brakeLevel = 0;
        this.acceleration = 0;
        this.currentCurve = null;
        this.currentGrade = 0;
        this.curveSpeedLimit = 9999;
        this.maxSpeed = 120;
    }

    setMaxSpeed(ms) { this.maxSpeed = ms; }

    setMascon(level) {
        level = Math.max(0, Math.min(5, level));
        if (level > 0) this.brakeLevel = 0;
        this.masconLevel = level;
    }

    setBrake(level) {
        level = Math.max(0, Math.min(9, level));
        if (level > 0) this.masconLevel = 0;
        this.brakeLevel = level;
    }

    setNeutral() { this.masconLevel = 0; this.brakeLevel = 0; }

    emergencyBrake() { this.masconLevel = 0; this.brakeLevel = 9; }

    // カーブ・勾配の状態を更新
    updateTrackConditions(route) {
        // カーブ判定
        this.currentCurve = null;
        this.curveSpeedLimit = 9999;
        if (route.curves) {
            for (const c of route.curves) {
                if (this.position >= c.pos && this.position <= c.pos + c.length) {
                    this.currentCurve = c;
                    // カーブ制限速度 = sqrt(radius) * factor
                    this.curveSpeedLimit = Math.sqrt(c.radius) * CONFIG.CURVE_SPEED_FACTOR * 10;
                    break;
                }
            }
        }

        // 勾配判定
        this.currentGrade = 0;
        if (route.grades) {
            for (const g of route.grades) {
                if (this.position >= g.pos && this.position <= g.pos + g.length) {
                    this.currentGrade = g.grade;
                    break;
                }
            }
        }
    }

    // 物理更新
    update(dt, weatherBrakeEffect) {
        const brakeEff = weatherBrakeEffect || 1.0;
        let accel = 0;

        if (this.masconLevel > 0) {
            accel = CONFIG.MASCON_ACCEL[this.masconLevel];
            // 高速域ほど加速力低下（300km/h対応）
            const speedFactor = 1 - (this.speed / this.maxSpeed) * 0.7;
            accel *= Math.max(0.1, speedFactor);
            // 高速車両は基礎加速力も高い
            if (this.maxSpeed > 200) accel *= 1.5;
            else if (this.maxSpeed > 120) accel *= 1.2;
        }

        if (this.brakeLevel > 0) {
            accel = -CONFIG.BRAKE_DECEL[this.brakeLevel] * brakeEff;
            // 高速車両のブレーキも強化
            if (this.maxSpeed > 200) accel *= 1.4;
            else if (this.maxSpeed > 120) accel *= 1.2;
        }

        // 走行抵抗（速度の2乗に比例 - リアル）
        const resistance = -(this.speed * this.speed * CONFIG.RESISTANCE_COEFF / 100 + this.speed * 0.005);
        accel += resistance;

        // 勾配の影響（下り=加速、上り=減速）
        if (this.currentGrade !== 0) {
            accel -= this.currentGrade * CONFIG.GRADE_ACCEL_FACTOR;
        }

        this.acceleration = accel;
        this.speed += accel * dt;

        if (this.speed < 0) this.speed = 0;
        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;

        const speedMs = this.speed / 3.6;
        this.position += speedMs * dt;

        return { speed: this.speed, position: this.position, acceleration: this.acceleration };
    }

    getMasconLabel() { return this.masconLevel === 0 ? 'N' : `P${this.masconLevel}`; }
    getBrakeLabel() {
        if (this.brakeLevel === 0) return '解除';
        if (this.brakeLevel === 9) return '非常';
        return `B${this.brakeLevel}`;
    }
}
