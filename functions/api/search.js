
export async function onRequestGet(context) {
    const { searchParams } = new URL(context.request.url);
    const phone = searchParams.get('phone');

    const user = await context.env.DB.prepare(
        "SELECT nickname FROM users WHERE phone = ?"
    ).bind(phone).first();

    if (!user) {
        return new Response(JSON.stringify({ error: "未找到该玩家" }), { status: 404 });
    }

    return new Response(JSON.stringify(user));
}
