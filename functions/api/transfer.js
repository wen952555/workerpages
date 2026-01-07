
export async function onRequestPost(context) {
    const { fromPhone, toPhone, amount } = await context.request.json();
    const val = parseInt(amount);

    if (val <= 0) return new Response(JSON.stringify({ error: "金额不正确" }), { status: 400 });

    // 1. 检查发件人余额
    const sender = await context.env.DB.prepare("SELECT id, coins FROM users WHERE phone = ?").bind(fromPhone).first();
    if (!sender || sender.coins < val) {
        return new Response(JSON.stringify({ error: "余额不足" }), { status: 400 });
    }

    // 2. 检查收件人是否存在
    const receiver = await context.env.DB.prepare("SELECT id FROM users WHERE phone = ?").bind(toPhone).first();
    if (!receiver) return new Response(JSON.stringify({ error: "接收人不存在" }), { status: 400 });

    try {
        // 3. 执行原子操作（扣款、存款、记录）
        // D1 当前建议分步执行或使用 batch
        await context.env.DB.batch([
            context.env.DB.prepare("UPDATE users SET coins = coins - ? WHERE phone = ?").bind(val, fromPhone),
            context.env.DB.prepare("UPDATE users SET coins = coins + ? WHERE phone = ?").bind(val, toPhone),
            context.env.DB.prepare("INSERT INTO transfers (from_user_id, to_user_id, amount) VALUES (?, ?, ?)").bind(sender.id, receiver.id, val)
        ]);

        return new Response(JSON.stringify({ success: true, newBalance: sender.coins - val }));
    } catch (e) {
        return new Response(JSON.stringify({ error: "赠送失败" }), { status: 500 });
    }
}
