(function () {
    'use strict';

    class EventSystemFallback {
        constructor() {
            this.combo = 0;
            this.applauseTimer = 0;
            this.tunnelAlpha = 0;
            this.vip = null;
            this.oncomingTrain = null;
            this.maxSpeedReached = 0;
            this.achievements = {};
        }
        generateEvents() {}
        onDepart() {}
        onHornUsed() {}
        checkTunnelPass() {}
        addSNS() {}
        renderOnGameCanvas() {}
        renderOverlay() {}
        update(dt, position, speed) {
            this.maxSpeedReached = Math.max(this.maxSpeedReached, speed || 0);
            if (this.applauseTimer > 0) this.applauseTimer -= dt;
            return { scoreBonus: 0, emergencyBrake: false };
        }
        onStopResult(grade) {
            if (grade === 'S') this.combo += 1;
            else this.combo = 0;
            return Math.min(3, 1 + Math.max(0, this.combo - 1) * 0.25);
        }
        checkFinalAchievements(stationResults, fallenCount, maxSpeedReached, routeMaxSpeed) {
            const achievements = [];
            if (stationResults.length && stationResults.every(r => r.stopGrade === 'S')) {
                achievements.push({ icon: '★', name: '全駅パーフェクト', desc: 'すべての駅でS停車' });
            }
            if (fallenCount === 0) achievements.push({ icon: '✓', name: '快適運転', desc: '乗客転倒なし' });
            if (maxSpeedReached >= routeMaxSpeed * 0.95) achievements.push({ icon: '速', name: '最高速到達', desc: '車両性能を引き出した' });
            return achievements;
        }
    }
    if (typeof EventSystem === 'undefined') window.EventSystem = EventSystemFallback;

    Object.assign(CONFIG.WEATHER, {
        clear: { ...CONFIG.WEATHER.clear, name: '晴れ' },
        cloudy: { ...CONFIG.WEATHER.cloudy, name: 'くもり' },
        rain: { ...CONFIG.WEATHER.rain, name: '雨' },
        heavyRain: { ...CONFIG.WEATHER.heavyRain, name: '大雨' },
        fog: { ...CONFIG.WEATHER.fog, name: '霧' },
        snow: { ...CONFIG.WEATHER.snow, name: '雪' },
    });
    Object.assign(CONFIG.TIME_OF_DAY, {
        morning: { ...CONFIG.TIME_OF_DAY.morning, name: '朝' },
        day: { ...CONFIG.TIME_OF_DAY.day, name: '昼' },
        evening: { ...CONFIG.TIME_OF_DAY.evening, name: '夕方' },
        night: { ...CONFIG.TIME_OF_DAY.night, name: '夜' },
    });

    CONFIG.ROUTES = {
        sakura: {
            name: 'さくらライン',
            description: '短い駅間で停車練習がしやすい入門路線。',
            difficulty: 'easy',
            maxSpeed: 100,
            color: '#ff6b9d',
            stations: [
                { name: 'さくら中央', distance: 0, arrivalTime: 0, departTime: 15, speedLimit: 0, isStart: true },
                { name: 'はなみ坂', distance: 700, arrivalTime: 55, departTime: 70, speedLimit: 75 },
                { name: 'みどり台', distance: 1500, arrivalTime: 115, departTime: 130, speedLimit: 70 },
                { name: 'あおぞら', distance: 2400, arrivalTime: 180, departTime: 195, speedLimit: 65 },
                { name: 'ひかり終点', distance: 3200, arrivalTime: 245, departTime: 0, speedLimit: 60, isEnd: true },
            ],
            sectionSpeedLimits: [80, 85, 80, 75],
            curves: [
                { pos: 300, radius: 600, direction: 1, length: 120 },
                { pos: 900, radius: 800, direction: -1, length: 150 },
                { pos: 1800, radius: 500, direction: 1, length: 130 },
                { pos: 2700, radius: 700, direction: -1, length: 120 },
            ],
            grades: [
                { pos: 150, grade: 10, length: 200 },
                { pos: 750, grade: -8, length: 250 },
                { pos: 1200, grade: 12, length: 180 },
                { pos: 2000, grade: -10, length: 200 },
                { pos: 2800, grade: 5, length: 200 },
            ],
            sceneryDensity: 1.0,
        },
        rapid: {
            name: 'あおば急行線',
            description: '速度を出しつつ、余裕を持った減速が求められる中級路線。',
            difficulty: 'normal',
            maxSpeed: 130,
            color: '#44aaff',
            stations: [
                { name: 'あおば中央', distance: 0, arrivalTime: 0, departTime: 15, speedLimit: 0, isStart: true },
                { name: 'かわせみ', distance: 1000, arrivalTime: 55, departTime: 70, speedLimit: 70 },
                { name: 'やまびこ台', distance: 2100, arrivalTime: 115, departTime: 130, speedLimit: 65 },
                { name: 'うみかぜ', distance: 3200, arrivalTime: 175, departTime: 190, speedLimit: 70 },
                { name: 'そらまち', distance: 4300, arrivalTime: 235, departTime: 250, speedLimit: 65 },
                { name: 'あおば終点', distance: 5300, arrivalTime: 295, departTime: 0, speedLimit: 60, isEnd: true },
            ],
            sectionSpeedLimits: [100, 110, 105, 110, 100],
            curves: [
                { pos: 400, radius: 800, direction: 1, length: 180 },
                { pos: 1300, radius: 600, direction: -1, length: 150 },
                { pos: 2400, radius: 900, direction: 1, length: 200 },
                { pos: 3500, radius: 500, direction: -1, length: 130 },
                { pos: 4500, radius: 700, direction: 1, length: 160 },
            ],
            grades: [
                { pos: 300, grade: 15, length: 300 },
                { pos: 1100, grade: -10, length: 250 },
                { pos: 1800, grade: 18, length: 300 },
                { pos: 2800, grade: -12, length: 250 },
                { pos: 3800, grade: 10, length: 300 },
                { pos: 4800, grade: -8, length: 200 },
            ],
            sceneryDensity: 0.8,
        },
        shinkansen: {
            name: 'のぞみ超特急',
            description: '最高速度300km/h。高速域からのブレーキ判断が試される上級路線。',
            difficulty: 'hard',
            maxSpeed: 300,
            color: '#ffd44d',
            stations: [
                { name: '東空港', distance: 0, arrivalTime: 0, departTime: 20, speedLimit: 0, isStart: true },
                { name: '天空橋', distance: 3500, arrivalTime: 65, departTime: 85, speedLimit: 70 },
                { name: '星見台', distance: 7500, arrivalTime: 140, departTime: 160, speedLimit: 70 },
                { name: '風の谷', distance: 12000, arrivalTime: 220, departTime: 240, speedLimit: 65 },
                { name: '光の都', distance: 16000, arrivalTime: 300, departTime: 0, speedLimit: 60, isEnd: true },
            ],
            sectionSpeedLimits: [270, 300, 285, 260],
            curves: [
                { pos: 1500, radius: 4000, direction: 1, length: 600 },
                { pos: 3000, radius: 3000, direction: -1, length: 500 },
                { pos: 5000, radius: 5000, direction: 1, length: 800 },
                { pos: 8000, radius: 3500, direction: -1, length: 600 },
                { pos: 10500, radius: 4500, direction: 1, length: 700 },
                { pos: 13000, radius: 3000, direction: -1, length: 500 },
                { pos: 15000, radius: 4000, direction: 1, length: 500 },
            ],
            grades: [
                { pos: 800, grade: 15, length: 900 },
                { pos: 2500, grade: -10, length: 600 },
                { pos: 4500, grade: 20, length: 1000 },
                { pos: 7000, grade: -15, length: 800 },
                { pos: 9500, grade: 12, length: 700 },
                { pos: 12500, grade: -18, length: 800 },
                { pos: 14500, grade: 8, length: 600 },
            ],
            sceneryDensity: 0.4,
        },
        bayLoop: {
            name: 'ベイサイド環状線',
            description: '新規追加路線。海沿いの長い直線と連続カーブを走るテクニカル路線。',
            difficulty: 'normal',
            maxSpeed: 160,
            color: '#3dd6c6',
            stations: [
                { name: '港中央', distance: 0, arrivalTime: 0, departTime: 15, speedLimit: 0, isStart: true },
                { name: 'みなと公園', distance: 1200, arrivalTime: 65, departTime: 80, speedLimit: 70 },
                { name: '潮見橋', distance: 2600, arrivalTime: 135, departTime: 150, speedLimit: 65 },
                { name: '海浜タワー', distance: 4300, arrivalTime: 215, departTime: 230, speedLimit: 70 },
                { name: 'ベイサイド終点', distance: 6000, arrivalTime: 305, departTime: 0, speedLimit: 60, isEnd: true },
            ],
            sectionSpeedLimits: [120, 135, 145, 130],
            curves: [
                { pos: 850, radius: 650, direction: -1, length: 220 },
                { pos: 1850, radius: 900, direction: 1, length: 260 },
                { pos: 3300, radius: 520, direction: -1, length: 180 },
                { pos: 5000, radius: 760, direction: 1, length: 240 },
            ],
            grades: [
                { pos: 500, grade: 8, length: 350 },
                { pos: 1500, grade: -6, length: 300 },
                { pos: 3000, grade: 12, length: 450 },
                { pos: 4700, grade: -10, length: 380 },
            ],
            sceneryDensity: 0.7,
        },
    };

    Object.assign(CONFIG.GUIDES, {
        START: '↑キーまたは加速ボタンで出発します',
        ACCELERATING: '加速中。制限速度に注意してください',
        APPROACHING: 'まもなく駅です。ブレーキ準備',
        BRAKE_NOW: 'ブレーキ。あと{dist}m',
        STOPPED: '停車完了。Enterまたはドアボタンでドアを開けます',
        DOOR_OPEN: 'ドア開放中...',
        DEPART: '発車準備完了。マスコンを入れてください',
        OVERSPEED: '速度超過。減速してください',
        CURVE_SLOW: 'カーブ注意。減速してください',
        OVERRUN: '駅を通過。非常ブレーキ',
        FINISH: '終点到着。お疲れさまでした',
        HARSH_BRAKE: '急ブレーキ。乗客がよろけています',
        HARSH_ACCEL: '急加速。乗客がよろけています',
        CLAIM_WARNING: '乗客から苦情が出始めています',
        CLAIM_FILED: '乗客からクレーム。丁寧な運転を',
        CLAIM_SERIOUS: '重大クレーム発生。安全運転に戻してください',
    });
    CONFIG.CONDUCTOR = {
        PERFECT_STOP: ['完璧な停車です。お見事です。', '停止位置ぴったり。安心してドアを開けられます。'],
        GREAT_STOP: ['かなり良い停車です。', '丁寧なブレーキでした。この調子です。'],
        GOOD_STOP: ['問題ない停車です。次はさらに正確に。'],
        OK_STOP: ['停車位置が少しずれました。早めの制動を意識しましょう。'],
        FAIR_STOP: ['ぎりぎり停車です。次は停止位置をよく見てください。'],
        MISS_STOP: ['停止位置を外しました。落ち着いて立て直しましょう。'],
        FINAL_S: '最高の運転でした。プロ級です。',
        FINAL_A: 'とても安定した運転でした。',
        FINAL_B: '良い運転です。もう少しで上位評価です。',
        FINAL_C: '練習すればまだ伸びます。ブレーキ開始を早めましょう。',
        FINAL_D: '基本操作から見直して、次に挑戦しましょう。',
    };

    if (typeof PhysicsEngine !== 'undefined') {
        PhysicsEngine.prototype.getBrakeLabel = function () {
            if (this.brakeLevel === 0) return '解除';
            if (this.brakeLevel === 9) return '非常';
            return `B${this.brakeLevel}`;
        };
    }

    if (typeof Game !== 'undefined') {
        Game.prototype.calcStopScore = function (distErr) {
            const ae = Math.abs(distErr);
            let ss = 0, sl = '', grade = '';
            if (ae <= 1) { ss = CONFIG.SCORE.PERFECT_STOP; sl = 'PERFECT'; grade = 'S'; }
            else if (ae <= 3) { ss = CONFIG.SCORE.GREAT_STOP; sl = 'GREAT'; grade = 'A'; }
            else if (ae <= 5) { ss = CONFIG.SCORE.GOOD_STOP; sl = 'GOOD'; grade = 'B'; }
            else if (ae <= 8) { ss = CONFIG.SCORE.OK_STOP; sl = 'OK'; grade = 'C'; }
            else if (ae <= 10) { ss = CONFIG.SCORE.FAIR_STOP; sl = 'FAIR'; grade = 'D'; }
            else { ss = 0; sl = 'MISS'; grade = 'E'; }

            const comboMul = this.events.onStopResult(grade);
            ss = Math.round(ss * comboMul);
            const st = this.route.stations[this.nextStationIndex];
            const td = Math.abs(this.gameTime - st.arrivalTime);
            let ts = 0, tl = '';
            if (td <= 3) { ts = CONFIG.SCORE.PERFECT_TIME; tl = '定刻'; }
            else if (td <= 5) { ts = CONFIG.SCORE.GREAT_TIME; tl = 'ほぼ定刻'; }
            else if (td <= 10) { ts = CONFIG.SCORE.GOOD_TIME; tl = 'やや遅延'; }
            else { ts = 0; tl = '遅延'; }

            const total = ss + ts;
            this.score += total;
            this.stationResults.push({
                station: st.name,
                stopError: +distErr.toFixed(1),
                stopScore: ss,
                stopLabel: sl,
                stopGrade: grade,
                timeDiff: +td.toFixed(1),
                timeScore: ts,
                timeLabel: tl,
                total,
                comboMultiplier: comboMul,
            });
            audioManager.playScoreSound();

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
        };
    }

    if (typeof app === 'undefined') return;

    app.init = function () {
        this.game = new Game();
        this.passengerSim = new PassengerSimulation();
        this.buildRouteSelect();
        this.bindEvents();
        this.bindTouch();
        this.showScreen('title');
    };

    app.buildRouteSelect = function () {
        const container = document.getElementById('route-cards');
        if (!container) return;
        const labels = { easy: '初級', normal: '中級', hard: '上級' };
        container.innerHTML = Object.entries(CONFIG.ROUTES).map(([key, r]) => `
            <div class="route-card ${key === this.selectedRoute ? 'selected' : ''}" data-route="${key}" style="border-color:${r.color}">
                <div class="route-name" style="color:${r.color}">${r.name}</div>
                <div class="route-diff">${labels[r.difficulty] || '標準'}</div>
                <div class="route-desc">${r.description}</div>
                <div class="route-info">最高速度: ${r.maxSpeed}km/h | ${r.stations.length}駅</div>
            </div>
        `).join('');
        container.querySelectorAll('.route-card').forEach(card => {
            card.addEventListener('click', () => {
                container.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedRoute = card.dataset.route;
            });
        });
    };

    app.bindEvents = function () {
        const on = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        };
        on('btn-start', () => this.showScreen('select'));
        on('btn-tutorial', () => this.showScreen('tutorial'));
        on('btn-tutorial-back', () => this.showScreen('title'));
        on('btn-select-back', () => this.showScreen('title'));
        on('btn-go', () => this.startGame());
        on('btn-retry', () => this.startGame());
        on('btn-result-title', () => this.showScreen('title'));
        on('conductor-ok', () => this.dismissConductor());
        on('pv-toggle', () => {
            const pv = document.getElementById('passenger-view');
            const btn = document.getElementById('pv-toggle');
            if (!pv || !btn) return;
            pv.classList.toggle('minimized');
            btn.textContent = pv.classList.contains('minimized') ? '+' : '-';
            this.passengerSim.isMinimized = pv.classList.contains('minimized');
        });

        document.querySelectorAll('.weather-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.selectedWeather = btn.dataset.weather;
            });
        });
        document.querySelectorAll('.tod-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tod-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.selectedTod = btn.dataset.tod;
            });
        });
        document.addEventListener('keydown', e => {
            if (this.currentScreen !== 'game') return;
            e.preventDefault();
            const co = document.getElementById('conductor-overlay');
            if (co && co.classList.contains('active')) {
                if (e.key === 'Enter' || e.key === ' ') this.dismissConductor();
                return;
            }
            this.game.handleKeyDown(e.key);
        });
        window.addEventListener('resize', () => {
            if (this.game && this.game.renderer) this.game.renderer.resize();
            if (this.passengerSim) this.passengerSim.resize();
        });
    };

    app.bindTouch = function () {
        const bind = (id, fn, repeat) => {
            const el = document.getElementById(id);
            if (!el) return;
            let timer = null;
            const run = e => {
                e.preventDefault();
                fn();
                if (repeat) timer = setInterval(fn, 180);
            };
            const stop = () => {
                if (timer) clearInterval(timer);
                timer = null;
            };
            el.addEventListener('pointerdown', run);
            el.addEventListener('pointerup', stop);
            el.addEventListener('pointercancel', stop);
            el.addEventListener('pointerleave', stop);
        };
        bind('touch-accel', () => {
            if (!this.game || this.game.state === 'door_open' || this.game.waitingForConductor) return;
            if (this.game.state === 'stopped' && !this.game.departReady) return;
            audioManager.resume();
            this.game.physics.setMascon(Math.min(5, this.game.physics.masconLevel + 1));
        }, true);
        bind('touch-brake', () => {
            if (!this.game || this.game.waitingForConductor) return;
            audioManager.resume();
            this.game.physics.setBrake(Math.min(9, this.game.physics.brakeLevel + 1));
            audioManager.playBrakeSound(this.game.physics.brakeLevel / 9);
        }, true);
        bind('touch-neutral', () => { if (this.game && !this.game.waitingForConductor) this.game.physics.setNeutral(); });
        bind('touch-horn', () => { audioManager.resume(); audioManager.playHorn(); if (this.game) this.game.events.onHornUsed(); });
        bind('touch-door', () => { if (this.game && this.game.state === 'stopped' && !this.game.waitingForConductor) this.game.openDoor(); });
        bind('touch-emergency', () => {
            if (!this.game || this.game.waitingForConductor) return;
            this.game.physics.emergencyBrake();
            this.game.score += CONFIG.SCORE.EMERGENCY_PENALTY;
            audioManager.playBrakeSound(1);
        });
    };

    app.showConductorEval = function (result, grade, onDismiss) {
        this._conductorDismiss = onDismiss;
        const messages = {
            S: CONFIG.CONDUCTOR.PERFECT_STOP,
            A: CONFIG.CONDUCTOR.GREAT_STOP,
            B: CONFIG.CONDUCTOR.GOOD_STOP,
            C: CONFIG.CONDUCTOR.OK_STOP,
            D: CONFIG.CONDUCTOR.FAIR_STOP,
            E: CONFIG.CONDUCTOR.MISS_STOP,
        };
        const colors = { S: '#ffd700', A: '#ff6b9d', B: '#88ccff', C: '#ffaa44', D: '#ff8844', E: '#ff4444' };
        const speechList = messages[grade] || messages.E;
        document.getElementById('conductor-avatar').textContent = '車掌';
        document.getElementById('conductor-msg').textContent = speechList[Math.floor(Math.random() * speechList.length)];
        document.getElementById('conductor-detail').innerHTML = `${result.station}駅<br>停車誤差: <b>${result.stopError > 0 ? '+' : ''}${result.stopError}m</b> | ${result.stopLabel}<br>時刻: ${result.timeLabel} (${result.timeDiff.toFixed(1)}秒差)<br>獲得: <b style="color:#ffdd44">+${result.total}pt</b>`;
        const gradeEl = document.getElementById('conductor-grade');
        gradeEl.textContent = grade === 'E' ? 'MISS' : grade;
        gradeEl.style.color = colors[grade] || '#fff';
        document.getElementById('conductor-overlay').classList.add('active');
    };

    app.showClaimToast = function (level) {
        const toast = document.getElementById('claim-toast');
        const text = document.getElementById('claim-text');
        const sub = document.getElementById('claim-sub');
        if (level === 1) {
            text.textContent = '乗客から苦情が出ています';
            sub.textContent = '急な加減速を控えてください。';
        } else if (level === 2) {
            text.textContent = '乗客からクレーム -300pt';
            sub.textContent = '転倒者が増えています。丁寧な運転を。';
        } else {
            text.textContent = '重大クレーム発生 -300pt';
            sub.textContent = '安全運転に戻してください。';
        }
        toast.classList.add('show');
        if (this.claimToastTimer) clearTimeout(this.claimToastTimer);
        this.claimToastTimer = setTimeout(() => toast.classList.remove('show'), level >= 2 ? 4000 : 2500);
    };

    app.updateHUD = function () {
        const p = this.game.physics;
        const route = this.game.route;
        const ns = route.stations[this.game.nextStationIndex];
        document.getElementById('hud-next-station').textContent = ns ? ns.name : '終点到着';
        const dist = ns ? Math.max(0, ns.distance - p.position) : 0;
        document.getElementById('hud-distance').textContent = dist > 1000 ? `${(dist / 1000).toFixed(1)}km` : `${Math.round(dist)}m`;
        const se = document.getElementById('hud-speed');
        se.textContent = Math.round(p.speed);
        se.classList.toggle('speed-warning', this.game.isOverspeed);
        document.getElementById('hud-speed-limit').textContent = this.game.getCurrentSpeedLimit();
        document.getElementById('hud-mascon').textContent = p.getMasconLabel();
        document.getElementById('hud-brake').textContent = p.getBrakeLabel();
        document.getElementById('mascon-bar').style.height = `${(p.masconLevel / 5) * 100}%`;
        document.getElementById('brake-bar').style.height = `${(p.brakeLevel / 9) * 100}%`;
        document.getElementById('hud-time').textContent = this.game.getGameTimeString();
        document.getElementById('hud-arrival').textContent = this.game.getArrivalTimeString();
        const delay = this.game.getDelay();
        const dl = document.getElementById('hud-delay-label');
        const dv = document.getElementById('hud-delay');
        if (Math.abs(delay) < 3) {
            dl.textContent = '定刻'; dl.className = 'hud-label on-time'; dv.textContent = '±0秒'; dv.className = 'hud-value';
        } else if (delay > 0) {
            dl.textContent = '遅延'; dl.className = 'hud-label delay-text'; dv.textContent = `+${Math.round(delay)}秒`; dv.className = 'hud-value delay-text';
        } else {
            dl.textContent = '早着'; dl.className = 'hud-label early-text'; dv.textContent = `${Math.round(delay)}秒`; dv.className = 'hud-value early-text';
        }
        document.getElementById('hud-score').textContent = Math.max(0, this.game.score);
        const gradeEl = document.getElementById('hud-grade');
        const g = p.currentGrade;
        gradeEl.textContent = g > 0 ? `上り ${g}‰` : g < 0 ? `下り ${Math.abs(g)}‰` : '平坦';
        const curveEl = document.getElementById('hud-curve');
        const c = p.currentCurve;
        curveEl.textContent = c ? `${c.direction > 0 ? '右' : '左'} R${c.radius}` : '直線';
    };

    app.showResult = function () {
        if (this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; }
        audioManager.stopRunningSound();
        document.getElementById('conductor-overlay').classList.remove('active');
        const ev = this.game.events;
        const unlockedAch = ev.checkFinalAchievements(
            this.game.stationResults,
            this.passengerSim ? this.passengerSim.fallenCount : 0,
            ev.maxSpeedReached,
            this.game.route.maxSpeed
        );
        const achBonus = unlockedAch.length * 200;
        this.game.score += achBonus;
        const rank = this.game.getRank();
        const re = document.getElementById('result-rank');
        re.textContent = rank;
        re.className = `result-rank rank-${rank}`;
        const finalMsg = CONFIG.CONDUCTOR[`FINAL_${rank}`] || CONFIG.CONDUCTOR.FINAL_D;
        let html = `<div class="result-row"><span class="result-label">車掌評価</span><span class="result-value">${finalMsg}</span></div>`;
        this.game.stationResults.forEach(r => {
            html += `<div class="result-row"><span class="result-label">${r.station}</span><span class="result-value">${r.stopLabel} / ${r.timeLabel}</span></div>`;
            html += `<div class="result-row"><span class="result-label">停車誤差</span><span class="result-value">${r.stopError > 0 ? '+' : ''}${r.stopError}m (${r.stopScore}pt)</span></div>`;
            html += `<div class="result-row"><span class="result-label">時刻差</span><span class="result-value">${r.timeDiff.toFixed(1)}秒 (${r.timeScore}pt)</span></div>`;
        });
        if (this.passengerSim) {
            const ps = this.passengerSim;
            html += `<div class="result-row"><span class="result-label">乗り心地</span><span class="result-value">${Math.round(ps.comfortScore)}/100</span></div>`;
            html += `<div class="result-row"><span class="result-label">転倒回数</span><span class="result-value">${ps.fallenCount}回</span></div>`;
            html += `<div class="result-row"><span class="result-label">急ブレーキ / 急加速</span><span class="result-value">${ps.harshBrakeCount}回 / ${ps.harshAccelCount}回</span></div>`;
        }
        if (unlockedAch.length > 0) {
            html += `<div class="result-row"><span class="result-label">実績ボーナス</span><span class="result-value">+${achBonus}pt</span></div>`;
        }
        html += `<div class="result-row"><span class="result-label">合計スコア</span><span class="result-value">${Math.max(0, this.game.score)}点</span></div>`;
        document.getElementById('result-details').innerHTML = html;
        this.showScreen('result');
    };

    app.registerScore = function () {};
})();
