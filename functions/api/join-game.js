export async function onRequestPost(context) {
    const { userId, sessionType } = await context.request.json();
    const db = context.env.DB;

    // 1. 寻找该场次有没有未满的轨道
    let track = await db.prepare(
        "SELECT * FROM tracks WHERE session_type = ? AND (user_e IS NULL OR user_s IS NULL OR user_w IS NULL OR user_n IS NULL) ORDER BY id DESC LIMIT 1"
    ).bind(sessionType).first();

    let seat = '';
    if (!track) {
        // 全满或没开，创建新轨道
        const info = await db.prepare("INSERT INTO tracks (session_type, user_e) VALUES (?, ?)").bind(sessionType, userId).run();
        track = { id: info.meta.last_row_id };
        seat = 'user_e';
    } else {
        // 有空位，依次填充
        if (!track.user_e) seat = 'user_e';
        else if (!track.user_s) seat = 'user_s';
        else if (!track.user_w) seat = 'user_w';
        else seat = 'user_n';
        
        await db.prepare(`UPDATE tracks SET ${seat} = ? WHERE id = ?`).bind(userId, track.id).run();
    }

    // 2. 检查或生成第一轮车厢（10局牌）
    let carriage = await db.prepare("SELECT * FROM carriages WHERE track_id = ? AND round_index = 1").bind(track.id).first();
    
    if (!carriage) {
        // 生成 10 局牌的 JSON (此处为简化版逻辑，实际应循环10次生成不同牌)
        const hands = [];
        const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
        const values = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];
        
        for(let i=0; i<10; i++) {
            // 简单演示：生成一局牌的东南西北四份
            hands.push({
                table: i,
                user_e: [{value:'ace', suit:'spades'}, /* ... 12张 */],
                user_s: [/* ... 13张 */],
                user_w: [/* ... 13张 */],
                user_n: [/* ... 13张 */]
            });
        }
        
        const info = await db.prepare("INSERT INTO carriages (track_id, round_index, hands_json) VALUES (?, 1, ?)")
            .bind(track.id, JSON.stringify(hands)).run();
        carriage = { id: info.meta.last_row_id, hands_json: JSON.stringify(hands) };
    }

    const allHands = JSON.parse(carriage.hands_json);
    // 返回该席位（例如 user_e）的第 1 局手牌
    const seatKey = seat; // 对应 JSON 里的 user_e 等
    
    return new Response(JSON.stringify({
        success: true,
        trackId: track.id,
        carriageId: carriage.id,
        seat: seatKey,
        tableIndex: 0,
        currentHand: allHands[0][seatKey] 
    }));
}