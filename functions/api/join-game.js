export async function onRequestPost(context) {
    const { env } = context;
    const db = env.DB;

    try {
        const { userId, sessionType } = await context.request.json();

        // 1. 寻找未满员轨道 (user_e, user_s, user_w, user_n 其中一个为 null)
        let track = await db.prepare(
            "SELECT * FROM tracks WHERE session_type = ? AND (user_e IS NULL OR user_s IS NULL OR user_w IS NULL OR user_n IS NULL) ORDER BY id DESC LIMIT 1"
        ).bind(sessionType).first();

        let seat = '';
        if (!track) {
            // 无可用轨道，开新轨道并占东位
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

        // 2. 获取或生成第 1 轮车厢 (10局牌)
        let carriage = await db.prepare("SELECT * FROM carriages WHERE track_id = ? AND round_index = 1").bind(track.id).first();
        
        if (!carriage) {
            // --- 核心发牌逻辑 ---
            const allRoundsHands = [];
            const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
            const values = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];
            
            for(let i=0; i<10; i++) {
                let deck = [];
                suits.forEach(s => values.forEach(v => deck.push({value: v, suit: s})));
                // 洗牌
                for (let j = deck.length - 1; j > 0; j--) {
                    const k = Math.floor(Math.random() * (j + 1));
                    [deck[j], deck[k]] = [deck[k], deck[j]];
                }
                allRoundsHands.push({
                    user_e: deck.slice(0, 13),
                    user_s: deck.slice(13, 26),
                    user_w: deck.slice(26, 39),
                    user_n: deck.slice(39, 52)
                });
            }
            const handsJson = JSON.stringify(allRoundsHands);
            const info = await db.prepare("INSERT INTO carriages (track_id, round_index, hands_json) VALUES (?, 1, ?)")
                .bind(track.id, handsJson).run();
            carriage = { id: info.meta.last_row_id, hands_json: handsJson };
        }

        const handsData = JSON.parse(carriage.hands_json);
        
        // 3. 记录初始动作 (标记为已看牌 VIEWED)
        await db.prepare("INSERT INTO player_actions (user_id, carriage_id, table_index, status) VALUES (?, ?, ?, 'VIEWED')")
            .bind(userId, carriage.id, 0).run();

        // 4. 计算当前轨道进度 (简单模拟)
        const progress = [
            track.user_e ? 1 : 0,
            track.user_s ? 1 : 0,
            track.user_w ? 1 : 0,
            track.user_n ? 1 : 0
        ];

        return new Response(JSON.stringify({
            success: true,
            trackId: track.id,
            carriageId: carriage.id,
            seat: seat,
            tableIndex: 0,
            currentHand: handsData[0][seat],
            trackProgress: progress
        }), { headers: { "Content-Type": "application/json" } });

    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
    }
}