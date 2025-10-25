"use strict";

const canvas = document.getElementById("snakeGame");
const ctx = canvas.getContext("2d");
const box = 20;
const snake = [{ x: 9 * box, y: 10 * box }];
let food;

const scoreEl = document.getElementById("score");
const highscoreEl = document.getElementById("highscore");
let score = 0;
let direction = "RIGHT";
let directionChanged = false;
let isPaused = true;
let isGameOver = false;
let isMuted = false;
let speed = 100;
let game = setInterval(tick, speed);

const gameOverSound = new Audio("Sounds/gameOver.mp3");
const appleEatedSound = new Audio("Sounds/appleEated.mp3");

let bonusAndMalus = [];
let applePoint = 10;
let gameMode = "classic";
let lives = 3;
let timer = 0;
let timerInterval;
let controlsReversed = false;

// Sprites Snake
const spriteSheetHead = new Image();
spriteSheetHead.src = "image/headSnake.png";

const spriteSheetBody = new Image();
spriteSheetBody.src = "image/bodySnake.png";

// --- Pseudo ---
const usernameInput = document.getElementById("username");
let currentUser = localStorage.getItem("snakeUsername") || "";

if (currentUser) {
    usernameInput.value = currentUser;
}

usernameInput.addEventListener("input", () => {
    currentUser = usernameInput.value.trim();
    localStorage.setItem("snakeUsername", currentUser);
});

// ------------------------ Highscores par joueur et par mode -----------------------------

let highscores = JSON.parse(localStorage.getItem("snakeHighScores") || "{}");

// S'assure que la structure existe pour un mode
function ensureMode(mode) {
    if (!highscores[mode]) highscores[mode] = {};
}

// Récupérer le highscore du user pour le mode courant
function getUserHighscore(mode, user = currentUser) {
    ensureMode(mode);
    return highscores[mode][user] || 0;
}

// Sauvegarder un score si c'est un nouveau highscore
function saveUserHighscore(mode, user, score) {
    ensureMode(mode);
    if (!user) return;

    if (!highscores[mode][user] || score > highscores[mode][user]) {
        highscores[mode][user] = score;
        localStorage.setItem("snakeHighScores", JSON.stringify(highscores));
    }
}

function getTop5(mode) {
    ensureMode(mode);
    const entries = Object.entries(highscores[mode]); // [["Sacha",150], ["Alex",120]]
    return entries
        .sort((a, b) => b[1] - a[1]) // tri décroissant
        .slice(0, 5);
}

function showLeaderboard(mode) {
    const listEl = document.getElementById("leaderboardList");
    const modeLabel = document.getElementById("leaderboardMode");

    // Nom du mode
    modeLabel.textContent = gameModesInfo[mode].title;

    const top5 = getTop5(mode);

    // Animation fade-out
    listEl.style.opacity = 0;

    setTimeout(() => {
        if (top5.length === 0) {
            listEl.innerHTML = "<li class='italic text-gray-500'>Aucun score enregistré</li>";
        } else {
            listEl.innerHTML = top5.map(([user, score], i) => {
                // Couleurs spéciales pour le podium
                let rankColor = "";
                if (i === 0) rankColor = "text-yellow-400"; // Or
                else if (i === 1) rankColor = "text-gray-300"; // Argent
                else if (i === 2) rankColor = "text-amber-600"; // Bronze

                return `
                    <li class="flex justify-between items-center px-3 py-2 rounded-lg bg-gray-700/40 hover:bg-gray-600/50 transition">
                        <span class="font-semibold ${rankColor}">
                            ${i + 1}. ${user}
                        </span>
                        <span class="font-bold text-indigo-400">${score} pts</span>
                    </li>
                `;
            }).join("");
        }

        // Animation fade-in
        listEl.style.opacity = 1;
        listEl.style.transition = "opacity 0.4s ease";
    }, 200);
}

function showLeaderboardInGame(mode) {
    const card = document.getElementById("leaderboardInGame");
    const listEl = document.getElementById("leaderboardListInGame");

    card.classList.remove("hidden"); // s'assurer qu'on l'affiche

    const top5 = getTop5(mode);

    if (top5.length === 0) {
        listEl.innerHTML = "<li class='italic text-gray-500'>Aucun score enregistré</li>";
        return;
    }

    listEl.innerHTML = top5.map(([user, score], i) => {
        let rankColor = "";
        if (i === 0) rankColor = "text-yellow-400 font-bold"; // or
        else if (i === 1) rankColor = "text-gray-300 font-bold"; // argent
        else if (i === 2) rankColor = "text-amber-600 font-bold"; // bronze

        return `
            <li class="flex justify-between items-center px-3 py-2 rounded-lg bg-gray-700/40 hover:bg-gray-600/50 transition">
                <span class="${rankColor}">${i + 1}. ${user}</span>
                <span class="font-bold text-indigo-400">${score} pts</span>
            </li>
        `;
    }).join("");
}


