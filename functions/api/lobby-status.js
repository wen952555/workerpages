export async function onRequestGet(context) {
    const { searchParams } = new URL(context.request.url);
    const type = searchParams.get('type'); // '8pm' 或 '12pm'

    try {
        // 查找该场次最新的一条轨道
        const latestTrack = await context.env.DB.prepare(
            "SELECT * FROM tracks WHERE session_type = ? ORDER BY id DESC LIMIT 1"
        ).bind(type).first();

        if (!latestTrack) return new Response(JSON.stringify({ count: 0 }));

        // 计算当前轨道有多少人（不为 null 的字段数）
        let count = 0;
        if (latestTrack.user_e) count++;
        if (latestTrack.user_s) count++;
        if (latestTrack.user_w) count++;
        if (latestTrack.user_n) count++;

        // 如果满了，逻辑上返回 0，让第五个人看到是新场次
        return new Response(JSON.stringify({ count: count >= 4 ? 0 : count }));
    } catch (e) {
        return new Response(JSON.stringify({ count: 0 }));
    }
}