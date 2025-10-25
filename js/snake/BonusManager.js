"use strict";

/**
 * BonusManager
 * - Gère l'apparition (spawn) des bonus/malus.
 * - Purge ceux expirés (lifetime).
 * - Détecte collisions avec la tête du serpent.
 * - Applique les effets via des callbacks fournis par Game.
 *
 * Aucune dépendance DOM. Le dessin est optionnel (UI peut dessiner à la place).
 */

export default class BonusManager {
    /**
     * @param {object} opts
     * @param {number} opts.canvasW
     * @param {number} opts.canvasH
     * @param {number} opts.box
     * @param {object} opts.catalog      - ex: { gold: {color:"gold", duration:0}, exp:{...}, ... }
     * @param {object} opts.probabilitiesByMode - ex: { classic:{gold:0.1,exp:0.2,...}, hardcore:{...} }
     * @param {function} [opts.random=Math.random]
     */
    constructor({ canvasW, canvasH, box, catalog, probabilitiesByMode, random = Math.random }) {
        this.w = canvasW;
        this.h = canvasH;
        this.box = box;

        this.catalog = catalog;
        this.probByMode = probabilitiesByMode;
        this.rand = random;

        /** @type Array<{type:string,x:number,y:number,expiresAt:number}> */
        this.items = [];

        // État d’effets temporaires actifs côté jeu (pour info si tu veux l’exposer)
        this.activeEffects = {
            expMultiplier: 1,      // 2 quand "exp" actif
            reverseControls: false,
            // freeze/speed gérés côté Game (car ça touche la boucle/interval)
        };
    }

    /** Retourne les positions courantes (utile pour éviter le spawn dans Food) */
    get positions() {
        return this.items.map(({ x, y }) => ({ x, y }));
    }

    /**
     * Appelé à chaque tick pour:
     * - purger les bonus expirés
     * - éventuellement tenter un spawn aléatoire
     * @param {number} now  - Date.now()
     * @param {object} opts
     * @param {string} opts.mode
     * @param {{x:number,y:number}} opts.foodPos
     * @param {Array<{x:number,y:number}>} opts.occupied - snake segments + food (optionnel)
     * @param {number} [opts.spawnChance=0.3] - probabilité de tenter un spawn (quand none présents)
     * @param {number} [opts.nearRadius=3] - rayon en cases pour spawn près de la pomme
     */
    tick(now, { mode, foodPos, occupied = [], spawnChance = 0.3, nearRadius = 3 } = {}) {
        // Purge
        this.items = this.items.filter(it => it.expiresAt > now);

        // Politique actuelle : ne spawn qu’un seul à la fois (comme ton code)
        if (this.items.length > 0) return;

        if (this.rand() < spawnChance) {
            const type = this.#pickTypeForMode(mode);
            if (!type) return;

            // Spawn près de la pomme pour les malus (comme ton code), sinon aléatoire global
            if (["malus", "freeze", "poison", "reverse"].includes(type) && foodPos) {
                const pos = this.#randomNear(foodPos, nearRadius, occupied);
                this.#spawn(type, pos);
            } else {
                const pos = this.#randomFreeCell(occupied);
                this.#spawn(type, pos);
            }
        }
    }

