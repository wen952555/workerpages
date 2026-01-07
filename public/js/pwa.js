window.onload = () => {
    // 自动登录
    const saved = localStorage.getItem('shisanshui_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('game-hall').style.display = 'block';
        document.getElementById('user-name').innerText = currentUser.nickname;
        document.getElementById('user-coins').innerText = currentUser.coins;
        startPolling();
    }

    // PWA 更新
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            reg.onupdatefound = () => {
                const nw = reg.installing;
                nw.onstatechange = () => {
                    if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                        if (confirm("新版本已发布，是否立即刷新体验新界面？")) location.reload();
                    }
                };
            };
        });
    }
};