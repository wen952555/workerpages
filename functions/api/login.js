export async function onRequestPost(context) {
    const { phone, password } = await context.request.json();

    try {
        // 在数据库中查找匹配的手机号和密码
        const user = await context.env.DB.prepare(
            "SELECT phone, nickname, coins FROM users WHERE phone = ? AND password = ?"
        ).bind(phone, password).first();

        if (!user) {
            return new Response(JSON.stringify({ error: "手机号或密码错误" }), { status: 401 });
        }

        return new Response(JSON.stringify({ success: true, user }));
    } catch (e) {
        return new Response(JSON.stringify({ error: "服务器内部错误" }), { status: 500 });
    }
}