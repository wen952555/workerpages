// 从后端获取牌数据并渲染到页面
async function drawCards() {
    const response = await fetch('/api/deal');
    const hand = await response.json();
    
    const cardContainer = document.getElementById('card-display');
    cardContainer.innerHTML = ''; // 清空旧牌

hand.forEach(card => {
        // 根据你的命名规则生成文件名：[value]_of_[suit].svg
        const fileName = `${card.value}_of_${card.suit}.svg`;
        const imgPath = `/assets/cards/${fileName}`;

        // 创建 HTML 元素
        const img = document.createElement('img');
        img.src = imgPath;
        img.alt = `${card.value} ${card.suit}`;
        img.className = 'card'; // 用于 CSS 样式
        
        cardContainer.appendChild(img);
    });
}