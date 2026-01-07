-- 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    coins INTEGER DEFAULT 1000
);

-- 游戏记录表
CREATE TABLE games (
    id TEXT PRIMARY KEY,
    player_id INTEGER,
    hand_data TEXT, -- 存储发给玩家的牌
    score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);