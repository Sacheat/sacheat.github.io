"use strict";

/**
 * UI
 * - Regroupe tous les accès DOM et opérations d'affichage.
 * - Pas de logique métier : on affiche ce que Game/Leaderboard lui demandent.
 * - Fournit aussi des helpers de dessin (tête/segment/food/bonus).
 */
export default class UI {
    /**
     * @param {Document} doc
     */
    constructor(doc = document) {
        // Canvas
        this.canvas = doc.getElementById("snakeGame");
        this.ctx = this.canvas.getContext("2d");

        // Badges top
        this.scoreEl = doc.getElementById("score");
        this.highscoreEl = doc.getElementById("highscore");
        this.timerEl = doc.getElementById("timer");
        this.livesEl = doc.getElementById("lives");

        // HUD droite
        this.hudMode = doc.getElementById("hudMode");
        this.hudSpeed = doc.getElementById("hudSpeed");
        this.hudLength = doc.getElementById("hudLength");
        this.hudApples = doc.getElementById("hudApples");

        // Écrans
        this.startScreen = doc.getElementById("startScreen");
        this.gameContainer = doc.getElementById("gameContainer");
        this.gameOverScreen = doc.getElementById("gameOverScreen");
        this.gameOverContent = doc.getElementById("gameOverContent");
        this.finalScore = doc.getElementById("finalScore");
        this.gameOverMode = doc.getElementById("gameOverMode");

        // Règles + Bonus list
        this.rulesCard = doc.getElementById("rulesCard");
        this.rulesText = doc.getElementById("rulesText");
        this.bonusCard = doc.getElementById("bonusCard");
        this.bonusList = doc.getElementById("bonusList");

        // Classements
        this.leaderboardListHome = doc.getElementById("leaderboardList");
        this.leaderboardModeLabel = doc.getElementById("leaderboardMode");
        this.leaderboardCardInGame = doc.getElementById("leaderboardInGame");
        this.leaderboardListInGame = doc.getElementById("leaderboardListInGame");

        // User / Header
        this.usernameInput = doc.getElementById("username");
        this.playerName = doc.getElementById("playerName");
        this.headerUsername = doc.getElementById("headerUsername");

        // Boutons (exposés pour câblage dans main.js)
        this.pauseBtn = doc.getElementById("pauseBtn");
        this.muteBtn = doc.getElementById("muteBtn");
        this.menuBtnInGame = doc.getElementById("menuBtnInGame");
        this.menuBtnGameOver = doc.getElementById("menuBtn");
        this.headerMenuBtn = doc.getElementById("headerMenuBtn");
        this.prevModeBtn = doc.getElementById("prevMode");
        this.nextModeBtn = doc.getElementById("nextMode");
        this.modeButtons = Array.from(doc.querySelectorAll(".modeBtn"));

        // Sprites (charge ici pour simplifier)
        this.spriteHead = new Image();
        this.spriteHead.src = "image/headSnake.png";
        this.spriteBody = new Image();
        this.spriteBody.src = "image/bodySnake.png";
        this.spriteApples = new Image();
        this.spriteApples.src = "image/apple.png";
        this.bonusSprites = {
            gold: loadImg("image/goldApple.png"),
            exp: loadImg("image/bonusExp.png"),
            malus: loadImg("image/malus.png"),
            poison: loadImg("image/poison.png"),
            freeze: loadImg("image/freeze.png"),
            reverse: loadImg("image/reverse.png"),
        };

        // Paragraphe Game Over “Temps …”
        this.timeInfoEl = doc.getElementById("timeInfo");
    }

    /* ============ Écrans ============ */

    showGame() {
        this.startScreen.style.display = "none";
        this.gameContainer.classList.remove("hidden");
    }
    showMenu() {
        this.gameContainer.classList.add("hidden");
        this.gameOverScreen.classList.add("hidden");
        this.startScreen.style.display = "flex";
    }
    showGameOver() {
        this.gameOverScreen.classList.remove("hidden");
        // petite anim d’apparition
        setTimeout(() => {
            this.gameOverContent.classList.remove("scale-90", "opacity-0");
            this.gameOverContent.classList.add("scale-100", "opacity-100");
        }, 50);
    }
    closeGameOver() {
        this.gameOverContent.classList.remove("scale-100", "opacity-100");
        this.gameOverContent.classList.add("scale-90", "opacity-0");
        setTimeout(() => this.gameOverScreen.classList.add("hidden"), 300);
    }

    /* ============ Badges & HUD ============ */

