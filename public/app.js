let isRegisterMode = false;
let currentUser = null;

// 页面加载时自动执行
window.onload = () => {
    const savedUser = localStorage.getItem('shisanshui_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showHall();
    }
};

// 切换登录/注册模式
function toggleAuthMode(toRegister) {
    isRegisterMode = toRegister;
    document.getElementById('auth-title').innerText = isRegisterMode ? '玩家注册' : '玩家登录';
    document.getElementById('auth-nick').style.display = isRegisterMode ? 'block' : 'none';
    document.getElementById('primary-btn').innerText = isRegisterMode ? '立即注册' : '立即登录';
    document.getElementById('toggle-text').innerHTML = isRegisterMode ? 
        '已有账号？<a href="javascript:void(0)" onclick="toggleAuthMode(false)">立即登录</a>' : 
        '没有账号？<a href="javascript:void(0)" onclick="toggleAuthMode(true)">立即注册</a>';
}

// 统一处理登录/注册点击
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
            // 登录或注册成功，保存到本地
            currentUser = data.user || { phone, nickname, coins: 1000 };
            localStorage.setItem('shisanshui_user', JSON.stringify(currentUser));
            showHall();
        } else {
            alert(data.error || "操作失败");
        }
    } catch (e) {
        alert("网络错误，请稍后再试");
    }
}

// 显示大厅
function showHall() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('game-hall').style.display = 'block';
    document.getElementById('user-name').innerText = currentUser.nickname;
    document.getElementById('user-coins').innerText = currentUser.coins;
}

// 退出登录
function logout() {
    localStorage.removeItem('shisanshui_user');
    location.reload(); // 刷新页面回到初始状态
}

// 搜索玩家
async function searchPlayer() {
    const phone = document.getElementById('search-phone').value;
    if(!phone) return;
    const res = await fetch(`/api/search?phone=${phone}`);
    const data = await res.json();
    
    const resultDiv = document.getElementById('search-result');
    if (data.nickname) {
        resultDiv.innerHTML = `✅ 目标玩家: <b>${data.nickname}</b>`;
        document.getElementById('transfer-box').style.display = 'block';
        window.targetPhone = phone;
    } else {
        resultDiv.innerText = "❌ 玩家不存在";
        document.getElementById('transfer-box').style.display = 'none';
    }
}

// 赠送积分
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
        document.getElementById('transfer-box').style.display = 'none';
        document.getElementById('search-phone').value = '';
        document.getElementById('search-result').innerText = '';
    } else {
        alert(data.error);
    }
}