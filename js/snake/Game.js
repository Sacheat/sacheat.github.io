"use strict";

import Snake, { Direction } from "./Snake.js";
import Food from "./Food.js";
import BonusManager from "./BonusManager.js";
import TimerManager from "./TimerManager.js";
import InputManager from "./InputManager.js";

import { GAME_MODES } from "./Mode.js";
import { BONUS_CATALOG, BONUS_PROBABILITIES } from "./Bonus.js";
import { BOX as DEFAULT_BOX, DEFAULT_SPEED, HARDCORE_SPEED, MIN_SPEED, APPLE_BASE_POINTS } from "./Constants.js";

/**
 * Game = orchestrateur : état global, boucle, collisions, règles de modes,
 * mise à jour UI, intégration sons/leaderboard.
 *
 * Aucune logique DOM ici : on parle à UI via son API.
 */
export default class Game {
    /**
     * @param {object} deps
     * @param {import("./UI.js").default} deps.ui
     * @param {import("./Leaderboard.js").default} deps.leaderboard
     * @param {import("./AudioManager.js").default} deps.audio
     * @param {number} [deps.box=DEFAULT_BOX]
     */
    constructor({ ui, leaderboard, audio, box = DEFAULT_BOX }) {
        this.ui = ui;
        this.leaderboard = leaderboard;
        this.audio = audio;

        // grille
        this.box = box;
        this.canvasW = ui.canvas.width;
        this.canvasH = ui.canvas.height;

        // entités & systèmes
        this.snake = new Snake(9 * box, 10 * box, box, Direction.RIGHT);
        this.food = new Food({ canvasW: this.canvasW, canvasH: this.canvasH, box: this.box });
        this.bonus = new BonusManager({
            canvasW: this.canvasW,
            canvasH: this.canvasH,
            box: this.box,
            catalog: BONUS_CATALOG,
            probabilitiesByMode: BONUS_PROBABILITIES
        });
        this.timer = new TimerManager({ tickMs: 1000 });
        this.input = new InputManager();

        // état de partie
        this.mode = "classic";
        this.user = "Invité";

        this.score = 0;
        this.appleBasePoints = APPLE_BASE_POINTS; // 10
        this.appleMultiplier = 1;                 // modifié par bonus exp
        this.speed = DEFAULT_SPEED;               // ms/tick
        this.isPaused = true;
        this.isGameOver = false;
        this.lives = 3;
        this.interval = null;                     // boucle setInterval

        // timers d’effets temporaires (pour restore)
        this._restoreAppleTimer = null;
        this._restoreSpeedTimer = null;
        this._restoreReverseTimer = null;

        // câblage entrées
        this.input.setDirectionHandler((dir) => this.snake.setDirection(dir));
        this.input.attach();

        // premier spawn
        this._respawnFood();

        // hook UI statique (bonus list sur l’accueil, si besoin)
        // (Tu peux l’appeler depuis main.js aussi)
        // this.ui.renderBonusList(BONUS_CATALOG);
    }

    /* =========================
       =       Lifecycle       =
       ========================= */

    /**
     * Lance une partie dans un mode donné.
     * @param {"classic"|"chrono"|"lives"|"hardcore"|"reverse-timer"} mode
     * @param {string} userName
     */
    start(mode, userName) {
        this.mode = mode;
        this.user = userName || "Invité";

        this._resetCoreStateForMode();
        this._renderLeaderboards();

        this.ui.showGame();
        this.ui.setPlayerName(this.user);
        this.ui.setHighscore(this.leaderboard.getUserHighscore(this.mode, this.user));
        this.ui.setScore(this.score);
        this._updateHUD();

        // timers d’affichage (timer/vies) selon le mode
        this.ui.showTimer(this._usesTimer());
        this.ui.showLives(this.mode === "lives");

        if (this._usesTimer()) {
            const startSeconds = (this.mode === "chrono") ? 120 : 60;
            const starter = (this.mode === "chrono") ? this.timer.startCountdown.bind(this.timer)
                : this.timer.startReverse.bind(this.timer);
            starter(startSeconds, {
                onTick: (v) => this.ui.setTimer(v),
                onEnd: () => this.gameOver()
            });
        }

        // boucle de jeu
        this.isPaused = false;
        this.isGameOver = false;
        this._restartInterval();

    }

    /** Retour au menu (stoppe tout). */
    toMenu() {
        this.isPaused = true;
        this.isGameOver = false;

        this._stopInterval();
        this.timer.stop();
        this._clearEffectTimers();

        this.ui.showMenu();
        this.ui.clearTimeInfo();
    }