    setScore(n) { this._setTxt(this.scoreEl, `Score : ${n}`); }
    setHighscore(n) { this._setTxt(this.highscoreEl, `Highscore : ${n}`); }

    setTimer(n) {
        if (!this.timerEl) return;
        this.timerEl.textContent = `⏱ Temps : ${n}`;
    }
    showTimer(show) {
        if (!this.timerEl) return;
        this.timerEl.classList.toggle("hidden", !show);
    }

    setLives(n) {
        if (!this.livesEl) return;
        this.livesEl.textContent = `❤️ Vies : ${n}`;
    }
    showLives(show) {
        if (!this.livesEl) return;
        this.livesEl.classList.toggle("hidden", !show);
    }

    setHUD({ modeTitle, speedMs, length, apples }) {
        this._setTxt(this.hudMode, modeTitle);
        this._setTxt(this.hudSpeed, `${speedMs} ms`);
        this._setTxt(this.hudLength, String(length));
        this._setTxt(this.hudApples, String(apples));
    }

    setPlayerName(name) {
        if (this.playerName) {
            this.playerName.textContent = `👤 Joueur : ${name}`;
            this.playerName.classList.remove("hidden");
        }
        if (this.headerUsername) {
            this.headerUsername.textContent = name ? `👤 ${name}` : "";
        }
    }

    setGameOverInfo({ score, modeTitle }) {
        this._setTxt(this.finalScore, String(score));
        this._setTxt(this.gameOverMode, modeTitle);
    }

    /* ============ Game Over: info temps ============ */

    ensureTimeInfoEl() {
        if (!this.timeInfoEl) {
            const el = document.createElement("p");
            el.id = "timeInfo";
            el.className = "mb-6 text-gray-300 italic hidden";
            this.gameOverContent.insertBefore(el, this.gameOverContent.querySelector(".flex"));
            this.timeInfoEl = el;
        }
        return this.timeInfoEl;
    }
    clearTimeInfo() {
        const el = this.ensureTimeInfoEl();
        el.textContent = "";
        el.classList.add("hidden");
    }
    showTimeInfo(text) {
        const el = this.ensureTimeInfoEl();
        el.textContent = text;
        el.classList.remove("hidden");
    }

    /* ============ Règles & Bonus list (écran d’accueil) ============ */

    renderRules(modeInfo) {
        if (!modeInfo) return;
        this.rulesCard.classList.remove("hidden");
        this.rulesText.innerHTML = `
      <h3 class="text-xl font-bold mb-2">${modeInfo.title}</h3>
      <p class="mb-2 text-gray-300">${modeInfo.description}</p>
      <ul class="list-disc pl-5 space-y-1">
        ${modeInfo.rules.map(r => `<li>${r}</li>`).join("")}
      </ul>
    `;
    }

    renderBonusList(bonusCatalog) {
        this.bonusCard.classList.remove("hidden");

        // Séparer bonus / malus
        const bonuses = Object.values(bonusCatalog).filter(b => !b.isMalus);
        const maluses = Object.values(bonusCatalog).filter(b => b.isMalus);

        // Fonction utilitaire pour créer les cartes
        const createCard = (b) => `
    <div class="relative bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-3 shadow-md hover:shadow-lg hover:border-gray-600 transition-all duration-200 no-underline">
      <div class="flex items-center justify-between mb-2 select-none">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full ${!b.isMalus ? 'animate-pulseLight' : ''}" style="background-color:${b.color};"></div>
          <span class="font-semibold text-yellow-300 text-base">${b.name}</span>
        </div>
        ${b.isMalus
            ? `<span class="text-xs text-red-400 font-medium">Malus 😈</span>`
            : `<span class="text-xs text-green-400 font-medium">Bonus 🎁</span>`
        }
      </div>

      <div class="text-gray-300 text-sm leading-relaxed space-y-1">
        <div class="flex gap-1">
          <span class="text-gray-400 font-medium">Effet :</span>
          <span class="text-gray-200">${b.effect}</span>
        </div>
        <div class="flex gap-1">
          <span class="text-gray-400 font-medium">Durée :</span>
          <span class="text-gray-200">${b.effectMs ? (b.effectMs / 1000) + "s" : "Instantané"}</span>
        </div>
      </div>

      <div class="absolute bottom-0 left-0 w-full h-1 rounded-b-xl" style="background-color:${b.color}; opacity:0.5;"></div>
    </div>
  `;

        // Construction du HTML final
        this.bonusList.innerHTML = `
    <div class="mb-5">
      <h3 class="text-lg font-semibold text-green-400 mb-2 flex items-center gap-2 select-none">
        🎁 Bonus
      </h3>
      ${bonuses.map(createCard).join("") || "<p class='text-gray-500 text-sm italic'>Aucun bonus disponible</p>"}
    </div>

    <div>
      <h3 class="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2 select-none">
        😈 Malus
      </h3>
      ${maluses.map(createCard).join("") || "<p class='text-gray-500 text-sm italic'>Aucun malus disponible</p>"}
    </div>
  `;
    }





