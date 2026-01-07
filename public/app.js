let currentUser = null, currentGame = null, selectedCardIndex = null, isRegisterMode = false, smartSortMode = 0;

window.onload = async () => {
    const saved = localStorage.getItem('shisanshui_user');
    if (saved) { currentUser = JSON.parse(saved); showHall(); startPolling(); }
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            reg.onupdatefound = () => {
                const nw = reg.installing;
                nw.onstatechange = () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) { if(confirm("发现新功能，点击刷新？")) location.reload(); } };
            };
        });
    }
};

async function handleAuth() {
    const phone = document.getElementById('auth-phone').value;
    const password = document.getElementById('auth-pass').value;
    const nickname = document.getElementById('auth-nick').value;
    const ep = isRegisterMode ? '/api/register' : '/api/login';
    const res = await fetch(ep, { method: 'POST', body: JSON.stringify({ phone, password, nickname }) });
    const data = await res.json();
    if (data.success) { currentUser = data.user; localStorage.setItem('shisanshui_user', JSON.stringify(currentUser)); showHall(); } else alert(data.error);
}

function toggleAuthMode(reg) {
    isRegisterMode = reg;
    document.getElementById('auth-title').innerText = reg ? '注册' : '登录';
    document.getElementById('auth-nick').style.display = reg ? 'block' : 'none';
}

function startPolling() { setInterval(async () => {
    const res8 = await fetch('/api/lobby-status?type=8pm'); const d8 = await res8.json();
    document.getElementById('count-8pm').innerText = `${d8.count}/4`;
    const res12 = await fetch('/api/lobby-status?type=12pm'); const d12 = await res12.json();
    document.getElementById('count-12pm').innerText = `${d12.count}/4`;
}, 5000); }

async function joinSession(type) {
    const res = await fetch('/api/join-game', { method: 'POST', body: JSON.stringify({ userId: currentUser.id, sessionType: type }) });
    const data = await res.json();
    if (data.success) { currentGame = data; showTable(); } else alert(data.error);
}

function showTable() {
    document.getElementById('game-hall').style.display = 'none';
    document.getElementById('game-table').style.display = 'block';
    renderTrack(); renderCards();
}

function renderTrack() {
    const seats = ['东', '南', '西', '北'];
    const prog = currentGame.trackProgress || [1,1,1,1];
    document.getElementById('track-info').innerHTML = seats.map((s, i) => 
        `<div class="track-node ${prog[i] > 1 ? 'finished' : ''}">${s}: ${prog[i]} 轮</div>`
    ).join('');
}

function renderCards() {
    const grid = document.getElementById('cards-grid'); grid.innerHTML = '';
    currentGame.currentHand.forEach((card, i) => {
        const img = document.createElement('img');
        img.src = `/assets/cards/${card.value}_of_${card.suit}.svg`;
        img.className = 'poker-card';
        if (selectedCardIndex === i) img.classList.add('selected');
        img.onclick = () => {
            if (selectedCardIndex === null) selectedCardIndex = i;
            else { [currentGame.currentHand[selectedCardIndex], currentGame.currentHand[i]] = [currentGame.currentHand[i], currentGame.currentHand[selectedCardIndex]]; selectedCardIndex = null; }
            renderCards();
        };
        grid.appendChild(img);
    });
}

async function submitHand() {
    if(!confirm("确定提交？")) return;
    const res = await fetch('/api/submit-hand', { method: 'POST', body: JSON.stringify({
        userId: currentUser.id, carriageId: currentGame.carriageId, tableIndex: currentGame.tableIndex, layout: currentGame.currentHand
    })});
    const data = await res.json();
    if (data.nextHand) {
        currentGame.currentHand = data.nextHand; currentGame.tableIndex = data.tableIndex; renderCards();
    } else { alert("本轮打完！"); location.reload(); }
}

function smartSort() {
    smartSortMode = (smartSortMode + 1) % 3;
    const h = currentGame.currentHand;
    if (smartSortMode === 1) h.sort((a,b) => b.value - a.value);
    else if (smartSortMode === 2) h.sort((a,b) => a.suit.localeCompare(b.suit));
    else h.sort(() => Math.random() - 0.5);
    renderCards();
}

function showHall() { document.getElementById('auth-section').style.display = 'none'; document.getElementById('game-hall').style.display = 'block'; document.getElementById('user-name').innerText = currentUser.nickname; document.getElementById('user-coins').innerText = currentUser.coins; }
function logout() { localStorage.removeItem('shisanshui_user'); location.reload(); }
function togglePointsManage() { const m = document.getElementById('points-modal'); m.style.display = m.style.display === 'none' ? 'flex' : 'none'; }