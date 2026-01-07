function startPolling() {
    const update = async () => {
        ['8pm', '12pm'].forEach(async type => {
            try {
                const res = await fetch(`/api/lobby-status?type=${type}`);
                const data = await res.json();
                document.getElementById(`count-${type}`).innerText = `${data.count}/4`;
            } catch (e) {}
        });
    };
    update();
    setInterval(update, 5000);
}

function togglePointsManage() {
    const m = document.getElementById('points-modal');
    m.style.display = m.style.display === 'none' ? 'flex' : 'none';
}

async function searchPlayer() {
    const phone = document.getElementById('search-phone').value;
    const res = await fetch(`/api/search?phone=${phone}`);
    const data = await res.json();
    const div = document.getElementById('search-result');
    if (data.nickname) {
        div.innerHTML = `<div style="color:green;padding:10px;background:#f0fff0;margin-top:10px">✅ 找到玩家: ${data.nickname}</div>`;
        document.getElementById('transfer-box').style.display = 'block';
        window.targetPhone = phone;
    } else div.innerHTML = "❌ 玩家不存在";
}

async function sendCoins() {
    const amount = document.getElementById('send-amount').value;
    const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({fromPhone: currentUser.phone, toPhone: window.targetPhone, amount})
    });
    const data = await res.json();
    if(data.success) {
        alert("赠送成功！");
        location.reload();
    } else alert(data.error);
}