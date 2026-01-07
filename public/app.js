/**
 * 十三水专业版 - 核心控制脚本 (全量完整版)
 */

let currentUser = null;
let currentGame = null; // 存储当前场次、轨道、车厢及手牌数据
let selectedCardIndex = null; // 用于点击交换牌的记录
let isRegisterMode = false;
let smartSortMode = 0; // 0: 默认, 1: 尾道最强, 2: 顺子优先

// ==========================================
// 1. 初始化与 PWA 更新管理
// ==========================================
window.onload = async () => {
    // 自动登录检测
    const savedUser = localStorage.getItem('shisanshui_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showHall();
        startLobbyPolling(); // 开始刷新大厅人数
    }

    // PWA 更新提示逻辑
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            reg.onupdatefound = () => {
                const newWorker = reg.installing;
                newWorker.onstatechange = () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        if (confirm("发现新版本，是否刷新体验新功能？")) {
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
        alert("请输入正确的手机号和6位密码");
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
            alert(data.error);
        }
    } catch (e) {
        alert("网络连接失败");
    }
}

function logout() {
    if (confirm("确定要退出登录吗？")) {
        localStorage.removeItem('shisanshui_user');
        location.reload();
    }
}

// ==========================================
// 3. 大厅逻辑与人数刷新
// ==========================================
function showHall() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('game-hall').style.display = 'block';
    document.getElementById('game-table').style.display = 'none';
    document.getElementById('user-name').innerText = currentUser.nickname;
    document.getElementById('user-coins').innerText = currentUser.coins;
}

function startLobbyPolling() {
    refreshLobbyCounts();
    setInterval(refreshLobbyCounts, 5000); // 每5秒同步一次场次人数
}

async function refreshLobbyCounts() {
    const sessions = ['8pm', '12pm'];
    for (let s of sessions) {
        try {
            const res = await fetch(`/api/lobby-status?type=${s}`);
            const data = await res.json();
            document.getElementById(`count-${s}`).innerText = `${data.count}/4`;
        } catch (e) {}
    }
}

// ==========================================
// 4. 核心游戏逻辑 (入局/理牌/提交)
// ==========================================

// 进入预约场次
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
            // data内容: trackId, carriageId, seat, tableIndex, currentHand, trackProgress
            showTable();
        } else {
            alert(data.error);
        }
    } catch (e) {
        alert("进入场次失败");
    }
}

function showTable() {
    document.getElementById('game-hall').style.display = 'none';
    document.getElementById('game-table').style.display = 'block';
    renderTrackInfo();
    renderCards();
}

// 渲染顶部轨道信息 (ABCD进度)
function renderTrackInfo() {
    const infoContainer = document.getElementById('track-info');
    const seats = ['东', '南', '西', '北'];
    // 假设 trackProgress 是 [1, 1, 1, 1] 这样的数组，代表东南西北四人的轮数
    const progress = currentGame.trackProgress || [1, 1, 1, 1];
    
    infoContainer.innerHTML = progress.map((round, i) => `
        <div class="track-node ${round > 1 ? 'finished' : ''}">
            ${seats[i]}: ${round}场
        </div>
    `).join('');
}

// 渲染扑克牌 (3-5-5 布局)
function renderCards() {
    const grid = document.getElementById('cards-grid');
    grid.innerHTML = '';
    const hand = currentGame.currentHand;

    hand.forEach((card, index) => {
        const img = document.createElement('img');
        img.src = `/assets/cards/${card.value}_of_${card.suit}.svg`;
        img.className = 'poker-card';
        if (selectedCardIndex === index) img.classList.add('selected');

        img.onclick = () => handleCardClick(index);
        grid.appendChild(img);
    });
    
    updateCardTypeTips();
}

// 点击交换逻辑
function handleCardClick(index) {
    if (selectedCardIndex === null) {
        selectedCardIndex = index;
    } else {
        // 交换位置
        const temp = currentGame.currentHand[selectedCardIndex];
        currentGame.currentHand[selectedCardIndex] = currentGame.currentHand[index];
        currentGame.currentHand[index] = temp;
        selectedCardIndex = null;
    }
    renderCards();
}

// 智能理牌算法切换 (模拟循环切换)
function smartSort() {
    smartSortMode = (smartSortMode + 1) % 3;
    const hand = currentGame.currentHand;

    if (smartSortMode === 1) {
        // 示例：按点数从大到小排列
        hand.sort((a, b) => b.rank - a.rank);
    } else if (smartSortMode === 2) {
        // 示例：按花色排列
        hand.sort((a, b) => a.suit.localeCompare(b.suit));
    } else {
        // 随机乱序
        hand.sort(() => Math.random() - 0.5);
    }
    renderCards();
}

// 更新牌型文字提示
function updateCardTypeTips() {
    const hand = currentGame.currentHand;
    // 简单的切片演示
    const head = hand.slice(0, 3);
    const mid = hand.slice(3, 8);
    const tail = hand.slice(8, 13);
    
    document.getElementById('card-type-tips').innerText = 
        `头道:分析中 | 中道:分析中 | 尾道:分析中`;
}

// 提交当前桌
async function submitHand() {
    if (!confirm("确认提交这局理牌方案吗？提交后不可修改")) return;

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
            // 进入下一局
            currentGame.currentHand = data.nextHand;
            currentGame.tableIndex = data.nextIndex;
            alert(`第 ${currentGame.tableIndex} 局开始！`);
            renderCards();
            renderTrackInfo();
        } else {
            alert("恭喜！您已完成本轮所有场次。");
            showHall();
        }
    } catch (e) {
        alert("提交失败，请检查网络");
    }
}

// ==========================================
// 5. 积分管理与弹窗
// ==========================================
function togglePointsManage() {
    const modal = document.getElementById('points-modal');
    modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
}

async function searchPlayer() {
    const phone = document.getElementById('search-phone').value;
    const res = await fetch(`/api/search?phone=${phone}`);
    const data = await res.json();
    const resultDiv = document.getElementById('search-result');
    if (data.nickname) {
        resultDiv.innerHTML = `<div class="res-box">找到玩家: <b>${data.nickname}</b></div>`;
        document.getElementById('transfer-box').style.display = 'block';
        window.targetPhone = phone;
    } else {
        resultDiv.innerHTML = `<p style="color:red">用户不存在</p>`;
    }
}

async function sendCoins() {
    const amount = document.getElementById('send-amount').value;
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
        alert("赠送成功！");
        currentUser.coins = data.newBalance;
        document.getElementById('user-coins').innerText = currentUser.coins;
        localStorage.setItem('shisanshui_user', JSON.stringify(currentUser));
        togglePointsManage();
    } else {
        alert(data.error);
    }
}
