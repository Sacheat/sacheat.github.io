"use strict";

/**
 * Leaderboard
 * - Stocke des highscores PAR MODE et PAR UTILISATEUR.
 * - Persistance via localStorage (clé configurable).
 * - Aucune dépendance DOM. L'affichage est délégué à UI.
 *
 * Structure interne:
 * {
 *   classic: { "Sacha": 150, "Alex": 120 },
 *   chrono:  { "Sacha": 90 }
 * }
 */
export default class Leaderboard {
    /**
     * @param {object} [opts]
     * @param {string} [opts.storageKey="snakeHighScores"] - clé localStorage
     * @param {Storage} [opts.storage=window.localStorage] - implémentation Storage
     */
    constructor({ storageKey = "snakeHighScores", storage = safeLocalStorage() } = {}) {
        this._storageKey = storageKey;
        this._storage = storage;

        /** @type {Record<string, Record<string, number>>} */
        this._map = this._load();
    }

    /* ============== Public API ============== */

    /** Retourne le highscore d'un user pour un mode. */
    getUserHighscore(mode, user) {
        if (!mode || !user) return 0;
        this._ensureMode(mode);
        return this._map[mode][user] || 0;
    }

    /**
     * Enregistre si et seulement si c'est un nouveau highscore.
     * @returns {boolean} true si le score a été mis à jour
     */
    saveIfHighscore(mode, user, score) {
        if (!mode || !user || !Number.isFinite(score)) return false;
        this._ensureMode(mode);

        const current = this._map[mode][user] || 0;
        if (score > current) {
            this._map[mode][user] = Math.floor(score);
            this._save();
            return true;
        }
        return false;
    }

    /**
     * Top N pour un mode (tri décroissant).
     * @returns {Array<[string, number]>} ex: [["Sacha",150], ["Alex",120]]
     */
    topN(mode, n = 5) {
        this._ensureMode(mode);
        return Object.entries(this._map[mode])
            .sort((a, b) => b[1] - a[1])
            .slice(0, n);
    }

    /** Supprime tous les scores d’un mode (utile pour reset ciblé). */
    clearMode(mode) {
        if (!mode) return;
        this._map[mode] = {};
        this._save();
    }

    /** Supprime tous les scores, tous modes. */
    clearAll() {
        this._map = {};
        this._save();
    }

    /** Import/merge d’une structure externe {mode:{user:score}} (écrase si meilleur). */
    merge(data) {
        if (!data || typeof data !== "object") return;

        for (const [mode, users] of Object.entries(data)) {
            if (!users || typeof users !== "object") continue;
            this._ensureMode(mode);
            for (const [user, score] of Object.entries(users)) {
                if (!Number.isFinite(score)) continue;
                const s = Math.floor(score);
                if (s > (this._map[mode][user] || 0)) {
                    this._map[mode][user] = s;
                }
            }
        }
        this._save();
    }

    /** Exporte une copie sérialisable de l’état interne. */
    toJSON() {
        return JSON.parse(JSON.stringify(this._map));
    }

    /* ============== Internals ============== */

    _ensureMode(mode) {
        if (!this._map[mode]) this._map[mode] = {};
    }

    _load() {
        try {
            const raw = this._storage.getItem(this._storageKey);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return isObject(parsed) ? parsed : {};
        } catch {
            return {};
        }
    }

    _save() {
        try {
            this._storage.setItem(this._storageKey, JSON.stringify(this._map));
        } catch {
            // quota plein / storage indisponible → on ignore silencieusement
        }
    }
}

/* ============== helpers ============== */

function isObject(v) {
    return v && typeof v === "object" && !Array.isArray(v);
}

/**
 * Fournit un Storage “safe” même si localStorage n’est pas dispo
 * (mode privé strict, SSR, etc.). Tombe sur un mini store mémoire.
 */
function safeLocalStorage() {
    try {
        if (typeof window !== "undefined" && window.localStorage) {
            // test de write
            const k = "__lb_test__";
            window.localStorage.setItem(k, "1");
            window.localStorage.removeItem(k);
            return window.localStorage;
        }
    } catch {
        // ignore
    }
    // Fallback en mémoire
    const mem = new Map();
    return {
        getItem: (k) => (mem.has(k) ? mem.get(k) : null),
        setItem: (k, v) => { mem.set(k, String(v)); },
        removeItem: (k) => { mem.delete(k); },
    };
}
