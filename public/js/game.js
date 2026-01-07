/**
 * game.js - 核心理牌逻辑
 */
let currentGame = null;
let selectedIndices = []; // 存储选中的卡片索引

// 1. 进入场次
async function joinSession(type) {
    try {
        const res = await fetch('/api/join-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, sessionType: type })
        });
        const data = await res.json();
        if (data.success) {
            currentGame = data; 
            showTable();
        } else alert(data.error);
    } catch (e) { alert("进入失败"); }
}

function showTable() {
    document.getElementById('game-hall').style.display = 'none';
    document.getElementById('game-table').style.display = 'block';
    renderCards();
    renderTrackProgress();
}

// 2. 渲染 3-5-5 布局
function renderCards() {
    const head = document.getElementById('grid-head');
    const mid = document.getElementById('grid-mid');
    const tail = document.getElementById('grid-tail');
    
    [head, mid, tail].forEach(el => el.innerHTML = '');

    currentGame.currentHand.forEach((card, i) => {
        const img = document.createElement('img');
        img.src = `/assets/cards/${card.value}_of_${card.suit}.svg`;
        img.className = 'poker-card';
        
        // 如果被选中，添加红色高亮类
        if (selectedIndices.includes(i)) {
            img.classList.add('selected');
        }

        img.onclick = (e) => {
            e.stopPropagation();
            toggleCardSelection(i);
        };

        if (i < 3) head.appendChild(img);
        else if (i < 8) mid.appendChild(img);
        else tail.appendChild(img);
    });
}

// 3. 多选逻辑 (变红)
function toggleCardSelection(index) {
    const foundIdx = selectedIndices.indexOf(index);
    if (foundIdx > -1) {
        selectedIndices.splice(foundIdx, 1); // 取消选择
    } else {
        selectedIndices.push(index); // 选中
    }
    renderCards();
}

// 4. 批量移动逻辑：点击“道标题”时触发
function moveSelectedToLane(targetBaseIndex) {
    if (selectedIndices.length === 0) return;

    // 获取选中的牌对象
    const pickedCards = selectedIndices.map(idx => currentGame.currentHand[idx]);
    
    // 从原手牌中移除选中的牌 (由后往前删，避免索引错位)
    const sortedDesc = [...selectedIndices].sort((a, b) => b - a);
    sortedDesc.forEach(idx => currentGame.currentHand.splice(idx, 1));

    // 插入到目标道的最前面
    currentGame.currentHand.splice(targetBaseIndex, 0, ...pickedCards);

    // 限制总数依然为13 (防止逻辑溢出)
    currentGame.currentHand = currentGame.currentHand.slice(0, 13);

    // 清空选择并刷新
    selectedIndices = [];
    renderCards();
}

// 5. 自动理牌循环
let smartMode = 0;
function smartSort() {
    smartMode = (smartMode + 1) % 3;
    const h = currentGame.currentHand;
    if (smartMode === 1) h.sort((a,b) => b.value.length - a.value.length);
    else if (smartMode === 2) h.sort((a,b) => a.suit.localeCompare(b.suit));
    else h.sort(() => Math.random() - 0.5);
    renderCards();
}

// 6. 提交
async function submitHand() {
    if(!confirm("确定提交这局理牌吗？")) return;
    const res = await fetch('/api/submit-hand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: currentUser.id, 
            carriageId: currentGame.carriageId, 
            tableIndex: currentGame.tableIndex, 
            layout: currentGame.currentHand
        })
    });
    const data = await res.json();
    if (data.nextHand) {
        currentGame.currentHand = data.nextHand;
        currentGame.tableIndex = data.nextIndex;
        alert(`已进入第 ${data.nextIndex + 1} 局`);
        renderCards();
    } else {
        alert("本轮场次已打完！");
        location.reload();
    }
}

function renderTrackProgress() {
    const container = document.getElementById('track-info');
    const seats = ['东', '南', '西', '北'];
    const progress = currentGame.trackProgress || [1,1,1,1];
    container.innerHTML = progress.map((p, i) => `
        <div class="track-node ${p > 1 ? 'finished' : ''}">${seats[i]}:${p}</div>
    `).join('');
}