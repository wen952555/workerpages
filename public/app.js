/**
 * 十三水全功能完整版 - public/app.js
 * 严禁省略，包含所有讨论过的交互与后端对接逻辑
 */

let currentUser = null;
let currentGame = null; // 存储当前轨道、车厢、手牌
let selectedCardIndex = null;
let isRegisterMode = false;
let smartSortMode = 0;

// ==========================================
// 1. 初始化与 PWA 自动更新逻辑
// ==========================================
window.onload = async () => {
    // 自动登录检测
    const saved = localStorage.getItem('shisanshui_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        showHall();
        startLobbyPolling();
    }

    // PWA 更新提示逻辑 (检测到新代码自动提示刷新)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            reg.onupdatefound = () => {
                const nw = reg.installing;
                nw.onstatechange = () => {
                    if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                        if (confirm("发现游戏新版本（如新大厅或新功能），是否立即刷新体验？")) {
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

// 切换登录和注册界面模式
function toggleAuthMode(toRegister) {
    isRegisterMode = toRegister;
    document.getElementById('auth-title').innerText = isRegisterMode ? '玩家注册' : '玩家登录';
    document.getElementById('auth-nick').style.display = isRegisterMode ? 'block' : 'none';
    document.getElementById('primary-btn').innerText = isRegisterMode ? '立即注册' : '立即登录';
    document.getElementById('toggle-text').innerHTML = isRegisterMode ? 
        '已有账号？ <a href="javascript:void(0)" onclick="toggleAuthMode(false)">立即登录</a>' : 
        '没有账号？ <a href="javascript:void(0)" onclick="toggleAuthMode(true)">立即注册</a>';
}

// 处理登录或注册提交
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
        alert("服务器连接错误，请稍后再试");
    }
}

// 退出登录
function logout() {
    if (confirm("确定要退出登录吗？")) {
        localStorage.removeItem('shisanshui_user');
        location.reload();
    }
}

// ==========================================
// 3. 大厅逻辑与人数轮询
// ==========================================

function showHall() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('game-hall').style.display = 'block';
    document.getElementById('game-table').style.display = 'none';
    document.getElementById('user-name').innerText = currentUser.nickname;
    document.getElementById('user-coins').innerText = currentUser.coins;
}

// 启动大厅人数刷新
function startLobbyPolling() {
    const fetchCounts = async () => {
        const types = ['8pm', '12pm'];
        for (let t of types) {
            try {
                const r = await fetch(`/api/lobby-status?type=${t}`);
                const d = await r.json();
                document.getElementById(`count-${t}`).innerText = `${d.count}/4`;
            } catch (e) {}
        }
    };
    fetchCounts();
    setInterval(fetchCounts, 5000); // 5秒自动刷新一次
}

// ==========================================
// 4. 核心游戏：入局与 3-5-5 理牌
// ==========================================

// 进入场次（预约模式）
async function joinSession(type) {
    try {
        const res = await fetch('/api/join-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, sessionType: type })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            alert("进入场次失败: " + (data.error || "服务器故障"));
            return;
        }

        if (data.success) {
            currentGame = data; 
            showTable();
        } else {
            alert("游戏错误: " + data.error);
        }
    } catch (e) {
        alert("网络异常，无法进入场次，请检查后端代码。");
    }
}

// 显示理牌界面
function showTable() {
    document.getElementById('game-hall').style.display = 'none';
    document.getElementById('game-table').style.display = 'block';
    renderTrackProgress();
    renderCards();
}

// 渲染顶部轨道进度（ABCD 谁进入了第几场）
function renderTrackProgress() {
    const container = document.getElementById('track-info');
    const seats = ['东', '南', '西', '北'];
    // 进度数据由后端 join-game 提供
    const progress = currentGame.trackProgress || [0, 0, 0, 0];
    
    container.innerHTML = progress.map((active, i) => `
        <div class="track-node ${active > 0 ? 'finished' : ''}">
            ${seats[i]}
        </div>
    `).join('');
}

// 3-5-5 布局渲染逻辑
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
                // 第一次点击：选中
                selectedCardIndex = index;
            } else {
                // 第二次点击：交换位置
                const temp = currentGame.currentHand[selectedCardIndex];
                currentGame.currentHand[selectedCardIndex] = currentGame.currentHand[index];
                currentGame.currentHand[index] = temp;
                selectedCardIndex = null;
            }
            renderCards(); // 重新渲染刷新界面
        };
        grid.appendChild(img);
    });
}

// 智能理牌算法切换
function smartSort() {
    smartSortMode = (smartSortMode + 1) % 3;
    const h = currentGame.currentHand;
    if (smartSortMode === 1) {
        // 模式1：简单大小排序
        h.sort((a,b) => b.value.length - a.value.length); 
    } else if (smartSortMode === 2) {
        // 模式2：按花色排序
        h.sort((a,b) => a.suit.localeCompare(b.suit)); 
    } else {
        // 模式0：随机重置
        h.sort(() => Math.random() - 0.5); 
    }
    renderCards();
}

// 提交理牌方案
async function submitHand() {
    if (!confirm("确认提交这局方案？提交后将无法修改。")) return;
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
            // 进入下一局（共10局）
            currentGame.currentHand = data.nextHand;
            currentGame.tableIndex = data.nextIndex;
            alert(`提交成功！已进入第 ${currentGame.tableIndex + 1} 局`);
            renderCards();
        } else {
            // 10局全部打完
            alert("恭喜！本场 10 局任务已全部完成，请等待预约时间结算。");
            location.reload();
        }
    } catch (e) {
        alert("提交失败，请检查网络连接");
    }
}

// ==========================================
// 5. 积分管理与转账
// ==========================================

// 切换积分管理弹窗
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

// 搜索目标玩家
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
            resultDiv.innerHTML = `<div style="padding:10px; color:#00703c; background:#f0fff0; border-radius:8px; margin-top:10px">✅ 找到玩家: <b>${data.nickname}</b></div>`;
            document.getElementById('transfer-box').style.display = 'block';
            window.targetPhone = phone; // 临时存储
        } else {
            resultDiv.innerHTML = `<p style="color:red; margin-top:10px">❌ 玩家不存在</p>`;
            document.getElementById('transfer-box').style.display = 'none';
        }
    } catch (e) {
        alert("搜索服务异常");
    }
}

// 执行转账
async function sendCoins() {
    const amount = parseInt(document.getElementById('send-amount').value);
    if (!amount || amount <= 0) {
        alert("请输入有效的赠送金额");
        return;
    }

    if (amount > currentUser.coins) {
        alert("您的账户余额不足");
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
            alert("✅ 积分赠送成功！");
            // 同步本地余额
            currentUser.coins = data.newBalance;
            document.getElementById('user-coins').innerText = currentUser.coins;
            localStorage.setItem('shisanshui_user', JSON.stringify(currentUser));
            togglePointsManage();
        } else {
            alert("赠送失败: " + data.error);
        }
    } catch (e) {
        alert("网络请求失败，请稍后重试");
    }
}