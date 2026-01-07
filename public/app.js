/**
 * 十三水全功能完整版 - public/app.js
 * 包含：身份验证、PWA更新、大厅同步、轨道进度、3-5-5理牌、智能理牌、积分赠送
 */

let currentUser = null;
let currentGame = null; 
let selectedCardIndex = null;
let isRegisterMode = false;
let smartSortMode = 0;

// ==========================================
// 1. 初始化与 PWA 自动更新
// ==========================================
window.onload = async () => {
    // 自动登录检测
    const saved = localStorage.getItem('shisanshui_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        showHall();
        startLobbyPolling();
    }

    // PWA 更新提示逻辑
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            reg.onupdatefound = () => {
                const nw = reg.installing;
                nw.onstatechange = () => {
                    if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                        if (confirm("发现游戏新版本，是否立即刷新体验？")) {
                            window.location.reload();
                        }
                    }
                };
            };
        });
    }
};

// ==========================================
// 2. 身份认证 (登录/注册/退出)
// ==========================================
function toggleAuthMode(toRegister) {
    isRegisterMode = toRegister;
    document.getElementById('auth-title').innerText = isRegisterMode ? '玩家注册' : '玩家登录';
    document.getElementById('auth-nick').style.display = isRegisterMode ? 'block' : 'none';
    document.getElementById('primary-btn').innerText = isRegisterMode ? '立即注册' : '立即登录';
    document.getElementById('toggle-text').innerHTML = isRegisterMode ? 
        '已有账号？ <a href="javascript:void(0)" onclick="toggleAuthMode(false)">立即登录</a>' : 
        '没有账号？ <a href="javascript:void(0)" onclick="toggleAuthMode(true)">立即注册</a>';
}

async function handleAuth() {
    const phone = document.getElementById('auth-phone').value;
    const password = document.getElementById('auth-pass').value;
    const nickname = document.getElementById('auth-nick').value;

    if (!phone || password.length !== 6) {
        alert("请输入手机号和6位数字密码");
        return;
    }

    const endpoint = isRegisterMode ? '/api/register' : '/api/login';
    const body = isRegisterMode ? { phone, nickname, password } : { phone, password };

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await res.json();
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('shisanshui_user', JSON.stringify(currentUser));
            showHall();
            startLobbyPolling();
        } else {
            alert(data.error || "认证失败");
        }
    } catch (e) {
        alert("服务器连接错误");
    }
}

function logout() {
    if (confirm("确定要退出登录吗？")) {
        localStorage.removeItem('shisanshui_user');
        location.reload();
    }
}

// ==========================================
// 3. 大厅逻辑
// ==========================================
function showHall() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('game-hall').style.display = 'block';
    document.getElementById('game-table').style.display = 'none';
    document.getElementById('user-name').innerText = currentUser.nickname;
    document.getElementById('user-coins').innerText = currentUser.coins;
}

function startLobbyPolling() {
    const refresh = async () => {
        const types = ['8pm', '12pm'];
        for (let t of types) {
            try {
                const r = await fetch(`/api/lobby-status?type=${t}`);
                const d = await r.json();
                document.getElementById(`count-${t}`).innerText = `${d.count}/4`;
            } catch (e) {}
        }
    };
    refresh();
    setInterval(refresh, 5000);
}

// ==========================================
// 4. 核心游戏流程 (入局/理牌/提交)
// ==========================================
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
        } else {
            alert("进入场次失败: " + data.error);
        }
    } catch (e) {
        alert("请求异常，请检查网络");
    }
}

function showTable() {
    document.getElementById('game-hall').style.display = 'none';
    document.getElementById('game-table').style.display = 'block';
    renderTrackProgress();
    renderCards();
}

function renderTrackProgress() {
    const container = document.getElementById('track-info');
    const seats = ['东', '南', '西', '北'];
    const progress = currentGame.trackProgress || [1, 1, 1, 1];
    
    container.innerHTML = progress.map((round, i) => `
        <div class="track-node ${round > 1 ? 'finished' : ''}">
            ${seats[i]}: ${round}场
        </div>
    `).join('');
}

