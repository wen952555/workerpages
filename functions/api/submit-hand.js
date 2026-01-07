export async function onRequestPost(context) {
    const { env } = context;
    const { userId, carriageId, tableIndex, layout } = await context.request.json();

    try {
        await env.DB.prepare("UPDATE player_actions SET layout = ?, status = 'SUBMITTED' WHERE user_id = ? AND carriage_id = ? AND table_index = ?")
            .bind(JSON.stringify(layout), userId, carriageId, tableIndex).run();

        if (tableIndex < 9) {
            const nextIdx = tableIndex + 1;
            const carriage = await env.DB.prepare("SELECT hands_json, track_id FROM carriages WHERE id = ?").bind(carriageId).first();
            const track = await env.DB.prepare("SELECT * FROM tracks WHERE id = ?").bind(carriage.track_id).first();
            
            let seat = 'user_e';
            if (track.user_s === userId) seat = 'user_s';
            else if (track.user_w === userId) seat = 'user_w';
            else if (track.user_n === userId) seat = 'user_n';

            const nextHand = JSON.parse(carriage.hands_json)[nextIdx][seat];
            await env.DB.prepare("INSERT OR IGNORE INTO player_actions (user_id, carriage_id, table_index, status) VALUES (?, ?, ?, 'VIEWED')")
                .bind(userId, carriageId, nextIdx).run();

            return new Response(JSON.stringify({ success: true, nextHand, nextIndex: nextIdx }));
        }
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
    }
}