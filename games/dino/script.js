const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const gameOverScreen = document.getElementById('game-over');

// Game constants and state
let frames = 0;
let currentScore = 0;
let highScore = localStorage.getItem('dinoHighScore') || 0;
let gameSpeed = 5;
let isGameOver = false;
let isPlaying = false;
let isPaused = false;

// Load images
const trexImg = new Image();
trexImg.src = 'assets/trex.jpg';
const cactusImg = new Image();
cactusImg.src = 'assets/cactus.jpg';

highScoreElement.innerText = highScore;

// Dino object
const dino = {
    x: 50,
    y: 200,
    width: 60,
    height: 60,
    dy: 0,
    gravity: 0.6,
    jumpForce: -10,
    grounded: true,

    draw() {
        ctx.save();
        // Multiply blend mode so the white background blends into the canvas
        ctx.globalCompositeOperation = 'multiply';
        
        // Move canvas origin to the center of the dino to rotate/scale around its center
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        let rotation = 0;
        let scaleX = 1;
        let scaleY = 1;

        if (this.grounded) {
            if (isPlaying) {
                // Running animation: dynamic wobble and bounce
                rotation = Math.sin(frames * 0.4) * 0.1; // Wobble back and forth
                const bounce = Math.abs(Math.sin(frames * 0.4)) * 5;
                ctx.translate(0, -bounce); // Bounce up and down
            }
        } else {
            // Mid-air animation
            if (this.dy < 0) {
                // Jumping up: Tilt back and stretch
                rotation = -0.2; 
                scaleX = 0.9;
                scaleY = 1.15; 
            } else {
                // Falling down: Tilt forward and squash
                rotation = 0.25; 
                scaleX = 1.15;
                scaleY = 0.9; 
            }
        }

        ctx.rotate(rotation);
        ctx.scale(scaleX, scaleY);
        
        // Draw the image. We offset by half width/height because the canvas origin is now at the center of the dino
        ctx.drawImage(trexImg, -this.width / 2, -this.height / 2, this.width, this.height);
        
        ctx.restore(); // Reset canvas transformations for everything else
    },

    update() {
        if (!this.grounded) {
            this.dy += this.gravity;
            this.y += this.dy;
        }

        // Check if hitting the ground
        if (this.y + this.height >= 240) {
            this.y = 240 - this.height;
            this.dy = 0;
            this.grounded = true;
        } else {
            this.grounded = false;
        }

        this.draw();
    },

    jump() {
        if (this.grounded) {
            this.dy = this.jumpForce;
            this.grounded = false;
        }
    }
};

// Obstacles array
let obstacles = [];

class Obstacle {
    constructor() {
        this.width = Math.random() > 0.5 ? 40 : 50;
        this.height = Math.random() > 0.5 ? 60 : 70;
        this.x = canvas.width;
        this.y = 240 - this.height;
    }

    draw() {
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(cactusImg, this.x, this.y, this.width, this.height);
        ctx.globalCompositeOperation = 'source-over';
    }

    update() {
        this.x -= gameSpeed;
        this.draw();
    }
}

