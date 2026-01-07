/**
 * game.js - 处理场次加入、多选变红、批量移动
 */
let currentGame = null;
let selectedIndices = []; // 存储当前选中的牌索引

// 进入场次
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
    } catch (e) { alert("进入场次失败"); }
}

function showTable() {
    document.getElementById('game-hall').style.display = 'none';
    document.getElementById('game-table').style.display = 'block';
    selectedIndices = [];
    renderCards();
    renderTrackProgress();
}

// 渲染 3-5-5
function renderCards() {
    const head = document.getElementById('grid-head');
    const mid = document.getElementById('grid-mid');
    const tail = document.getElementById('grid-tail');
    
    [head, mid, tail].forEach(el => el.innerHTML = '');

    currentGame.currentHand.forEach((card, i) => {
        const img = document.createElement('img');
        img.src = `/assets/cards/${card.value}_of_${card.suit}.svg`;
        img.className = 'poker-card';
        
        // 变红高亮逻辑
        if (selectedIndices.includes(i)) img.classList.add('selected');

        img.onclick = (e) => {
            e.stopPropagation();
            toggleSelect(i);
        };

        if (i < 3) head.appendChild(img);
        else if (i < 8) mid.appendChild(img);
        else tail.appendChild(img);
    });
}

// 多选逻辑
function toggleSelect(index) {
    const pos = selectedIndices.indexOf(index);
    if (pos > -1) selectedIndices.splice(pos, 1);
    else selectedIndices.push(index);
    renderCards();
}

// 批量移动逻辑：点击道标题触发
function moveSelectedToLane(targetBaseIndex) {
    if (selectedIndices.length === 0) return;

    // 1. 提取选中的牌对象
    const pickedCards = selectedIndices.map(idx => currentGame.currentHand[idx]);
    
    // 2. 从原数组移除
    const sortedDesc = [...selectedIndices].sort((a, b) => b - a);
    sortedDesc.forEach(idx => currentGame.currentHand.splice(idx, 1));

    // 3. 插入到目标位置
    currentGame.currentHand.splice(targetBaseIndex, 0, ...pickedCards);

    // 4. 重置状态
    selectedIndices = [];
    renderCards();
}

// 提交理牌
async function submitHand() {
    if(!confirm("确定提交？提交后无法修改")) return;
    const res = await fetch('/api/submit-hand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: currentUser.id, carriageId: currentGame.carriageId,
            tableIndex: currentGame.tableIndex, layout: currentGame.currentHand
        })
    });
    const data = await res.json();
    if (data.nextHand) {
        currentGame.currentHand = data.nextHand;
        currentGame.tableIndex = data.nextIndex;
        alert(`第 ${data.nextIndex + 1} 局开始！`);
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
        <div class="track-node ${p > 1 ? 'finished' : ''}">${seats[i]}:${p}轮</div>
    `).join('');
}

function smartSort() {
    const h = currentGame.currentHand;
    h.sort((a,b) => b.value.length - a.value.length); // 简单排序演示
    renderCards();
}