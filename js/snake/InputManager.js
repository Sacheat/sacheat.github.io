"use strict";

import { Direction } from "./Snake.js";

/**
 * InputManager
 * - Traduit les touches clavier en Directions du Snake.
 * - Gère l'inversion des contrôles (reverse).
 * - Empêche >1 changement de direction par tick (lock/unlock).
 * - Aucune dépendance DOM hormis window (peut être mocké).
 */
export default class InputManager {
    /**
     * @param {object} [opts]
     * @param {Window} [opts.target=window]
     * @param {boolean} [opts.preventScroll=true] - bloque le scroll des flèches
     */
    constructor({ target = window, preventScroll = true } = {}) {
        this.target = target;
        this.preventScroll = preventScroll;

        this.enabled = false;
        this.reversed = false;
        this.locked = false; // “une direction par tick”
        this.onDirection = null; // (Direction) => void

        // keymap configurable (flèches + WASD)
        this.keymap = {
            ArrowUp:    "UP",
            ArrowDown:  "DOWN",
            ArrowLeft:  "LEFT",
            ArrowRight: "RIGHT",
            z: "UP", Z: "UP",
            s: "DOWN", S: "DOWN",
            q: "LEFT", Q: "LEFT",
            d: "RIGHT", D: "RIGHT",
        };

        this._onKeyDown = this._onKeyDown.bind(this);
    }

    /** Active l’écoute clavier. */
    attach() {
        if (this.enabled) return;
        this.enabled = true;
        this.target.addEventListener("keydown", this._onKeyDown, { passive: !this.preventScroll });
    }

    /** Désactive l’écoute clavier. */
    detach() {
        if (!this.enabled) return;
        this.enabled = false;
        this.target.removeEventListener("keydown", this._onKeyDown);
    }

    /** Définit le callback de direction. */
    setDirectionHandler(fn) {
        this.onDirection = typeof fn === "function" ? fn : null;
    }

    /** Inverse ou rétablit les contrôles. */
    setReversed(flag) {
        this.reversed = !!flag;
    }

    /** Verrouille le changement de direction jusqu’au prochain tick. */
    lockPerTick() {
        this.locked = true;
    }

    /** À appeler en fin de tick pour autoriser un nouveau changement. */
    unlockPerTick() {
        this.locked = false;
    }

    /** Personnalise le keymap (merge). */
    setKeymap(partialMap) {
        this.keymap = { ...this.keymap, ...partialMap };
    }

    /* ---------- internals ---------- */

    _onKeyDown(e) {
        if (!this.enabled || this.locked) return;

        const key = e.key;
        const dirName = this.keymap[key];
        if (!dirName) return;

        // empêche le scroll sur flèches
        if (this.preventScroll && key.startsWith("Arrow")) {
            e.preventDefault?.();
        }

        const logical = this._applyReverse(dirName);
        const dir = toDirection(logical);
        if (!dir) return;

        // émet la direction
        if (this.onDirection) this.onDirection(dir);

        // lock jusqu’au prochain tick
        this.lockPerTick();
    }

    _applyReverse(dirName) {
        if (!this.reversed) return dirName;
        switch (dirName) {
            case "UP": return "DOWN";
            case "DOWN": return "UP";
            case "LEFT": return "RIGHT";
            case "RIGHT": return "LEFT";
            default: return dirName;
        }
    }
}

/* ===== helpers ===== */

function toDirection(name) {
    switch (name) {
        case "UP": return Direction.UP;
        case "DOWN": return Direction.DOWN;
        case "LEFT": return Direction.LEFT;
        case "RIGHT": return Direction.RIGHT;
        default: return null;
    }
}
