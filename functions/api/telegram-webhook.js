export async function onRequestPost(context) {
    const { env } = context;
    const body = await context.request.json();

    // 1. 安全校验：只允许管理员操作
    const chatId = body.message?.chat?.id;
    const text = body.message?.text || "";
    const adminId = parseInt(env.ADMIN_ID);

    if (chatId !== adminId) return new Response("Unauthorized", { status: 403 });

    // 2. 命令解析逻辑
    const [command, phone, val] = text.split(" ");

    let responseText = "未知命令。可用命令：\n/search 手机号\n/delete 手机号\n/add 手机号 分数\n/sub 手机号 分数";

    try {
        if (command === "/search") {
            const user = await env.DB.prepare("SELECT nickname, coins FROM users WHERE phone = ?").bind(phone).first();
            responseText = user ? `玩家: ${user.nickname}\n积分: ${user.coins}` : "未找到该用户";
        } 
        
        else if (command === "/delete") {
            await env.DB.prepare("DELETE FROM users WHERE phone = ?").bind(phone).run();
            responseText = `用户 ${phone} 已永久删除`;
        } 
        
        else if (command === "/add") {
            const amount = parseInt(val);
            await env.DB.prepare("UPDATE users SET coins = coins + ? WHERE phone = ?").bind(amount, phone).run();
            responseText = `已给 ${phone} 增加 ${amount} 积分`;
        } 
        
        else if (command === "/sub") {
            const amount = parseInt(val);
            await env.DB.prepare("UPDATE users SET coins = coins - ? WHERE phone = ?").bind(amount, phone).run();
            responseText = `已扣除 ${phone} ${amount} 积分`;
        }

        // 3. 发送反馈给 Telegram
        await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: responseText
            })
        });
    } catch (e) {
        // 报错反馈
        await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: "执行出错: " + e.message })
        });
    }

    return new Response("OK");
}