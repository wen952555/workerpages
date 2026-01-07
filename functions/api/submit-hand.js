export async function onRequestPost(context) {
    const { env } = context;
    const db = env.DB;

    try {
        const { userId, carriageId, tableIndex, layout } = await context.request.json();

        // 更新当前局为 SUBMITTED
        await db.prepare(
            "UPDATE player_actions SET layout = ?, status = 'SUBMITTED', updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND carriage_id = ? AND table_index = ?"
        ).bind(JSON.stringify(layout), userId, carriageId, tableIndex).run();

        // 尝试获取下一局手牌
        if (tableIndex < 9) {
            const nextIndex = tableIndex + 1;
            const carriage = await db.prepare("SELECT hands_json, track_id FROM carriages WHERE id = ?").bind(carriageId).first();
            const track = await db.prepare("SELECT * FROM tracks WHERE id = ?").bind(carriage.track_id).first();
            
            let seat = 'user_e';
            if (track.user_s === userId) seat = 'user_s';
            else if (track.user_w === userId) seat = 'user_w';
            else if (track.user_n === userId) seat = 'user_n';

            const hands = JSON.parse(carriage.hands_json);
            
            // 插入下一局的 VIEWED 记录
            await db.prepare("INSERT OR IGNORE INTO player_actions (user_id, carriage_id, table_index, status) VALUES (?, ?, ?, 'VIEWED')")
                .bind(userId, carriageId, nextIndex).run();

            return new Response(JSON.stringify({ success: true, nextHand: hands[nextIndex][seat], nextIndex }));
        }

        return new Response(JSON.stringify({ success: true, message: "本场次完成" }));

    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
    }
}