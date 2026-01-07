let currentUser = null;
let isRegisterMode = false;

function toggleAuthMode(reg) {
    isRegisterMode = reg;
    document.getElementById('auth-title').innerText = reg ? '玩家注册' : '玩家登录';
    document.getElementById('auth-nick').style.display = reg ? 'block' : 'none';
    document.getElementById('primary-btn').innerText = reg ? '立即注册' : '立即登录';
}

async function handleAuth() {
    const phone = document.getElementById('auth-phone').value;
    const password = document.getElementById('auth-pass').value;
    const nickname = document.getElementById('auth-nick').value;
    const ep = isRegisterMode ? '/api/register' : '/api/login';
    
    try {
        const res = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password, nickname })
        });
        const data = await res.json();
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('shisanshui_user', JSON.stringify(currentUser));
            location.reload(); // 刷新让 pwa.js 接管进入大厅
        } else alert(data.error);
    } catch (e) { alert("认证请求失败"); }
}

function logout() {
    if(confirm("确定退出？")) {
        localStorage.removeItem('shisanshui_user');
        location.reload();
    }
}