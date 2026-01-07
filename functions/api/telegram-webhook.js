export async function onRequestPost(context) {
    const { env } = context;
    const body = await context.request.json();
    const chatId = body.message?.chat?.id;
    const text = body.message?.text || "";
    const adminId = parseInt(env.ADMIN_ID);

    if (chatId !== adminId) return new Response("OK");

    const token = env.TELEGRAM_TOKEN;
    const apiUrl = `https://api.telegram.org/bot${token}/sendMessage`;

    // 1. 获取管理员当前状态
    let admin = await env.DB.prepare("SELECT * FROM admin_states WHERE id = ?").bind(chatId).first();
    if (!admin) {
        await env.DB.prepare("INSERT INTO admin_states (id, state) VALUES (?, 'IDLE')").bind(chatId).run();
        admin = { state: 'IDLE' };
    }

    // 2. 定义主菜单键盘
    const mainKeyboard = {
        keyboard: [
            [{ text: "🔍 搜索玩家" }, { text: "📊 系统统计" }],
            [{ text: "➕ 增加积分" }, { text: "➖ 扣除积分" }],
            [{ text: "❌ 删除用户" }, { text: "🏠 返回主菜单" }]
        ],
        resize_keyboard: true
    };

    let responseText = "";

    // 3. 处理主菜单点击（切换状态）
    if (text === "🏠 返回主菜单" || text === "/start") {
        await env.DB.prepare("UPDATE admin_states SET state = 'IDLE', target_phone = NULL WHERE id = ?").bind(chatId).run();
        responseText = "已返回主菜单，请选择操作：";
    } 
    else if (text === "🔍 搜索玩家") {
        await env.DB.prepare("UPDATE admin_states SET state = 'WAIT_SEARCH' WHERE id = ?").bind(chatId).run();
        responseText = "请输入要查询的玩家【手机号】：";
    }
    else if (text === "➕ 增加积分") {
        await env.DB.prepare("UPDATE admin_states SET state = 'WAIT_ADD_PHONE' WHERE id = ?").bind(chatId).run();
        responseText = "【上分】第一步：请输入玩家【手机号】：";
    }
    else if (text === "➖ 扣除积分") {
        await env.DB.prepare("UPDATE admin_states SET state = 'WAIT_SUB_PHONE' WHERE id = ?").bind(chatId).run();
        responseText = "【下分】第一步：请输入玩家【手机号】：";
    }
    else if (text === "❌ 删除用户") {
        await env.DB.prepare("UPDATE admin_states SET state = 'WAIT_DELETE' WHERE id = ?").bind(chatId).run();
        responseText = "❗ 危险操作：请输入要删除的玩家【手机号】：";
    }
    else if (text === "📊 系统统计") {
        const stats = await env.DB.prepare("SELECT COUNT(*) as total, SUM(coins) as sum_coins FROM users").first();
        responseText = `📊 系统统计：\n总玩家数：${stats.total}\n总流通积分：${stats.sum_coins}`;
    }

    // 4. 根据状态处理具体输入
    else {
        switch (admin.state) {
            case 'WAIT_SEARCH':
                const user = await env.DB.prepare("SELECT * FROM users WHERE phone = ?").bind(text).first();
                responseText = user ? `👤 玩家: ${user.nickname}\n💰 积分: ${user.coins}` : "❌ 未找到该用户";
                break;

            case 'WAIT_DELETE':
                await env.DB.prepare("DELETE FROM users WHERE phone = ?").bind(text).run();
                responseText = `⚠️ 用户 ${text} 已被永久删除。`;
                await env.DB.prepare("UPDATE admin_states SET state = 'IDLE' WHERE id = ?").bind(chatId).run();
                break;

            case 'WAIT_ADD_PHONE':
            case 'WAIT_SUB_PHONE':
                // 记录目标手机号，进入等待输入金额状态
                const nextState = admin.state === 'WAIT_ADD_PHONE' ? 'WAIT_ADD_VALUE' : 'WAIT_SUB_VALUE';
                await env.DB.prepare("UPDATE admin_states SET state = ?, target_phone = ? WHERE id = ?").bind(nextState, text, chatId).run();
                responseText = `已选定用户: ${text}\n第二步：请输入要操作的【积分数额】：`;
                break;

            case 'WAIT_ADD_VALUE':
            case 'WAIT_SUB_VALUE':
                const amount = parseInt(text);
                if (isNaN(amount)) {
                    responseText = "❌ 请输入有效的数字！";
                } else {
                    const op = admin.state === 'WAIT_ADD_VALUE' ? '+' : '-';
                    await env.DB.prepare(`UPDATE users SET coins = coins ${op} ? WHERE phone = ?`).bind(amount, admin.target_phone).run();
                    responseText = `✅ 成功！用户 ${admin.target_phone} 的积分已更新 ${op}${amount}`;
                    await env.DB.prepare("UPDATE admin_states SET state = 'IDLE', target_phone = NULL WHERE id = ?").bind(chatId).run();
                }
                break;

            default:
                responseText = "请先选择下方菜单中的操作。";
        }
    }

    // 5. 发送响应
    await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: responseText,
            reply_markup: mainKeyboard
        })
    });

    return new Response("OK");
}