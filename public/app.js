let isRegisterMode = false;
let currentUser = null;

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
}

async function handleAuth() {
    const phone = document.getElementById('auth-phone').value;
    const password = document.getElementById('auth-pass').value;
    const nickname = document.getElementById('auth-nick').value;

    const endpoint = isRegisterMode ? '/api/register' : '/api/login';
    const body = isRegisterMode ? { phone, nickname, password } : { phone, password };

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
}

function showHall() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('game-hall').style.display = 'block';
    document.getElementById('user-name').innerText = currentUser.nickname;
    document.getElementById('user-coins').innerText = currentUser.coins;
}

function logout() {
    localStorage.removeItem('shisanshui_user');
    location.reload();
}

// 积分管理切换
function togglePointsManage() {
    const modal = document.getElementById('points-modal');
    modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
}

// 预约功能
function reserveGame(gameName) {
    alert(`预约成功！您已加入【${gameName}】。\n系统将在开场前自动核算积分。`);
}

async function searchPlayer() {
    const phone = document.getElementById('search-phone').value;
    const res = await fetch(`/api/search?phone=${phone}`);
    const data = await res.json();
    const resultDiv = document.getElementById('search-result');
    if (data.nickname) {
        resultDiv.innerHTML = `目标：<b>${data.nickname}</b>`;
        document.getElementById('transfer-box').style.display = 'block';
        window.targetPhone = phone;
    } else {
        resultDiv.innerText = "用户不存在";
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