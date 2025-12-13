const board = document.getElementById('board');
const ROWS = 5; // 縦5行
const COLS = 6; // 横6列
const ORB_TYPES = ['fire', 'water', 'wood', 'light', 'dark', 'heal'];

// 盤面のデータ（配列）
let boardData = [];

// --- 初期化 ---
function initGame() {
    boardData = [];
    for (let i = 0; i < ROWS * COLS; i++) {
        const randomType = ORB_TYPES[Math.floor(Math.random() * ORB_TYPES.length)];
        boardData.push(randomType);
    }
    renderBoard();
    setTimeout(checkAndProcessChain, 500);
}

// --- 盤面を描画する ---
function renderBoard() {
    board.innerHTML = '';
    boardData.forEach((type, index) => {
        const orb = document.createElement('div');
        orb.classList.add('orb', `orb-${type}`);
        orb.dataset.index = index;
        board.appendChild(orb);
    });
}

// --- 操作用の変数 ---
let isDragging = false;
let draggedIndex = -1;
let floatingOrb = null;
let orbSize = 0;
let originalOrbElement = null;
let isProcessing = false;

// --- イベントリスナー設定 ---
board.addEventListener('mousedown', handleStart);
board.addEventListener('touchstart', handleStart, { passive: false });

window.addEventListener('mousemove', handleMove);
window.addEventListener('touchmove', handleMove, { passive: false });

window.addEventListener('mouseup', handleEnd);
window.addEventListener('touchend', handleEnd);


// 1. 操作開始
function handleStart(e) {
    if (isProcessing) return;
    const event = e.type === 'touchstart' ? e.touches[0] : e;
    const target = document.elementFromPoint(event.clientX, event.clientY);

    if (target && target.classList.contains('orb')) {
        e.preventDefault();
        isDragging = true;
        draggedIndex = parseInt(target.dataset.index);

        // ★修正1: 元の要素を記録しておく
        originalOrbElement = target;

        const rect = target.getBoundingClientRect();
        orbSize = rect.width;

        createFloatingOrb(boardData[draggedIndex], event.clientX, event.clientY);

        target.classList.add('orb-placeholder');
    }
}

// 2. 移動中
function handleMove(e) {
    if (!isDragging || !floatingOrb) return;
    e.preventDefault();

    const event = e.type === 'touchmove' ? e.touches[0] : e;

    floatingOrb.style.left = `${event.clientX}px`;
    floatingOrb.style.top = `${event.clientY}px`;

    const targetElement = document.elementFromPoint(event.clientX, event.clientY);

    // 自分自身（元の位置にある薄いドロップ）の上では入れ替え処理をしない
    if (targetElement && targetElement.classList.contains('orb') && targetElement !== originalOrbElement) {
        const targetIndex = parseInt(targetElement.dataset.index);

        if (targetIndex !== draggedIndex) {
            // ★修正2: 正しい関数名 'swapOrbsVisual' を呼ぶ
            swapOrbsVisual(draggedIndex, targetIndex);
            draggedIndex = targetIndex;
        }
    }
}

// 3. 操作終了
function handleEnd() {
    // ... (前半の isDragging 判定などはそのまま) ...
    if (!isDragging) return;
    isDragging = false;

    if (floatingOrb) {
        floatingOrb.remove();
        floatingOrb = null;
    }

    if (originalOrbElement) {
        originalOrbElement.classList.remove('orb-placeholder');
        originalOrbElement = null;
    }

    renderBoard();

    checkAndProcessChain();
}

// --- 浮いているドロップを作る関数 ---
function createFloatingOrb(type, x, y) {
    floatingOrb = document.createElement('div');
    floatingOrb.classList.add('orb', `orb-${type}`, 'floating-orb');
    floatingOrb.style.width = `${orbSize}px`;
    floatingOrb.style.height = `${orbSize}px`;
    floatingOrb.style.left = `${x}px`;
    floatingOrb.style.top = `${y}px`;
    document.body.appendChild(floatingOrb);
}

