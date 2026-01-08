let currentGame = null;
let selectedIndices = []; 

async function joinSession(type) {
    try {
        const res = await fetch('/api/join-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, sessionType: type })
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.error || "服务器故障");
            return;
        }
        currentGame = data; 
        showTable();
    } catch (e) { alert("网络连接异常"); }
}

function showTable() {
    document.getElementById('game-hall').style.display = 'none';
    document.getElementById('game-table').style.display = 'block';
    selectedIndices = [];
    renderCards();
}

function renderCards() {
    const head = document.getElementById('grid-head');
    const mid = document.getElementById('grid-mid');
    const tail = document.getElementById('grid-tail');
    [head, mid, tail].forEach(el => el.innerHTML = '');

    currentGame.currentHand.forEach((card, i) => {
        const img = document.createElement('img');
        img.src = `/assets/cards/${card.value}_of_${card.suit}.svg`;
        img.className = 'poker-card';
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

function moveSelectedToLane(targetIndex) {
    if (selectedIndices.length === 0) return;
    const pickedCards = selectedIndices.map(idx => currentGame.currentHand[idx]);
    const sortedDesc = [...selectedIndices].sort((a, b) => b - a);
    sortedDesc.forEach(idx => currentGame.currentHand.splice(idx, 1));
    currentGame.currentHand.splice(targetIndex, 0, ...pickedCards);
    selectedIndices = [];
    renderCards();
}

async function submitHand() {
    if(!confirm("确定提交？")) return;
    const res = await fetch('/api/submit-hand', {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser.id, carriageId: currentGame.carriageId, tableIndex: currentGame.tableIndex, layout: currentGame.currentHand })
    });
    const data = await res.json();
    if (data.nextHand) {
        currentGame.currentHand = data.nextHand;
        currentGame.tableIndex = data.nextIndex;
        alert(`进入第 ${data.nextIndex + 1} 局`);
        renderCards();
    } else location.reload();
}

function smartSort() {
    currentGame.currentHand.sort((a,b) => b.value.length - a.value.length);
    renderCards();
}