
let currentUser = null; // 存储当前登录的用户信息

// 1. 注册功能
async function register() {
    const phone = document.getElementById('reg-phone').value;
    const nickname = document.getElementById('reg-nick').value;
    const password = document.getElementById('reg-pass').value;

    const res = await fetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({ phone, nickname, password })
    });
    const data = await res.json();
    if (data.success) {
        currentUser = { phone, nickname, coins: 1000 };
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

// 2. 搜索玩家
async function searchPlayer() {
    const phone = document.getElementById('search-phone').value;
    const res = await fetch(`/api/search?phone=${phone}`);
    const data = await res.json();
    
    const resultDiv = document.getElementById('search-result');
    if (data.nickname) {
        resultDiv.innerHTML = `找到玩家: <b>${data.nickname}</b>`;
        document.getElementById('transfer-box').style.display = 'block';
        window.targetPhone = phone; // 临时存储目标手机号
    } else {
        resultDiv.innerText = "玩家不存在";
        document.getElementById('transfer-box').style.display = 'none';
    }
}

// 3. 赠送积分
async function sendCoins() {
    const amount = document.getElementById('send-amount').value;
    const res = await fetch('/api/transfer', {
        method: 'POST',
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
    } else {
        alert(data.error);
    }
}
