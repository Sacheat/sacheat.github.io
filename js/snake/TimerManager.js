"use strict";

/**
 * TimerManager
 * - Gère un compte à rebours (chrono) ou un "reverse timer".
 * - Pas de DOM ici : on informe le jeu via des callbacks.
 * - Corrige la dérive en se basant sur Date.now() plutôt que sur la confiance en setInterval.
 */
export default class TimerManager {
    /**
     * @param {object} [opts]
     * @param {number} [opts.tickMs=1000] - période des ticks (ms)
     */
    constructor({ tickMs = 1000 } = {}) {
        this.tickMs = tickMs;

        this._interval = null;
        this._mode = "none";     // "countdown" | "reverse" | "none"
        this._startValue = 0;    // valeur initiale en secondes
        this._value = 0;         // valeur courante en secondes
        this._paused = false;

        this._startedAt = 0;     // timestamp ms du dernier (re)démarrage
        this._accumPause = 0;    // durée totale de pause cumulée (ms)
        this._pausedAt = 0;      // timestamp ms du passage en pause

        // Callbacks
        this._onTick = null;     // (valueSeconds) => void
        this._onEnd = null;      // () => void
    }

    /* =========================
       =      Public API      =
       ========================= */

    /**
     * Démarre un compte à rebours (chrono qui descend).
     * @param {number} seconds - valeur de départ (ex: 120)
     * @param {{onTick?:(n:number)=>void, onEnd?:()=>void}} [cbs]
     */
    startCountdown(seconds, cbs = {}) {
        this._setup("countdown", seconds, cbs);
        this._run();
    }

    /**
     * Démarre un "reverse timer" (qui part d'un nombre et descend de la même manière ;
     * la différence métier se gère dans Game, ex: +5s quand on mange une pomme).
     * Concrètement identique à startCountdown côté Timer, mais on garde un nom explicite.
     * @param {number} seconds
     * @param {{onTick?:(n:number)=>void, onEnd?:()=>void}} [cbs]
     */
    startReverse(seconds, cbs = {}) {
        this._setup("reverse", seconds, cbs);
        this._run();
    }

    /** Stoppe complètement le timer (callbacks non appelés après stop). */
    stop() {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
        this._mode = "none";
        this._onTick = null;
        this._onEnd = null;
        this._paused = false;
        this._accumPause = 0;
    }

    /** Met en pause (true) / reprend (false). */
    setPaused(paused) {
        if (this._mode === "none") return;
        if (paused && !this._paused) {
            this._paused = true;
            this._pausedAt = Date.now();
        } else if (!paused && this._paused) {
            this._paused = false;
            // On cumule la durée de pause pour conserver une mesure réelle du temps écoulé
            this._accumPause += Date.now() - this._pausedAt;
            this._pausedAt = 0;
        }
    }

    /** Ajoute (ou retire si négatif) des secondes au timer en cours. */
    add(secondsDelta) {
        if (this._mode === "none") return;
        this._value = Math.max(0, this._value + Math.trunc(secondsDelta));
        // Notifie tout de suite (pratique pour afficher +5s instantanément)
        if (this._onTick) this._onTick(this._value);
        // Si on tombe à 0 → termine
        if (this._value <= 0) this._end();
    }

    /** Valeur courante (en secondes) du timer. */
    get() {
        return this._value;
    }

    /** Vrai si un timer (quel qu’il soit) est actif. */
    isRunning() {
        return this._mode !== "none" && this._interval !== null;
    }

    /** Vrai si le timer est en pause. */
    isPaused() {
        return this._paused;
    }

    /* =========================
       =     Internals        =
       ========================= */

    _setup(mode, startSeconds, { onTick = null, onEnd = null }) {
        this.stop(); // reset propre de tout état précédent

        this._mode = mode;
        this._startValue = Math.max(0, Math.trunc(startSeconds));
        this._value = this._startValue;

        this._onTick = onTick;
        this._onEnd = onEnd;

        this._startedAt = Date.now();
        this._accumPause = 0;
        this._paused = false;
        this._pausedAt = 0;

        // tick initial (pour afficher la valeur dès le start)
        if (this._onTick) this._onTick(this._value);
    }

    _run() {
        this._interval = setInterval(() => {
            if (this._paused || this._mode === "none") return;

            const now = Date.now();
            const elapsedMs = now - this._startedAt - this._accumPause;
            const elapsedSeconds = Math.floor(elapsedMs / 1000);

            // valeur = start - elapsed
            const next = Math.max(0, this._startValue - elapsedSeconds);

            if (next !== this._value) {
                this._value = next;
                if (this._onTick) this._onTick(this._value);

                if (this._value <= 0) {
                    this._end();
                }
            }
        }, this.tickMs);
    }

    _end() {
        const onEnd = this._onEnd;
        this.stop(); // nettoie tout
        if (onEnd) onEnd();
    }
}
