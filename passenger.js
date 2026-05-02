// ===================================
// 電車でGO!風 - メインUI v5
// 全ギミック統合版
// ===================================

const app = {
    game: null, animationId: null, lastTime: 0, currentScreen: 'title',
    selectedRoute: 'sakura', selectedWeather: 'clear', selectedTod: 'day',
    passengerSim: null,
    claimToastTimer: null,

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const el = document.getElementById(id + '-screen');
        if (el) el.classList.add('active');
        this.currentScreen = id;
    },

    init() {
        this.game = new Game();
        this.passengerSim = new PassengerSimulation();
        this.buildRouteSelect();
        this.bindEvents();
        this.bindTouch();
        this.showScreen('title');
    },

    buildRouteSelect() {
        const container = document.getElementById('route-cards');
        if (!container) return;
        let html = '';
        for (const [key, r] of Object.entries(CONFIG.ROUTES)) {
            const diffLabel = { easy: '🟢 初心者', normal: '🟡 中級者', hard: '🔴 上級者' }[r.difficulty] || '';
            html += `<div class="route-card ${key === this.selectedRoute ? 'selected' : ''}" data-route="${key}" style="border-color:${r.color}">
                <div class="route-name" style="color:${r.color}">${r.name}</div>
                <div class="route-diff">${diffLabel}</div>
                <div class="route-desc">${r.description}</div>
                <div class="route-info">最高速度: ${r.maxSpeed}km/h | ${r.stations.length}駅</div>
            </div>`;
        }
        container.innerHTML = html;
        container.querySelectorAll('.route-card').forEach(card => {
            card.addEventListener('click', () => {
                container.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedRoute = card.dataset.route;
            });
        });
    },

    bindEvents() {
        document.getElementById('btn-start').addEventListener('click', () => this.showScreen('select'));
        document.getElementById('btn-tutorial').addEventListener('click', () => this.showScreen('tutorial'));
        document.getElementById('btn-ranking').addEventListener('click', () => { this.showScreen('ranking'); this.loadRanking(); });
        document.getElementById('btn-tutorial-back').addEventListener('click', () => this.showScreen('title'));
        document.getElementById('btn-ranking-back').addEventListener('click', () => this.showScreen('title'));
        document.getElementById('btn-select-back').addEventListener('click', () => this.showScreen('title'));
        document.getElementById('btn-go').addEventListener('click', () => this.startGame());
        document.getElementById('btn-retry').addEventListener('click', () => this.startGame());
        document.getElementById('btn-result-title').addEventListener('click', () => this.showScreen('title'));
        document.getElementById('btn-register').addEventListener('click', () => this.registerScore());

        // 天候・時間帯
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

        // 乗客ビュー トグル
        const pvToggle = document.getElementById('pv-toggle');
        if (pvToggle) {
            pvToggle.addEventListener('click', () => {
                const pv = document.getElementById('passenger-view');
                if (pv) {
                    pv.classList.toggle('minimized');
                    pvToggle.textContent = pv.classList.contains('minimized') ? '+' : '−';
                    this.passengerSim.isMinimized = pv.classList.contains('minimized');
                }
            });
        }

        // 車掌OK
        document.getElementById('conductor-ok').addEventListener('click', () => this.dismissConductor());

        // キーボード
        document.addEventListener('keydown', (e) => {
            if (this.currentScreen === 'game') {
                e.preventDefault();
                const co = document.getElementById('conductor-overlay');
                if (co && co.classList.contains('active')) {
                    if (e.key === 'Enter' || e.key === ' ') this.dismissConductor();
                    return;
                }
                // 実績表示中は閉じる
                const achOv = document.getElementById('achievement-overlay');
                if (achOv && achOv.classList.contains('active')) {
                    achOv.classList.remove('active');
                    return;
                }
                this.game.handleKeyDown(e.key);
            }
        });
        window.addEventListener('resize', () => {
            if (this.game && this.game.renderer) this.game.renderer.resize();
            if (this.passengerSim) this.passengerSim.resize();
        });
    },

    bindTouch() {
        const addTouchBtn = (id, downFn) => {
            const el = document.getElementById(id);
            if (!el) return;
            const onDown = (e) => { e.preventDefault(); downFn(); };
            el.addEventListener('touchstart', onDown, { passive: false });
            el.addEventListener('mousedown', onDown);
        };
        addTouchBtn('touch-accel', () => {
            if (!this.game || this.game.state === 'door_open' || this.game.waitingForConductor) return;
            if (this.game.state === 'stopped' && !this.game.departReady) return;
            audioManager.resume();
            this.game.physics.setMascon(Math.min(5, this.game.physics.masconLevel + 1));
        });
        addTouchBtn('touch-brake', () => {
            if (!this.game || this.game.waitingForConductor) return; audioManager.resume();
            this.game.physics.setBrake(Math.min(9, this.game.physics.brakeLevel + 1));
            audioManager.playBrakeSound(this.game.physics.brakeLevel / 9);
        });
        addTouchBtn('touch-neutral', () => { if (this.game && !this.game.waitingForConductor) this.game.physics.setNeutral(); });
        addTouchBtn('touch-horn', () => {
            audioManager.resume(); audioManager.playHorn();
            if (this.game) this.game.events.onHornUsed();
        });
        addTouchBtn('touch-door', () => { if (this.game && this.game.state === 'stopped' && !this.game.waitingForConductor) this.game.openDoor(); });
        addTouchBtn('touch-emergency', () => {
            if (!this.game || this.game.waitingForConductor) return;
            this.game.physics.emergencyBrake();
            this.game.score += CONFIG.SCORE.EMERGENCY_PENALTY;
            audioManager.playBrakeSound(1);
        });
    },

    // === 車掌評価表示 ===
    showConductorEval(result, grade, onDismiss) {
        this._conductorDismiss = onDismiss;
        const co = document.getElementById('conductor-overlay');
        const avatar = document.getElementById('conductor-avatar');
        const msg = document.getElementById('conductor-msg');
        const detail = document.getElementById('conductor-detail');
        const gradeEl = document.getElementById('conductor-grade');

        const C = CONFIG.CONDUCTOR;
        let speeches, gradeColor, emoji;
        switch (grade) {
            case 'S': speeches = C.PERFECT_STOP; gradeColor = '#ffd700'; emoji = '🧑‍✈️'; break;
            case 'A': speeches = C.GREAT_STOP; gradeColor = '#ff6b9d'; emoji = '🧑‍✈️'; break;
            case 'B': speeches = C.GOOD_STOP; gradeColor = '#88ccff'; emoji = '🧑‍✈️'; break;
            case 'C': speeches = C.OK_STOP; gradeColor = '#ffaa44'; emoji = '😐'; break;
            case 'D': speeches = C.FAIR_STOP; gradeColor = '#ff8844'; emoji = '😟'; break;
            default: speeches = C.MISS_STOP; gradeColor = '#ff4444'; emoji = '😠'; break;
        }
        const speech = speeches[Math.floor(Math.random() * speeches.length)];

        avatar.textContent = emoji;
        msg.textContent = speech;

        // コンボ情報追加
        let comboText = '';
        if (result.comboMultiplier > 1) {
            comboText = `<br>🔥 <b style="color:#ff8800">${this.game.events.combo}コンボ！ スコア${result.comboMultiplier}倍</b>`;
        }
        detail.innerHTML = `🚉 ${result.station}駅<br>停車誤差: <b>${result.stopError > 0 ? '+' : ''}${result.stopError}m</b> | ${result.stopLabel}<br>時刻: ${result.timeLabel} (${result.timeDiff.toFixed(1)}秒差)<br>獲得: <b style="color:#ffdd44">+${result.total}pt</b>${comboText}`;
        gradeEl.textContent = grade === 'E' ? 'MISS' : grade;
        gradeEl.style.color = gradeColor;

        co.classList.add('active');
    },

    dismissConductor() {
        const co = document.getElementById('conductor-overlay');
        co.classList.remove('active');
        if (this._conductorDismiss) {
            this._conductorDismiss();
            this._conductorDismiss = null;
        }
    },

    // === クレーム演出 ===
    showClaimToast(level) {
        const toast = document.getElementById('claim-toast');
        const text = document.getElementById('claim-text');
        const sub = document.getElementById('claim-sub');
        if (level === 1) {
            text.textContent = '⚠️ 乗客から苦情が出ています';
            sub.textContent = '運転が荒いとの声が上がっています。丁寧に！';
        } else if (level === 2) {
            text.textContent = '😡 乗客からクレーム！ -300pt';
            sub.textContent = '転倒者が続出！今すぐ運転を見直してください！';
        } else {
            text.textContent = '🚨 重大クレーム発生！ -300pt';
            sub.textContent = '多数の怪我人が報告されています！厳重注意！';
        }
        toast.classList.add('show');
        if (this.claimToastTimer) clearTimeout(this.claimToastTimer);
        this.claimToastTimer = setTimeout(() => { toast.classList.remove('show'); }, level >= 2 ? 4000 : 2500);
    },

    startGame() {
        audioManager.init(); audioManager.resume();
        this.showScreen('game');
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const gc = document.getElementById('game-canvas');
            const sc = document.getElementById('speed-canvas');
            const pc = document.getElementById('passenger-canvas');
            this.game.init(gc, sc);
            this.game.setRoute(this.selectedRoute);
            this.game.setWeather(this.selectedWeather);
            this.game.setTimeOfDay(this.selectedTod);

            // コールバック設定
            this.game.onConductorEval = (result, grade, onDismiss) => this.showConductorEval(result, grade, onDismiss);
            this.game.onClaimEvent = (level) => this.showClaimToast(level);

            this.game.reset();

            if (pc) {
                this.passengerSim.init(pc);
                this.passengerSim.reset();
                const pv = document.getElementById('passenger-view');
                if (pv) pv.classList.remove('minimized');
                const pvt = document.getElementById('pv-toggle');
                if (pvt) pvt.textContent = '−';
                this.passengerSim.isMinimized = false;
            }

            // overlays off
            document.getElementById('conductor-overlay').classList.remove('active');
            document.getElementById('claim-toast').classList.remove('show');
            const achOv = document.getElementById('achievement-overlay');
            if (achOv) achOv.classList.remove('active');

            this.lastTime = performance.now();
            if (this.animationId) cancelAnimationFrame(this.animationId);
            this.gameLoop();
        }));
    },

    gameLoop() {
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;

        this.game.update(dt);
        const state = this.game.getState();
        this.game.renderer.render(state);

        // イベント描画（ゲームキャンバス上）
        const gCtx = this.game.renderer.ctx;
        const gW = this.game.renderer.logW;
        const gH = this.game.renderer.logH;
        const hY = this.game.renderer.lastHorizonY;
        const vX = this.game.renderer.lastVanishX;
        const dD = this.game.renderer.lastDrawDist;
        this.game.events.renderOnGameCanvas(gCtx, gW, gH, state.position, state.speed, state.route, hY, vX, dD);
        this.game.events.renderOverlay(gCtx, gW, gH);

        const sl = this.game.getCurrentSpeedLimit();
        this.game.renderer.drawSpeedometer(this.game.speedCanvas, this.game.physics.speed, sl, this.game.route.maxSpeed);
        this.updateHUD();
        audioManager.updateRunningSound(this.game.physics.speed);

        // 乗客シミュレーション
        if (this.passengerSim && this.passengerSim.canvas) {
            // イベント状態を乗客シムに反映
            const ev = this.game.events;
            this.passengerSim.applauseActive = ev.applauseTimer > 0;
            this.passengerSim.inTunnel = ev.tunnelAlpha > 0.3;
            this.passengerSim.inCurve = this.game.inCurve;
            this.passengerSim.vipActive = ev.vip && ev.vip.active;
            // すれ違い列車の風圧
            if (ev.oncomingTrain && ev.oncomingTrain.passed && ev.oncomingTrain.z > -100) {
                this.passengerSim.windShake = 1;
            }

            const pResult = this.passengerSim.update(dt, this.game.physics.speed, this.game.physics.acceleration);
            this.passengerSim.render(this.game.physics.speed);

            if (pResult.event === 'harsh_brake') {
                this.game.score += CONFIG.SCORE.PASSENGER_FALL_PENALTY;
                this.game.showGuide(CONFIG.GUIDES.HARSH_BRAKE);
                ev.addSNS('bad', '急ブレーキやめて！コーヒーこぼれたんだけど😡');
            } else if (pResult.event === 'harsh_accel') {
                this.game.score += CONFIG.SCORE.PASSENGER_FALL_PENALTY;
                this.game.showGuide(CONFIG.GUIDES.HARSH_ACCEL);
                ev.addSNS('bad', 'いきなり加速しないでよ💢 掴まれなかった...');
            }
            if (pResult.newFalls > 0) {
                this.game.score += CONFIG.SCORE.PASSENGER_FALL_PENALTY * pResult.newFalls;
            }

            // VIPボーナス（転倒なしで乗り心地が良ければ追加得点）
            if (this.passengerSim.vipActive && this.passengerSim.comfortScore > 70 && pResult.newFalls === 0) {
                // VIP区間では乗り心地減少抑制
            }

            // クレーム判定
            this.game.checkClaim(this.passengerSim.fallenCount);
        }

        if (this.game.state === 'finished') { setTimeout(() => this.showResult(), 1500); return; }
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    },

    updateHUD() {
        const p = this.game.physics;
        const route = this.game.route;
        const ns = route.stations[this.game.nextStationIndex];

        document.getElementById('hud-next-station').textContent = ns ? ns.name : '終点到着';
        const dist = ns ? Math.max(0, ns.distance - p.position) : 0;
        document.getElementById('hud-distance').textContent = dist > 1000 ? `${(dist/1000).toFixed(1)}km` : `${Math.round(dist)}m`;
        const se = document.getElementById('hud-speed');
        se.textContent = Math.round(p.speed);
        se.classList.toggle('speed-warning', this.game.isOverspeed);
        document.getElementById('hud-speed-limit').textContent = this.game.getCurrentSpeedLimit();
        document.getElementById('hud-mascon').textContent = p.getMasconLabel();
        document.getElementById('hud-brake').textContent = p.getBrakeLabel();
        document.getElementById('mascon-bar').style.height = `${(p.masconLevel/5)*100}%`;
        document.getElementById('brake-bar').style.height = `${(p.brakeLevel/9)*100}%`;
        document.getElementById('hud-time').textContent = this.game.getGameTimeString();
        document.getElementById('hud-arrival').textContent = this.game.getArrivalTimeString();

        const delay = this.game.getDelay();
        const dl = document.getElementById('hud-delay-label'), dv = document.getElementById('hud-delay');
        if (Math.abs(delay) < 3) { dl.textContent = '定刻'; dl.className = 'hud-label on-time'; dv.textContent = '±0秒'; dv.className = 'hud-value'; }
        else if (delay > 0) { dl.textContent = '遅延'; dl.className = 'hud-label delay-text'; dv.textContent = `+${Math.round(delay)}秒`; dv.className = 'hud-value delay-text'; }
        else { dl.textContent = '早着'; dl.className = 'hud-label early-text'; dv.textContent = `${Math.round(delay)}秒`; dv.className = 'hud-value early-text'; }

        document.getElementById('hud-score').textContent = Math.max(0, this.game.score);

        const gradeEl = document.getElementById('hud-grade');
        if (gradeEl) {
            const g = p.currentGrade;
            if (g > 0) gradeEl.textContent = `↗ ${g}‰`;
            else if (g < 0) gradeEl.textContent = `↘ ${Math.abs(g)}‰`;
            else gradeEl.textContent = '— 平坦';
        }
        const curveEl = document.getElementById('hud-curve');
        if (curveEl) {
            const c = p.currentCurve;
            if (c) curveEl.textContent = `${c.direction > 0 ? '→' : '←'} R${c.radius}`;
            else curveEl.textContent = '直線';
        }
    },

    showResult() {
        if (this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; }
        audioManager.stopRunningSound();
        document.getElementById('conductor-overlay').classList.remove('active');

        // 実績チェック
        const ev = this.game.events;
        const unlockedAch = ev.checkFinalAchievements(
            this.game.stationResults,
            this.passengerSim ? this.passengerSim.fallenCount : 0,
            ev.maxSpeedReached,
            this.game.route.maxSpeed
        );

        // 実績ボーナス
        const achBonus = unlockedAch.length * 200;
        this.game.score += achBonus;

        const rank = this.game.getRank();
        const re = document.getElementById('result-rank');
        re.textContent = rank; re.className = `result-rank rank-${rank}`;

        let html = '';

        // 車掌の最終評価
        const C = CONFIG.CONDUCTOR;
        const finalMsg = C['FINAL_' + rank] || C.FINAL_D;
        const conductorEmoji = rank === 'S' ? '🧑‍✈️✨' : rank === 'A' ? '🧑‍✈️👍' : rank === 'B' ? '🧑‍✈️' : rank === 'C' ? '😐' : '😟';
        html += `<div style="background:rgba(50,100,200,0.15);border:1px solid rgba(100,160,255,0.3);border-radius:12px;padding:14px;margin-bottom:12px;text-align:center">`;
        html += `<div style="font-size:2.5rem;margin-bottom:4px">${conductorEmoji}</div>`;
        html += `<div style="font-size:.7rem;color:rgba(255,255,255,0.4);margin-bottom:4px">車掌 山田の評価</div>`;
        html += `<div style="font-size:.95rem;font-weight:700;color:#fff;line-height:1.6">${finalMsg}</div>`;
        html += `</div>`;

        // 駅別結果
        this.game.stationResults.forEach(r => {
            const gc = { S: '#ffd700', A: '#ff6b9d', B: '#88ccff', C: '#ffaa44', D: '#ff8844', E: '#ff4444' }[r.stopGrade] || '#888';
            html += `<div class="result-row"><span class="result-label">🚉 ${r.station}</span><span class="result-value" style="color:${gc}">${r.stopLabel} ${r.timeLabel}</span></div>`;
            html += `<div class="result-row"><span class="result-label">　停車誤差</span><span class="result-value">${r.stopError > 0 ? '+' : ''}${r.stopError}m → ${r.stopScore}pt</span></div>`;
            html += `<div class="result-row"><span class="result-label">　時刻精度</span><span class="result-value">${r.timeDiff.toFixed(1)}秒差 → ${r.timeScore}pt</span></div>`;
            if (r.comboMultiplier > 1) {
                html += `<div class="result-row"><span class="result-label">　🔥 コンボ</span><span class="result-value" style="color:#ff8800">×${r.comboMultiplier}</span></div>`;
            }
        });

        // イベントボーナス
        if (this.game.eventBonusTotal !== 0) {
            const evColor = this.game.eventBonusTotal > 0 ? '#88ff88' : '#ff6666';
            html += `<div class="result-row" style="margin-top:6px;border-top:1px solid rgba(255,255,255,0.15);padding-top:6px"><span class="result-label">🎪 イベントボーナス</span><span class="result-value" style="color:${evColor}">${this.game.eventBonusTotal > 0 ? '+' : ''}${this.game.eventBonusTotal}pt</span></div>`;
        }

        // 乗客結果
        if (this.passengerSim) {
            const ps = this.passengerSim;
            html += `<div class="result-row" style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.2);padding-top:6px"><span class="result-label">🧑‍🤝‍🧑 乗り心地</span><span class="result-value" style="color:${ps.comfortScore > 60 ? '#88ff88' : ps.comfortScore > 30 ? '#ffaa44' : '#ff4444'}">${Math.round(ps.comfortScore)}/100</span></div>`;
            html += `<div class="result-row"><span class="result-label">　転倒回数</span><span class="result-value" style="color:${ps.fallenCount > 0 ? '#ff6666' : '#88ff88'}">${ps.fallenCount}回</span></div>`;
            if (this.game.totalClaims > 0) {
                html += `<div class="result-row"><span class="result-label">　😡 クレーム</span><span class="result-value" style="color:#ff4444">${this.game.totalClaims}件 (${this.game.totalClaims * 300}pt減)</span></div>`;
            }
            html += `<div class="result-row"><span class="result-label">　急ブレーキ</span><span class="result-value">${ps.harshBrakeCount}回</span></div>`;
            html += `<div class="result-row"><span class="result-label">　急発進</span><span class="result-value">${ps.harshAccelCount}回</span></div>`;
        }

        // 実績バッジ
        if (unlockedAch.length > 0) {
            html += `<div style="margin-top:10px;border-top:2px solid rgba(255,200,50,0.3);padding-top:8px">`;
            html += `<div style="font-size:.8rem;color:#ffd700;font-weight:700;margin-bottom:6px">🏆 獲得実績 (+${achBonus}pt)</div>`;
            for (const a of unlockedAch) {
                html += `<div class="result-row"><span class="result-label">${a.icon} ${a.name}</span><span class="result-value" style="color:#ffd700;font-family:'Noto Sans JP',sans-serif;font-size:.7rem">${a.desc}</span></div>`;
            }
            html += `</div>`;
        }

        html += `<div class="result-row" style="margin-top:10px;border-top:2px solid rgba(255,255,255,0.3);padding-top:8px"><span class="result-label" style="font-weight:700">合計スコア</span><span class="result-value" style="font-size:1.1rem;color:#ffdd44">${Math.max(0, this.game.score)}点</span></div>`;
        document.getElementById('result-details').innerHTML = html;
        const btn = document.getElementById('btn-register'); btn.disabled = false; btn.textContent = '📝 ランキング登録';
        this.showScreen('result');
    },

    async loadRanking() {
        const el = document.getElementById('ranking-list');
        el.innerHTML = '<p class="loading">読み込み中...</p>';
        try {
            const res = await fetch('tables/rankings?sort=-score&limit=20');
            const data = await res.json();
            if (!data.data || data.data.length === 0) { el.innerHTML = '<p class="loading">まだランキングデータがありません</p>'; return; }
            let h = '';
            data.data.forEach((item, i) => {
                const rc = i < 3 ? `rank-${i+1}` : '';
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`;
                h += `<div class="ranking-item"><span class="rank-number ${rc}">${medal}</span><span class="rank-name">${this.esc(item.player_name || '名無し')}</span><span class="rank-score">${item.score}点</span><span class="rank-grade">${item.rank}</span></div>`;
            });
            el.innerHTML = h;
        } catch (e) { el.innerHTML = '<p class="loading">読み込み失敗</p>'; }
    },

    async registerScore() {
        const name = (document.getElementById('player-name').value.trim()) || '名無し運転士';
        const btn = document.getElementById('btn-register');
        btn.disabled = true; btn.textContent = '登録中...';
        try {
            const body = {
                player_name: name,
                score: Math.max(0, this.game.score),
                rank: this.game.getRank(),
                station_results: JSON.stringify(this.game.stationResults),
                replay_data: JSON.stringify(this.game.replayData.slice(0, 500)),
                event_bonus: this.game.eventBonusTotal,
            };
            if (this.passengerSim) {
                body.comfort_score = Math.round(this.passengerSim.comfortScore);
                body.fallen_count = this.passengerSim.fallenCount;
                body.claim_count = this.game.totalClaims;
            }
            // 実績
            const unlockedNames = Object.values(this.game.events.achievements).filter(a => a.unlocked).map(a => a.name);
            body.achievements = JSON.stringify(unlockedNames);

            const res = await fetch('tables/rankings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (res.ok) { btn.textContent = '✅ 登録完了！'; audioManager.playScoreSound(); } else throw 0;
        } catch (e) { btn.textContent = '❌ 失敗'; setTimeout(() => { btn.disabled = false; btn.textContent = '📝 ランキング登録'; }, 2000); }
    },

    esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
};

document.addEventListener('DOMContentLoaded', () => app.init());
