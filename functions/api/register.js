
export async function onRequestPost(context) {
    const { phone, nickname, password } = await context.request.json();

    // 校验：密码必须是 6 位
    if (!password || password.length !== 6) {
        return new Response(JSON.stringify({ error: "密码必须为6位" }), { status: 400 });
    }

    try {
        // 插入数据库，初始1000积分
        await context.env.DB.prepare(
            "INSERT INTO users (phone, nickname, password, coins) VALUES (?, ?, ?, 1000)"
        ).bind(phone, nickname, password).run();

        return new Response(JSON.stringify({ success: true, message: "注册成功！" }));
    } catch (e) {
        return new Response(JSON.stringify({ error: "手机号已存在或注册失败" }), { status: 400 });
    }
}
