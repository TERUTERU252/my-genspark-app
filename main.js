// ===================================
// 電車でGO!風 - ゲームロジック v4
// ±10m許容・クレーム・車掌評価・全ギミック統合
// ===================================

class Game {
    constructor() {
        this.state = 'idle';
        this.physics = new PhysicsEngine();
        this.renderer = null;
        this.speedCanvas = null;
        this.route = null;
        this.weather = null;
        this.timeOfDay = null;

        this.gameTime = 0;
        this.nextStationIndex = 1;
        this.currentStation = 0;
        this.score = 0;
        this.stationResults = [];
        this.isOverspeed = false;
        this.inCurve = false;
        this.overspeedTimer = 0;
        this.doorOpened = false;
        this.doorTimer = 0;
        this.departReady = false;
        this.warningCooldown = 0;
        this.guideTimer = 0;
        this.replayData = [];
        this.replayInterval = 0;
        this.lastBrakeGuideDistance = Infinity;
        this.guideEnabled = true;

        // クレームシステム
        this.claimLevel = 0;
        this.lastClaimFallCount = 0;
        this.totalClaims = 0;

        // 車掌評価コールバック
        this.onConductorEval = null;
        this.onClaimEvent = null;
        this.waitingForConductor = false;

        // イベントシステム
        this.events = new EventSystem();
        this.eventBonusTotal = 0;  // イベントボーナス合計
    }

    init(canvas, speedCanvas) {
        this.renderer = new Renderer(canvas);
        this.speedCanvas = speedCanvas;
    }

    setRoute(routeKey) { this.route = CONFIG.ROUTES[routeKey]; }
    setWeather(weatherKey) { this.weather = CONFIG.WEATHER[weatherKey]; }
    setTimeOfDay(todKey) { this.timeOfDay = CONFIG.TIME_OF_DAY[todKey]; }

    reset() {
        this.physics.reset();
        this.physics.setMaxSpeed(this.route.maxSpeed);
        this.state = 'stopped';
        this.gameTime = 0;
        this.nextStationIndex = 1;
        this.currentStation = 0;
        this.score = 0;
        this.stationResults = [];
        this.isOverspeed = false;
        this.inCurve = false;
        this.overspeedTimer = 0;
        this.doorOpened = false;
        this.doorTimer = 0;
        this.departReady = true;
        this.warningCooldown = 0;
        this.replayData = [];
        this.replayInterval = 0;
        this.lastBrakeGuideDistance = Infinity;
        this.claimLevel = 0;
        this.lastClaimFallCount = 0;
        this.totalClaims = 0;
        this.waitingForConductor = false;
        this.eventBonusTotal = 0;

        this.physics.position = this.route.stations[0].distance;
        this.renderer.generateScenery(this.route);

        // イベント生成
        this.events.generateEvents(this.route);

        this.showGuide(CONFIG.GUIDES.START);
    }

    getState() {
        return {
            position: this.physics.position,
            speed: this.physics.speed,
            gameTime: this.gameTime,
            nextStationIndex: this.nextStationIndex,
            isOverspeed: this.isOverspeed,
            inCurve: this.inCurve,
            route: this.route,
            weather: this.weather,
            timeOfDay: this.timeOfDay,
        };
    }

    getCurrentSpeedLimit() {
        if (!this.route) return 80;
        const stations = this.route.stations;
        if (this.nextStationIndex >= stations.length) {
            return this.route.sectionSpeedLimits[this.route.sectionSpeedLimits.length - 1];
        }
        const ns = stations[this.nextStationIndex];
        const dist = ns.distance - this.physics.position;
        if (dist < 100) return ns.speedLimit;
        const si = Math.min(this.nextStationIndex - 1, this.route.sectionSpeedLimits.length - 1);
        let limit = this.route.sectionSpeedLimits[si];
        if (this.physics.curveSpeedLimit < limit) limit = Math.floor(this.physics.curveSpeedLimit);
        return limit;
    }