// ----------------- Config Règles et Bonus/Malus -----------------

const gameModesInfo = {
    classic: {
        title: "Mode Classique 🎯",
        description: "Jouez au Snake traditionnel.",
        rules: [
            "Chaque pomme = +10 points",
            "Bonus/Malus de base",
            "Mort instantanée si collision"
        ]
    },
    chrono: {
        title: "Mode Chrono ⏱",
        description: "Faites le meilleur score avant la fin du temps.",
        rules: [
            "Temps limité : 120 secondes",
            "Chaque pomme = +10 points",
            "Fin de partie quand le temps arrive à 0"
        ]
    },
    lives: {
        title: "Mode avec Vies ❤️",
        description: "Vous avez plusieurs vies pour survivre plus longtemps.",
        rules: [
            "3 vies disponibles",
            "Chaque pomme = +10 points",
            "Collision = perte d’1 vie"
        ]
    },
    hardcore: {
        title: "Mode Hardcore ⚡",
        description: "Un défi extrême réservé aux pros.",
        rules: [
            "Vitesse plus rapide",
            "Bords mortels",
            "Beaucoup plus de malus"
        ]
    },
    "reverse-timer": {
        title: "Timer inversé 🔄",
        description: "Le temps descend, mangez des pommes pour le rallonger.",
        rules: [
            "Temps initial : 60 secondes",
            "Chaque pomme = +10 points et +5 sec",
            "Fin de partie quand le temps est écoulé"
        ]
    }
};

const bonusMalusInfo = {
    gold: { name: "Pomme dorée", effect: "+50 points", duration: "Instantané" },
    exp: { name: "Pomme XP", effect: "Double les points des pommes", duration: "5s" },
    malus: { name: "Malus", effect: "-30 points et rétrécit le serpent", duration: "Instantané" },
    poison: { name: "Poison", effect: "-50 points et enlève 2 segments", duration: "Instantané" },
    freeze: { name: "Gel", effect: "Ralentit le serpent", duration: "4s" },
    reverse: { name: "Contrôles inversés", effect: "Touches inversées", duration: "5s" }
};

function showModeRules(mode) {
    const rulesCard = document.getElementById("rulesCard");
    const rulesText = document.getElementById("rulesText");

    const modeInfo = gameModesInfo[mode];
    if (!modeInfo) return;

    rulesCard.classList.remove("hidden");

    rulesText.innerHTML = `
        <h3 class="text-xl font-bold mb-2">${modeInfo.title}</h3>
        <p class="mb-2 text-gray-300">${modeInfo.description}</p>
        <ul class="list-disc pl-5 space-y-1">
            ${modeInfo.rules.map(rule => `<li>${rule}</li>`).join("")}
        </ul>
    `;
}

function showBonusList() {
    const listEl = document.getElementById("bonusList");
    const bonusCard = document.getElementById("bonusCard");
    bonusCard.classList.remove("hidden");

    listEl.innerHTML = Object.values(bonusMalusInfo).map(bm => `
        <div class="border-b border-gray-700 pb-2">
            <strong>${bm.name}</strong><br>
            Effet : ${bm.effect}<br>
            Durée : ${bm.duration}
        </div>
    `).join("");
}

function getOrCreateTimeInfoEl() {
    const content = document.getElementById("gameOverContent");
    let el = document.getElementById("timeInfo");
    if (!el) {
        el = document.createElement("p");
        el.id = "timeInfo";
        el.className = "mb-6 text-gray-300 italic hidden";
        // place avant le bloc de boutons (le premier <div> actions)
        content.insertBefore(el, content.querySelector(".flex"));
    }
    return el;
}

function clearTimeInfo() {
    const el = document.getElementById("timeInfo");
    if (el) {
        el.textContent = "";
        el.classList.add("hidden");
    }
}


// ----------------- Fonctions Core -----------------

function restartInterval() {
    clearInterval(game);
    game = setInterval(tick, speed);
}