// --- 配列の中身と見た目を入れ替える関数 ---
function swapOrbsVisual(indexA, indexB) {
    // データの交換
    const typeA = boardData[indexA];
    const typeB = boardData[indexB];
    boardData[indexA] = typeB;
    boardData[indexB] = typeA;

    // DOM要素の取得
    const orbA = board.children[indexA];
    const orbB = board.children[indexB];

    // クラス（色）を入れ替える
    orbA.className = `orb orb-${typeB}`;
    orbB.className = `orb orb-${typeA}`;

    // dataset.index はそのままでOK（場所は変わらないので）
    // ただし、placeholderクラスの移動が必要
    
    // indexAにあった「薄いドロップ」がindexBに移動したことにする
    orbB.classList.add('orb-placeholder');
    orbA.classList.remove('orb-placeholder');
    
    // ★重要: originalOrbElementの参照先も更新しないと、
    // handleMoveの「自分自身の上では入れ替えない」判定がおかしくなる
    if (originalOrbElement === orbA) {
        originalOrbElement = orbB;
    }
}

// --- ★新規: マッチング判定関数 ---
function checkMatches() {
    const matchedIndices = new Set(); // 重複なくインデックスを保存する箱

    // 横方向のチェック
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 2; c++) { // 右端2つは始点にならないので -2
            const i = r * COLS + c;
            const type = boardData[i];
            // 右隣、そのまた右隣が同じ色か？
            if (type === boardData[i + 1] && type === boardData[i + 2]) {
                matchedIndices.add(i);
                matchedIndices.add(i + 1);
                matchedIndices.add(i + 2);
            }
        }
    }

    // 縦方向のチェック
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 2; r++) { // 下端2つは始点にならないので -2
            const i = r * COLS + c;
            const type = boardData[i];
            // 下、そのまた下が同じ色か？
            // 縦はインデックスが +COLS ずつ増える
            if (type === boardData[i + COLS] && type === boardData[i + COLS * 2]) {
                matchedIndices.add(i);
                matchedIndices.add(i + COLS);
                matchedIndices.add(i + COLS * 2);
            }
        }
    }

    return matchedIndices; // 揃った場所のリストを返す
}

// --- ★新規: マッチしたドロップを目立たせる関数 ---
function highlightMatches(matchedIndices) {
    matchedIndices.forEach(index => {
        const orb = board.children[index];
        if (orb) {
            orb.classList.add('orb-match');
        }
    });
}

// --- ★新規: ランダムなドロップの色を1つ返す関数 ---
function getRandomOrb() {
    return ORB_TYPES[Math.floor(Math.random() * ORB_TYPES.length)];
}

// --- ★新規: ドロップを消して、詰めて、補充する関数 ---
function removeAndDropOrbs(matchedIndices) {
    // 1. マッチした場所のデータを「空（null）」にする
    matchedIndices.forEach(index => {
        boardData[index] = null;
    });

    // 2. 列ごとに処理を行う（縦に詰めるため）
    for (let c = 0; c < COLS; c++) {
        // その列にある「生き残った（nullじゃない）ドロップ」だけを集めるリスト
        let currentColumnOrbs = [];
        
        for (let r = 0; r < ROWS; r++) {
            let index = r * COLS + c; // 縦のインデックス計算
            if (boardData[index] !== null) {
                currentColumnOrbs.push(boardData[index]);
            }
        }

        // 3. 足りなくなった数（消えた数）を計算
        let missingCount = ROWS - currentColumnOrbs.length;

        // 消した数 * 10 ポイント回復
        updateHP(matchedIndices.size * 10);
        
        // 4. 足りない分だけ、新しいドロップをリストの「先頭（上）」に追加
        for (let i = 0; i < missingCount; i++) {
            currentColumnOrbs.unshift(getRandomOrb());
        }

        // 5. 盤面データ（boardData）に書き戻す
        for (let r = 0; r < ROWS; r++) {
            let index = r * COLS + c;
            boardData[index] = currentColumnOrbs[r];
        }
    }

    // 6. 盤面を再描画して見た目を更新！
    renderBoard();
}

