// ==========================================
// CONFIGURAÇÕES INICIAIS
// ==========================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("bestScore");
const finalScoreElement = document.getElementById("finalScore");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

let width;
let height;

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    width = rect.width;
    height = rect.height;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ==========================================
// VARIÁVEIS DO JOGO
// ==========================================

let gameRunning = false;
let gameStarted = false;

let score = 0;

let bestScore = Number(localStorage.getItem("beetleBest")) || 0;

bestElement.textContent = bestScore;

let gravity = 0.38;
let jumpForce = -7.5;

let frame = 0;
let obstacleTimer = 0;

let obstacles = [];
let particles = [];
let backgroundParticles = [];

let lastTime = 0;

// ==========================================
// BESOURO
// ==========================================

const beetle = {
    x: 100,
    y: 200,
    radius: 17,
    velocity: 0,
    rotation: 0,
    wingAngle: 0
};

function resetBeetle() {
    beetle.x = width * 0.25;
    beetle.y = height * 0.45;
    beetle.velocity = 0;
    beetle.rotation = 0;
    beetle.wingAngle = 0;
}

// ==========================================
// FUNDO DA CAVERNA
// ==========================================

function drawBackground() {

    const gradient = ctx.createLinearGradient(0, 0, 0, height);

    gradient.addColorStop(0, "#071d25");
    gradient.addColorStop(0.5, "#103b37");
    gradient.addColorStop(1, "#061916");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Luz no fundo da caverna

    const glow = ctx.createRadialGradient(
        width * 0.55,
        height * 0.45,
        5,
        width * 0.55,
        height * 0.45,
        width * 0.75
    );

    glow.addColorStop(0, "rgba(37, 160, 119, 0.19)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Silhuetas de pedras

    for (let i = 0; i < 9; i++) {

        const x = i * (width / 8);

        ctx.fillStyle = i % 2 === 0 ? "#102d2c" : "#0b2425";

        ctx.beginPath();
        ctx.moveTo(x - 30, 0);
        ctx.lineTo(x + 20, 0);
        ctx.lineTo(x + 50, 30 + Math.sin(i * 2) * 20);
        ctx.lineTo(x + 20, 70 + Math.cos(i) * 20);
        ctx.lineTo(x - 20, 35);
        ctx.closePath();
        ctx.fill();
    }

    // Rochas no chão

    ctx.fillStyle = "#0c2923";
    ctx.fillRect(0, height - 24, width, 24);

    // Cristais brilhantes

    for (let i = 0; i < 6; i++) {

        const x = (i * width / 5 + 30) % width;
        const y = height - 27;

        ctx.fillStyle = "#43dca0";
        ctx.shadowColor = "#32ffc1";
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 7, y - 17);
        ctx.lineTo(x + 13, y);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
    }
}

// ==========================================
// PLANTAS E RAÍZES DO CENÁRIO
// ==========================================

function drawDecorativeRoots() {

    for (let i = 0; i < 7; i++) {

        const x = i * (width / 6);

        ctx.beginPath();
        ctx.moveTo(x, 0);

        ctx.bezierCurveTo(
            x + 15,
            30,
            x - 20,
            50,
            x + Math.sin(i) * 25,
            80 + (i % 3) * 20
        );

        ctx.strokeStyle = "#315c37";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x + 5, 85 + (i % 3) * 20, 3, 0, Math.PI * 2);

        ctx.fillStyle = "#63b96e";
        ctx.fill();
    }
}

// ==========================================
// PARTÍCULAS BRILHANTES
// ==========================================

function createBackgroundParticles() {

    for (let i = 0; i < 35; i++) {

        backgroundParticles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.5 + 0.2,
            alpha: Math.random()
        });
    }
}

function drawBackgroundParticles(delta) {

    backgroundParticles.forEach(p => {

        p.y -= p.speed * delta / 16.67;
        p.alpha += 0.015 * delta / 16.67;

        if (p.y < 0) {
            p.y = height;
            p.x = Math.random() * width;
        }

        const opacity = 0.3 + Math.abs(Math.sin(p.alpha)) * 0.7;

        ctx.fillStyle = `rgba(105, 255, 190, ${opacity})`;

        ctx.shadowColor = "#55ffbb";
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
    });
}

// ==========================================
// DESENHAR O BESOURO
// ==========================================

