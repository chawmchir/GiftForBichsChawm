// Thiết lập Canvas
const canvas = document.getElementById('animationCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('start-button');
const startScreen = document.getElementById('start-screen');
const music = document.getElementById('music');

// Kích thước Canvas (cần cập nhật khi cửa sổ thay đổi)
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Cấu hình trò chơi ---
const CHAR_SIZE = 30; // Kích thước Lego (đại diện cho 3cm)
const BULLET_SIZE = 5;
const GAME_DURATION = 15000; // 15 giây
const SCENE_TIMES = {
    FLY_UP_END: 1000,
    SAY_HI_START: 1500,
    SHOOT_START: 2500,
    IMPACT: 3000,
    END_SCENE: GAME_DURATION
};

// --- Đối tượng Lego ---
class Lego {
    constructor(x, y, color, targetY, sayHiFrame) {
        this.x = x;
        this.y = canvas.height + CHAR_SIZE; // Bắt đầu từ dưới màn hình
        this.color = color;
        this.targetY = targetY; // Vị trí dừng
        this.vy = -3; // Tốc độ bay lên
        this.isSayingHi = false;
        this.sayHiFrame = sayHiFrame; // Dùng để tạo hiệu ứng tay vẫy
        this.handAngle = 0;
    }

    update() {
        if (this.y > this.targetY) {
            this.y += this.vy;
            if (this.y < this.targetY) this.y = this.targetY; // Dừng lại
        }
        if (this.isSayingHi) {
            this.handAngle = Math.sin(Date.now() / 150) * Math.PI / 8; // Vẫy tay nhẹ
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        
        // Vẽ thân (hình vuông)
        ctx.fillRect(this.x - CHAR_SIZE / 2, this.y - CHAR_SIZE / 2, CHAR_SIZE, CHAR_SIZE);
        
        // Vẽ tay cầm súng (đơn giản hóa)
        ctx.fillStyle = 'gray';
        ctx.fillRect(this.x + CHAR_SIZE / 4, this.y, 5, 10); 
        
        // Vẽ tay vẫy (chỉ cho Lego 1)
        if (this.sayHiFrame) {
            ctx.save();
            ctx.translate(this.x - CHAR_SIZE / 4, this.y);
            ctx.rotate(this.handAngle);
            ctx.fillRect(0, 0, 5, 10);
            ctx.restore();
        }
    }
}

// --- Đối tượng Đạn ---
class Bullet {
    constructor(startX, startY, targetX, targetY, speed) {
        this.x = startX;
        this.y = startY;
        this.speed = speed;
        const dx = targetX - startX;
        const dy = targetY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.vx = (dx / dist) * speed;
        this.vy = (dy / dist) * speed;
        this.isAlive = true;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // Kiểm tra va chạm (nếu vượt quá thời gian va chạm dự kiến)
        if (Date.now() - startTime > SCENE_TIMES.IMPACT) {
            this.isAlive = false;
        }
    }

    draw() {
        if (!this.isAlive) return;
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(this.x, this.y, BULLET_SIZE, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- Đối tượng Hạt (Trái Tim / Chữ) ---
class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = -(Math.random() * 2 + 1); // Bay lên
        this.size = Math.random() * 15 + 10;
        this.alpha = 1;
        this.isHeart = type === 'heart';
        this.text = 'i love you so much Bich Cham';
        this.opacitySpeed = Math.random() * 0.02 + 0.01;
        this.luminous = Math.random() < 0.3; // Hiệu ứng lấp lánh
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.opacitySpeed;
        this.isAlive = this.alpha > 0;
    }

    draw() {
        if (!this.isAlive) return;
        
        ctx.globalAlpha = this.alpha;
        
        if (this.isHeart) {
            // Vẽ trái tim (đơn giản hóa thành hình tròn/màu)
            ctx.fillStyle = `rgba(255, ${200 + Math.floor(Math.random() * 55)}, 200, ${this.alpha})`;
            if (this.luminous) {
                 ctx.shadowColor = 'white';
                 ctx.shadowBlur = 10;
            } else {
                 ctx.shadowBlur = 0;
            }
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Vẽ chữ
            ctx.font = `${this.size}px Arial`;
            ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
            if (this.luminous && Math.random() < 0.5) { // Lấp lánh ngẫu nhiên
                 ctx.shadowColor = 'yellow';
                 ctx.shadowBlur = 15;
            } else {
                 ctx.shadowBlur = 0;
            }
            ctx.fillText(this.text, this.x, this.y);
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0; // Tắt shadow để không ảnh hưởng đến các đối tượng khác
    }
}

// --- Khởi tạo ---
let startTime = 0;
let animationFrameId;
const legos = [];
const bullets = [];
const particles = [];
let gameRunning = false;

// Nhân vật Lego
const lego1 = new Lego(canvas.width / 3, canvas.height * 0.7, 'blue', canvas.height * 0.7, true);
const lego2 = new Lego(canvas.width * 2 / 3, canvas.height * 0.7, 'red', canvas.height * 0.7, false);
legos.push(lego1, lego2);


// --- Hàm Game Loop chính ---
function gameLoop(timestamp) {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Cập nhật và Vẽ Lego
    legos.forEach(lego => {
        lego.update();
        lego.draw();
    });

    // Cập nhật và Vẽ Đạn
    bullets.forEach(bullet => {
        bullet.update();
        bullet.draw();
    });

    // Cập nhật và Vẽ Hạt
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (!particles[i].isAlive) {
            particles.splice(i, 1);
        }
    }
    
    // Tạo hạt mới liên tục sau khi nổ
    if (Date.now() - startTime > SCENE_TIMES.IMPACT && Date.now() - startTime < SCENE_TIMES.END_SCENE) {
        // Tạo 5 trái tim và 1 dòng chữ ngẫu nhiên mỗi frame
        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(canvas.width / 2 + (Math.random() - 0.5) * 50, canvas.height / 2, 'heart'));
        }
        if (Math.random() < 0.1) { // Tỉ lệ thấp hơn cho chữ
            particles.push(new Particle(Math.random() * canvas.width, canvas.height, 'text'));
        }
    }


    animationFrameId = requestAnimationFrame(gameLoop);
}


// --- Hàm điều khiển kịch bản ---
function startScene() {
    startTime = Date.now();
    gameRunning = true;
    startScreen.style.display = 'none';

    // 1. Lego bay lên (tự động qua Lego.update)

    // 2. Lego 1 say hi
    setTimeout(() => {
        lego1.isSayingHi = true;
    }, SCENE_TIMES.SAY_HI_START);

    // 3. Cả hai bắn nhau
    setTimeout(() => {
        lego1.isSayingHi = false;
        // Đạn 1: từ Lego 1 đến giữa
        bullets.push(new Bullet(lego1.x + CHAR_SIZE/2, lego1.y, canvas.width / 2, lego1.y, 8));
        // Đạn 2: từ Lego 2 đến giữa
        bullets.push(new Bullet(lego2.x - CHAR_SIZE/2, lego2.y, canvas.width / 2, lego2.y, 8));
    }, SCENE_TIMES.SHOOT_START);
    
    // 4. Va chạm, Pháo hoa, Nhạc Nổ
    setTimeout(() => {
        // Vị trí nổ: chính giữa
        const impactX = canvas.width / 2;
        const impactY = lego1.y;

        // Bắt đầu tạo pháo hoa ban đầu (hàng trăm hạt)
        for (let i = 0; i < 200; i++) {
            particles.push(new Particle(impactX, impactY, Math.random() < 0.8 ? 'heart' : 'text'));
        }
        
        // Phát nhạc ngay lập tức
        music.play().catch(e => console.error("Lỗi phát nhạc:", e));

    }, SCENE_TIMES.IMPACT);

    // 5. Dừng sau 15 giây
    setTimeout(() => {
        cancelAnimationFrame(animationFrameId);
        music.pause();
        music.currentTime = 0;
        gameRunning = false;
        // Có thể hiện màn hình kết thúc tại đây nếu muốn
    }, SCENE_TIMES.END_SCENE);

    // Bắt đầu vòng lặp game
    gameLoop(0);
}

// Bắt đầu khi người dùng nhấn nút
startButton.addEventListener('click', startScene);
