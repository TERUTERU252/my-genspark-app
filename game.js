// ===================================
// 電車でGO!風 - 疑似3Dレンダラー v2
// カーブ・天候・時間帯・リアル線路
// ===================================

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.logW = 0; this.logH = 0;
        this.objects = [];
        this.rainDrops = [];
        this.snowFlakes = [];
        this.lastHorizonY = 0;
        this.lastVanishX = 0;
        this.lastDrawDist = 0;
        this.setupSize();
    }

    setupSize() {
        const rect = this.canvas.getBoundingClientRect();
        this.logW = rect.width; this.logH = rect.height;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.logW * dpr;
        this.canvas.height = this.logH * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize() { this.setupSize(); }

    generateScenery(route) {
        this.objects = [];
        const totalDist = route.stations[route.stations.length - 1].distance + 500;
        const density = route.sceneryDensity || 1.0;
        const step = (30 + Math.random() * 30) / density;

        for (let d = 50; d < totalDist; d += step + Math.random() * 20) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const offX = 160 + Math.random() * 250;
            const t = Math.random();
            if (t < 0.35) {
                this.objects.push({ distance: d, offsetX: offX * side, type: 'tree', height: 25 + Math.random() * 50, color: `hsl(${95 + Math.random() * 45},${45 + Math.random() * 35}%,${22 + Math.random() * 22}%)` });
            } else if (t < 0.6) {
                this.objects.push({ distance: d, offsetX: offX * side, type: 'building', width: 18 + Math.random() * 35, height: 35 + Math.random() * 90, color: `hsl(${190 + Math.random() * 70},${8 + Math.random() * 22}%,${35 + Math.random() * 35}%)` });
            } else if (t < 0.75) {
                this.objects.push({ distance: d, offsetX: (115 + Math.random() * 25) * side, type: 'pole', height: 65 });
            }
        }
        // 架線柱
        for (let d = 0; d < totalDist; d += 45) {
            this.objects.push({ distance: d, offsetX: -108, type: 'catenary', height: 78 });
            this.objects.push({ distance: d, offsetX: 108, type: 'catenary', height: 78 });
        }
        this.objects.sort((a, b) => b.distance - a.distance);

        // 雨・雪パーティクル初期化
        this.rainDrops = [];
        for (let i = 0; i < 300; i++) this.rainDrops.push({ x: Math.random(), y: Math.random(), speed: 0.5 + Math.random() * 0.5, size: 1 + Math.random() * 2 });
        this.snowFlakes = [];
        for (let i = 0; i < 200; i++) this.snowFlakes.push({ x: Math.random(), y: Math.random(), speed: 0.1 + Math.random() * 0.2, drift: (Math.random() - 0.5) * 0.003, size: 1 + Math.random() * 3 });
    }

    // カーブオフセットを計算
    getCurveOffset(pos, route) {
        let offset = 0;
        if (!route.curves) return 0;
        for (const c of route.curves) {
            if (pos >= c.pos && pos <= c.pos + c.length) {
                const t = (pos - c.pos) / c.length;
                const curveAmount = Math.sin(t * Math.PI);
                offset = curveAmount * c.direction * (800 / c.radius) * 120;
            }
        }
        return offset;
    }

    // 勾配によるY補正
    getGradeOffset(pos, route) {
        let yOff = 0;
        if (!route.grades) return 0;
        for (const g of route.grades) {
            if (pos >= g.pos && pos <= g.pos + g.length) {
                const t = (pos - g.pos) / g.length;
                yOff = Math.sin(t * Math.PI) * g.grade * 0.3;
            }
        }
        return yOff;
    }

    render(gameState) {
        const ctx = this.ctx;
        const w = this.logW;
        const h = this.logH;
        if (w <= 0 || h <= 0) return;

        const playerPos = gameState.position;
        const route = gameState.route;
        const weather = gameState.weather || CONFIG.WEATHER.clear;
        const tod = gameState.timeOfDay || CONFIG.TIME_OF_DAY.day;
        const horizonY = h * 0.35;
        const vanishX = w * 0.5;
        const drawDist = CONFIG.RENDER.DRAW_DISTANCE * weather.visibility;

        // 描画パラメータ保存（イベント描画用）
        this.lastHorizonY = horizonY;
        this.lastVanishX = vanishX;
        this.lastDrawDist = drawDist;

        ctx.clearRect(0, 0, w, h);

        // === 空 ===
        const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
        skyGrad.addColorStop(0, tod.skyTop);
        skyGrad.addColorStop(0.5, tod.skyMid);
        skyGrad.addColorStop(1, tod.skyBottom);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, horizonY + 2);

        // 雲 (晴・曇)
        if (weather.fogDensity < 0.4) {
            const cloudAlpha = Math.max(0.1, 0.6 * tod.ambient);
            ctx.fillStyle = `rgba(255,255,255,${cloudAlpha})`;
            for (let i = 0; i < 6; i++) {
                const cx = ((i * 220 + (gameState.gameTime || 0) * 4) % (w + 300)) - 150;
                const cy = 20 + i * 22;
                ctx.beginPath(); ctx.ellipse(cx, cy, 55 + i * 12, 14 + i * 3, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(cx + 35, cy - 7, 38, 11, 0, 0, Math.PI * 2); ctx.fill();
            }
        }

        // 山のシルエット
        this.drawMountains(ctx, w, horizonY, tod);

        // === 地面 ===
        const gt = tod.groundTint;
        const baseG = [0x4a, 0x7a, 0x1a];
        const tintedG = `rgb(${Math.min(255, baseG[0] * gt[0])},${Math.min(255, baseG[1] * gt[1])},${Math.min(255, baseG[2] * gt[2])})`;
        const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
        groundGrad.addColorStop(0, `rgb(${Math.min(255, 0x6B * gt[0])},${Math.min(255, 0x8E * gt[1])},${Math.min(255, 0x23 * gt[2])})`);
        groundGrad.addColorStop(0.1, tintedG);
        groundGrad.addColorStop(1, `rgb(${Math.min(255, 0x3a * gt[0])},${Math.min(255, 0x5a * gt[1])},${Math.min(255, 0x10 * gt[2])})`);
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, horizonY, w, h - horizonY);

        // === 線路 ===
        this.drawRailsAdvanced(ctx, w, h, horizonY, vanishX, playerPos, route, drawDist);

        // === 沿線オブジェクト ===
        this.drawObjects(ctx, w, h, horizonY, vanishX, playerPos, route, drawDist, tod);

        // === 駅 ===
        this.drawStations(ctx, w, h, horizonY, vanishX, playerPos, gameState, route, drawDist);

        // === 信号 ===
        this.drawSignals(ctx, w, h, horizonY, vanishX, playerPos, gameState, route, drawDist);

        // === 霧 ===
        if (weather.fogDensity > 0) {
            const fogGrad = ctx.createLinearGradient(0, horizonY - 30, 0, horizonY + (h - horizonY) * 0.3);
            fogGrad.addColorStop(0, `rgba(180,190,200,${weather.fogDensity * 0.8})`);
            fogGrad.addColorStop(1, `rgba(180,190,200,0)`);
            ctx.fillStyle = fogGrad;
            ctx.fillRect(0, 0, w, h);
        }

        // === 雨 ===
        if (weather.rainIntensity > 0) this.drawRain(ctx, w, h, weather, gameState);

        // === 雪 ===
        if (weather.snowIntensity > 0) this.drawSnow(ctx, w, h, weather, gameState);

        // === 速度超過フラッシュ ===
        if (gameState.isOverspeed) {
            ctx.save();
            ctx.globalAlpha = 0.15 + Math.sin((gameState.gameTime || 0) * 6) * 0.1;
            ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }

        // === カーブ注意表示 ===
        if (gameState.inCurve) {
            ctx.save();
            ctx.globalAlpha = 0.06 + Math.sin((gameState.gameTime || 0) * 4) * 0.03;
            ctx.fillStyle = '#ffaa00'; ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }

        // === 夜の暗さオーバーレイ ===
        if (tod.ambient < 0.5) {
            ctx.save();
            ctx.globalAlpha = 0.5 - tod.ambient;
            ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
            ctx.restore();
            // ヘッドライト効果
            const hlGrad = ctx.createRadialGradient(vanishX, horizonY + 20, 5, vanishX, horizonY + 20, h * 0.5);
            hlGrad.addColorStop(0, 'rgba(255,255,200,0.15)');
            hlGrad.addColorStop(1, 'rgba(255,255,200,0)');
            ctx.fillStyle = hlGrad;
            ctx.fillRect(0, 0, w, h);
        }
    }

    drawMountains(ctx, w, horizonY, tod) {
        const alpha = Math.max(0.15, tod.ambient * 0.4);
        ctx.fillStyle = `rgba(60,80,100,${alpha})`;
        ctx.beginPath(); ctx.moveTo(0, horizonY);
        for (let x = 0; x <= w; x += 3) {
            const y = horizonY - 15 - Math.sin(x * 0.005) * 25 - Math.sin(x * 0.012 + 1) * 15 - Math.sin(x * 0.003) * 30;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(w, horizonY); ctx.closePath(); ctx.fill();

        ctx.fillStyle = `rgba(80,100,120,${alpha * 0.7})`;
        ctx.beginPath(); ctx.moveTo(0, horizonY);
        for (let x = 0; x <= w; x += 3) {
            const y = horizonY - 8 - Math.sin(x * 0.008 + 2) * 18 - Math.sin(x * 0.015) * 10;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(w, horizonY); ctx.closePath(); ctx.fill();
    }

    drawRailsAdvanced(ctx, w, h, horizonY, vanishX, playerPos, route, drawDist) {
        const segCount = 120;
        const railGauge = CONFIG.RENDER.RAIL_WIDTH;
        const points = [];

        // セグメントごとの画面座標を計算（カーブ・勾配込み）
        for (let i = 0; i <= segCount; i++) {
            const z = (i / segCount) * drawDist;
            if (z < 1) { points.push(null); continue; }
            const worldPos = playerPos + z;
            const curveOff = this.getCurveOffset(worldPos, route);
            const gradeOff = this.getGradeOffset(worldPos, route);
            const perspective = 300 / z;
            const screenY = horizonY + (h - horizonY) * (20 / z) - gradeOff * perspective;
            const screenX = vanishX + curveOff * perspective;
            if (screenY > h + 20 || screenY < horizonY - 30) { points.push(null); continue; }
            points.push({ x: screenX, y: screenY, p: perspective, z: z });
        }

        // 描画（奥から手前）
        for (let i = segCount; i >= 1; i--) {
            const pt = points[i];
            if (!pt) continue;
            const leftX = pt.x - railGauge * 0.5 * pt.p;
            const rightX = pt.x + railGauge * 0.5 * pt.p;

            // バラスト（砂利）リアルカラー
            const bw = (rightX - leftX) * 1.5;
            ctx.fillStyle = '#7a6a52';
            ctx.fillRect(pt.x - bw / 2, pt.y - 1, bw, Math.max(2, 3 * pt.p + 1));

            // 枕木
            const worldZ = playerPos + pt.z;
            if (Math.floor(worldZ / 1.5) % 2 === 0) {
                const tw = (rightX - leftX) * 1.25;
                ctx.fillStyle = '#4a3218';
                ctx.fillRect(pt.x - tw / 2, pt.y, tw, Math.max(2, 3 * pt.p));
            }

            // レール（太めで光沢）
            const rw = Math.max(1.5, 4 * pt.p);
            ctx.fillStyle = '#D0D0D0';
            ctx.fillRect(leftX - rw / 2, pt.y, rw, Math.max(1, 2.5 * pt.p + 1));
            ctx.fillRect(rightX - rw / 2, pt.y, rw, Math.max(1, 2.5 * pt.p + 1));
            // レール光沢
            if (pt.p > 0.5) {
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.fillRect(leftX - rw * 0.3, pt.y, rw * 0.3, Math.max(1, 2 * pt.p));
                ctx.fillRect(rightX - rw * 0.3, pt.y, rw * 0.3, Math.max(1, 2 * pt.p));
            }
        }
    }

    drawObjects(ctx, w, h, horizonY, vanishX, playerPos, route, drawDist, tod) {
        const ambient = tod.ambient;
        for (const obj of this.objects) {
            const relZ = obj.distance - playerPos;
            if (relZ < 5 || relZ > drawDist) continue;
            const curveOff = this.getCurveOffset(obj.distance, route);
            const perspective = 300 / relZ;
            const baseY = horizonY + (h - horizonY) * (20 / relZ);
            const screenX = vanishX + (obj.offsetX + curveOff) * perspective;
            if (baseY > h + 50 || baseY < horizonY - 10) continue;
            const sc = perspective * 3;

            switch (obj.type) {
                case 'tree': {
                    const tH = obj.height * 0.3 * sc;
                    const cH = obj.height * 0.7 * sc;
                    const cW = obj.height * 0.4 * sc;
                    ctx.fillStyle = this.tintColor('#5a3a1a', ambient);
                    ctx.fillRect(screenX - 2 * sc, baseY - tH, 4 * sc, tH);
                    ctx.fillStyle = this.tintColor(obj.color, ambient);
                    ctx.beginPath();
                    ctx.ellipse(screenX, baseY - tH - cH * 0.4, Math.max(1, cW), Math.max(1, cH * 0.5), 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                }
                case 'building': {
                    const bw = obj.width * sc;
                    const bh = obj.height * sc;
                    ctx.fillStyle = this.tintColor(obj.color, ambient);
                    ctx.fillRect(screenX - bw / 2, baseY - bh, bw, bh);
                    // 窓（夜は光る）
                    const winColor = ambient < 0.5 ? 'rgba(255,255,180,0.8)' : 'rgba(255,255,200,0.5)';
                    ctx.fillStyle = winColor;
                    const rows = Math.max(1, Math.floor(bh / (12 * sc)));
                    const cols = Math.max(1, Math.floor(bw / (10 * sc)));
                    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                        if (ambient < 0.5 && Math.random() > 0.7) continue; // 夜は一部消灯
                        const wx = screenX - bw / 2 + (c + 0.5) * (bw / cols);
                        const wy = baseY - bh + (r + 0.5) * (bh / rows);
                        ctx.fillRect(wx - 2 * sc, wy - 2 * sc, 4 * sc, 3 * sc);
                    }
                    break;
                }
                case 'pole': {
                    ctx.fillStyle = this.tintColor('#888', ambient);
                    ctx.fillRect(screenX - 1, baseY - 70 * sc, 2, 70 * sc);
                    break;
                }
                case 'catenary': {
                    ctx.fillStyle = this.tintColor('#777', ambient);
                    ctx.fillRect(screenX - 1.5, baseY - 78 * sc, 3, 78 * sc);
                    ctx.fillRect(screenX - 14 * sc, baseY - 78 * sc, 28 * sc, 2);
                    // 架線
                    if (relZ < 400) {
                        ctx.strokeStyle = 'rgba(150,150,150,0.4)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(screenX - 14 * sc, baseY - 78 * sc);
                        ctx.lineTo(screenX + 14 * sc, baseY - 78 * sc);
                        ctx.stroke();
                    }
                    break;
                }
            }
        }
    }

    drawStations(ctx, w, h, horizonY, vanishX, playerPos, gameState, route, drawDist) {
        const time = gameState.gameTime || 0;
        for (let i = 0; i < route.stations.length; i++) {
            const st = route.stations[i];
            const relZ = st.distance - playerPos;
            if (relZ < 2 || relZ > drawDist) continue;
            const curveOff = this.getCurveOffset(st.distance, route);
            const p = 300 / relZ;
            const baseY = horizonY + (h - horizonY) * (20 / relZ);
            const baseX = vanishX + curveOff * p;
            const isNext = (i === gameState.nextStationIndex);

            // === ホーム（大きく表示） ===
            const pW = 300 * p, pH = 22 * p;
            const pX = baseX + 140 * p;
            const platLeft = pX - pW * 0.2;
            const platTop = baseY - pH;

            // ホーム土台（側面）
            ctx.fillStyle = '#8a8070';
            ctx.fillRect(platLeft, baseY, pW, Math.max(2, 8 * p));

            // ホーム本体
            const platGrad = ctx.createLinearGradient(0, platTop, 0, baseY);
            platGrad.addColorStop(0, '#d0ccc0');
            platGrad.addColorStop(0.5, '#b8b4a8');
            platGrad.addColorStop(1, '#a0988e');
            ctx.fillStyle = platGrad;
            ctx.fillRect(platLeft, platTop, pW, pH);

            // 点字ブロック（黄色い線 - 太く明瞭に）
            ctx.fillStyle = '#FFD700';
            const yellowH = Math.max(2, 4 * p);
            ctx.fillRect(platLeft, platTop, pW, yellowH);

            // ホーム上のタイル模様
            if (p > 0.3) {
                ctx.fillStyle = 'rgba(0,0,0,0.06)';
                for (let t = 0; t < pW; t += 15 * p) {
                    ctx.fillRect(platLeft + t, platTop + yellowH, 1, pH - yellowH);
                }
            }

            // === 屋根 ===
            if (relZ < 600) {
                const roofW = pW * 0.85;
                const roofH = Math.max(4, 12 * p);
                const roofY = platTop - Math.max(30, 80 * p);
                const roofX = platLeft + pW * 0.08;

                // 柱（4本）
                ctx.fillStyle = '#888';
                const pillarW = Math.max(2, 4 * p);
                for (let pi = 0; pi < 4; pi++) {
                    const px2 = roofX + (roofW / 5) * (pi + 1);
                    ctx.fillRect(px2 - pillarW / 2, roofY + roofH, pillarW, platTop - roofY - roofH);
                }

                // 屋根本体
                ctx.fillStyle = '#556B7A';
                ctx.fillRect(roofX, roofY, roofW, roofH);
                ctx.fillStyle = '#44596A';
                ctx.fillRect(roofX, roofY + roofH, roofW, Math.max(1, 2 * p));

                // 照明（次駅は点灯）
                if (p > 0.2 && isNext) {
                    for (let li = 0; li < 3; li++) {
                        const lx = roofX + roofW * (0.2 + li * 0.3);
                        const ly = roofY + roofH;
                        ctx.fillStyle = 'rgba(255,255,200,0.6)';
                        ctx.beginPath(); ctx.arc(lx, ly + 2, Math.max(1, 3 * p), 0, Math.PI * 2); ctx.fill();
                        // 光のグロー
                        const glowGrad = ctx.createRadialGradient(lx, ly + 2, 0, lx, ly + 2, 30 * p);
                        glowGrad.addColorStop(0, 'rgba(255,255,200,0.15)');
                        glowGrad.addColorStop(1, 'rgba(255,255,200,0)');
                        ctx.fillStyle = glowGrad;
                        ctx.fillRect(lx - 30 * p, ly, 60 * p, 40 * p);
                    }
                }
            }

            // === 駅名標（大きく、遠くから見える） ===
            if (relZ < 500) {
                const sW = Math.max(60, 160 * p), sH = Math.max(18, 52 * p);
                const sX = pX + pW * 0.3, sY = platTop - Math.max(40, 85 * p);

                // 駅名標の支柱
                ctx.fillStyle = '#666';
                ctx.fillRect(sX + sW / 2 - Math.max(1, 2 * p), sY + sH, Math.max(2, 4 * p), platTop - sY - sH);

                // 駅名標背景（白地に色帯、大きめ）
                ctx.fillStyle = '#fff';
                ctx.fillRect(sX, sY, sW, sH);

                // 枠線
                ctx.strokeStyle = isNext ? '#FF4444' : '#2196F3';
                ctx.lineWidth = Math.max(1.5, 3 * p);
                ctx.strokeRect(sX, sY, sW, sH);

                // 上下の色帯
                const bandColor = isNext ? '#FF4444' : '#2196F3';
                ctx.fillStyle = bandColor;
                ctx.fillRect(sX, sY, sW, Math.max(2, 4 * p));
                ctx.fillRect(sX, sY + sH - Math.max(2, 4 * p), sW, Math.max(2, 4 * p));

                // 駅名テキスト
                const fs = Math.max(7, Math.min(18, 28 * p));
                ctx.fillStyle = isNext ? '#CC0000' : '#333';
                ctx.font = `bold ${fs}px 'Noto Sans JP',sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(st.name, sX + sW / 2, sY + sH / 2);

                // 次駅は駅名標を光らせる
                if (isNext && relZ < 300) {
                    ctx.save();
                    ctx.shadowColor = '#FF4444';
                    ctx.shadowBlur = 10 + Math.sin(time * 4) * 5;
                    ctx.strokeStyle = '#FF4444';
                    ctx.lineWidth = Math.max(1.5, 2 * p);
                    ctx.strokeRect(sX - 2, sY - 2, sW + 4, sH + 4);
                    ctx.restore();
                }
            }

            // === ホーム上の人（小さなドット） ===
            if (p > 0.3 && relZ < 400) {
                const personCount = Math.min(8, Math.floor(5 * p));
                for (let pi = 0; pi < personCount; pi++) {
                    const ppx = platLeft + pW * (0.15 + pi * 0.1 + Math.sin(pi * 3.7) * 0.05);
                    const ppy = platTop - Math.max(2, 6 * p);
                    const psz = Math.max(1.5, 3 * p);
                    ctx.fillStyle = `hsl(${pi * 50}, 40%, 50%)`;
                    ctx.beginPath(); ctx.arc(ppx, ppy - psz, psz, 0, Math.PI * 2); ctx.fill();
                    ctx.fillRect(ppx - psz * 0.5, ppy - psz * 0.3, psz, psz * 1.5);
                }
            }

            // === 停車マーク（大きく点滅） ===
            if (relZ > 0 && relZ < 250) {
                const mY = baseY + 5, mS = Math.max(7, 22 * p);
                const isFlashing = isNext && Math.sin(time * 6) > 0;

                // 停車マーク▼（地面上の大きな三角）
                ctx.fillStyle = isNext ? (isFlashing ? '#FF0000' : '#CC0000') : '#888';
                ctx.beginPath();
                ctx.moveTo(baseX - mS, mY);
                ctx.lineTo(baseX + mS, mY);
                ctx.lineTo(baseX, mY + mS * 1.8);
                ctx.closePath();
                ctx.fill();

                // 赤い輪郭
                if (isNext) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = Math.max(1, 2 * p);
                    ctx.beginPath();
                    ctx.moveTo(baseX - mS, mY);
                    ctx.lineTo(baseX + mS, mY);
                    ctx.lineTo(baseX, mY + mS * 1.8);
                    ctx.closePath();
                    ctx.stroke();
                }

                // STOPテキスト
                if (relZ < 120) {
                    const ts = Math.max(8, 18 * p);
                    ctx.fillStyle = isNext ? '#FF0000' : '#666';
                    ctx.font = `bold ${ts}px 'Orbitron',sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('STOP', baseX, mY + mS * 1.8 + ts + 3);
                }

                // 距離表示（次駅のみ、近い場合）
                if (isNext && relZ < 200 && relZ > 5) {
                    const dts = Math.max(7, 12 * p);
                    ctx.fillStyle = '#FFD700';
                    ctx.font = `bold ${dts}px 'Orbitron',sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(`${Math.round(relZ)}m`, baseX, mY - 8);
                }
            }

            // === 接近時のハイライト帯（駅100m手前から画面端に線） ===
            if (isNext && relZ > 0 && relZ < 100) {
                const alpha = Math.max(0, 0.2 * (1 - relZ / 100));
                ctx.fillStyle = `rgba(255, 200, 0, ${alpha})`;
                ctx.fillRect(0, baseY - 2, w, 4);
            }
        }
    }

    drawSignals(ctx, w, h, horizonY, vanishX, playerPos, gameState, route, drawDist) {
        for (let i = 0; i < route.stations.length; i++) {
            const sp = route.stations[i].distance - 250;
            const relZ = sp - playerPos;
            if (relZ < 2 || relZ > drawDist) continue;
            const curveOff = this.getCurveOffset(sp, route);
            const p = 300 / relZ;
            const baseY = horizonY + (h - horizonY) * (20 / relZ);
            const sigX = vanishX + curveOff * p - 135 * p;
            const sc = p * 3;

            ctx.fillStyle = '#444'; ctx.fillRect(sigX - 2, baseY - 62 * sc, 4, 62 * sc);
            const sW = 13 * sc, sH = 30 * sc;
            ctx.fillStyle = '#1a1a1a'; ctx.fillRect(sigX - sW / 2, baseY - 62 * sc, sW, sH);
            // 反射板風の枠
            ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.strokeRect(sigX - sW / 2, baseY - 62 * sc, sW, sH);
            const lr = Math.max(1, 4.5 * sc);
            const isGreen = i <= gameState.nextStationIndex;

            ctx.fillStyle = isGreen ? '#330000' : '#FF0000';
            if (!isGreen) { ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 8; }
            ctx.beginPath(); ctx.arc(sigX, baseY - 57 * sc, lr, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#333300';
            ctx.beginPath(); ctx.arc(sigX, baseY - 49 * sc, lr, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = isGreen ? '#00FF00' : '#003300';
            if (isGreen) { ctx.shadowColor = '#00FF00'; ctx.shadowBlur = 8; }
            ctx.beginPath(); ctx.arc(sigX, baseY - 41 * sc, lr, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    drawRain(ctx, w, h, weather, gs) {
        const intensity = weather.rainIntensity;
        ctx.strokeStyle = `rgba(180,200,255,${0.3 * intensity})`;
        ctx.lineWidth = 1;
        const speed = gs.speed || 0;
        const windOff = speed * 0.05;
        for (const d of this.rainDrops) {
            d.y += d.speed * 0.04 * intensity;
            d.x += windOff * 0.001;
            if (d.y > 1) { d.y = 0; d.x = Math.random(); }
            if (d.x > 1) d.x -= 1;
            const rx = d.x * w, ry = d.y * h;
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx - windOff * 2, ry + d.size * 8 * intensity);
            ctx.stroke();
        }
    }

    drawSnow(ctx, w, h, weather, gs) {
        const intensity = weather.snowIntensity || 0;
        ctx.fillStyle = `rgba(255,255,255,${0.6 * intensity})`;
        for (const f of this.snowFlakes) {
            f.y += f.speed * 0.02;
            f.x += f.drift + (gs.speed || 0) * 0.0002;
            if (f.y > 1) { f.y = 0; f.x = Math.random(); }
            if (f.x > 1) f.x -= 1; if (f.x < 0) f.x += 1;
            ctx.beginPath();
            ctx.arc(f.x * w, f.y * h, f.size * intensity, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 環境光によるカラー調整
    tintColor(color, ambient) {
        if (ambient >= 0.95) return color;
        const tc = document.createElement('canvas').getContext('2d');
        tc.fillStyle = color;
        tc.fillRect(0, 0, 1, 1);
        const d = tc.getImageData(0, 0, 1, 1).data;
        const r = Math.round(d[0] * ambient);
        const g = Math.round(d[1] * ambient);
        const b = Math.round(d[2] * ambient);
        return `rgb(${r},${g},${b})`;
    }

    // スピードメーター（300km/h対応）
    drawSpeedometer(canvas, speed, speedLimit, maxSpeed) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 8;
        maxSpeed = maxSpeed || 120;
        ctx.clearRect(0, 0, w, h);

        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,10,30,0.85)'; ctx.fill();
        ctx.strokeStyle = 'rgba(100,160,255,0.3)'; ctx.lineWidth = 2; ctx.stroke();

        const sa = Math.PI * 0.75, ea = Math.PI * 2.25, range = ea - sa;
        const step = maxSpeed <= 150 ? 10 : 20;

        for (let i = 0; i <= maxSpeed; i += step) {
            const a = sa + (i / maxSpeed) * range;
            const major = i % (step * 2) === 0 || i === maxSpeed;
            const ir = r - (major ? 15 : 9), or = r - 4;
            const over = i > speedLimit;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * ir, cy + Math.sin(a) * ir);
            ctx.lineTo(cx + Math.cos(a) * or, cy + Math.sin(a) * or);
            ctx.strokeStyle = over ? 'rgba(255,50,50,0.8)' : 'rgba(200,220,255,0.6)';
            ctx.lineWidth = major ? 2.5 : 1; ctx.stroke();

            if (major) {
                const tr = r - 22;
                ctx.fillStyle = over ? '#ff6666' : '#aaccff';
                ctx.font = `bold ${maxSpeed > 200 ? 8 : 10}px 'Orbitron',sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(i.toString(), cx + Math.cos(a) * tr, cy + Math.sin(a) * tr);
            }
        }

        // 制限アーク
        ctx.beginPath(); ctx.arc(cx, cy, r - 3, sa + (speedLimit / maxSpeed) * range, ea);
        ctx.strokeStyle = 'rgba(255,50,50,0.4)'; ctx.lineWidth = 3; ctx.stroke();

        // 速度アーク
        const spa = sa + (Math.min(speed, maxSpeed) / maxSpeed) * range;
        ctx.beginPath(); ctx.arc(cx, cy, r - 3, sa, spa);
        ctx.strokeStyle = speed > speedLimit ? '#ff4444' : '#44aaff'; ctx.lineWidth = 3; ctx.stroke();

        // 針
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(spa) * (r - 26), cy + Math.sin(spa) * (r - 26));
        ctx.strokeStyle = speed > speedLimit ? '#ff2222' : '#fff'; ctx.lineWidth = 2; ctx.stroke();

        ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
    }
}