function renderCards() {
    const grid = document.getElementById('cards-grid');
    grid.innerHTML = '';
    const hand = currentGame.currentHand;

    hand.forEach((card, index) => {
        const img = document.createElement('img');
        img.src = `/assets/cards/${card.value}_of_${card.suit}.svg`;
        img.className = 'poker-card';
        if (selectedCardIndex === index) img.classList.add('selected');

        img.onclick = () => {
            if (selectedCardIndex === null) {
                selectedCardIndex = index;
            } else {
                const temp = currentGame.currentHand[selectedCardIndex];
                currentGame.currentHand[selectedCardIndex] = currentGame.currentHand[index];
                currentGame.currentHand[index] = temp;
                selectedCardIndex = null;
            }
            renderCards();
        };
        grid.appendChild(img);
    });
}

function smartSort() {
    smartSortMode = (smartSortMode + 1) % 3;
    const h = currentGame.currentHand;
    if (smartSortMode === 1) h.sort((a,b) => b.value.length - a.value.length);
    else if (smartSortMode === 2) h.sort((a,b) => a.suit.localeCompare(b.suit));
    else h.sort(() => Math.random() - 0.5);
    renderCards();
}

async function submitHand() {
    if (!confirm("确认提交这局方案？")) return;
    try {
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
            alert(`已进入第 ${currentGame.tableIndex + 1} 局`);
            renderCards();
        } else {
            alert("本场 10 局已全部完成！");
            location.reload();
        }
    } catch (e) {
        alert("提交失败");
    }
}

// ==========================================
// 5. 积分管理与转账 (全量代码)
// ==========================================
function togglePointsManage() {
    const modal = document.getElementById('points-modal');
    const isHidden = modal.style.display === 'none';
    modal.style.display = isHidden ? 'flex' : 'none';
    
    if (!isHidden) {
        document.getElementById('search-phone').value = '';
        document.getElementById('search-result').innerText = '';
        document.getElementById('transfer-box').style.display = 'none';
    }
}

async function searchPlayer() {
    const phone = document.getElementById('search-phone').value;
    if (!phone) {
        alert("请输入手机号");
        return;
    }

    try {
        const res = await fetch(`/api/search?phone=${phone}`);
        const data = await res.json();
        const resultDiv = document.getElementById('search-result');

        if (data.nickname) {
            resultDiv.innerHTML = `<div style="padding:10px; color:#00703c">✅ 找到玩家: <b>${data.nickname}</b></div>`;
            document.getElementById('transfer-box').style.display = 'block';
            window.targetPhone = phone; // 记录目标
        } else {
            resultDiv.innerHTML = `<span style="color:red">❌ 玩家不存在</span>`;
            document.getElementById('transfer-box').style.display = 'none';
        }
    } catch (e) {
        alert("搜索失败");
    }
}

async function sendCoins() {
    const amount = parseInt(document.getElementById('send-amount').value);
    if (!amount || amount <= 0) {
        alert("请输入有效的赠送金额");
        return;
    }

    if (amount > currentUser.coins) {
        alert("您的余额不足");
        return;
    }

    if (!confirm(`确定赠送 ${amount} 积分给玩家 ${window.targetPhone} 吗？`)) return;

    try {
        const res = await fetch('/api/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromPhone: currentUser.phone,
                toPhone: window.targetPhone,
                amount: amount
            })
        });
        const data = await res.json();

        if (data.success) {
            alert("✅ 赠送成功！");
            currentUser.coins = data.newBalance;
            document.getElementById('user-coins').innerText = currentUser.coins;
            localStorage.setItem('shisanshui_user', JSON.stringify(currentUser));
            togglePointsManage();
        } else {
            alert("赠送失败: " + data.error);
        }
    } catch (e) {
        alert("请求失败");
    }
}