// --- ★新規: 連鎖処理を行う関数（再帰的に呼び出される） ---
function checkAndProcessChain() {
    // 1. 揃っているかチェック
    const matches = checkMatches();

    // 2. 揃っている場所がなければ終了（連鎖ストップ）
    if (matches.size === 0) {
        console.log("連鎖終了");
        
        isProcessing = false; // もし操作ロックするならここで解除
        return;
    }

    isProcessing = true;

    console.log("コンボ発生！数:", matches.size);

    // 3. 揃った場所を光らせる（半透明にする）
    highlightMatches(matches);

    // 4. 少し待ってから「消して・落として・補充」
    setTimeout(() => {
        removeAndDropOrbs(matches);

        // 5. さらに少し待ってから、もう一度自分を呼ぶ（再帰呼び出し）
        // これにより「落ちてきた後の盤面」でまた1.からチェックされる
        setTimeout(() => {
            checkAndProcessChain();
        }, 500); // 落下アニメーションの時間分待つ

    }, 500); // 光っている時間分待つ
}

// --- ふわふわアニメーションの処理 --- 
const characterElement = document.getElementById('character');
const shadowElement = document.getElementById('shadow');
let floatTime = 0;

function animateCharacter() {
    // 時間を進める
    floatTime += 0.05;

    // 上下のふわふわ（サイン波）
    // Math.sin(floatTime)は -1 ～ 1
    // * 15 で上下 15px の範囲で動く
    const offsetY = Math.sin(floatTime) * 15;
    characterElement.style.transform = `translateY(${offsetY}px)`;

    // 影のアニメーション（キャラが上がると小さく薄く、下がると大きく濃く）
    // 1 - (offsetY / 60) で大きさを計算
    const scale = 1 - (offsetY / 60);
    shadowElement.style.transform = `scale(${scale})`;
    shadowElement.style.opacity = 0.5 * scale;

    // 次のフレームを予約
    requestAnimationFrame(animateCharacter);
}

//アニメーション開始
animateCharacter();

// --- HP管理システム --- 
const maxHP = 1000;
let currentHP = 1000;
const hpBar = document.getElementById('hp-bar');
const hpText = document.getElementById('hp-text');

//HPを更新する関数（amount: 回復ならプラス、ダメージならマイナスの値）
function updateHP(amount) {
    currentHP += amount;

    //最大・最小値の制限
    if (currentHP > maxHP) currentHP = maxHP;
    if (currentHP < 0) currentHP = 0;

    //バーの長さを更新（%）
    const percentage = (currentHP / maxHP) * 100;
    hpBar.style.width = `${percentage}%`;

    //テキスト更新
    hpText.textContent = `HP: ${currentHP} / ${maxHP}`;

    //色を変える演出（ピンチになったら赤くする）
    if (percentage <= 20) {
        hpBar.style.backgroundColor = '#ff1744'; // 赤
    } else if (percentage <= 50) {
        hpBar.style.backgroundColor = '#ffea00'; // 黄色
    } else {
        hpBar.style.backgroundColor = '#00e676'; // 緑
    }
}

// テスト用: ゲーム開始時に少しHPを減らしておく
updateHP(-800);

// --- ドラゴンの攻撃制御 ---
const dragonElement = document.getElementById('dragon');
const dragonBtn = document.getElementById('dragon-attack-btn');