    /**
     * Collision avec la tête du serpent → applique l’effet et retire l’item.
     * Les effets sont passés par callbacks fournis par Game (aucune dépendance forte).
     *
     * @param {{x:number,y:number}} head
     * @param {object} effectAPI - callbacks vers Game
     * @param {function(number):void} effectAPI.addScore                 // +points
     * @param {function(number,number):void} effectAPI.setApplePointsMultiplierFor // (multiplier, ms)
     * @param {function(number):void} effectAPI.shrink                   // retire n segments si possible
     * @param {function(number):void} effectAPI.slowFor                  // ms de ralentissement
     * @param {function(number):void} effectAPI.reverseControlsFor       // ms de reverse
     * @returns {boolean} true si un bonus a été consommé
     */
    applyIfCollision(head, effectAPI) {
        for (let i = 0; i < this.items.length; i++) {
            const it = this.items[i];
            if (head.x === it.x && head.y === it.y) {
                this.#applyEffect(it.type, effectAPI);
                this.items.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * (Optionnel) Dessine les items en mode simple (carrés colorés).
     * Tu peux déplacer ça dans UI si tu préfères une séparation stricte.
     */
    draw(ctx) {
        for (const it of this.items) {
            const color = this.catalog[it.type]?.color || "white";
            ctx.fillStyle = color;
            ctx.fillRect(it.x, it.y, this.box, this.box);
        }
    }

    /* ============================
       ==        Internals       ==
       ============================ */

    #spawn(type, pos) {
        const duration = this.catalog[type]?.lifetimeMs ?? 5000; // par défaut 5s visibles
        this.items.push({
            type,
            x: pos.x,
            y: pos.y,
            expiresAt: Date.now() + duration,
        });
    }

    #pickTypeForMode(mode) {
        // Probabilités par mode, sinon fallback "standard"
        const weights = this.probByMode[mode] || this.probByMode.default;
        if (!weights) return null;
        return choiceWeighted(weights, this.rand);
    }

    #randomFreeCell(occupied = []) {
        const occ = toKeySet(occupied);
        const cols = Math.floor(this.w / this.box);
        const rows = Math.floor(this.h / this.box);
        const maxTries = Math.max(200, cols * rows);

        for (let i = 0; i < maxTries; i++) {
            const cx = Math.floor(this.rand() * cols);
            const cy = Math.floor(this.rand() * rows);
            const x = cx * this.box;
            const y = cy * this.box;
            if (!occ.has(xyKey(x, y))) return { x, y };
        }
        // Au pire, centre
        return { x: Math.floor(cols / 2) * this.box, y: Math.floor(rows / 2) * this.box };
    }

    #randomNear(center, radiusCells, occupied = []) {
        const occ = toKeySet(occupied);
        const candidates = validCellsAround(center, radiusCells, this.box, this.w, this.h)
            .filter(p => !occ.has(xyKey(p.x, p.y)));
        if (!candidates.length) return this.#randomFreeCell(occupied);
        return candidates[Math.floor(this.rand() * candidates.length)];
    }

    #applyEffect(type, api) {
        // Map tes types actuels → callbacks Game
        switch (type) {
            case "gold":
                // +50 points
                api.addScore(50);
                break;

            case "exp":
                // Double les points des pommes pendant 5s (ou duration depuis catalog)
                // Ici on met duration dans le catalog: BONUS_CATALOG.exp.effectMs
                api.setApplePointsMultiplierFor(2, this.catalog.exp?.effectMs ?? 5000);
                break;

            case "malus":
                // -30 points et retire 1 segment si possible
                api.addScore(-30);
                api.shrink(1);
                break;

            case "poison":
                // -50 points et retire 2 segments si possible
                api.addScore(-50);
                api.shrink(2);
                break;

            case "freeze":
                // Ralentit le jeu pendant 4s (durée configurable)
                api.slowFor(this.catalog.freeze?.effectMs ?? 4000);
                break;

            case "reverse":
                // Inverse contrôles pendant 5s (durée configurable)
                api.reverseControlsFor(this.catalog.reverse?.effectMs ?? 5000);
                break;

            default:
                // Unknown → no-op
                break;
        }
    }
}

/* ============================
   ==     Helpers “utils”    ==
   ============================ */

function toKeySet(points) {
    const s = new Set();
    for (const p of points) s.add(xyKey(p.x, p.y));
    return s;
}
function xyKey(x, y) { return `${x},${y}`; }

function validCellsAround(center, radiusCells, box, w, h) {
    const cells = [];
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
        for (let dy = -radiusCells; dy <= radiusCells; dy++) {
            const x = center.x + dx * box;
            const y = center.y + dy * box;
            if (x < 0 || x >= w || y < 0 || y >= h) continue;
            cells.push({ x, y });
        }
    }
    return cells;
}

/**
 * Choix pondéré: weights = {gold:0.1, exp:0.2, malus:0.3, freeze:0.4}
 * Retourne une clé selon les poids.
 */
function choiceWeighted(weights, rand = Math.random) {
    const entries = Object.entries(weights);
    const total = entries.reduce((acc, [, w]) => acc + w, 0);
    if (total <= 0) return null;
    const r = rand() * total;

    let acc = 0;
    for (const [key, w] of entries) {
        acc += w;
        if (r < acc) return key;
    }
    return entries[entries.length - 1][0]; // fallback
}