    getGameTimeString() {
        const ts = Math.floor(this.gameTime);
        const hour = (this.timeOfDay ? this.timeOfDay.hour || CONFIG.GAME_START_HOUR : CONFIG.GAME_START_HOUR);
        const h = hour + Math.floor(ts / 3600);
        const m = CONFIG.GAME_START_MIN + Math.floor((ts % 3600) / 60);
        const s = ts % 60;
        return `${String(h).padStart(2,'0')}:${String(m%60).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }

    getArrivalTimeString() {
        if (!this.route || this.nextStationIndex >= this.route.stations.length) return '--:--:--';
        const arr = this.route.stations[this.nextStationIndex].arrivalTime;
        const hour = (this.timeOfDay ? this.timeOfDay.hour || CONFIG.GAME_START_HOUR : CONFIG.GAME_START_HOUR);
        const h = hour + Math.floor(arr / 3600);
        const m = CONFIG.GAME_START_MIN + Math.floor((arr % 3600) / 60);
        const s = arr % 60;
        return `${String(h).padStart(2,'0')}:${String(m%60).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }

    getDelay() {
        if (!this.route || this.nextStationIndex >= this.route.stations.length) return 0;
        const exp = this.route.stations[this.nextStationIndex].arrivalTime;
        const dist = this.route.stations[this.nextStationIndex].distance - this.physics.position;
        if (this.physics.speed > 0) return (this.gameTime + dist / (this.physics.speed / 3.6)) - exp;
        return this.gameTime - exp;
    }

    showGuide(msg) {
        if (!this.guideEnabled) return;
        this.guideTimer = 5;
        const el = document.getElementById('guide-message');
        if (el) { el.textContent = msg; el.classList.add('visible'); }
    }
    hideGuide() {
        const el = document.getElementById('guide-message');
        if (el) el.classList.remove('visible');
    }

    // クレーム判定
    checkClaim(fallenCount) {
        const C = CONFIG.CLAIM;
        if (fallenCount >= C.FALL_THRESHOLD_SERIOUS && this.claimLevel < 3) {
            this.claimLevel = 3;
            this.totalClaims++;
            this.score += CONFIG.SCORE.CLAIM_PENALTY;
            this.showGuide(CONFIG.GUIDES.CLAIM_SERIOUS);
            if (this.onClaimEvent) this.onClaimEvent(3);
        } else if (fallenCount >= C.FALL_THRESHOLD_CLAIM && this.claimLevel < 2) {
            this.claimLevel = 2;
            this.totalClaims++;
            this.score += CONFIG.SCORE.CLAIM_PENALTY;
            this.showGuide(CONFIG.GUIDES.CLAIM_FILED);
            if (this.onClaimEvent) this.onClaimEvent(2);
        } else if (fallenCount >= C.FALL_THRESHOLD_WARNING && this.claimLevel < 1) {
            this.claimLevel = 1;
            this.showGuide(CONFIG.GUIDES.CLAIM_WARNING);
            if (this.onClaimEvent) this.onClaimEvent(1);
        }
    }

    update(dt) {
        if (this.state === 'finished' || this.state === 'idle') return;
        if (this.waitingForConductor) return;

        this.gameTime += dt * CONFIG.TIME_SCALE;
        if (this.guideTimer > 0) { this.guideTimer -= dt; if (this.guideTimer <= 0) this.hideGuide(); }
        if (this.warningCooldown > 0) this.warningCooldown -= dt;

        // ドア開放中
        if (this.state === 'door_open') {
            this.doorTimer -= dt * 1000;
            if (this.doorTimer <= 0) {
                this.doorOpened = false;
                this.departReady = true;
                this.state = 'departing';
                this.showGuide(CONFIG.GUIDES.DEPART);
                // 次駅アナウンス
                const nsNext = this.route.stations[this.nextStationIndex];
                if (nsNext) this.events.onDepart(nsNext.name);
            }
            return;
        }

        if (this.state === 'stopped' && !this.departReady) return;
        if (this.state === 'stopped' && this.departReady && this.physics.speed === 0 && this.physics.masconLevel === 0) return;

        if ((this.state === 'stopped' || this.state === 'departing') && this.physics.masconLevel > 0) {
            this.state = 'running';
            this.showGuide(CONFIG.GUIDES.ACCELERATING);
        }

        this.physics.updateTrackConditions(this.route);
        this.inCurve = !!this.physics.currentCurve;
        const brakeEff = this.weather ? this.weather.brakeEffect : 1.0;
        this.physics.update(dt, brakeEff);

        const ns = this.route.stations[this.nextStationIndex];
        if (!ns) { this.state = 'finished'; return; }
        const distToSt = ns.distance - this.physics.position;

        // 速度超過
        const spdLimit = this.getCurrentSpeedLimit();
        this.isOverspeed = this.physics.speed > spdLimit + 3;
        if (this.isOverspeed) {
            this.overspeedTimer += dt;
            if (this.overspeedTimer >= 1) { this.score += CONFIG.SCORE.SPEED_PENALTY; this.overspeedTimer -= 1; }
            if (this.warningCooldown <= 0) { this.showGuide(CONFIG.GUIDES.OVERSPEED); audioManager.playWarningBeep(); this.warningCooldown = 2; }
        } else { this.overspeedTimer = 0; }

        // カーブ警告
        if (this.inCurve && this.physics.speed > this.physics.curveSpeedLimit + 5 && this.warningCooldown <= 0) {
            this.showGuide(CONFIG.GUIDES.CURVE_SLOW);
            this.warningCooldown = 3;
        }

        // 駅接近ガイド
        if (this.guideEnabled && this.state === 'running') {
            if (distToSt < 500 && distToSt > 200 && this.lastBrakeGuideDistance > 500) this.showGuide(CONFIG.GUIDES.APPROACHING);
            if (distToSt < 200 && distToSt > 0) {
                if (Math.abs(this.lastBrakeGuideDistance - distToSt) > 30) {
                    this.showGuide(CONFIG.GUIDES.BRAKE_NOW.replace('{dist}', Math.round(distToSt)));
                    this.lastBrakeGuideDistance = distToSt;
                }
            }
        }

        // === イベントシステム更新 ===
        const evResult = this.events.update(dt, this.physics.position, this.physics.speed, this.gameTime, this.route);
        if (evResult.scoreBonus !== 0) {
            this.score += evResult.scoreBonus;
            this.eventBonusTotal += evResult.scoreBonus;
        }
        if (evResult.emergencyBrake) {
            this.physics.emergencyBrake();
        }
        // トンネル通過チェック
        this.events.checkTunnelPass(this.physics.position, this.isOverspeed);

        // 停車判定（±10m）
        if (this.state === 'running' || this.state === 'stopping') {
            if (Math.abs(distToSt) <= CONFIG.STOP_TOLERANCE && this.physics.speed < 2) {
                this.physics.speed = 0; this.physics.setNeutral();
                this.state = 'stopped'; this.departReady = false; this.doorOpened = false;
                this.calcStopScore(distToSt);
                audioManager.playStationChime();
            }
            if (distToSt < -CONFIG.STOP_TOLERANCE && this.physics.speed > 2 && this.state !== 'stopping') {
                this.state = 'stopping'; this.score += CONFIG.SCORE.OVERRUN_PENALTY;
                this.showGuide(CONFIG.GUIDES.OVERRUN); this.physics.emergencyBrake();
            }
            if (distToSt < -CONFIG.STOP_TOLERANCE && this.physics.speed < 1) {
                this.physics.speed = 0; this.state = 'stopped';
                this.departReady = false; this.doorOpened = false;
                this.calcStopScore(distToSt);
                audioManager.playStationChime();
            }
        }

        // リプレイ
        this.replayInterval += dt;
        if (this.replayInterval >= 0.1) {
            this.replayData.push({ t: +this.gameTime.toFixed(1), pos: +this.physics.position.toFixed(0), spd: +this.physics.speed.toFixed(0), m: this.physics.masconLevel, b: this.physics.brakeLevel });
            this.replayInterval = 0;
        }
    }

    calcStopScore(distErr) {
        const ae = Math.abs(distErr);
        let ss = 0, sl = '', grade = '';
        if (ae <= 1) { ss = CONFIG.SCORE.PERFECT_STOP; sl = '✨ PERFECT!'; grade = 'S'; }
        else if (ae <= 3) { ss = CONFIG.SCORE.GREAT_STOP; sl = '🎯 GREAT!'; grade = 'A'; }
        else if (ae <= 5) { ss = CONFIG.SCORE.GOOD_STOP; sl = '👍 GOOD'; grade = 'B'; }
        else if (ae <= 8) { ss = CONFIG.SCORE.OK_STOP; sl = '🤔 OK'; grade = 'C'; }
        else if (ae <= 10) { ss = CONFIG.SCORE.FAIR_STOP; sl = '😅 FAIR'; grade = 'D'; }
        else { ss = 0; sl = '😥 MISS'; grade = 'E'; }

        // コンボマルチプライヤー適用
        const comboMul = this.events.onStopResult(grade);
        ss = Math.round(ss * comboMul);

        const st = this.route.stations[this.nextStationIndex];
        const td = Math.abs(this.gameTime - st.arrivalTime);
        let ts = 0, tl = '';
        if (td <= 3) { ts = CONFIG.SCORE.PERFECT_TIME; tl = '⏰ 定刻!'; }
        else if (td <= 5) { ts = CONFIG.SCORE.GREAT_TIME; tl = '⏰ ほぼ定刻'; }
        else if (td <= 10) { ts = CONFIG.SCORE.GOOD_TIME; tl = '⏰ やや遅延'; }
        else { ts = 0; tl = '⏰ 遅延'; }

        const total = ss + ts;
        this.score += total;
        this.stationResults.push({
            station: st.name,
            stopError: +(distErr).toFixed(1),
            stopScore: ss, stopLabel: sl, stopGrade: grade,
            timeDiff: +td.toFixed(1), timeScore: ts, timeLabel: tl,
            total, comboMultiplier: comboMul,
        });
        audioManager.playScoreSound();

        // 車掌評価をトリガー
        if (this.onConductorEval) {
            this.waitingForConductor = true;
            const result = this.stationResults[this.stationResults.length - 1];
            this.onConductorEval(result, grade, () => {
                this.waitingForConductor = false;
                this.showGuide(CONFIG.GUIDES.STOPPED);
            });
        } else {
            this.showGuide(CONFIG.GUIDES.STOPPED);
        }
    }

    openDoor() {
        if (this.state !== 'stopped' || this.doorOpened || this.physics.speed > 0) return;
        if (this.waitingForConductor) return;
        this.doorOpened = true; this.doorTimer = CONFIG.DOOR_OPEN_TIME;
        this.state = 'door_open';
        audioManager.playDoorSound();
        this.showGuide(CONFIG.GUIDES.DOOR_OPEN);

        if (this.nextStationIndex >= this.route.stations.length - 1) {
            setTimeout(() => { this.state = 'finished'; this.showGuide(CONFIG.GUIDES.FINISH); }, CONFIG.DOOR_OPEN_TIME);
            return;
        }
        this.currentStation = this.nextStationIndex;
        this.nextStationIndex++;
        this.lastBrakeGuideDistance = Infinity;
    }

    getRank() {
        if (this.score >= CONFIG.RANKS.S) return 'S';
        if (this.score >= CONFIG.RANKS.A) return 'A';
        if (this.score >= CONFIG.RANKS.B) return 'B';
        if (this.score >= CONFIG.RANKS.C) return 'C';
        return 'D';
    }

    handleKeyDown(key) {
        if (this.state === 'finished' || this.state === 'idle' || this.state === 'door_open') return;
        if (this.waitingForConductor) return;
        audioManager.resume();
        switch (key) {
            case 'ArrowUp': case 'w': case 'W':
                if (this.state === 'stopped' && !this.departReady) return;
                this.physics.setMascon(this.physics.masconLevel + 1); break;
            case 'ArrowDown': case 's': case 'S':
                this.physics.setBrake(this.physics.brakeLevel + 1);
                audioManager.playBrakeSound(this.physics.brakeLevel / 9); break;
            case 'ArrowRight': case 'd': case 'D':
                if (this.physics.masconLevel > 0) this.physics.setMascon(this.physics.masconLevel + 1);
                else if (this.physics.brakeLevel > 0) { this.physics.setBrake(this.physics.brakeLevel + 1); audioManager.playBrakeSound(this.physics.brakeLevel / 9); }
                else this.physics.setMascon(1);
                break;
            case 'ArrowLeft': case 'a': case 'A':
                if (this.physics.masconLevel > 0) this.physics.setMascon(this.physics.masconLevel - 1);
                else if (this.physics.brakeLevel > 0) this.physics.setBrake(this.physics.brakeLevel - 1);
                break;
            case 'n': case 'N': this.physics.setNeutral(); break;
            case 'e': case 'E':
                this.physics.emergencyBrake(); this.score += CONFIG.SCORE.EMERGENCY_PENALTY;
                audioManager.playBrakeSound(1); break;
            case ' ':
                audioManager.playHorn();
                this.events.onHornUsed();  // 猫に警笛
                break;
            case 'Enter': if (this.state === 'stopped') this.openDoor(); break;
        }
    }
}
