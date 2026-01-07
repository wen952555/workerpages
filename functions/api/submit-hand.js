export async function onRequestPost(context) {
    const { env } = context;
    const { userId, carriageId, tableIndex, layout } = await context.request.json();
    
    // 1. 保存当前理牌
    await env.DB.prepare("UPDATE player_actions SET layout = ?, status = 'SUBMITTED' WHERE user_id = ? AND carriage_id = ? AND table_index = ?")
        .bind(JSON.stringify(layout), userId, carriageId, tableIndex).run();
    
    // 2. 检查是否有下一局 (0-9局)
    if (tableIndex < 9) {
        const nextIndex = tableIndex + 1;
        const carriage = await env.DB.prepare("SELECT hands_json FROM carriages WHERE id = ?").bind(carriageId).first();
        const hands = JSON.parse(carriage.hands_json);
        // 获取席位名
        const track = await env.DB.prepare("SELECT * FROM tracks t JOIN carriages c ON t.id = c.track_id WHERE c.id = ?").bind(carriageId).first();
        let seat = 'user_e';
        if (track.user_s === userId) seat = 'user_s';
        else if (track.user_w === userId) seat = 'user_w';
        else if (track.user_n === userId) seat = 'user_n';

        // 插入下一局的已看牌记录
        await env.DB.prepare("INSERT INTO player_actions (user_id, carriage_id, table_index, status) VALUES (?, ?, ?, 'VIEWED')")
            .bind(userId, carriageId, nextIndex).run();

        return new Response(JSON.stringify({ nextHand: hands[nextIndex][seat], nextIndex }));
    }
    
    return new Response(JSON.stringify({ success: true }));
}