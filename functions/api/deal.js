export async function onRequestGet(context) {
    const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    
    // 生成 52 张牌
    let deck = [];
    for (let s of suits) {
        for (let v of values) {
            deck.push({ value: v, suit: s });
        }
    }

    // 洗牌算法 (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // 抽取 13 张牌给玩家
    const playerHand = deck.slice(0, 13);

    return new Response(JSON.stringify(playerHand), {
        headers: { "Content-Type": "application/json" }
    });
}