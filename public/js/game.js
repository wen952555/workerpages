/**
 * game.js - 核心理牌逻辑
 */
let currentGame = null;
let selectedIndices = []; // 存储选中的索引

async function joinSession(type) {
    try {
        const res = await fetch('/api/join-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, sessionType: type })
        });
        const data = await res.json();
        if (!res.ok) {
            alert("服务器报错: " + (data.error || "未知故障"));
            return;
        }
        if (data.success) {
            currentGame = data; 
            showTable();
        } else alert(data.error);
    } catch (e) { alert("网络连接异常"); }
}

function showTable() {
    document.getElementById('game-hall').style.display = 'none';
    document.getElementById('game-table').style.display = 'block';
    selectedIndices = [];
    renderCards();
    renderTrackProgress();
}

// 渲染 3-5-5 布局
function renderCards() {
    const head = document.getElementById('grid-head');
    const mid = document.getElementById('grid-mid');
    const tail = document.getElementById('grid-tail');
    [head, mid, tail].forEach(el => el.innerHTML = '');

    currentGame.currentHand.forEach((card, i) => {
        const img = document.createElement('img');
        img.src = `/assets/cards/${card.value}_of_${card.suit}.svg`;
        img.className = 'poker-card';
        
        // 多选变红
        if (selectedIndices.includes(i)) img.classList.add('selected');

        img.onclick = (e) => {
            e.stopPropagation();
            const pos = selectedIndices.indexOf(i);
            if (pos > -1) selectedIndices.splice(pos, 1);
            else selectedIndices.push(i);
            renderCards();
        };

        if (i < 3) head.appendChild(img);
        else if (i < 8) mid.appendChild(img);
        else tail.appendChild(img);
    });
}

// 批量移动：点击牌墩头部移入选中的牌
function moveSelectedToLane(targetBaseIndex) {
    if (selectedIndices.length === 0) return;

    // 1. 提取选中的牌
    const pickedCards = selectedIndices.map(idx => currentGame.currentHand[idx]);
    
    // 2. 移除原牌
    const sortedDesc = [...selectedIndices].sort((a, b) => b - a);
    sortedDesc.forEach(idx => currentGame.currentHand.splice(idx, 1));

    // 3. 插入到新位置
    currentGame.currentHand.splice(targetBaseIndex, 0, ...pickedCards);

    selectedIndices = [];
    renderCards();
}

async function submitHand() {
    if(!confirm("确认提交理牌方案？")) return;
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
        alert(`已提交，进入第 ${data.nextIndex + 1} 局`);
        renderCards();
    } else {
        alert("本轮场次完成！");
        location.reload();
    }
}

function renderTrackProgress() {
    const container = document.getElementById('track-info');
    const progress = currentGame.trackProgress || [0,0,0,0];
    const seats = ['东','南','西','北'];
    container.innerHTML = progress.map((p, i) => `<div class="track-node ${p>0?'finished':''}">${seats[i]}</div>`).join('');
}

function smartSort() {
    currentGame.currentHand.sort((a,b) => b.value.length - a.value.length);
    renderCards();
}