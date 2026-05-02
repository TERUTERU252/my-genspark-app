// ===================================
// 乗客シミュレーションシステム v2
// 急停止・急発進で乗客が転倒する
// ===================================

class PassengerSimulation {
    constructor() {
        this.passengers = [];
        this.canvas = null;
        this.ctx = null;
        this.logW = 0;
        this.logH = 0;
        this.prevSpeed = 0;
        this.prevAccel = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.comfortScore = 100;
        this.fallenCount = 0;
        this.harshBrakeCount = 0;
        this.harshAccelCount = 0;
        this.lastHarshEvent = 0;
        this.isMinimized = false;
        this.animFrame = 0;

        // C1: 多彩リアクション
        this.applauseActive = false;
        this.inTunnel = false;
        this.inCurve = false;
        this.vipActive = false;
        this.windShake = 0;  // D2 すれ違い風圧
    }

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.setupSize();
        this.generatePassengers();
    }

    setupSize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.logW = rect.width;
        this.logH = rect.height;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.logW * dpr;
        this.canvas.height = this.logH * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize() { this.setupSize(); }

    generatePassengers() {
        this.passengers = [];
        this.fallenCount = 0;
        this.harshBrakeCount = 0;
        this.harshAccelCount = 0;
        this.comfortScore = 100;
        this.prevSpeed = 0;
        this.prevAccel = 0;

        // 立ち客8人
        const standPositions = [
            { x: 0.15, y: 0.65 }, { x: 0.25, y: 0.62 }, { x: 0.38, y: 0.66 },
            { x: 0.50, y: 0.63 }, { x: 0.62, y: 0.65 }, { x: 0.72, y: 0.62 },
            { x: 0.82, y: 0.66 }, { x: 0.90, y: 0.63 },
        ];
        // 座り客6人
        const sitPositions = [
            { x: 0.10, y: 0.78 }, { x: 0.22, y: 0.78 },
            { x: 0.35, y: 0.78 },
            { x: 0.65, y: 0.78 }, { x: 0.78, y: 0.78 },
            { x: 0.90, y: 0.78 },
        ];

        const colors = ['#4a90d9', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#3498db', '#e84393', '#00cec9', '#6c5ce7', '#fd79a8', '#fab1a0', '#a29bfe'];
        const hairColors = ['#2c3e50', '#34495e', '#7f8c8d', '#d35400', '#c0392b', '#1a1a2e'];

        const activities = ['normal', 'phone', 'sleep', 'window', 'read', 'music'];
        standPositions.forEach((pos, i) => {
            this.passengers.push({
                baseX: pos.x, baseY: pos.y,
                offsetX: 0, offsetY: 0,
                velocityX: 0, velocityY: 0,
                angle: 0, angularVel: 0,
                seated: false,
                fallen: false,
                fallenTimer: 0,
                recovering: false,
                height: 0.12 + Math.random() * 0.03,
                color: colors[i % colors.length],
                hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
                holdingStrap: Math.random() > 0.4,
                stability: 0.6 + Math.random() * 0.4,
                expression: 'normal',
                activity: activities[Math.floor(Math.random() * activities.length)],
                reactionTimer: 0,
                reactionEmoji: '',
            });
        });

        sitPositions.forEach((pos, i) => {
            this.passengers.push({
                baseX: pos.x, baseY: pos.y,
                offsetX: 0, offsetY: 0,
                velocityX: 0, velocityY: 0,
                angle: 0, angularVel: 0,
                seated: true,
                fallen: false,
                fallenTimer: 0,
                recovering: false,
                height: 0.08,
                color: colors[(i + 8) % colors.length],
                hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
                holdingStrap: false,
                stability: 1.5,
                expression: 'normal',
                activity: activities[Math.floor(Math.random() * activities.length)],
                reactionTimer: 0,
                reactionEmoji: '',
            });
        });
    }

    // 物理更新 - returns event info for game scoring
    update(dt, speed, acceleration) {
        this.animFrame++;
        const accelChange = acceleration - this.prevAccel;
        const now = performance.now() / 1000;

        // 車体の揺れ
        const baseShake = Math.min(speed / 300, 1) * 0.003;
        this.shakeX = Math.sin(this.animFrame * 0.08) * baseShake + (Math.random() - 0.5) * baseShake * 0.5;
        this.shakeY = Math.sin(this.animFrame * 0.11) * baseShake * 0.5;

        // G力
        const gForce = -acceleration / 20;

        // 急制動・急発進判定（クールダウン1秒）
        let event = null;
        if (now - this.lastHarshEvent > 1.0) {
            if (acceleration < -12 && speed > 3) {
                event = 'harsh_brake';
                this.harshBrakeCount++;
                this.lastHarshEvent = now;
            } else if (acceleration > 8 && speed > 3) {
                event = 'harsh_accel';
                this.harshAccelCount++;
                this.lastHarshEvent = now;
            }
        }

        let newFalls = 0;

        for (const p of this.passengers) {
            if (p.fallen) {
                p.fallenTimer -= dt;
                if (p.fallenTimer <= 0) {
                    p.recovering = true;
                    p.fallen = false;
                    p.expression = 'worried';
                }
                continue;
            }

            if (p.recovering) {
                p.angle *= 0.9;
                p.offsetX *= 0.9;
                p.offsetY *= 0.9;
                if (Math.abs(p.angle) < 0.02) {
                    p.recovering = false;
                    p.angle = 0;
                    p.offsetX = 0;
                    p.offsetY = 0;
                    p.expression = 'normal';
                }
                continue;
            }

            // 力の適用
            const strapFactor = p.holdingStrap ? 0.4 : 1.0;
            const seatFactor = p.seated ? 0.25 : 1.0;
            const force = gForce * strapFactor * seatFactor;

            // バネダンパーモデル
            const springK = 15;
            const damping = 4;

            p.velocityX += (force * 50 - springK * p.offsetX - damping * p.velocityX) * dt;
            p.offsetX += p.velocityX * dt;

            p.angularVel += (force * 3 - springK * 0.3 * p.angle - damping * 0.5 * p.angularVel) * dt;
            p.angle += p.angularVel * dt;

            p.offsetX += this.shakeX;
            p.offsetY += this.shakeY;

            // C1: リアクションタイマー
            if (p.reactionTimer > 0) p.reactionTimer -= dt;

            // 表情更新（C1: 多彩リアクション）
            if (Math.abs(p.angle) > 0.15 || Math.abs(force) > 0.3) {
                p.expression = 'worried';
            } else if (this.applauseActive && !p.fallen && !p.recovering) {
                p.expression = 'happy';
                if (p.reactionTimer <= 0) { p.reactionEmoji = '👏'; p.reactionTimer = 0.3 + Math.random() * 0.5; }
            } else if (this.inTunnel && p.activity === 'window' && !p.fallen) {
                p.expression = 'normal';
                if (p.reactionTimer <= 0) { p.reactionEmoji = '🌑'; p.reactionTimer = 2; }
            } else if (speed > 80 && p.activity === 'window' && !p.fallen) {
                p.expression = 'happy';
                if (p.reactionTimer <= 0 && Math.random() < 0.01) { p.reactionEmoji = '😍'; p.reactionTimer = 2; }
            } else {
                p.expression = speed < 1 ? 'happy' : 'normal';
            }

            // すれ違い列車の風圧
            if (this.windShake > 0 && !p.seated) {
                p.velocityX += (Math.random() - 0.5) * this.windShake * 50 * dt;
            }

            // 転倒判定
            const fallThreshold = p.stability * 0.35;
            if (!p.seated && (Math.abs(p.offsetX) > fallThreshold || Math.abs(p.angle) > 0.8)) {
                p.fallen = true;
                p.fallenTimer = 3 + Math.random() * 2;
                p.expression = 'fallen';
                p.angle = p.offsetX > 0 ? 1.4 : -1.4;
                p.offsetY = 0.04;
                this.fallenCount++;
                newFalls++;
                this.comfortScore = Math.max(0, this.comfortScore - 15);
            }

            // 座り客の大揺れ
            if (p.seated && Math.abs(p.offsetX) > 0.15) {
                p.expression = 'worried';
                this.comfortScore = Math.max(0, this.comfortScore - 2 * dt);
            }

            // 制限
            p.offsetX = Math.max(-0.15, Math.min(0.15, p.offsetX));
            p.angle = Math.max(-1.5, Math.min(1.5, p.angle));
        }

        this.prevSpeed = speed;
        this.prevAccel = acceleration;

        // 乗り心地スコアの緩やかな回復
        if (Math.abs(acceleration) < 3) {
            this.comfortScore = Math.min(100, this.comfortScore + dt * 2);
        }

        // 風圧揺れ減衰
        if (this.windShake > 0) this.windShake = Math.max(0, this.windShake - dt * 2);

        return { event, newFalls };
    }

    // 描画
    render(speed) {
        if (this.isMinimized) return;
        const ctx = this.ctx;
        const w = this.logW;
        const h = this.logH;
        if (w <= 0 || h <= 0) return;
        ctx.clearRect(0, 0, w, h);

        // 車内背景
        this.drawInterior(ctx, w, h, speed);

        // 座り客（奥）
        for (const p of this.passengers) { if (p.seated) this.drawPassenger(ctx, w, h, p); }
        // 立ち客（手前）
        for (const p of this.passengers) { if (!p.seated) this.drawPassenger(ctx, w, h, p); }

        // 乗り心地バー
        this.drawComfortBar(ctx, w, h);
    }

    drawInterior(ctx, w, h, speed) {
        // 床
        ctx.fillStyle = '#e8e0d0';
        ctx.fillRect(0, h * 0.82, w, h * 0.18);

        // 壁
        const wallGrad = ctx.createLinearGradient(0, 0, 0, h * 0.82);
        wallGrad.addColorStop(0, '#c8d8e8');
        wallGrad.addColorStop(0.3, '#d8e4f0');
        wallGrad.addColorStop(1, '#e0e8f0');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, w, h * 0.82);

        // 窓
        const winY = h * 0.08;
        const winH = h * 0.28;
        const winCount = 5;
        const winSpacing = w / (winCount + 1);
        for (let i = 0; i < winCount; i++) {
            const wx = winSpacing * (i + 0.5);
            const ww = winSpacing * 0.65;
            ctx.fillStyle = '#a0b0c0';
            ctx.fillRect(wx - 2, winY - 2, ww + 4, winH + 4);
            // トンネル内は暗い、通常は景色
            if (this.inTunnel) {
                ctx.fillStyle = '#1a1a2a';
                ctx.fillRect(wx, winY, ww, winH);
                // トンネル壁面の照明反射
                ctx.fillStyle = 'rgba(255,200,100,0.05)';
                ctx.fillRect(wx, winY + winH * 0.5, ww, winH * 0.5);
            } else {
                const skyGrad = ctx.createLinearGradient(0, winY, 0, winY + winH);
                skyGrad.addColorStop(0, '#87CEEB');
                skyGrad.addColorStop(1, '#b0d4a8');
                ctx.fillStyle = skyGrad;
                ctx.fillRect(wx, winY, ww, winH);
                // 流れる景色ライン
                if (speed > 5) {
                    const lineCount = Math.min(8, Math.floor(speed / 15));
                    ctx.strokeStyle = `rgba(100,160,100,${Math.min(0.5, speed / 200)})`;
                    ctx.lineWidth = 1;
                    for (let j = 0; j < lineCount; j++) {
                        const ly = winY + winH * 0.4 + j * (winH * 0.06);
                        ctx.beginPath();
                        ctx.moveTo(wx, ly);
                        ctx.lineTo(wx + ww, ly + (Math.random() - 0.5) * 3);
                        ctx.stroke();
                    }
                }
            }
        }

        // 天井
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, w, h * 0.05);

        // つり革
        for (let i = 0; i < 12; i++) {
            const sx = w * (0.08 + i * 0.078);
            const sy = h * 0.05;
            const sLen = h * 0.12;
            // つり革が揺れる
            const swayAngle = this.shakeX * 80 + Math.sin(this.animFrame * 0.03 + i) * 0.02;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(swayAngle);
            ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, sLen); ctx.stroke();
            ctx.strokeStyle = '#666'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, sLen + 6, 6, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }

        // 座席
        const seatY = h * 0.72;
        const seatH = h * 0.12;
        ctx.fillStyle = '#3a7bd5';
        ctx.fillRect(w * 0.04, seatY, w * 0.28, seatH);
        ctx.fillStyle = '#2a6bc5';
        ctx.fillRect(w * 0.04, seatY, w * 0.28, seatH * 0.15);
        ctx.fillStyle = '#3a7bd5';
        ctx.fillRect(w * 0.58, seatY, w * 0.36, seatH);
        ctx.fillStyle = '#2a6bc5';
        ctx.fillRect(w * 0.58, seatY, w * 0.36, seatH * 0.15);

        // 手すりポール
        ctx.strokeStyle = '#c0c0c0'; ctx.lineWidth = 3;
        [0.33, 0.55].forEach(xr => {
            ctx.beginPath(); ctx.moveTo(w * xr, h * 0.05); ctx.lineTo(w * xr, h * 0.82); ctx.stroke();
        });
    }

    drawPassenger(ctx, w, h, p) {
        const px = (p.baseX + p.offsetX + this.shakeX) * w;
        const py = p.baseY * h + p.offsetY * h;
        const pH = p.height * h;
        const angle = p.angle;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle);

        if (p.fallen) {
            this.drawFallenPassenger(ctx, pH, p);
        } else if (p.seated) {
            this.drawSeatedPassenger(ctx, pH, p);
        } else {
            this.drawStandingPassenger(ctx, pH, p);
        }

        ctx.restore();
    }

    drawStandingPassenger(ctx, pH, p) {
        const bodyW = pH * 0.35;
        // 足
        ctx.fillStyle = '#444';
        ctx.fillRect(-bodyW * 0.3, -pH * 0.05, bodyW * 0.2, pH * 0.25);
        ctx.fillRect(bodyW * 0.1, -pH * 0.05, bodyW * 0.2, pH * 0.25);
        // 体
        ctx.fillStyle = p.color;
        const bodyTop = -pH * 0.65;
        ctx.beginPath();
        ctx.roundRect(-bodyW * 0.45, bodyTop, bodyW * 0.9, pH * 0.6, 4);
        ctx.fill();
        // 腕（つり革掴み）
        if (p.holdingStrap) {
            ctx.strokeStyle = p.color; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(bodyW * 0.3, bodyTop + pH * 0.1);
            ctx.lineTo(bodyW * 0.4, bodyTop - pH * 0.3); ctx.stroke();
        }
        // C1: アクティビティ小物
        if (p.activity === 'phone' && !p.fallen && !p.recovering) {
            ctx.fillStyle = '#333';
            ctx.fillRect(-bodyW * 0.15, bodyTop + pH * 0.2, bodyW * 0.2, bodyW * 0.35);
            ctx.fillStyle = '#88ccff';
            ctx.fillRect(-bodyW * 0.13, bodyTop + pH * 0.22, bodyW * 0.16, bodyW * 0.28);
        } else if (p.activity === 'music' && !p.fallen && !p.recovering) {
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bodyW * 0.2, bodyTop + pH * 0.05);
            ctx.quadraticCurveTo(bodyW * 0.5, bodyTop - pH * 0.1, bodyW * 0.3, bodyTop - pH * 0.2);
            ctx.stroke();
        }
        // 頭
        const headR = pH * 0.12;
        const headY = bodyTop - headR * 0.5;
        ctx.fillStyle = '#fdd9b5';
        ctx.beginPath(); ctx.arc(0, headY, headR, 0, Math.PI * 2); ctx.fill();
        // 髪
        ctx.fillStyle = p.hairColor;
        ctx.beginPath(); ctx.arc(0, headY - headR * 0.15, headR * 1.05, Math.PI, 0); ctx.fill();
        // 表情
        this.drawFace(ctx, 0, headY, headR, p.expression);
        // C1: リアクション絵文字
        if (p.reactionTimer > 0 && p.reactionEmoji) {
            ctx.font = `${headR * 1.2}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(p.reactionEmoji, headR * 1.5, headY - headR * 1.8);
        }
    }

    drawSeatedPassenger(ctx, pH, p) {
        const bodyW = pH * 0.4;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.roundRect(-bodyW * 0.45, -pH * 0.7, bodyW * 0.9, pH * 0.55, 3);
        ctx.fill();
        // C1: 座り客のアクティビティ
        if (p.activity === 'sleep') {
            // Zzz
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = `${pH * 0.08}px sans-serif`;
            ctx.textAlign = 'center';
            const zOff = Math.sin(this.animFrame * 0.05) * 2;
            ctx.fillText('Z', bodyW * 0.5, -pH * 0.85 + zOff);
            ctx.font = `${pH * 0.06}px sans-serif`;
            ctx.fillText('z', bodyW * 0.65, -pH * 0.9 + zOff);
        } else if (p.activity === 'read') {
            ctx.fillStyle = '#ddd';
            ctx.fillRect(-bodyW * 0.25, -pH * 0.45, bodyW * 0.35, bodyW * 0.25);
            ctx.fillStyle = '#666';
            for (let l = 0; l < 3; l++) {
                ctx.fillRect(-bodyW * 0.2, -pH * 0.42 + l * bodyW * 0.07, bodyW * 0.25, 1);
            }
        }
        const headR = pH * 0.13;
        const headY = -pH * 0.7 - headR * 0.5;
        // 寝てる人は頭が傾く
        if (p.activity === 'sleep' && p.expression === 'normal') {
            ctx.save();
            ctx.translate(0, headY);
            ctx.rotate(0.15);
            ctx.translate(0, -headY);
        }
        ctx.fillStyle = '#fdd9b5';
        ctx.beginPath(); ctx.arc(0, headY, headR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.hairColor;
        ctx.beginPath(); ctx.arc(0, headY - headR * 0.15, headR * 1.05, Math.PI, 0); ctx.fill();
        this.drawFace(ctx, 0, headY, headR, p.activity === 'sleep' ? 'sleep' : p.expression);
        if (p.activity === 'sleep' && p.expression === 'normal') {
            ctx.restore();
        }
        // C1: リアクション絵文字
        if (p.reactionTimer > 0 && p.reactionEmoji) {
            ctx.font = `${headR * 1.2}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(p.reactionEmoji, headR * 1.5, headY - headR * 1.8);
        }
    }

    drawFallenPassenger(ctx, pH, p) {
        const bodyW = pH * 0.6;
        ctx.fillStyle = p.color;
        ctx.fillRect(-bodyW * 0.1, -pH * 0.15, bodyW * 0.8, pH * 0.25);
        const headR = pH * 0.1;
        ctx.fillStyle = '#fdd9b5';
        ctx.beginPath(); ctx.arc(-bodyW * 0.15, -pH * 0.1, headR, 0, Math.PI * 2); ctx.fill();
        // ×目
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
        const ex = -bodyW * 0.15, ey = -pH * 0.1;
        ctx.beginPath(); ctx.moveTo(ex - 3, ey - 2); ctx.lineTo(ex + 1, ey + 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex + 1, ey - 2); ctx.lineTo(ex - 3, ey + 2); ctx.stroke();
        // グルグル
        ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.2) {
            const sr = 3 + a * 0.8;
            const sx = ex + Math.cos(a + this.animFrame * 0.08) * sr;
            const sy = ey - headR - 4 + Math.sin(a + this.animFrame * 0.08) * sr * 0.5;
            if (a === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
    }

    drawFace(ctx, x, y, r, expression) {
        const es = r * 0.25;
        ctx.lineWidth = 1;
        switch (expression) {
            case 'normal':
                ctx.fillStyle = '#333';
                ctx.beginPath(); ctx.arc(x - es, y - r * 0.1, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(x + es, y - r * 0.1, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.beginPath(); ctx.arc(x, y + r * 0.25, 2, 0, Math.PI); ctx.stroke();
                break;
            case 'worried':
                ctx.fillStyle = '#333';
                ctx.beginPath(); ctx.arc(x - es, y - r * 0.1, 2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(x + es, y - r * 0.1, 2, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.beginPath(); ctx.moveTo(x - 3, y + r * 0.2); ctx.quadraticCurveTo(x, y + r * 0.35, x + 3, y + r * 0.2); ctx.stroke();
                // 汗
                ctx.fillStyle = '#88ccff';
                ctx.beginPath(); ctx.ellipse(x + r * 0.7, y - r * 0.2, 1.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
                break;
            case 'happy':
                ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(x - es, y - r * 0.05, 2, Math.PI, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(x + es, y - r * 0.05, 2, Math.PI, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(x, y + r * 0.15, 3, 0, Math.PI); ctx.stroke();
                break;
            case 'fallen':
                ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
                [-1, 1].forEach(side => {
                    const ex2 = x + es * side;
                    ctx.beginPath(); ctx.moveTo(ex2 - 2, y - r * 0.2); ctx.lineTo(ex2 + 2, y); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(ex2 + 2, y - r * 0.2); ctx.lineTo(ex2 - 2, y); ctx.stroke();
                });
                break;
            case 'sleep':
                // 閉じた目
                ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(x - es - 2, y - r * 0.05); ctx.lineTo(x - es + 2, y - r * 0.05); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x + es - 2, y - r * 0.05); ctx.lineTo(x + es + 2, y - r * 0.05); ctx.stroke();
                // 口（小さなo）
                ctx.beginPath(); ctx.arc(x, y + r * 0.2, 1.5, 0, Math.PI * 2); ctx.stroke();
                break;
        }
    }

    drawComfortBar(ctx, w, h) {
        const barW = w * 0.35;
        const barH = 6;
        const barX = w * 0.02;
        const barY = h * 0.94;

        // ラベル
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX - 4, barY - 12, barW + 65, barH + 16);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px "Noto Sans JP",sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('乗り心地', barX, barY - 3);

        // バー背景
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(barX, barY, barW, barH);

        // バー
        const ratio = this.comfortScore / 100;
        const barColor = ratio > 0.6 ? '#4caf50' : ratio > 0.3 ? '#ff9800' : '#f44336';
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, barW * ratio, barH);

        // 転倒者数
        const currentFallen = this.passengers.filter(p => p.fallen).length;
        if (currentFallen > 0) {
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 8px "Noto Sans JP",sans-serif';
            ctx.fillText(`😵 ${currentFallen}人転倒`, barX + barW + 5, barY + barH - 1);
        } else {
            ctx.fillStyle = '#88ff88';
            ctx.font = 'bold 8px "Noto Sans JP",sans-serif';
            ctx.fillText(`😊 良好`, barX + barW + 5, barY + barH - 1);
        }
    }

    reset() {
        this.generatePassengers();
    }
}
