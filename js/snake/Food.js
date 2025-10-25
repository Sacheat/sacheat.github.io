"use strict";

/**
 * Gère la position de la pomme et sa génération sur une grille sur une case valide.
 */

export default class Food {
    /**
     * @param {object} opts
     * @param {number} opts.canvasW - Largeur du plateau en pixels
     * @param {number} opts.canvasH - Hauteur du plateau en pixels
     * @param {number} opts.box     - taille d'une case
     * @param {function} [opts.random] - Générateur aléatoire
     */

    constructor({canvasW, canvasH, box, random = Math.random}) {
        this.box = box;
        this.w = canvasW;
        this.h = canvasH;
        this.rand = random;

        // Position courante (x, y) en multiples de box
        this._x = 0;
        this._y = 0;
    }

    /**
     * Coordonnées actuelles (lecture seule)
     */

    get x() {return this._x;}
    get y() {return this._y;}
    get pos() {return {x: this._x, y: this._y};}

    /**
     * Repositionne la pomme sur une case libre.
     * @param {Array<{x:number, y:number}>} occupied - cases interdites (snake, bonus, malus)
     * @returns {{x:number, y:number}} - la nouvelle position
     */
    respawn(occupied = []) {
        const occ = toKeySet(occupied);

        //Nombre max d'essais pour éviter les boucles infinies en fin de partie
        const maxTries = Math.max(200, (this.w / this.box) * (this.h / this.box));
        for (let i = 0; i < maxTries; i++) {
            const {x, y} = this.#randomGridCell();
            const key = xyKey(x, y);
            if (!occ.has(key)) {
                this._x = x;
                this._y = y;
                return this.pos;
            }
        }
        //Fallback : on garde la position courante si saturation extrême
        return this.pos;
    }

    /**
     * Repositionne la pomme près d'une position cible
     * (utile pour faire apparaitre des "malus" autour de la pomme)
     * @param {{x:number, y:number}} target - centre
     * @param {number} radiusCell - rayon en case
     * @param {Array<{x:number, y:number}>} occupied - cases interdites
     */
    respawnNear(target, radiusCell = 3, occupied = []) {
        const occ = toKeySet(occupied);
        const candidates = validCellsAround(target, radiusCell, this.box, this.w, this.y).filter(p => !occ.has(xyKey(p.x, p.y)));

        if (candidates.length) {
            const pick = candidates[Math.floor(this.rand * candidates.length)];
            this._x = pick.x;
            this._y = pick.y;
            return this.pos;
        }
        // Si aucune case dispo fallback sur respawn global
        return this.respawn(occupied);
    }

    /**
     * True si la tête du serpent est sur la pomme
     */
    isEatenBy(head) {
        return head.x === this._x && head.y === this._y;
    }

    // ============ Helper interne ==============

    #randomGridCell() {
        const cols = Math.floor((this.w / this.box));
        const rows = Math.floor(this.h / this.box);
        const cx = Math.floor((this.rand() * cols));
        const cy = Math.floor((this.rand() * rows));
        return {x: cx * this.box, y: cy * this.box};
    }
}

/* ============================
   ==     Helpers “utils”    ==
   ==   (déplaçables plus tard dans /src/utils) ==
   ============================ */

/** Transforme un tableau de {x,y} en Set de clés "x,y" pour lookup O(1). */
function toKeySet(points) {
    const s = new Set();
    for (const p of points) s.add(xyKey(p.x, p.y));
    return s;
}
function xyKey(x, y) { return `${x},${y}`; }

/**
 * Retourne toutes les cases valides autour d’un centre, dans un rayon (en cases).
 * - Respecte les bords (0..w, 0..h).
 * - Filtrage “occupé” à faire au-dessus (on renvoie toutes les cases potentielles).
 */
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