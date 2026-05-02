// ===================================
// 電車でGO!風 - ゲーム設定 v4
// 1分到着・10m許容・クレーム・車掌評価
// ===================================

const CONFIG = {
    ROUTES: {
        sakura: {
            name: 'さくら線（普通）',
            description: '各駅停車のローカル線。初心者向け。',
            difficulty: 'easy',
            maxSpeed: 100,
            color: '#ff6b9d',
            // 駅間距離: 約700-900m → 平均速度50km/h(14m/s)で約50-65秒
            stations: [
                { name: 'さくら中央', distance: 0, arrivalTime: 0, departTime: 15, speedLimit: 0, isStart: true },
                { name: 'はなみ', distance: 700, arrivalTime: 55, departTime: 70, speedLimit: 75 },
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
            description: '快速列車。中級者向け。',
            difficulty: 'normal',
            maxSpeed: 130,
            // 駅間距離: 約1000-1200m → 平均速度70km/h(19m/s)で約55-65秒
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
            description: '最高速度300km/h！上級者向け。',
            difficulty: 'hard',
            maxSpeed: 300,
            // 駅間距離: 約3500-4500m → 平均速度200km/h(56m/s)で約60-80秒
            stations: [
                { name: '東雲', distance: 0, arrivalTime: 0, departTime: 20, speedLimit: 0, isStart: true },
                { name: '天空橋', distance: 3500, arrivalTime: 65, departTime: 85, speedLimit: 70 },
                { name: '星ヶ丘', distance: 7500, arrivalTime: 140, departTime: 160, speedLimit: 70 },
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
    },

    WEATHER: {
        clear: { name: '晴れ', visibility: 1.0, brakeEffect: 1.0, rainIntensity: 0, fogDensity: 0 },
        cloudy: { name: '曇り', visibility: 0.85, brakeEffect: 1.0, rainIntensity: 0, fogDensity: 0.1 },
        rain: { name: '雨', visibility: 0.6, brakeEffect: 0.85, rainIntensity: 1.0, fogDensity: 0.15 },
        heavyRain: { name: '大雨', visibility: 0.4, brakeEffect: 0.7, rainIntensity: 2.0, fogDensity: 0.25 },
        fog: { name: '霧', visibility: 0.3, brakeEffect: 0.95, rainIntensity: 0, fogDensity: 0.6 },
        snow: { name: '雪', visibility: 0.5, brakeEffect: 0.6, rainIntensity: 0, fogDensity: 0.2, snowIntensity: 1.0 },
    },

    TIME_OF_DAY: {
        morning: { name: '朝', hour: 7, skyTop: '#FF9A56', skyMid: '#FFD4A8', skyBottom: '#FFF0D0', sunColor: '#FFD700', ambient: 0.85, groundTint: [1.0, 0.95, 0.85] },
        day: { name: '昼', hour: 12, skyTop: '#87CEEB', skyMid: '#B0E0FF', skyBottom: '#E8F4FF', sunColor: '#FFFFFF', ambient: 1.0, groundTint: [1.0, 1.0, 1.0] },
        evening: { name: '夕方', hour: 17, skyTop: '#FF6B35', skyMid: '#FF8C42', skyBottom: '#FFD166', sunColor: '#FF4500', ambient: 0.7, groundTint: [1.1, 0.8, 0.6] },
        night: { name: '夜', hour: 21, skyTop: '#0a0a2e', skyMid: '#1a1a4e', skyBottom: '#2a2a5e', sunColor: '#8888AA', ambient: 0.25, groundTint: [0.3, 0.3, 0.5] },
    },

    MASCON_ACCEL: [0, 2.5, 4.0, 5.5, 7.0, 9.0],
    BRAKE_DECEL: [0, 2.0, 3.5, 5.0, 6.5, 8.0, 10.0, 12.0, 14.0, 25.0],
    RESISTANCE_COEFF: 0.012,
    CURVE_SPEED_FACTOR: 0.3,
    GRADE_ACCEL_FACTOR: 0.035,

    GAME_START_HOUR: 10, GAME_START_MIN: 0, TIME_SCALE: 1,
    // ±10mまで停車OK
    STOP_TOLERANCE: 10.0,
    DOOR_OPEN_TIME: 3000,

    SCORE: {
        // 停車精度 (±10m許容、段階評価)
        PERFECT_STOP: 1000,   // ±1m
        GREAT_STOP: 700,      // ±3m
        GOOD_STOP: 400,       // ±5m
        OK_STOP: 200,         // ±8m
        FAIR_STOP: 50,        // ±10m
        // 時刻精度
        PERFECT_TIME: 500, GREAT_TIME: 300, GOOD_TIME: 100,
        // ペナルティ
        SPEED_PENALTY: -50, EMERGENCY_PENALTY: -200, OVERRUN_PENALTY: -500,
        PASSENGER_FALL_PENALTY: -100,
        CLAIM_PENALTY: -300,
    },
    RANKS: { S: 4000, A: 3000, B: 2000, C: 1000 },

    // クレーム閾値
    CLAIM: {
        FALL_THRESHOLD_WARNING: 3,   // 3人転倒で注意
        FALL_THRESHOLD_CLAIM: 5,     // 5人転倒でクレーム
        FALL_THRESHOLD_SERIOUS: 8,   // 8人転倒で重大クレーム
    },

    RENDER: { DRAW_DISTANCE: 1200, RAIL_WIDTH: 200 },

    GUIDES: {
        START: '↑キーでマスコンを入れて発車！',
        ACCELERATING: '加速中... 制限速度に注意！',
        APPROACHING: '⚠️ まもなく駅！ブレーキ準備！',
        BRAKE_NOW: '🛑 ブレーキ！あと{dist}m',
        STOPPED: '🎉 停車完了！Enterでドアを開けよう',
        DOOR_OPEN: '🚪 ドア開放中...',
        DEPART: '✅ 発車準備完了！マスコン入れよう',
        OVERSPEED: '⚠️ 速度超過！減速！',
        CURVE_SLOW: '⚠️ カーブ注意！減速！',
        OVERRUN: '❌ 駅通過！非常ブレーキ！',
        FINISH: '🏁 終点到着！お疲れさまでした！',
        HARSH_BRAKE: '😵 急ブレーキ！乗客が転びます！',
        HARSH_ACCEL: '😵 急発進！乗客がよろけています！',
        CLAIM_WARNING: '⚠️ 乗客から苦情が出ています...',
        CLAIM_FILED: '😡 乗客からクレームが入りました！',
        CLAIM_SERIOUS: '🚨 重大クレーム！運行継続が危険です！',
    },

    // 車掌セリフ集
    CONDUCTOR: {
        PERFECT_STOP: [
            '素晴らしい！まさにプロの技ですね！',
            '完璧な停車です！お客様も大満足でしょう！',
            'ぴったり停車！教科書に載せたいレベルです！',
        ],
        GREAT_STOP: [
            'なかなかの腕前ですね！',
            '良い停車です！安心してドアを開けられます。',
            'お見事！このまま頑張りましょう！',
        ],
        GOOD_STOP: [
            'まずまずの停車ですね。',
            '少しズレましたが、問題ない範囲です。',
            '悪くないですよ、次はもっと正確に！',
        ],
        OK_STOP: [
            'う〜ん、もう少し正確に停めたいですね。',
            '停車位置がだいぶズレています...。',
            '次は停車マークをよく見て！',
        ],
        FAIR_STOP: [
            'ギリギリセーフ...危なかったですね。',
            'なんとか停車できましたが、要改善です！',
            'お客様が心配しています。精進してください。',
        ],
        MISS_STOP: [
            'これはひどい...やり直しですね。',
            '完全に停車位置を外しています！',
            '駅を通り過ぎています！緊急停止！',
        ],
        CLAIM: [
            '乗客からクレームが入りました！運転が荒すぎます！',
            'お客様転倒の報告多数！もっと丁寧な運転を！',
            '車内で怪我人が出ています！今すぐ運転を見直して！',
        ],
        FINAL_S: '最高の運転でした！あなたこそ真のプロ運転士です！🌟',
        FINAL_A: '素晴らしい運転でした！一流運転士の実力ですね。',
        FINAL_B: '良い運転でした。あと少しで一流の域に！',
        FINAL_C: 'もう少し練習が必要ですね。ブレーキのタイミングを磨きましょう。',
        FINAL_D: '今日は散々でしたね...基本から見直しましょう。',
    },

    currentRoute: null, currentWeather: null, currentTimeOfDay: null,
};