function updateSpeed() {
    if (gameMode === "hardcore") return; // pas de scaling en hardcore

    let newSpeed = 100 - Math.floor(score / 50) * 10;
    if (newSpeed < 50) newSpeed = 50;

    if (newSpeed !== speed) {
        speed = newSpeed;
        restartInterval();
    }
}

function isOnSnake(x, y) {
    return snake.some(seg => seg.x === x && seg.y === y);
}

function generateValidPosition() {
    let pos;
    do {
        pos = {
            x: Math.floor(Math.random() * (canvas.width / box)) * box,
            y: Math.floor(Math.random() * (canvas.height / box)) * box
        };
    } while (
        isOnSnake(pos.x, pos.y) ||
        (food && pos.x === food.x && pos.y === food.y) ||
        bonusAndMalus.some(bm => bm.x === pos.x && bm.y === pos.y)
        );
    return pos;
}

function validCellsAround(center, radiusCells = 3) {
    const cells = [];
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
        for (let dy = -radiusCells; dy <= radiusCells; dy++) {
            const x = center.x + dx * box;
            const y = center.y + dy * box;
            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
            if (isOnSnake(x, y)) continue;
            if (food && x === food.x && y === food.y) continue;
            if (bonusAndMalus.some(bm => bm.x === x && bm.y === y)) continue;
            cells.push({ x, y });
        }
    }
    return cells;
}

// ----------------- Dessin -----------------

food = generateValidPosition();

function drawPomme() {
    ctx.fillStyle = "red";
    ctx.fillRect(food.x, food.y, box, box);
}

function spawnBonusAndMalus() {
    if (bonusAndMalus.length > 0) return;

    let type;
    if (gameMode === "hardcore") {
        const r = Math.random();
        if (r < 0.40) type = "malus";
        else if (r < 0.60) type = "poison";
        else if (r < 0.75) type = "freeze";
        else if (r < 0.90) type = "reverse";
        else if (r < 0.95) type = "exp";
        else type = "gold";
    } else {
        const types = ["gold", "exp", "malus", "freeze"];
        type = types[Math.floor(Math.random() * types.length)];
    }

    let pos;
    if (["malus", "freeze", "poison", "reverse"].includes(type) && food) {
        const candidates = validCellsAround(food, 3);
        pos = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : generateValidPosition();
    } else {
        pos = generateValidPosition();
    }

    bonusAndMalus.push({
        type,
        x: pos.x,
        y: pos.y,
        lifetime: Date.now() + 5000
    });
}

function drawBonusAndMalus() {
    for (let i = 0; i < bonusAndMalus.length; i++) {
        const bonusMalus = bonusAndMalus[i];
        if (bonusMalus.type === "gold") ctx.fillStyle = "gold";
        else if (bonusMalus.type === "exp") ctx.fillStyle = "blue";
        else if (bonusMalus.type === "malus") ctx.fillStyle = "black";
        else if (bonusMalus.type === "poison") ctx.fillStyle = "purple";
        else if (bonusMalus.type === "freeze") ctx.fillStyle = "cyan";
        else if (bonusMalus.type === "reverse") ctx.fillStyle = "green";

        ctx.fillRect(bonusMalus.x, bonusMalus.y, box, box);
    }
}
function drawRotatedImage(img, x, y, angle) {
    ctx.save();
    ctx.translate(x + box/2, y + box/2);
    ctx.rotate(angle);
    ctx.drawImage(img, -box/2, -box/2, box, box);
    ctx.restore();
}


// ----------------- Jeu -----------------

function startGame(mode) {
    gameMode = mode;
    resetGame();
    clearTimeInfo();

    showLeaderboardInGame(mode);

    document.getElementById("startScreen").style.display = "none";
    document.getElementById("gameContainer").classList.remove("hidden");

    currentUser = usernameInput.value.trim() || "Invité";
    localStorage.setItem("snakeUsername", currentUser);

    const playerNameEl = document.getElementById("playerName");
    playerNameEl.textContent = `👤 Joueur : ${currentUser}`;
    playerNameEl.classList.remove("hidden");

    highscoreEl.textContent = `Highscore : ${getUserHighscore(mode)}`;

    isPaused = false;
    score = 0;
    snake.length = 1;
    snake[0] = { x: 9 * box, y: 10 * box };
    direction = "RIGHT";
    lives = 3;

    scoreEl.innerText = `Score : ${score}`;
    document.getElementById("timer").classList.add("hidden");
    document.getElementById("lives").classList.add("hidden");

    if (mode === "chrono") {
        timer = 120;
        document.getElementById("timer").textContent = "⏱ Temps : " + timer;
        document.getElementById("timer").classList.remove("hidden");
        startTimer();
    } else if (mode === "lives") {
        document.getElementById("lives").textContent = "❤️ Vies : " + lives;
        document.getElementById("lives").classList.remove("hidden");
    } else if (mode === "hardcore") {
        speed = 70;
        restartInterval();
    } else if (mode === "reverse-timer") {
        timer = 60;
        document.getElementById("timer").textContent = "⏱ Temps : " + timer;
        document.getElementById("timer").classList.remove("hidden");
        startReverseTimer();
    }

}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (isPaused || isGameOver) return;
        timer--;
        document.getElementById("timer").textContent = "⏱ Temps : " + timer;
        if (timer <= 0) {
            clearInterval(timerInterval);
            gameOver();
        }
    }, 1000);
}

function startReverseTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (isPaused || isGameOver) return;
        timer--;
        document.getElementById("timer").textContent = "⏱ Temps : " + timer;
        if (timer <= 0) {
            clearInterval(timerInterval);
            gameOver();
        }
    }, 1000);
}

// ----------------- Input -----------------

document.addEventListener("keydown", changeDirection);

function changeDirection(event) {
    if (directionChanged) return;

    const left = controlsReversed ? "ArrowRight" : "ArrowLeft";
    const right = controlsReversed ? "ArrowLeft" : "ArrowRight";
    const up = controlsReversed ? "ArrowDown" : "ArrowUp";
    const down = controlsReversed ? "ArrowUp" : "ArrowDown";

    if (event.key === left && direction !== "RIGHT") direction = "LEFT";
    else if (event.key === up && direction !== "DOWN") direction = "UP";
    else if (event.key === right && direction !== "LEFT") direction = "RIGHT";
    else if (event.key === down && direction !== "UP") direction = "DOWN";

    directionChanged = true;
}

// ----------------- UI Boutons -----------------

document.getElementById("pauseBtn").addEventListener("click", function () {
    if (isGameOver) return;
    isPaused = !isPaused;
    this.textContent = isPaused ? "▶ Reprendre" : "⏸ Pause";
});

document.getElementById("muteBtn").addEventListener("click", function () {
    isMuted = !isMuted;
    this.textContent = isMuted ? "🔇 Muet" : "🔊 Son";
});

document.getElementById("menuBtn").addEventListener("click", () => {
    document.getElementById("gameOverScreen").classList.add("hidden");
    document.getElementById("gameContainer").classList.add("hidden");
    document.getElementById("startScreen").style.display = "flex";
    resetGame();
});

document.querySelectorAll(".modeBtn").forEach(btn => {
    btn.addEventListener("mouseenter", () => {
        const mode = btn.getAttribute("onclick").match(/'(.*?)'/)[1];
        showModeRules(mode);
    });
});

// Met à jour le header quand le pseudo change
usernameInput.addEventListener("input", () => {
    currentUser = usernameInput.value.trim();
    localStorage.setItem("snakeUsername", currentUser);

    const headerUsername = document.getElementById("headerUsername");
    headerUsername.textContent = currentUser ? `👤 ${currentUser}` : "";
});

// Au lancement du jeu → synchronise le pseudo dans le header
document.addEventListener("DOMContentLoaded", () => {
    const headerUsername = document.getElementById("headerUsername");
    headerUsername.textContent = currentUser ? `👤 ${currentUser}` : "";
});

// Bouton retour vers menu
document.getElementById("headerMenuBtn").addEventListener("click", () => {
    document.getElementById("gameContainer").classList.add("hidden");
    document.getElementById("gameOverScreen").classList.add("hidden");
    document.getElementById("startScreen").style.display = "flex";
    resetGame();
});

// Affiche les bonus dès l'accueil
showBonusList();

const modes = Object.keys(gameModesInfo); // ["classic", "chrono", "lives", ...]
let currentLeaderboardMode = modes[0]; // par défaut "classic"

document.getElementById("prevMode").addEventListener("click", () => {
    let idx = modes.indexOf(currentLeaderboardMode);
    currentLeaderboardMode = modes[(idx - 1 + modes.length) % modes.length];
    showLeaderboard(currentLeaderboardMode);
});

document.getElementById("nextMode").addEventListener("click", () => {
    let idx = modes.indexOf(currentLeaderboardMode);
    currentLeaderboardMode = modes[(idx + 1) % modes.length];
    showLeaderboard(currentLeaderboardMode);
});

