export async function onRequestPost(context) {
    const { env } = context;
    let body;
    try {
        body = await context.request.json();
    } catch (e) {
        return new Response("No Body", { status: 200 });
    }

    const chatId = body.message?.chat?.id;
    const text = body.message?.text || "";
    const adminId = parseInt(env.ADMIN_ID);

    // 调试：如果不是管理员，先回复一条消息告知当前 ID
    if (chatId !== adminId) {
        await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: `安全校验失败！你的 ID 是 ${chatId}，但管理员 ID 设置为 ${adminId}。请检查环境变量。`
            })
        });
        return new Response("Unauthorized", { status: 200 }); // 返回200防止Telegram重试
    }

    let responseText = "";

    // 专门处理 /start 命令
    if (text === "/start") {
        responseText = "✅ 管理员你好！系统已连接成功。\n可用命令：\n/search 手机号\n/add 手机号 分数\n/sub 手机号 分数\n/delete 手机号";
    } else {
        const [command, phone, val] = text.split(" ");

        try {
            if (command === "/search") {
                const user = await env.DB.prepare("SELECT nickname, coins FROM users WHERE phone = ?").bind(phone).first();
                responseText = user ? `👤 玩家: ${user.nickname}\n💰 积分: ${user.coins}` : "❌ 未找到该用户";
            } 
            else if (command === "/add") {
                const amount = parseInt(val);
                await env.DB.prepare("UPDATE users SET coins = coins + ? WHERE phone = ?").bind(amount, phone).run();
                responseText = `✅ 已给 ${phone} 增加 ${amount} 积分`;
            } 
            else if (command === "/sub") {
                const amount = parseInt(val);
                await env.DB.prepare("UPDATE users SET coins = coins - ? WHERE phone = ?").bind(amount, phone).run();
                responseText = `📉 已扣除 ${phone} ${amount} 积分`;
            }
            else if (command === "/delete") {
                await env.DB.prepare("DELETE FROM users WHERE phone = ?").bind(phone).run();
                responseText = `⚠️ 用户 ${phone} 已永久删除`;
            }
            else {
                responseText = "❓ 未知指令，请输入 /start 查看帮助";
            }
        } catch (e) {
            responseText = "❌ 数据库操作出错: " + e.message;
        }
    }

    // 发送回执
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: responseText
        })
    });

    return new Response("OK");
}