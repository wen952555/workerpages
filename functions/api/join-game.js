export async function onRequestPost(context) {
    const { userId, sessionType } = await context.request.json();
    const db = context.env.DB;

    // 1. 查找玩家是否已在某个未结束的轨道中
    let track = await db.prepare(
        "SELECT * FROM tracks WHERE session_type = ? AND (user_e=? OR user_s=? OR user_w=? OR user_n=?)"
    ).bind(sessionType, userId, userId, userId, userId).first();

    let seat = '';
    if (!track) {
        // 找不到则寻找未满员的轨道
        track = await db.prepare(
            "SELECT * FROM tracks WHERE session_type = ? AND (user_e IS NULL OR user_s IS NULL OR user_w IS NULL OR user_n IS NULL) LIMIT 1"
        ).bind(sessionType).first();

        if (!track) {
            const info = await db.prepare("INSERT INTO tracks (session_type, user_e) VALUES (?, ?)").bind(sessionType, userId).run();
            track = { id: info.meta.last_row_id };
            seat = 'user_e';
        } else {
            if (!track.user_e) seat = 'user_e';
            else if (!track.user_s) seat = 'user_s';
            else if (!track.user_w) seat = 'user_w';
            else seat = 'user_n';
            await db.prepare(`UPDATE tracks SET ${seat} = ? WHERE id = ?`).bind(userId, track.id).run();
        }
    } else {
        // 已在轨道中，确定席位
        if (track.user_e === userId) seat = 'user_e';
        else if (track.user_s === userId) seat = 'user_s';
        else if (track.user_w === userId) seat = 'user_w';
        else seat = 'user_n';
    }

    // 2. 确定玩家当前打到第几轮 (Carriage Round)
    // 逻辑：查询该玩家在该轨道下最后提交的 carriage_id
    const lastAction = await db.prepare(
        "SELECT c.round_index, a.table_index FROM player_actions a JOIN carriages c ON a.carriage_id = c.id WHERE a.user_id = ? AND c.track_id = ? ORDER BY c.round_index DESC, a.table_index DESC LIMIT 1"
    ).bind(userId, track.id).first();

    let roundIndex = lastAction ? (lastAction.table_index >= 9 ? lastAction.round_index + 1 : lastAction.round_index) : 1;
    let tableIndex = lastAction ? (lastAction.table_index >= 9 ? 0 : lastAction.table_index + 1) : 0;

    // 3. 获取或生成该轮的车厢牌稿
    let carriage = await db.prepare("SELECT * FROM carriages WHERE track_id = ? AND round_index = ?").bind(track.id, roundIndex).first();
    if (!carriage) {
        const newHands = generate10Tables(); // 模拟发 10 局牌的函数
        const info = await db.prepare("INSERT INTO carriages (track_id, round_index, hands_json) VALUES (?, ?, ?)")
            .bind(track.id, roundIndex, JSON.stringify(newHands)).run();
        carriage = { id: info.meta.last_row_id, hands_json: JSON.stringify(newHands) };
    }

    const allHands = JSON.parse(carriage.hands_json);
    
    // 标记为 VIEWED (看牌防逃跑)
    await db.prepare("INSERT INTO player_actions (user_id, carriage_id, table_index, status) VALUES (?, ?, ?, 'VIEWED')")
        .bind(userId, carriage.id, tableIndex).run();

    return new Response(JSON.stringify({
        success: true,
        trackId: track.id,
        carriageId: carriage.id,
        seat: seat,
        tableIndex: tableIndex,
        currentHand: allHands[tableIndex][seat]
    }));
}

// 模拟发牌逻辑 (52张洗牌分四份，循环10次)
function generate10Tables() {
    const hands = [];
    const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    const values = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];
    for(let i=0; i<10; i++) {
        let deck = [];
        suits.forEach(s => values.forEach(v => deck.push({value:v, suit:s})));
        deck.sort(() => Math.random() - 0.5);
        hands.push({
            user_e: deck.slice(0, 13),
            user_s: deck.slice(13, 26),
            user_w: deck.slice(26, 39),
            user_n: deck.slice(39, 52)
        });
    }
    return hands;
}