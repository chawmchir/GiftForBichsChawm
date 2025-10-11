// Thiết lập Canvas và các phần tử
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

// --- Tải Hình Ảnh (Assets) ---
const ASSETS = {
    lego1: new Image(),
    lego2: new Image(),
    bullet: new Image()
};

let assetsLoadedCount = 0;
const totalAssets = Object.keys(ASSETS).length;

function loadAssets() {
    return new Promise((resolve) => {
        Object.keys(ASSETS).forEach(key => {
            ASSETS[key].onload = () => {
                assetsLoadedCount++;
                if (assetsLoadedCount === totalAssets) {
                    resolve();
                }
            };
        });
        
        // Gán nguồn hình ảnh - CHẮC CHẮN PHẢI TỒN TẠI TRONG THƯ MỤC assets/
        ASSETS.lego1.src = 'assets/lego1.png'; 
        ASSETS.lego2.src = 'assets/lego2.png';
        ASSETS.bullet.src = 'assets/bullet.png';
    });
}


// --- Cấu hình trò chơi ---
const CHAR_SIZE = 60; // Kích thước hiển thị (đã tăng để dễ nhìn chi tiết)
const BULLET_SIZE = 15;
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
    constructor(x, y, image, targetY, isWaving) {
        this.x = x;
        this.y = canvas.height + CHAR_SIZE; // Bắt đầu từ dưới màn hình
        this.image = image;
        this.targetY = targetY; // Vị trí dừng
        this.vy = -3; // Tốc độ bay lên
        this.isWaving = isWaving; // Nhân vật 1 vẫy tay
        this.rotationAngle = 0; // Để tạo hiệu ứng bay lên thú vị hơn
    }

    update() {
        if (this.y > this.targetY) {
            this.y += this.vy;
            // Xoay nhẹ khi bay lên
            this.rotationAngle = Math.sin((Date.now() / 200) + this.x) * 0.05; 
            if (this.y < this.targetY) this.y = this.targetY; // Dừng lại
        } else {
            this.rotationAngle = 0; // Dừng xoay khi đã đến nơi
        }
    }

    draw() {
        ctx.save();
        // Dịch chuyển và Xoay
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotationAngle);
        
        // Vẽ hình ảnh Lego
        // (Vị trí -CHAR_SIZE/2 để hình ảnh được căn giữa tại (this.x, this.y))
        ctx.drawImage(this.image, -CHAR_SIZE / 2, -CHAR_SIZE / 2, CHAR_SIZE, CHAR_SIZE);
        
        ctx.restore();
        
        // Ghi chữ "Hi" (thay cho hiệu ứng tay vẫy phức tạp)
        if (this.isWaving && Date.now() - startTime > SCENE_TIMES.SAY_HI_START && Date.now() - startTime < SCENE_TIMES.SHOOT_START) {
            ctx.font = '20px Arial';
            ctx.fillStyle = 'yellow';
            ctx.fillText('👋 Hi!', this.x + CHAR_SIZE / 2, this.y - CHAR_SIZE / 2);
        }
    }
}

// --- Đối tượng Đạn ---
class Bullet {
    constructor(startX, startY, targetX, targetY, speed) {
        this.x = startX;
        this.y = startY;
        this.image = ASSETS.bullet; // Sử dụng hình ảnh đạn
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
        
        // Kiểm tra va chạm
        if (Date.now() - startTime > SCENE_TIMES.IMPACT) {
            this.isAlive = false;
        }
    }

    draw() {
        if (!this.isAlive) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        // Vẽ hình ảnh đạn
        ctx.drawImage(this.image, -BULLET_SIZE / 2, -BULLET_SIZE / 2, BULLET_SIZE, BULLET_SIZE);
        ctx.restore();
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
        this.luminous = Math.random() < 0.4; // Hiệu ứng lấp lánh
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
        
        if (this.luminous) {
             // Tạo hiệu ứng lấp lánh mạnh hơn
             ctx.shadowColor = this.isHeart ? '#ff007f' : 'white';
             ctx.shadowBlur = this.luminous ? 15 : 0;
        } else {
             ctx.shadowBlur = 0;
        }
        
        if (this.isHeart) {
            // Vẽ trái tim (vẫn là hình cơ bản nhưng có lấp lánh)
            ctx.fillStyle = `rgba(255, 50, 150, ${this.alpha})`;
            ctx.font = `${this.size}px Arial`;
            ctx.fillText('♥', this.x, this.y); // Sử dụng ký tự trái tim unicode
        } else {
            // Vẽ chữ
            ctx.font = `${this.size * 0.8}px 'Comic Sans MS', cursive`;
            ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
            ctx.fillText(this.text, this.x, this.y);
        }
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0; // Tắt shadow cho các đối tượng khác
    }
}

// --- Khởi tạo ---
let startTime = 0;
let animationFrameId;
const legos = [];
const bullets = [];
const particles = [];
let gameRunning = false;

// Nhân vật Lego (sẽ được khởi tạo sau khi assets load)
let lego1, lego2;


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
            particles.push(new Particle(canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.4, canvas.height, 'heart'));
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
        // Hiệu ứng "Hi" được vẽ trong Lego.draw()
    }, SCENE_TIMES.SAY_HI_START);

    // 3. Cả hai bắn nhau
    setTimeout(() => {
        // Tọa độ bắn (từ vị trí Lego)
        const shootPos1 = { x: lego1.x + CHAR_SIZE / 2, y: lego1.y };
        const shootPos2 = { x: lego2.x - CHAR_SIZE / 2, y: lego2.y };
        
        // Tọa độ va chạm
        const impactPoint = { x: canvas.width / 2, y: lego1.y };

        // Đạn 1: từ Lego 1 đến giữa
        bullets.push(new Bullet(shootPos1.x, shootPos1.y, impactPoint.x, impactPoint.y, 15));
        // Đạn 2: từ Lego 2 đến giữa
        bullets.push(new Bullet(shootPos2.x, shootPos2.y, impactPoint.x, impactPoint.y, 15));
    }, SCENE_TIMES.SHOOT_START);
    
    // 4. Va chạm, Pháo hoa, Nhạc Nổ
    setTimeout(() => {
        const impactX = canvas.width / 2;
        const impactY = lego1.y;

        // Bắt đầu tạo pháo hoa ban đầu (150 hạt)
        for (let i = 0; i < 150; i++) {
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
        // Hiện màn hình chúc mừng nếu cần
    }, SCENE_TIMES.END_SCENE);

    // Bắt đầu vòng lặp game
    gameLoop(0);
}

// --- Khởi tạo sau khi tải Assets ---
startButton.addEventListener('click', () => {
    // Tải hình ảnh trước
    loadAssets().then(() => {
        // Khởi tạo đối tượng Lego sau khi hình ảnh đã tải
        const targetY = canvas.height * 0.7; // Vị trí dừng
        lego1 = new Lego(canvas.width / 3, targetY, ASSETS.lego1, targetY, true);
        lego2 = new Lego(canvas.width * 2 / 3, targetY, ASSETS.lego2, targetY, false);
        legos.push(lego1, lego2);
        
        startScene();
    }).catch(e => {
        console.error("Lỗi tải hình ảnh:", e);
        alert("Không thể tải các hình ảnh (lego1.png, lego2.png, bullet.png). Vui lòng kiểm tra lại thư mục assets!");
    });
});
