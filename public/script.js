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

// --- イベントリスナー設定 ---
board.addEventListener('mousedown', handleStart);
board.addEventListener('touchstart', handleStart, { passive: false });

window.addEventListener('mousemove', handleMove);
window.addEventListener('touchmove', handleMove, { passive: false });

window.addEventListener('mouseup', handleEnd);
window.addEventListener('touchend', handleEnd);


// 1. 操作開始
function handleStart(e) {
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
        // isProcessing = false; // もし操作ロックするならここで解除
        return;
    }

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


initGame();

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

// --- 落ち葉エフェクト生成システム ---
function createFireEffect() {
    const fire = document.createElement('div');
    fire.classList.add('fire-effect');

    // パズル盤面の位置情報を取得する
    const board = document.getElementById('board');
    if (!board) return; 
    const rect = board.getBoundingClientRect();

    // rect.left = ボードの左端の座標
    // rect.bottom = ボードの下端の座標

    // 出現位置（横）ボードの左端付近（少しランダムにずらす）
    // rect.left から -20px ~ +30px の範囲
    const startX = rect.left + (Math.random() * 50 - 20);
    
    // 出現位置（縦）ボード下端付近
    // rect.bottom から-20px ~ +20px の範囲
    const startY = rect.bottom + (Math.random() * 40 - 20);

    // 計算した位置をセット
    fire.style.left = `${startX}px`;
    fire.style.top = `${startY}px`;

    // タイプ（方向と画像）をランダムに決定
    // 1 ~ 3のランダムな整数を生成
    const fireType = Math.floor(Math.random() * 3) + 1;

    let minAngle, maxAngle, typeClass;

    // タイプに応じて設定を切り替え
    switch (fireType) {
        case 1: // 真上方向（0 ~ 30度）
            minAngle = 0;
            maxAngle = 30;
            typeClass = 'fire-type-1'; // 真上用の画像クラス
            break;
        case 2: // 斜め方向（30 ~ 60度）
            minAngle = 30;
            maxAngle = 60;
            typeClass = 'fire-type-2'; // 斜め用の画像クラス
            break;
        case 3: // 真右方向（60 ~ 90度）
            minAngle = 60;
            maxAngle = 90;
            typeClass = 'fire-type-3'; // 真右用の画像クラス
            break;
    }

    // 決定したタイプ別クラスを追加（これで画像が変わる）
    fire.classList.add(typeClass);

    // 決定した範囲内でランダムな角度を計算
    const angle = minAngle + Math.random() * (maxAngle - minAngle);

    // 角度をラジアン単位に変換
    const radian = angle * (Math.PI / 180);

    // 距離(勢い): 200px ~ 450px 飛んでいく
    const distance = 200 + Math.random() * 250;

    // 角度と距離から、移動先の X, Y 座標を計算
    // Math.sin(横方向)、Math.cos(縦方向)
    // 画面の座標は、上がマイナスなので、moveY にはマイナスをつける
    const moveX = Math.sin(radian) * distance;
    const moveY = -Math.cos(radian) * distance;

    // css変数にセット
    fire.style.setProperty('--move-x', `${moveX}px`);
    fire.style.setProperty('--move-y', `${moveY}px`);

    // 大きさとスピードの設定(バラつきを出す)
    const scale = 0.9 + Math.random() * 0.4; //大きさ
    fire.style.transform = `scale(${scale})`; // 初期スケールとして設定

    // 風の強さ（アニメーション時間）をランダムに
    // 4秒 ~ 9秒の間で舞う
    const duration = 1.5 + Math.random() * 2.0;
    fire.style.animation = `rise-fire ${duration}s ease-out`;

    // HTML に追加
    document.body.appendChild(fire);

    // アニメーションが終わったら消す（メモリ節約）
    setTimeout(() => {
        fire.remove();
    }, duration * 1000);
}

// 0.3秒ごとに葉っぱを一枚生成する
setInterval(createFireEffect, 400);