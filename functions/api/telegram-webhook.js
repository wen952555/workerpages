export async function onRequestPost(context) {
    const { env } = context;
    const body = await context.request.json();
    const chatId = body.message?.chat?.id;
    const text = body.message?.text || "";
    const adminId = parseInt(env.ADMIN_ID);

    if (chatId !== adminId) return new Response("OK");

    const token = env.TELEGRAM_TOKEN;
    const apiUrl = `https://api.telegram.org/bot${token}/sendMessage`;

    // 定义底部菜单键盘
    const mainKeyboard = {
        keyboard: [
            [{ text: "🔍 搜索玩家" }, { text: "📈 整体统计" }],
            [{ text: "❓ 帮助" }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    };

    let responseText = "";

    // --- 逻辑分发 ---

    if (text === "/start" || text === "❓ 帮助") {
        responseText = "欢迎来到十三水管理后台！\n请使用下方菜单进行操作。\n\n💡 提示：直接发送手机号即可快速搜索。";
    } 
    
    else if (text === "🔍 搜索玩家") {
        responseText = "请直接输入玩家的【手机号】进行查询：";
    }

    else if (text === "📈 整体统计") {
        const stats = await env.DB.prepare("SELECT COUNT(*) as total, SUM(coins) as sum_coins FROM users").first();
        responseText = `📊 系统统计：\n总玩家数：${stats.total}\n总流通积分：${stats.sum_coins}`;
    }

    // 处理手机号搜索 (假设手机号为11位数字)
    else if (/^\d{11}$/.test(text)) {
        const user = await env.DB.prepare("SELECT * FROM users WHERE phone = ?").bind(text).first();
        if (user) {
            responseText = `👤 玩家信息\n昵称：${user.nickname}\n手机：${user.phone}\n积分：${user.coins}\n注册时间：${user.created_at}\n\n发送指令修改积分：\n/add ${user.phone} 100 (加100)\n/sub ${user.phone} 100 (扣100)\n/delete ${user.phone} (删人)`;
        } else {
            responseText = "❌ 未找到该用户。";
        }
    }

    // 处理加分/扣分指令
    else if (text.startsWith("/add") || text.startsWith("/sub")) {
        const [cmd, phone, val] = text.split(" ");
        const amount = parseInt(val);
        if (!phone || isNaN(amount)) {
            responseText = "指令格式错误。示例：/add 13800138000 100";
        } else {
            const operator = cmd === "/add" ? "+" : "-";
            await env.DB.prepare(`UPDATE users SET coins = coins ${operator} ? WHERE phone = ?`).bind(amount, phone).run();
            responseText = `✅ 操作成功！用户 ${phone} 积分已更新。`;
        }
    }

    else if (text.startsWith("/delete")) {
        const [cmd, phone] = text.split(" ");
        await env.DB.prepare("DELETE FROM users WHERE phone = ?").bind(phone).run();
        responseText = `⚠️ 用户 ${phone} 已永久删除。`;
    }

    else {
        responseText = "未知指令，请点击下方菜单。";
    }

    // 发送消息
    await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: responseText,
            reply_markup: mainKeyboard // 携带键盘
        })
    });

    return new Response("OK");
}