    /** Pause / reprise. */
    pauseToggle() {
        if (this.isGameOver) return;
        this.isPaused = !this.isPaused;
        this.timer.setPaused(this.isPaused);
        if (this.isPaused) this._stopInterval();
        else this._restartInterval();
    }

    /* =========================
       =     Boucle & Tick     =
       ========================= */

    _restartInterval() {
        this._stopInterval();
        console.log("[Game] restart interval at", this.speed, "ms");
        this.interval = setInterval(() => this._tick(), this.speed);
    }
    _stopInterval() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    _tick() {
        if (this.isPaused || this.isGameOver) {
            // console.log("[Game] tick skipped: paused=", this.isPaused, "over=", this.isGameOver);
            return;
        }

        try {
            const now = Date.now();

            // Purge/spawn bonus
            this.bonus.tick(now, {
                mode: this.mode,
                foodPos: this.food.pos,
                occupied: [
                    ...this.snake.segments,
                    this.food.pos
                ],
                spawnChance: 0.3,
                nearRadius: 3
            });

            // Déplacer serpent
            this.snake.advance(false);

            // Bords
            if (this.mode === "hardcore") {
                if (this.snake.isOutOfBounds(this.canvasW, this.canvasH)) {
                    // console.warn("[Game] out-of-bounds → gameOver");
                    this.gameOver();
                    return; // on sort, le finally va unlock
                }
            } else {
                this.snake.applyWrap(this.canvasW, this.canvasH);
            }

            // Auto-collision
            if (this.snake.hitSelf()) {
                if (this.mode === "lives") {
                    this.lives--;
                    this.ui.setLives(this.lives);
                    if (this.lives <= 0) {
                        this.gameOver();
                        return; // finally -> unlock
                    }
                    // respawn soft
                    this.snake.resetTo(9 * this.box, 10 * this.box, Direction.RIGHT);
                    this.input.setReversed(false);
                    this._respawnFood();
                } else {
                    this.gameOver();
                    return; // finally -> unlock
                }
            }

            // Pomme ?
            if (this.food.isEatenBy(this.snake.head)) {
                this.audio.playApple();
                const applePoints = this.appleBasePoints * this.appleMultiplier;
                this._addScore(applePoints);

                // grow
                this.snake.advance(true);

                if (this.mode === "reverse-timer") {
                    this.timer.add(+5);
                }

                if (this.leaderboard.saveIfHighscore(this.mode, this.user, this.score)) {
                    this.ui.setHighscore(this.leaderboard.getUserHighscore(this.mode, this.user));
                    this._renderLeaderboards();
                }

                this._updateSpeed();
                this._respawnFood();
            }

            // Bonus
            this.bonus.applyIfCollision(this.snake.head, {
                addScore: (delta) => this._addScore(delta),
                setApplePointsMultiplierFor: (mult, ms) => this._setAppleMultiplierFor(mult, ms),
                shrink: (n) => this._shrinkSnake(n),
                slowFor: (ms) => this._slowFor(ms),
                reverseControlsFor: (ms) => this._reverseControlsFor(ms),
            });

            // Rendu
            this._render();

        } finally {
            // Déverrouille TOUJOURS le changement de direction pour le prochain tick
            this.input.unlockPerTick();
            // console.log("[Input] unlockPerTick()");
        }
    }



    /* =========================
       =        Rendu          =
       ========================= */

    _render() {
        const box = this.box;
        this.ui.clearCanvas();

        // Food
        this.ui.drawFood(this.food.x, this.food.y, box);

        // Bonus
        // (Si tu préfères laisser BonusManager dessiner, appelle this.bonus.draw(this.ui.ctx))
        for (const it of this.bonus.items) {
            const color = BONUS_CATALOG[it.type]?.color || "white";
            this.ui.drawBonus(it.x, it.y, box, it.type);
        }

        // Snake
        const segs = this.snake.segments;
        for (let i = 0; i < segs.length; i++) {
            const s = segs[i];
            if (i === 0) this.ui.drawSnakeHead(s.x, s.y, box, this.snake.headAngle());
            else this.ui.drawSnakeBodySegment(s.x, s.y, box);
        }

        // HUD
        this._updateHUD();
    }

    _updateHUD() {
        this.ui.setHUD({
            modeTitle: GAME_MODES[this.mode].title,
            speedMs: this.speed,
            length: this.snake.length,
            apples: Math.floor(this.score / this.appleBasePoints)
        });
    }

    _renderLeaderboards() {
        const top5 = this.leaderboard.topN(this.mode, 5);
        this.ui.renderLeaderboardInGame(top5);
        // (sur l’accueil, tu peux appeler ui.renderLeaderboardHome depuis main.js au hover)
    }

    /* =========================
       =       Règles UX       =
       ========================= */

    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.isPaused = true;