    /* ============ Classements (affichage uniquement) ============ */

    renderLeaderboardHome(topN, modeTitle) {
        this.leaderboardModeLabel.textContent = modeTitle;
        const listEl = this.leaderboardListHome;

        listEl.style.opacity = 0;
        setTimeout(() => {
            if (!topN || topN.length === 0) {
                listEl.innerHTML = "<li class='italic text-gray-500'>Aucun score enregistré</li>";
            } else {
                listEl.innerHTML = topN.map(([user, score], i) => {
                    const podium = i === 0 ? "text-yellow-400"
                        : i === 1 ? "text-gray-300"
                            : i === 2 ? "text-amber-600" : "";
                    return `
            <li class="flex justify-between items-center px-3 py-2 rounded-lg bg-gray-700/40 hover:bg-gray-600/50 transition">
              <span class="font-semibold ${podium}">${i + 1}. ${escapeHtml(user)}</span>
              <span class="font-bold text-indigo-400">${score} pts</span>
            </li>`;
                }).join("");
            }
            listEl.style.opacity = 1;
            listEl.style.transition = "opacity 0.4s ease";
        }, 150);
    }

    renderLeaderboardInGame(topN) {
        this.leaderboardCardInGame.classList.remove("hidden");
        if (!topN || topN.length === 0) {
            this.leaderboardListInGame.innerHTML = "<li class='italic text-gray-500'>Aucun score enregistré</li>";
            return;
        }
        this.leaderboardListInGame.innerHTML = topN.map(([user, score], i) => {
            const podium = i === 0 ? "text-yellow-400 font-bold"
                : i === 1 ? "text-gray-300 font-bold"
                    : i === 2 ? "text-amber-600 font-bold" : "";
            return `
        <li class="flex justify-between items-center px-3 py-2 rounded-lg bg-gray-700/40 hover:bg-gray-600/50 transition">
          <span class="${podium}">${i + 1}. ${escapeHtml(user)}</span>
          <span class="font-bold text-indigo-400">${score} pts</span>
        </li>`;
        }).join("");
    }

    /* ============ Dessin Canvas (optionnel, “bête”) ============ */

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawFood(x, y, box) {
        const img = this.spriteApples;

        // Si l’image est prête, on la dessine
        if (img.complete && img.naturalWidth > 0) {
            const offset = (box - 32) / 2; // exemple si ton image est légèrement plus petite
            this.ctx.drawImage(img, x + offset, y + offset, box - offset * 2, box - offset * 2);

        } else {
            // fallback (si image pas encore chargée)
            this.ctx.fillStyle = "red";
            this.ctx.fillRect(x, y, box, box);
        }
    }

    // UI.js
    drawBonus(x, y, box, type) {
        const img = this.bonusSprites?.[type];
        if (img && img.complete && img.naturalWidth > 0) {
            const offset = (box - 32) / 2; // exemple si ton image est légèrement plus petite
            this.ctx.drawImage(img, x + offset, y + offset, box - offset * 2, box - offset * 2);
        } else {
            // Fallback visuel si l'image n'est pas encore prête
            // (couleurs de secours par type)
            const fallback = {
                gold: "#FFD54F",
                exp: "#64B5F6",
                malus: "#000000",
                poison: "#8E24AA",
                freeze: "#26C6DA",
                reverse: "#43A047",
            };
            this.ctx.fillStyle = fallback[type] || "white";
            this.ctx.fillRect(x, y, box, box);
        }
    }


    drawSnakeHead(x, y, box, angleRad) {
        this.ctx.save();
        this.ctx.translate(x + box / 2, y + box / 2);
        this.ctx.rotate(angleRad);
        this.ctx.drawImage(this.spriteHead, -box / 2, -box / 2, box, box);
        this.ctx.restore();
    }

    drawSnakeBodySegment(x, y, box) {
        this.ctx.drawImage(this.spriteBody, x, y, box, box);
    }

    /* ============ Helpers ============ */

    _setTxt(el, txt) { if (el) el.textContent = txt; }
}

/* ===== utils (simples) ===== */

function escapeHtml(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function loadImg(src) {
    const img = new Image();
    img.src = src;
    return img;
}
