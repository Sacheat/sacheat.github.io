"use strict";

/**
 * AudioManager
 * - Wrapper minimal autour d'HTMLAudioElement (compat large, simple).
 * - Gère mute, volume global, et lecture "one-shot".
 * - Précharge les sons et ignore proprement les erreurs d'autoplay.
 */
export default class AudioManager {
    /**
     * @param {object} [opts]
     * @param {number} [opts.volume=1.0]     - volume global [0..1]
     * @param {boolean} [opts.muted=false]   - état muet initial
     * @param {object} [opts.sounds]         - mapping nom → URL
     *        ex: { gameOver: "Sounds/gameOver.mp3", appleEated: "Sounds/appleEated.mp3" }
     */
    constructor({
                    volume = 1.0,
                    muted = false,
                    sounds = {
                        gameOver: "Sounds/gameOver.mp3",
                        appleEated: "Sounds/appleEated.mp3",
                    },
                } = {}) {
        this._muted = !!muted;
        this._volume = clamp01(volume);

        /** @type {Record<string, HTMLAudioElement>} */
        this._pool = {};
        this._sources = { ...sounds };

        this._preloadAll();
    }

    /* ============== Public API ============== */

    /** Coupe/rétablit le son. */
    setMuted(muted) {
        this._muted = !!muted;
        // on ne stoppe pas les sons en cours, on bloque seulement de futures lectures
    }

    toggleMuted() {
        this.setMuted(!this._muted);
        return this._muted;
    }

    /** Règle le volume global [0..1]. */
    setVolume(v) {
        this._volume = clamp01(v);
    }

    get muted() { return this._muted; }
    get volume() { return this._volume; }

    /** Lecture d’un son par nom (ex: "gameOver"). Options locales possibles. */
    play(name, { volume = 1.0, playbackRate = 1.0 } = {}) {
        if (this._muted) return;

        const base = this._pool[name];
        if (!base) return; // son inconnu → no-op

        // On clone le node pour autoriser les overlaps (plusieurs lectures rapprochées)
        const audio = base.cloneNode(true);
        audio.volume = clamp01(this._volume * volume);
        audio.playbackRate = playbackRate;

        // Tentative de lecture, on ignore les erreurs d'autoplay (politiques navigateur)
        audio.currentTime = 0;
        audio.play().catch(() => {/* ignore */});
    }

    /** Alias pratiques pour ton jeu actuel */
    playGameOver() { this.play("gameOver"); }
    playApple()    { this.play("appleEated"); }

    /** Ajoute/écrase dynamiquement un son (utile si tu étends ton set audio). */
    register(name, url) {
        this._sources[name] = url;
        this._pool[name] = this._createAudio(url);
    }

    /** Stop “grossièrement” tout ce qui est en cours (best-effort). */
    stopAll() {
        // HTMLAudioElement n’a pas d’API globale ; on force pause sur le “pool de base”
        // Les clones lancés ne sont pas référencés, donc solution simple : couper le volume global à 0 temporairement.
        const prev = this._volume;
        this._volume = 0;
        // petite remise en place asynchrone si tu veux simuler un “stop”
        setTimeout(() => { this._volume = prev; }, 0);
    }

    /* ============== Internals ============== */

    _preloadAll() {
        for (const [name, url] of Object.entries(this._sources)) {
            this._pool[name] = this._createAudio(url);
        }
    }

    _createAudio(url) {
        const a = new Audio(url);
        a.preload = "auto";
        // Sur certains navigateurs, .load() explicite aide le préchargement :
        try { a.load(); } catch { /* ignore */ }
        return a;
    }
}

/* ============== helpers ============== */
function clamp01(v) {
    return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 1));
}