document.querySelectorAll(".modeBtn").forEach(btn => {
    btn.addEventListener("mouseenter", () => {
        const mode = btn.getAttribute("onclick").match(/'(.*?)'/)[1];
        showModeRules(mode);       // règles
        showLeaderboard(mode);     // classement
        currentLeaderboardMode = mode; // on synchronise le "carrousel"
    });
});

showLeaderboard(currentLeaderboardMode);

// Bouton "🏠 Menu" visible pendant la partie
document.getElementById("menuBtnInGame").addEventListener("click", () => {
    // Met le jeu en pause et stoppe les timers
    isPaused = true;
    isGameOver = false;
    clearInterval(timerInterval);

    // Cache le canvas et l'overlay éventuel
    document.getElementById("gameContainer").classList.add("hidden");
    document.getElementById("gameOverScreen").classList.add("hidden");

    // Réaffiche le menu d'accueil
    document.getElementById("startScreen").style.display = "flex";

    // Réinitialise tout l’état du jeu
    resetGame();
    clearTimeInfo();

    // Réinitialise aussi le bouton pause pour la prochaine partie
    const pauseBtn = document.getElementById("pauseBtn");
    if (pauseBtn) pauseBtn.textContent = "⏸ Pause";
});



// ----------------- Gameplay -----------------

function playSound(audio) {
    if (!isMuted) {
        audio.currentTime = 0;
        audio.play();
    }
}

function collision(newHead, snake) {
    return snake.some(seg => seg.x === newHead.x && seg.y === newHead.y);
}

function gameOver() {
    isGameOver = true;
    isPaused = true;

    // on stoppe le timer (bug actuel: restartInterval(timerInterval))
    clearInterval(timerInterval);
    playSound(gameOverSound);

    // (1) purge toute info précédente
    clearTimeInfo();
    const timeInfoEl = getOrCreateTimeInfoEl();

    // (2) calcule et affiche UNIQUEMENT si le mode s'y prête
    if (gameMode === "chrono") {
        const tempsEcoule = 120 - timer;        // timer = secondes restantes
        timeInfoEl.textContent = `⏱ Temps écoulé : ${tempsEcoule}s`;
        timeInfoEl.classList.remove("hidden");

        // si tu veux réinitialiser pour une future partie:
        timer = 120;
        const t = document.getElementById("timer");
        if (t) t.textContent = "⏱ Temps : " + timer;

    } else if (gameMode === "reverse-timer") {
        // ici "timer" EST le temps restant. Pas besoin de 60 - timer.
        timeInfoEl.textContent = `⏱ Temps restant : ${timer}s`;
        timeInfoEl.classList.remove("hidden");

        timer = 60;
        const t = document.getElementById("timer");
        if (t) t.textContent = "⏱ Temps : " + timer;
    }

    document.getElementById("finalScore").innerText = score;
    document.getElementById("gameOverMode").textContent = gameModesInfo[gameMode].title;

    const overlay = document.getElementById("gameOverScreen");
    const content = document.getElementById("gameOverContent");
    overlay.classList.remove("hidden");
    setTimeout(() => {
        content.classList.remove("scale-90", "opacity-0");
        content.classList.add("scale-100", "opacity-100");
    }, 50);
}


