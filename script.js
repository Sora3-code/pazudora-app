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
        updataHP(matchedIndices.size * 10);
        
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
function updataHP(amount) {
    currentHP += amount;

    //最大・最小値の制限
    if (currentHP > maxHP) currentHP = maxHP;
    if (currentHP < 0) currentHP = 0;

    //バーの長さを更新（%）
    const parcentage = (currentHP / maxHP) * 100;
    hpBar.style.width = `${parcentage}%`;

    //テキスト更新
    hpText.textContent = `HP: ${currentHP} / ${maxHP}`;

    //色を変える演出（ピンチになったら赤くする）
    if (parcentage <= 20) {
        hpBar.style.backgroundColor = '#ff1744'; // 赤
    } else if (parcentage <= 50) {
        hpBar.style.backgroundColor = '#ffea00'; // 黄色
    } else {
        hpBar.style.backgroundColor = '#00e676'; // 緑
    }
}

// テスト用: ゲーム開始時に少しHPを減らしておく
updataHP(-800);