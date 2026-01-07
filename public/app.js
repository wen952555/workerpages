let isRegisterMode = false;
let currentUser = null;

// PWA 自动更新检测
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            reg.onupdatefound = () => {
                const newWorker = reg.installing;
                newWorker.onstatechange = () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        if (confirm("发现新版本，是否刷新体验？")) window.location.reload();
                    }
                };
            };
        });
    });
}

window.onload = () => {
    const savedUser = localStorage.getItem('shisanshui_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showHall();
    }
};

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
        alert("请输入正确的手机号和6位数字密码");
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
            currentUser = data.user || { phone, nickname, coins: 1000 };
            localStorage.setItem('shisanshui_user', JSON.stringify(currentUser));
            showHall();
        } else {
            alert(data.error);
        }
    } catch (e) {
        alert("网络请求失败");
    }
}

function showHall() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('game-hall').style.display = 'block';
    document.getElementById('user-name').innerText = currentUser.nickname;
    document.getElementById('user-coins').innerText = currentUser.coins;
}

function logout() {
    if (confirm("确定要退出吗？")) {
        localStorage.removeItem('shisanshui_user');
        location.reload();
    }
}

function togglePointsManage() {
    const modal = document.getElementById('points-modal');
    modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
}

function reserveGame(gameName) {
    alert(`预约成功：${gameName}\n结算结果请关注大厅动态。`);
}

async function searchPlayer() {
    const phone = document.getElementById('search-phone').value;
    const res = await fetch(`/api/search?phone=${phone}`);
    const data = await res.json();
    const resultDiv = document.getElementById('search-result');
    if (data.nickname) {
        resultDiv.innerHTML = `<div style="padding:10px;background:#f9f9f9;margin:10px 0;border-radius:8px">找到玩家: <b>${data.nickname}</b></div>`;
        document.getElementById('transfer-box').style.display = 'block';
        window.targetPhone = phone;
    } else {
        resultDiv.innerHTML = `<p style="color:red">用户不存在</p>`;
    }
}

async function sendCoins() {
    const amount = document.getElementById('send-amount').value;
    if (!amount || amount <= 0) return;
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