function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bonusAndMalus = bonusAndMalus.filter(bm => Date.now() < bm.lifetime);

    drawPomme()
    drawBonusAndMalus();

    for (let i = 0; i < snake.length; i++) {
        if (i === 0) {
            let angle = 0;
            if (direction === "UP") angle = 0;             // déjà vers le haut
            if (direction === "RIGHT") angle = Math.PI/2;  // tourne à droite
            if (direction === "DOWN") angle = Math.PI;     // tête vers le bas
            if (direction === "LEFT") angle = -Math.PI/2;  // tête vers la gauche
            drawRotatedImage(spriteSheetHead, snake[i].x, snake[i].y, angle);
        } else {
            ctx.drawImage(spriteSheetBody, snake[i].x, snake[i].y, box, box);
        }
    }

    let headX = snake[0].x;
    let headY = snake[0].y;

    if (direction === "LEFT") headX -= box;
    if (direction === "UP") headY -= box;
    if (direction === "RIGHT") headX += box;
    if (direction === "DOWN") headY += box;

    if (gameMode === "hardcore") {
        if (headX < 0 || headX >= canvas.width || headY < 0 || headY >= canvas.height) {
            gameOver();
            return;
        }
    } else {
        if (headX < 0) headX = canvas.width - box;
        if (headX >= canvas.width) headX = 0;
        if (headY < 0) headY = canvas.height - box;
        if (headY >= canvas.height) headY = 0;
    }

    const newHead = { x: headX, y: headY };

    if (collision(newHead, snake)) {
        if (gameMode === "lives") {
            lives--;
            document.getElementById("lives").textContent = "❤️ Vies : " + lives;
            if (lives <= 0) gameOver();
            else {
                snake.length = 1;
                snake[0] = { x: 9 * box, y: 10 * box };
                direction = "RIGHT";
            }
        } else gameOver();
        return;
    }

    snake.unshift(newHead);

    // Mange la pomme
    if (snake[0].x === food.x && snake[0].y === food.y) {
        playSound(appleEatedSound);
        score += applePoint;
        scoreEl.textContent = `Score : ${score}`;

        if (gameMode === "reverse-timer") timer += 5;

        if (score > getUserHighscore(gameMode, currentUser)) {
            saveUserHighscore(gameMode, currentUser, score);
            highscoreEl.textContent = `Highscore : ${getUserHighscore(gameMode, currentUser)}`;

            showLeaderboardInGame(gameMode);
        }

        updateSpeed();
        food = generateValidPosition();

        if (Math.random() < 0.3) spawnBonusAndMalus();
    } else {
        snake.pop();
    }

    // Collisions avec bonus/malus
    for (let i = 0; i < bonusAndMalus.length; i++) {
        let bm = bonusAndMalus[i];
        if (snake[0].x === bm.x && snake[0].y === bm.y) {
            if (bm.type === "gold") score += 50;
            else if (bm.type === "exp") {
                let oldPoint = 10;
                applePoint = oldPoint * 2;
                setTimeout(() => (applePoint = oldPoint), 5000);
            } else if (bm.type === "malus") {
                score = Math.max(0, score - 30);
                if (snake.length > 1) snake.pop();
            } else if (bm.type === "poison") {
                score = Math.max(0, score - 50);
                if (snake.length > 2) {
                    snake.pop();
                    snake.pop();
                }
            } else if (bm.type === "freeze") {
                let oldSpeed = speed;
                speed = 200;
                restartInterval();
                setTimeout(() => {
                    speed = oldSpeed;
                    restartInterval();
                }, 4000);
            } else if (bm.type === "reverse") {
                controlsReversed = true;
                setTimeout(() => {
                    controlsReversed = false;
                }, 5000);
            }

            scoreEl.textContent = `Score : ${score}`;
            bonusAndMalus.splice(i, 1);
            break;
        }
    }
}

function tick() {
    if (isPaused || isGameOver) return;
    drawGame();
    directionChanged = false;

    // HUD Stats
    document.getElementById("hudMode").textContent = gameModesInfo[gameMode].title;
    document.getElementById("hudSpeed").textContent = speed + " ms";
    document.getElementById("hudLength").textContent = snake.length;
    document.getElementById("hudApples").textContent = Math.floor(score / 10);
}


function restartGame() {
    score = 0;
    scoreEl.textContent = `Score : ${score}`;
    snake.length = 1;
    snake[0] = { x: 9 * box, y: 10 * box };
    direction = "RIGHT";
    speed = (gameMode === "hardcore") ? 70 : 100;
    clearTimeInfo();

    food = generateValidPosition();
    applePoint = 10;

    const overlay = document.getElementById("gameOverScreen");
    const content = document.getElementById("gameOverContent");

    content.classList.remove("scale-100", "opacity-100");
    content.classList.add("scale-90", "opacity-0");

    setTimeout(() => overlay.classList.add("hidden"), 300);

    isGameOver = false;
    isPaused = false;
    document.getElementById("pauseBtn").textContent = "⏸ Pause";

    highscoreEl.textContent = `Highscore : ${getUserHighscore(gameMode, currentUser)}`;

    if (gameMode === "chrono") {
        timer = 120;
        startTimer();
    } else if (gameMode === "lives") {
        lives = 3;
        document.getElementById("lives").textContent = "❤️ Vies : " + lives;
    } else if (gameMode === "reverse-timer") {
        timer = 60;
        startReverseTimer();
    }
}

function resetGame() {
    score = 0;
    scoreEl.textContent = `Score : ${score}`;
    snake.length = 1;
    snake[0] = { x: 9 * box, y: 10 * box };
    direction = "RIGHT";
    applePoint = 10;
    isGameOver = false;
    isPaused = true;
    clearInterval(timerInterval);
    speed = (gameMode === "hardcore") ? 70 : 100;
    clearTimeInfo();
}
