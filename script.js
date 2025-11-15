const board = document.getElementById('board');
const ROWS = 5; // 縦5行
const COLS = 6; // 横6列
const ORB_TYPES = ['fire', 'water', 'wood', 'light', 'dark', 'heal'];

// 盤面のデータ（配列）
// 1次元配列で管理します (index = y * COLS + x)
let boardData = [];

// --- 初期化 ---
function initGame() {
    // ランダムにドロップを埋める
    boardData = [];
    for (let i = 0; i < ROWS * COLS; i++) {
        const randomType = ORB_TYPES[Math.floor(Math.random() * ORB_TYPES.length)];
        boardData.push(randomType);
    }
    renderBoard();
}

// --- 盤面を描画する ---
function renderBoard() {
    board.innerHTML = ''; // 一旦クリア
    boardData.forEach((type, index) => {
        const orb = document.createElement('div');
        orb.classList.add('orb', `orb-${type}`);
        orb.dataset.index = index; // 何番目のドロップか情報を埋め込む
        board.appendChild(orb);
    });
}

// --- 操作用の変数 ---
let isDragging = false;
let draggedIndex = -1; // 元々あった場所のインデックス
let floatingOrb = null; // 浮いているドロップの要素
let orbSize = 0; // ドロップ1個の幅
let originalOrbElement = null; // ドラッグ開始時の元のドロップ要素を保持

// --- イベントリスナー設定 (マウス & タッチ対応) ---
board.addEventListener('mousedown', handleStart);
board.addEventListener('touchstart', handleStart, { passive: false });

window.addEventListener('mousemove', handleMove);
window.addEventListener('touchmove', handleMove, { passive: false });

window.addEventListener('mouseup', handleEnd);
window.addEventListener('touchend', handleEnd);


// 1. 操作開始
function handleStart(e) {
    // タッチイベントの場合は最初の指を取得、マウスならeそのまま
    const event = e.type === 'touchstart' ? e.touches[0] : e;
    const target = document.elementFromPoint(event.clientX, event.clientY);

    if (target && target.classList.contains('orb')) {
        e.preventDefault(); // スクロール等を防ぐ
        isDragging = true;
        draggedIndex = parseInt(target.dataset.index);

        // ドロップのサイズを取得 (座標計算用)
        const rect = target.getBoundingClientRect();
        orbSize = rect.width;

        // 浮いているドロップ（見た目用）を作成
        createFloatingOrb(boardData[draggedIndex], event.clientX, event.clientY);

        // 元の場所のドロップを薄くする
        target.classList.add('orb-placeholder');
    }
}

// 2. 移動中 (ここが一番大事！入れ替えロジック)
function handleMove(e) {
    if (!isDragging || !floatingOrb) return;
    e.preventDefault();

    const event = e.type === 'touchmove' ? e.touches[0] : e;

    // 浮いているドロップを指の位置に追従させる
    floatingOrb.style.left = `${event.clientX}px`;
    floatingOrb.style.top = `${event.clientY}px`;

    // --- 今、指がどのマスの・どのドロップの上にいるか計算 ---
    // elementFromPoint で、座標の下にある要素を取得
    // (floatingOrb は pointer-events: none なので貫通して下の要素が取れる)
    const targetElement = document.elementFromPoint(event.clientX, event.clientY);
    if (targetElement && targetElement.classList.contains('orb') && targetElement !== originalOrbElement) {
        const targetIndex = parseInt(targetElement.dataset.index);

        // もし「今いる場所(draggedIndex)」と「指の下の場所(targetIndex)」が違うなら
        // 配列の中身を入れ替える（スワップ）
        if (targetIndex !== draggedIndex) {
            swapOrbs(draggedIndex, targetIndex);
            draggedIndex = targetIndex; // 現在位置を更新
        }
    }
}

// 3. 操作終了
function handleEnd() {
    if (!isDragging) return;
    isDragging = false;

    // 浮いているドロップを消す
    if (floatingOrb) {
        floatingOrb.remove();
        floatingOrb = null;
    }

    if (originalOrbElement) {
        originalOrbElement.classList.remove('orb-placeholder');
        originalOrbElement = null;
    }

    // 盤面を再描画して、見た目とデータが同期
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

// --- 配列の中身を入れ替える関数 ---
function swapOrbsVisual(indexA, indexB) {
    // 配列のデータを交換
    const typeA = boardData[indexA];
    const typeB = boardData[indexB];
    boardData[indexA] = typeB;
    boardData[indexB] = typeA;

    // DOM要素の交換
    const orbA = board.children[indexA];
    const orbB = board.children[indexB];

    // まずクラスを入れ替える
    orbA.className = `orb orb-${typeB}`;
    // クラスを新しいタイプで上書き
    orbB.className = `orb orb-${typeA}`;
    // クラスを新しいタイプで上書き

    // dataset.indexも更新
    orbA.dataset.index = indexA;
    orbB.dataset.index = indexB;

    // 現在、ドラッグ中のドロップ（元々indexAにあったもの）の新しい位置indexBをマーク
    // これが次の draggedIndex になるので、これを薄くする
    orbB.classList.add('orb-placeholder');
    orbA.classList.remove('orb-placeholder');
    // 前のマークを消す
}

// ゲーム開始
initGame();