        this._stopInterval();
        this.timer.stop();
        this.audio.playGameOver();

        // Infos “temps” selon le mode
        this.ui.clearTimeInfo();
        if (this.mode === "chrono") {
            const v = 120 - this.timer.get(); // temps écoulé
            this.ui.showTimeInfo(`⏱ Temps écoulé : ${v}s`);
        } else if (this.mode === "reverse-timer") {
            const v = this.timer.get(); // temps restant
            this.ui.showTimeInfo(`⏱ Temps restant : ${v}s`);
        }

        // Highscore final
        this.leaderboard.saveIfHighscore(this.mode, this.user, this.score);
        this.ui.setGameOverInfo({ score: this.score, modeTitle: GAME_MODES[this.mode].title });

        // Overlay
        this.ui.showGameOver();
    }

    restart() {
        // appelé par ton bouton “Rejouer” si tu veux conserver le même mode & user
        this.start(this.mode, this.user);
        this.ui.closeGameOver();
    }

    /* =========================
       =      Aides core       =
       ========================= */

    _resetCoreStateForMode() {
        this.score = 0;
        this.appleMultiplier = 1;
        this._clearEffectTimers();

        // vitesse
        this.speed = (this.mode === "hardcore") ? HARDCORE_SPEED : DEFAULT_SPEED;

        // snake pos & dir
        this.snake.resetTo(9 * this.box, 10 * this.box, Direction.RIGHT);

        // vies
        this.lives = 3;

        // timers
        this.timer.stop();
        this.ui.clearTimeInfo();

        // entrées
        this.input.setReversed(false);

        // food
        this._respawnFood();
    }

    _respawnFood() {
        this.food.respawn([ ...this.snake.segments, ...this.bonus.positions ]);
    }

    _addScore(delta) {
        this.score = Math.max(0, this.score + Math.floor(delta));
        this.ui.setScore(this.score);
    }

    _updateSpeed() {
        if (this.mode === "hardcore") return; // fixe
        // même logique que ton code : -10 ms tous les 50 pts, min 50 ms
        const newSpeed = Math.max(MIN_SPEED, DEFAULT_SPEED - Math.floor(this.score / 50) * 10);
        if (newSpeed !== this.speed) {
            this.speed = newSpeed;
            this._restartInterval();
        }
    }

    _shrinkSnake(n) {
        // retire jusqu’à n segments (sans aller sous 1)
        let toRemove = Math.min(n, Math.max(0, this.snake.length - 1));
        while (toRemove-- > 0) {
            // “couper la queue” = on avance sans grow et on supprime la vraie queue (déjà géré dans advance).
            // Ici plus simple : on manipule directement le tableau interne via reset ou une API que tu peux exposer.
            // Pour t’entraîner, on fait une petite astuce : on pop en rejouant l’état (copie segments).
            const segs = this.snake._segments; // ⚠️ interne → si tu veux, expose une méthode public removeTail(1)
            if (segs.length > 1) segs.pop();
        }
    }

    _setAppleMultiplierFor(mult, ms) {
        clearTimeout(this._restoreAppleTimer);
        this.appleMultiplier = mult;
        this._restoreAppleTimer = setTimeout(() => {
            this.appleMultiplier = 1;
        }, ms);
    }

    _slowFor(ms) {
        clearTimeout(this._restoreSpeedTimer);

        // mémoriser la vitesse courante pour restore + ralentir tout de suite
        const prev = this.speed;
        this.speed = Math.max(prev, 200); // comme ton “freeze” (~200 ms)
        this._restartInterval();

        this._restoreSpeedTimer = setTimeout(() => {
            // ne pas écraser si le score a réduit la vitesse entre temps :
            // on recalcule depuis le score (hors hardcore)
            if (this.mode === "hardcore") {
                this.speed = HARDCORE_SPEED;
            } else {
                const newSpeed = Math.max(MIN_SPEED, DEFAULT_SPEED - Math.floor(this.score / 50) * 10);
                this.speed = newSpeed;
            }
            this._restartInterval();
        }, ms);
    }

    _reverseControlsFor(ms) {
        clearTimeout(this._restoreReverseTimer);
        this.input.setReversed(true);
        this._restoreReverseTimer = setTimeout(() => this.input.setReversed(false), ms);
    }

    _usesTimer() {
        return this.mode === "chrono" || this.mode === "reverse-timer";
    }

    _clearEffectTimers() {
        clearTimeout(this._restoreAppleTimer);
        clearTimeout(this._restoreSpeedTimer);
        clearTimeout(this._restoreReverseTimer);
        this._restoreAppleTimer = this._restoreSpeedTimer = this._restoreReverseTimer = null;
    }
}