function drawBeetle() {

    ctx.save();

    ctx.translate(beetle.x, beetle.y);
    ctx.rotate(beetle.rotation);

    // Asas

    beetle.wingAngle += 0.25;

    const wingMovement = Math.sin(beetle.wingAngle) * 4;

    ctx.fillStyle = "rgba(160, 255, 190, 0.75)";

    ctx.beginPath();
    ctx.ellipse(-2, -9 + wingMovement, 11, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-2, 9 - wingMovement, 11, 6, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Perninhas

    ctx.strokeStyle = "#183c21";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    for (let i = -1; i <= 1; i++) {

        ctx.beginPath();
        ctx.moveTo(-5, i * 6);
        ctx.lineTo(-12, i * 8 + 5);
        ctx.stroke();
    }

    // Corpo

    const bodyGradient = ctx.createLinearGradient(-15, -10, 15, 12);

    bodyGradient.addColorStop(0, "#baff75");
    bodyGradient.addColorStop(0.4, "#43c85c");
    bodyGradient.addColorStop(1, "#125b35");

    ctx.fillStyle = bodyGradient;

    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Casca do besouro

    ctx.strokeStyle = "#d0ff9d";
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(-2, -10);
    ctx.lineTo(-2, 10);
    ctx.stroke();

    // Brilho na casca

    ctx.fillStyle = "rgba(255,255,255,0.45)";

    ctx.beginPath();
    ctx.ellipse(-5, -5, 5, 2, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Cabeça

    ctx.fillStyle = "#236b39";

    ctx.beginPath();
    ctx.arc(13, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    // Olho

    ctx.fillStyle = "white";

    ctx.beginPath();
    ctx.arc(15, -3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#071b12";

    ctx.beginPath();
    ctx.arc(16, -3, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Antenas

    ctx.strokeStyle = "#d2fca0";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(14, -5);
    ctx.quadraticCurveTo(18, -14, 22, -12);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(11, -6);
    ctx.quadraticCurveTo(11, -15, 15, -16);
    ctx.stroke();

    ctx.restore();
}

// ==========================================
// CRIAR OBSTÁCULOS: RAÍZES
// ==========================================

function createObstacle() {

    const gap = Math.max(145, Math.min(190, height * 0.30));

    const margin = 65;

    const maxTop = height - gap - margin;
    const topHeight = margin + Math.random() * (maxTop - margin);

    obstacles.push({
        x: width + 20,
        topHeight: topHeight,
        gap: gap,
        bottomY: topHeight + gap,
        scored: false,
        seed: Math.random() * 100
    });
}

// ==========================================
// DESENHAR RAÍZES
// ==========================================

function drawRoot(x, y, rootHeight, direction, seed) {

    ctx.save();

    ctx.translate(x, y);

    ctx.strokeStyle = "#68472e";
    ctx.lineCap = "round";

    // Raiz principal

    ctx.lineWidth = 13;

    ctx.beginPath();
    ctx.moveTo(0, 0);

    const bend = Math.sin(seed) * 15;

    ctx.bezierCurveTo(
        bend,
        rootHeight * 0.3,
        -bend,
        rootHeight * 0.7,
        5,
        rootHeight
    );

    ctx.stroke();

    // Detalhes claros

    ctx.strokeStyle = "#a17a4d";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(-2, 4);
    ctx.quadraticCurveTo(8, rootHeight * 0.5, 5, rootHeight);
    ctx.stroke();

    // Ramificações

    for (let i = 0; i < 4; i++) {

        const branchY = rootHeight * (0.25 + i * 0.17);
        const side = i % 2 === 0 ? -1 : 1;

        ctx.strokeStyle = "#78563a";
        ctx.lineWidth = 5 - i * 0.5;

        ctx.beginPath();
        ctx.moveTo(0, branchY);
        ctx.quadraticCurveTo(
            side * 15,
            branchY + 8,
            side * (20 + i * 4),
            branchY + 25
        );
        ctx.stroke();

        // Folhas verdes

        ctx.fillStyle = i % 2 === 0 ? "#45b86b" : "#80d65f";

        ctx.beginPath();
        ctx.ellipse(
            side * (20 + i * 4),
            branchY + 23,
            8,
            4,
            side * 0.5,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    // Pequenas raízes pontudas

    for (let i = 0; i < 3; i++) {

        const rootX = Math.sin(seed + i * 4) * 12;
        const rootY = rootHeight * (0.4 + i * 0.15);

        ctx.fillStyle = "#68472e";

        ctx.beginPath();
        ctx.moveTo(rootX, rootY);
        ctx.lineTo(rootX + 5, rootY + 19);
        ctx.lineTo(rootX - 5, rootY + 13);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

// ==========================================
// DESENHAR OBSTÁCULOS
// ==========================================

function drawObstacles() {

    obstacles.forEach(obstacle => {

        const rootWidth = 32;

        // Raízes superiores

        drawRoot(
            obstacle.x + rootWidth / 2,
            0,
            obstacle.topHeight,
            1,
            obstacle.seed
        );

        // Raízes inferiores

        drawRoot(
            obstacle.x + rootWidth / 2,
            height,
            -(height - obstacle.bottomY),
            -1,
            obstacle.seed + 10
        );

        // Pequeno brilho próximo às raízes

        ctx.fillStyle = "rgba(90, 230, 130, 0.12)";

        ctx.beginPath();
        ctx.arc(
            obstacle.x + rootWidth / 2,
            obstacle.topHeight + 10,
            24,
            0,
            Math.PI * 2
        );

        ctx.fill();
    });
}

// ==========================================
// PARTÍCULAS DE COLISÃO
// ==========================================

function createParticles(x, y) {

    for (let i = 0; i < 20; i++) {

        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 1,
            radius: Math.random() * 4 + 1
        });
    }
}

function updateParticles(delta) {

    particles.forEach(p => {

        p.x += p.vx * delta / 16.67;
        p.y += p.vy * delta / 16.67;

        p.life -= 0.025 * delta / 16.67;

        ctx.fillStyle = `rgba(100, 255, 170, ${Math.max(0, p.life)})`;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    particles = particles.filter(p => p.life > 0);
}

// ==========================================
// MOVIMENTO DOS OBSTÁCULOS
// ==========================================

function updateObstacles(delta) {

    const speed = 2.7 + Math.min(score * 0.04, 1.5);
    const movement = speed * delta / 16.67;

    obstacles.forEach(obstacle => {

        obstacle.x -= movement;

        // Pontuação

        if (!obstacle.scored &&
            obstacle.x + 32 < beetle.x) {

            obstacle.scored = true;
            score++;

            scoreElement.textContent = score;

            if (score > bestScore) {

                bestScore = score;

                localStorage.setItem("beetleBest", bestScore);

                bestElement.textContent = bestScore;
            }
        }
    });

    obstacles = obstacles.filter(o => o.x > -50);
}

// ==========================================
// COLISÕES
// ==========================================

function checkCollision() {

    const radius = beetle.radius - 4;

    // Teto e chão

    if (
        beetle.y - radius < 0 ||
        beetle.y + radius > height
    ) {
        return true;
    }

    // Colisão com raízes

    for (const obstacle of obstacles) {

        const horizontalCollision =
            beetle.x + radius > obstacle.x &&
            beetle.x - radius < obstacle.x + 32;

        const verticalCollision =
            beetle.y - radius < obstacle.topHeight ||
            beetle.y + radius > obstacle.bottomY;

        if (horizontalCollision && verticalCollision) {
            return true;
        }
    }

    return false;
}

// ==========================================
// MOVIMENTO DO BESOURO
// ==========================================

function updateBeetle(delta) {

    const step = delta / 16.67;

    beetle.velocity += gravity * step;
    beetle.y += beetle.velocity * step;

    beetle.rotation = Math.max(
        -0.4,
        Math.min(0.9, beetle.velocity * 0.07)
    );
}

// ==========================================
// FAZER O BESOURO VOAR
// ==========================================

function flap() {

    if (!gameRunning) return;

    beetle.velocity = jumpForce;

    createParticles(
        beetle.x - 10,
        beetle.y + 5
    );
}

// ==========================================
// COMEÇAR O JOGO
// ==========================================

function startGame() {

    score = 0;
    frame = 0;
    obstacleTimer = 0;

    scoreElement.textContent = "0";

    obstacles = [];
    particles = [];

    resetBeetle();

    gameRunning = true;
    gameStarted = true;

    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
}

// ==========================================
// FIM DE JOGO
// ==========================================

function gameOver() {

    if (!gameRunning) return;

    gameRunning = false;

    createParticles(beetle.x, beetle.y);

    finalScoreElement.textContent = score;

    gameOverScreen.classList.remove("hidden");
}

// ==========================================
// DESENHAR TUDO
// ==========================================

function draw() {

    ctx.clearRect(0, 0, width, height);

    drawBackground();

    drawDecorativeRoots();

    drawBackgroundParticles(16.67);

    drawObstacles();

    drawBeetle();

    updateParticles(16.67);
}

// ==========================================
// LOOP PRINCIPAL
// ==========================================

function gameLoop(timestamp) {

    const delta = lastTime
        ? Math.min(timestamp - lastTime, 40)
        : 16.67;

    lastTime = timestamp;

    if (gameRunning) {

        frame++;

        updateBeetle(delta);

        obstacleTimer += delta;

        if (obstacleTimer > 1650) {

            createObstacle();

            obstacleTimer = 0;
        }

        updateObstacles(delta);

        if (checkCollision()) {
            gameOver();
        }
    }

    draw();

    requestAnimationFrame(gameLoop);
}

// ==========================================
// CONTROLES
// ==========================================

// Teclado

document.addEventListener("keydown", event => {

    if (event.code === "Space" || event.code === "ArrowUp") {

        event.preventDefault();

        if (gameRunning) {
            flap();
        }
    }
});

// Mouse e toque

canvas.addEventListener("pointerdown", event => {

    if (gameRunning) {
        event.preventDefault();
        flap();
    }
});

// Botões

startButton.addEventListener("click", startGame);

restartButton.addEventListener("click", startGame);

// ==========================================
// INICIALIZAÇÃO
// ==========================================

createBackgroundParticles();

resetBeetle();

draw();

requestAnimationFrame(gameLoop);