dragonBtn.addEventListener('click', () => {
    if (dragonElement.classList.contains('attacking')) return;

    // 攻撃モーション開始
    dragonElement.classList.add('attacking');

    // 四角いキャラにダメージを与える演出（HPを減らす）
    // ブレスが当たるタイミング（約0.8秒後）に合わせてHPを減らす
    setTimeout(() => {
        updateHP(-300); // 300のダメージ

        // 四角いキャラを揺らす（ダメージ演出）
        const charWrap = document.getElementById('char-wrapper');
        charWrap.style.transform = 'translateX(-10px)';
        setTimeout(() => charWrap.style.transform = 'translateX(10px)', 50);
        setTimeout(() => charWrap.style.transform = 'translateX(-10px)', 100);
        setTimeout(() => charWrap.style.transform = 'translateY(0)', 150);
    }, 800);

    // モーション終了時にクラスを外す
    setTimeout(() => {
        dragonElement.classList.remove('attacking');
    }, 1500);
});

// --- エキドナの炎:パーティクルシステム ---
// 今の状態を管理する変数（最初は 'nomal'）
let fireMode = 'normal';
// 炎の生成関数
function createFireEffect() {
    const fire = document.createElement('div');
    fire.classList.add('fire-effect');

    // パズル盤面の位置情報を取得する
    const board = document.getElementById('board');
    if (!board) return; 
    const rect = board.getBoundingClientRect();

    // --- モードによって出現位置を変える ---
    let startX, startY;

    if (fireMode === 'normal') {
        // 【通常モード】あちこちの定点から淡々と出る
        const spawnPoints = [
            { x: -20, y: -20 },   //左下
            { x: -40, y: -150 },  //左中
            { x: 10, y: -100 },   //左奥
            { x: 200, y: -10 }    //右下
            // * 右手（220, -120）は通常時は出さないでおく
        ];
        const randomPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        startX = rect.left + randomPoint.x + (Math.random() * 10 - 5); //ズレも少なめ
        startY = rect.bottom + randomPoint.y + (Math.random() * 10 - 5);

        // 動き:ゆったり
        fire.style.animation = `rise-fire 4s ease-in-out`;

    } else if (fireMode === 'charge') {
        // 【溜めモード】右腕の一点に集中する
        // 腕の座標（絵に合わせて調整）
        const armX = 220;
        const armY = -120;

        startX = rect.left + armX + (Math.random() * 10 - 5);
        startY = rect.bottom + armY + (Math.random() * 10 - 5);

        // 動き:吸い込まれるように早く消える
        // *cssのアニメーション時間を短く上書き
        fire.style.animation = `rise-fire 1.5s ease-out`;
        fire.style.transform = `scale(0.5)`; //少し小さく
    }

    // 座標セット
    fire.style.left = `${startX}px`;
    fire.style.top = `${startY}px`;

    // 画像タイプ決定
    const fireType = Math.floor(Math.random() * 3) + 1;
    let typeClass = `fire-type-${fireType}`;
    fire.classList.add(typeClass);

    // 移動先の計算
    // 溜めモードの時はあまり遠くへ飛ばない（その場で燃える感じ）
    let distance = (fireMode === 'charge') ? 50 : (150 + Math.random() * 200);

    // 角度
    let angle = Math.random() * 90; // 0 ~ 90度
    if (fireMode === 'charge') angle = Math.random() * 360; // 溜め時は全方向にゆらめく

    const radian = angle * (Math.PI / 180);
    const moveX = Math.sin(radian) * distance;
    const moveY = -Math.cos(radian) * distance;

    fire.style.setProperty('--move-x', `${moveX}px`);
    fire.style.setProperty('--move-y', `${moveY}px`);

    // アニメーション時間（モードで変える）
    let duration = (fireMode === 'charge') ? 1.5 : (3.0 + Math.random() * 2.0);
    fire.style.animation = `rise-fire ${duration}s ease-in-out`;

    document.body.appendChild(fire);
    setTimeout(() => fire.remove(), duration * 1000);
}

// 炎生成ループ（0.4秒ごとに１つ）
setInterval(createFireEffect, 400);

