/**
 * 十三水专业版 - 核心逻辑控制脚本
 */

let isRegisterMode = false;
let currentUser = null;

// ==========================================
// 1. PWA 自动更新检测逻辑 (最专业做法)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            // 监听是否有新的 Service Worker 在后台下载并安装
            reg.onupdatefound = () => {
                const newWorker = reg.installing;
                newWorker.onstatechange = () => {
                    // 当新版本安装完成且旧版本正在运行时，提示用户
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        if (confirm("发现游戏有新版本（如新大厅或新功能），是否立即刷新体验？")) {
                            window.location.reload();
                        }
                    }
                };
            };
        }).catch(err => console.log("SW注册失败:", err));
    });
}

// ==========================================
// 2. 初始化与自动登录
// ==========================================
window.onload = () => {
    const savedUser = localStorage.getItem('shisanshui_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showHall();
    }
};

// ==========================================
// 3. 认证逻辑 (登录/注册)
// ==========================================

// 切换登录和注册模式
function toggleAuthMode(toRegister) {
    isRegisterMode = toRegister;
    document.getElementById('auth-title').innerText = isRegisterMode ? '玩家注册' : '玩家登录';
    document.getElementById('auth-nick').style.display = isRegisterMode ? 'block' : 'none';
    document.getElementById('primary-btn').innerText = isRegisterMode ? '立即注册' : '立即登录';
    document.getElementById('toggle-text').innerHTML = isRegisterMode ? 
        '已有账号？<a href="javascript:void(0)" onclick="toggleAuthMode(false)">立即登录</a>' : 
        '没有账号？<a href="javascript:void(0)" onclick="toggleAuthMode(true)">立即注册</a>';
}

// 处理登录或注册请求
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
            // 保存用户信息到本地存储
            currentUser = data.user || { phone, nickname, coins: 1000 };
            localStorage.setItem('shisanshui_user', JSON.stringify(currentUser));
            showHall();
        } else {
            alert(data.error || "操作失败，请检查账号密码");
        }
    } catch (e) {
        alert("网络连接失败，请检查网络");
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
// 4. 大厅与积分管理逻辑
// ==========================================

// 进入大厅界面
function showHall() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('game-hall').style.display = 'block';
    document.getElementById('user-name').innerText = currentUser.nickname;
    document.getElementById('user-coins').innerText = currentUser.coins;
}

// 切换积分管理弹窗显示/隐藏
function togglePointsManage() {
    const modal = document.getElementById('points-modal');
    const isHidden = modal.style.display === 'none';
    modal.style.display = isHidden ? 'flex' : 'none';
    
    // 如果是关闭弹窗，清空一下搜索记录
    if (!isHidden) {
        document.getElementById('search-phone').value = '';
        document.getElementById('search-result').innerText = '';
        document.getElementById('transfer-box').style.display = 'none';
    }
}

// 预约游戏场次
function reserveGame(gameName) {
    alert(`预约成功！\n您已加入：${gameName}\n请准时参加，系统将自动核算积分。`);
}

// 搜索玩家
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
            resultDiv.innerHTML = `✅ 目标玩家: <b>${data.nickname}</b>`;
            document.getElementById('transfer-box').style.display = 'block';
            window.targetPhone = phone; // 临时记录目标
        } else {
            resultDiv.innerHTML = `<span style="color:#ff4d4d">❌ 用户不存在</span>`;
            document.getElementById('transfer-box').style.display = 'none';
        }
    } catch (e) {
        alert("搜索失败");
    }
}

// 确认赠送积分
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
            // 更新本地数据
            currentUser.coins = data.newBalance;
            document.getElementById('user-coins').innerText = currentUser.coins;
            localStorage.setItem('shisanshui_user', JSON.stringify(currentUser));
            
            // 关闭弹窗
            togglePointsManage();
        } else {
            alert("赠送失败: " + data.error);
        }
    } catch (e) {
        alert("转账请求失败");
    }
}