// Particle System for running dust
let particles = [];
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * -2 - 1;
        this.speedY = Math.random() * -2;
        this.life = 1.0;
    }
    
    update() {
        this.x += this.speedX - gameSpeed * 0.5;
        this.y += this.speedY;
        this.life -= 0.05;
    }
    
    draw() {
        ctx.fillStyle = `rgba(148, 163, 184, ${this.life})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function handleParticles() {
    // Generate particles if dino is running on the ground
    if (dino.grounded && isPlaying && frames % 5 === 0) {
        particles.push(new Particle(dino.x + 10, dino.y + dino.height));
    }
    
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }
}

function handleObstacles() {
    if (frames % 100 === 0 && isPlaying) {
        obstacles.push(new Obstacle());
        
        // Increase speed slightly over time
        if (gameSpeed < 12) {
            gameSpeed += 0.1;
        }
    }

    for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].update();

        // Hitbox adjustments to ignore the white padding in the images
        const dinoHitbox = {
            x: dino.x + 15,
            y: dino.y + 10,
            width: dino.width - 30,
            height: dino.height - 20
        };
        const obsHitbox = {
            x: obstacles[i].x + 10,
            y: obstacles[i].y + 10,
            width: obstacles[i].width - 20,
            height: obstacles[i].height - 20
        };

        // Collision detection
        if (
            dinoHitbox.x < obsHitbox.x + obsHitbox.width &&
            dinoHitbox.x + dinoHitbox.width > obsHitbox.x &&
            dinoHitbox.y < obsHitbox.y + obsHitbox.height &&
            dinoHitbox.y + dinoHitbox.height > obsHitbox.y
        ) {
            endGame();
        }

        // Remove off-screen obstacles
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            i--;
            currentScore++;
            scoreElement.innerText = currentScore;
        }
    }
}

function drawGround() {
    // Draw the main ground line with a slight shadow effect
    ctx.beginPath();
    ctx.moveTo(0, 240);
    ctx.lineTo(canvas.width, 240);
    ctx.strokeStyle = '#cbd5e1'; // Premium light gray
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Draw a secondary darker line for depth
    ctx.beginPath();
    ctx.moveTo(0, 244);
    ctx.lineTo(canvas.width, 244);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function resetGame() {
    dino.y = 240 - dino.height;
    dino.dy = 0;
    obstacles = [];
    particles = [];
    currentScore = 0;
    gameSpeed = 5;
    frames = 0;
    isGameOver = false;
    isPlaying = true;
    scoreElement.innerText = currentScore;
    gameOverScreen.classList.add('hidden');
    animate();
}

function endGame() {
    isGameOver = true;
    isPlaying = false;
    gameOverScreen.classList.remove('hidden');
    
    if (currentScore > highScore) {
        highScore = currentScore;
        localStorage.setItem('dinoHighScore', highScore);
        highScoreElement.innerText = highScore;
    }

    // YouTube Playables: Send Score
    if (typeof ytgame !== 'undefined') {
        ytgame.engagement.sendScore({ value: currentScore });
    }
}

function animate() {
    if (isGameOver || isPaused) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    
    drawGround();
    handleParticles();
    dino.update();
    handleObstacles();
    
    frames++;
    if (isPlaying) {
        requestAnimationFrame(animate);
    }
}

// Initial draw before playing
trexImg.onload = () => {
    if (!isPlaying && !isGameOver) {
        drawGround();
        dino.draw();
    }
};
if (trexImg.complete) {
    drawGround();
    dino.draw();
}

// Input listeners
function handleInput(e) {
    if (e.type === 'keydown' && e.code !== 'Space' && e.code !== 'ArrowUp') return;
    if (e.type === 'keydown') e.preventDefault(); // prevent scrolling
    
    if (!isPlaying) {
        resetGame();
    } else {
        dino.jump();
    }
}

window.addEventListener('keydown', handleInput);
window.addEventListener('touchstart', handleInput, { passive: false });
window.addEventListener('mousedown', (e) => {
    // Only trigger if clicking the canvas or game over screen
    if (e.target.id === 'gameCanvas' || e.target.closest('#game-over')) {
        handleInput(e);
    }
});

// 2. Prevent Native Browser Behavior (Scrolling/Zooming)
window.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

if (typeof ytgame !== 'undefined') {
    // Notify YouTube that game splash screen is visible
    ytgame.game.firstFrameReady();

    // Notify YouTube that game is fully loaded and ready
    if (trexImg.complete && cactusImg.complete) {
        ytgame.game.gameReady();
    } else {
        window.addEventListener('load', () => ytgame.game.gameReady());
    }

    // Register Audio hooks
    ytgame.system.onAudioEnabledChange((isAudioEnabled) => {
        // We do not have audio yet, but if we did, we would mute/unmute here
    });

    // Register Pause hooks
    ytgame.system.onPause(() => {
        if (isPlaying && !isGameOver) {
            isPaused = true;
        }
    });
    ytgame.system.onResume(() => {
        if (isPaused) {
            isPaused = false;
            requestAnimationFrame(animate);
        }
    });
}
