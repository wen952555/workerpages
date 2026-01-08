/**
 * API: /api/join-game
 * 功能: 处理玩家加入游戏场次的请求
 * 方法: POST
 * 参数: { userId: string, sessionType: 'FRIEND' | 'RANDOM' }
 * 响应: { success: boolean, error?: string, ...gameState }
 */
export async function onRequestPost(context) {
    const { env } = context;
    const db = env.DB;

    try {
        const { userId, sessionType } = await context.request.json();
        const seats = ['user_e', 'user_s', 'user_w', 'user_n'];

        // 步骤 1: 查找玩家是否已在活跃的牌桌中
        let track = await db.prepare(
            "SELECT * FROM tracks WHERE session_type = ? AND (user_e = ? OR user_s = ? OR user_w = ? OR user_n = ?) AND status = 'ACTIVE' LIMIT 1"
        ).bind(sessionType, userId, userId, userId, userId).first();

        // 步骤 2: 如果玩家不在任何牌桌，则为他寻找或创建一个
        if (!track) {
            // 2a. 查找有空位的活跃牌桌
            const openTrack = await db.prepare(
                "SELECT * FROM tracks WHERE session_type = ? AND status = 'ACTIVE' AND (user_e IS NULL OR user_s IS NULL OR user_w IS NULL OR user_n IS NULL) ORDER BY id DESC LIMIT 1"
            ).bind(sessionType).first();

            if (openTrack) {
                // 2b. 找到空位，加入牌桌
                track = openTrack;
                const emptySeat = seats.find(s => !track[s]);
                await db.prepare(`UPDATE tracks SET ${emptySeat} = ? WHERE id = ?`).bind(userId, track.id).run();
                track[emptySeat] = userId; // 更新内存中的 track 对象
            } else {
                // 2c. 没有空位，创建新牌桌
                const info = await db.prepare("INSERT INTO tracks (session_type, user_e) VALUES (?, ?)")
                    .bind(sessionType, userId).run();
                track = await db.prepare("SELECT * FROM tracks WHERE id = ?").bind(info.meta.last_row_id).first();
            }
        }

        // 步骤 3: 确定玩家的具体座位
        const seat = seats.find(s => track[s] === userId);
        if (!seat) {
            return new Response(JSON.stringify({ success: false, error: "无法为玩家分配座位。" }), { status: 500 });
        }

        // 步骤 4: 获取或生成本轮（第1轮）的牌局（共10局）
        let carriage = await db.prepare("SELECT * FROM carriages WHERE track_id = ? AND round_index = 1").bind(track.id).first();
        
        if (!carriage) {
            const allHands = createNewRounds(); // 调用辅助函数生成10局牌
            const handsJson = JSON.stringify(allHands);
            const info = await db.prepare("INSERT INTO carriages (track_id, round_index, hands_json) VALUES (?, 1, ?)")
                .bind(track.id, handsJson).run();
            carriage = { id: info.meta.last_row_id, hands_json: handsJson, track_id: track.id };
        }

        // 步骤 5: 确定玩家进度，返回牌局状态
        // 查找玩家已提交的最新牌局
        const lastAction = await db.prepare(
            "SELECT table_index FROM player_actions WHERE user_id = ? AND carriage_id = ? AND status = 'SUBMITTED' ORDER BY table_index DESC LIMIT 1"
        ).bind(userId, carriage.id).first();

        const tableIndex = lastAction ? lastAction.table_index + 1 : 0;
        const handsData = JSON.parse(carriage.hands_json);
        
        // 如果是最后一局之后，则不继续
        if (tableIndex >= handsData.length) {
             return new Response(JSON.stringify({ success: false, error: "您已完成本轮所有牌局。" }));
        }

        // 记录玩家已查看当前牌局
        await db.prepare("INSERT OR IGNORE INTO player_actions (user_id, carriage_id, table_index, status) VALUES (?, ?, ?, 'VIEWED')")
            .bind(userId, carriage.id, tableIndex).run();
        
        const trackProgress = seats.map(s => (track[s] ? 1 : 0));

        return new Response(JSON.stringify({
            success: true,
            trackId: track.id,
            carriageId: carriage.id,
            seat: seat,
            tableIndex: tableIndex,
            currentHand: handsData[tableIndex][seat],
            trackProgress: trackProgress
        }));

    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ success: false, error: "服务器内部错误：" + e.message }), { status: 500 });
    }
}

/**
 * 创建新的一轮牌局（10局）
 * @returns {Array} 包含10局牌的数组，每局包含四个玩家的手牌
 */
function createNewRounds() {
    const allRounds = [];
    const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    const values = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];

    for(let i = 0; i < 10; i++) {
        let deck = [];
        suits.forEach(s => values.forEach(v => deck.push({value: v, suit: s})));
        
        // Fisher-Yates 洗牌算法
        for (let j = deck.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            [deck[j], deck[k]] = [deck[k], deck[j]];
        }
        allRounds.push({
            user_e: deck.slice(0, 13),
            user_s: deck.slice(13, 26),
            user_w: deck.slice(26, 39),
            user_n: deck.slice(39, 52)
        });
    }
    return allRounds;
}