// --- 監督役:シナリオ進行システム ---
function startEkidonaRoutine() {
    // 最初は、通常モード
    console.log('モード:通常（淡々と）');
    fireMode = 'normal';

    // 2.5秒後に、溜めモードへ移行
    setTimeout(() => {
        console.log('モード:溜め（腕に集約）');
        fireMode = 'charge';

        // 溜め中は、炎の生成頻度を上げて「激しく」する演出
        // (setIntervalとは別に、追加で炎を出す)
        const chargeInterval = setInterval(createFireEffect, 100);

        // さらに3秒後（合計8秒後）に「開放（バースト）」
        setTimeout(() => {
            console.log('モード:開放');
            clearInterval(chargeInterval); // 激しい生成を止める
            triggerBurst(); // 円状に爆発させる関数を実行

            // すぐにまた「通常モード」に戻ってループ再開
            startEkidonaRoutine();
        }, 3000); // 溜め時間3秒
    }, 5000); // 通常時間5秒
}

// --- 円状に一気に炎を出す関数 ---
function triggerBurst() {
    const board = document.getElementById('board');
    if (!board) return;
    const rect = board.getBoundingClientRect();

    // 腕の中心の座標
    const armX = rect.left + 220;
    const armY = rect.bottom -120;

    // 20個の炎を一気に円状に飛ばす
    for (let i = 0; i < 20; i++) {
        const fire = document.createElement('div');
        fire.classList.add('fire-effect');
        fire.classList.add('fire-type-1');

        // 出現位置は腕の中心
        fire.style.left = `${armX}px`;
        fire.style.top = `${armY}px`;

        // ３６０度均等に広げる
        const angle = (360 / 20) * i;
        const radian = angle * (Math.PI / 180);
        const distance = 300; // 遠くまで飛ばす

        const moveX = Math.cos(radian) * distance;
        const moveY = Math.sin(radian) * distance;

        fire.style.setProperty('--move-x', `${moveX}px`);
        fire.style.setProperty('--move-y', `${moveY}px`);

        // バースト用の速いアニメーション
        fire.style.animation = `rise-fire 1.0s ease-out`;
        fire.style.transform = `scale(2.0)`; // 大きく

        document.body.appendChild(fire);
        setTimeout(() => fire.remove(), 1000);
    }
}

// タイトル画面のボタン → ユーザー選択へ
function toUserSelect() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('user-select-screen').style.display = 'flex';
}

// ユーザーを選択 → ロード画面へ
function startLoding() {
    document.getElementById('user-select-screen').style.display = 'none';
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.style.display = 'flex';

    // ロードのアニメーション（0% ~ 100%）
    let percent = 0;
    const bar = document.getElementById('loading-bar');
    const orb = document.getElementById('loading-orb');
    const text = document.getElementById('loading-percent');

    const interval =setInterval(() => {
        percent += 2; // スピード調整
        if (percent > 100) percent = 100;

        bar.style.width = `${percent}%`;
        orb.style.left = `${percent}%`;
        text.textContent = `${percent}%`;

        if (percent === 100) {
            clearInterval(interval);
            // 完了したら少し待ってクエスト画面へ
            setTimeout(toQuestScreen, 500);
        }
    }, 30); // 更新頻度
}

// ロード完了 → クエスト選択画面へ
function toQuestScreen() {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('quest-screen').style.display = 'flex';
}

// クエスト選択 → パズル開始
function startPuzzle() {
    document.getElementById('quest-screen').style.display = 'none';

    const gameContainer = document.getElementById('game-container');
    gameContainer.style.display = 'flex';
    setTimeout(() => {
        gameContainer.style.opacity = '1'
    }, 10);

    initGame();
    startEkidonaRoutine();
}

// イベントリスナーの登録

// タイトル画面
const startBtn = document.getElementById('start-btn');
startBtn.addEventListener('click', toUserSelect);

// ユーザー選択（soraを押したらロード開始）
const userCard = document.getElementById('user-1');
userCard.addEventListener('click', startLoding);

// 新しく始める（同じくロード開始）
const newGameCard = document.getElementById('user-new');
newGameCard.addEventListener('click', startLoding);
