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
    if (!isDragging) return;
    isDragging = false;

    if (floatingOrb) {
        floatingOrb.remove();
        floatingOrb = null;
    }

    // 元のドロップの薄い表示を元に戻す
    if (originalOrbElement) {
        originalOrbElement.classList.remove('orb-placeholder');
        originalOrbElement = null;
    }

    // 見た目とデータを同期（念のため再描画）
    renderBoard();
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

initGame();
