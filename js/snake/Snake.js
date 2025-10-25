"use strict";

/**
 *
 * Directions possibles du serpent
 *
 */

export const Direction = Object.freeze({
    UP: "UP",
    DOWN: "DOWN",
    LEFT: "LEFT",
    RIGHT: "RIGHT",
});

/**
 * Classe Snake : gère les segments, la direction, les déplacements
 * et les collisions internes.
 */

export default class Snake {
    /**
     * @param {number} startX - position X de départ (en pixel)
     * @param {number} startY - position Y de départ (en pixel)
     * @param {number} cell   - taille d'une case
     * @param {string} initialDir - direction initiale
     */

    constructor(startX, startY, cell, initialDir = Direction.RIGHT) {
        this.cell = cell;

        // Liste de segment {x,y} - tête = index 0
        this._segments = [{ x: startX, y: startY }];

        // Direction courante
        this._dir = initialDir;

        // Verrou "une seule rotation par tick"
        this._directionLocked = false;
    }

    /* ========================

       ==  Accesseur simple  ==

       ======================== */

    get head() {
        return this._segments[0];
    }

    get length() {
        return this._segments.length;
    }

    get segments() {
        // renvoie une copie
        return this._segments.map(s => ({ ...s }));
    }

    get direction() {
        return this._dir;
    }

    /**
     * Change la direction si elle n'est pas opposé à l'actuelle
     * et si on n'a pas déjà changé de direction dans ce tick
     * @param {string} nextDir - une valeur de Direction
     */
    setDirection(nextDir) {
        if (!isValidDirection(nextDir)) return;
        if (isOpposite(this._dir, nextDir)) return;

        this._dir = nextDir;
    }

    /**
     * Réinitialise le serpent à une position & direction précises.
     */
    resetTo(x, y, dir = Direction.RIGHT) {
        this._segments = [{x, y}];
        this._dir = dir;
        this._directionLocked = false;
    }

    /**
     * Indique si une case (x, y) est occupée par le serpent.
     */
    occupies(x, y) {
        return this._segments.some(seg => seg.x === x && seg.y === y);
    }


    /* ===============================
       ==        Déplacements       ==
       =============================== */

    /**
     * Calcule la prochaine position de tête selon la direction actuelle
     * @returns {{x:number, y:number}}
     */
    nextHead() {
        const {x, y} = this.head;
        switch (this._dir) {
            case Direction.LEFT:  return {x: x - this.cell, y};
            case Direction.RIGHT: return {x: x + this.cell, y};
            case Direction.UP:    return {x, y: y - this.cell};
            case Direction.DOWN:  return {x, y: y + this.cell};

            default:              return {x, y};
        }
    }

    /**
     * Avance d'une cellule. Si "grow" est true, on ne retire pas la queue.
     * @param {boolean} grow
     */
    advance(grow = false) {
        const nh = this.nextHead();

        // ajoute la tête
        this._segments.unshift(nh);

        //retire la queue si on ne grandit pas
        if (!grow) this._segments.pop();
    }

    /**
     * Applique le wrap (sortie d'un bord -> entrée bord opposé).
     * Ne teste pas la collision, ne redessine pas.
     * @param {number} canvasW
     * @param {number} canvasH
     */
    applyWrap(canvasW, canvasH) {
        const h = this.head;
        if (h.x < 0) h.x = canvasW - this.cell;
        else if(h.x >= canvasW) h.x = 0;
        if (h.y < 0) h.y = canvasH - this.cell;
        else if (h.y >= canvasH) h.y = 0;
    }


    /**
     *Test si la tête est hors limite (pour le mode hardcore)
     * @param {number} canvasW
     * @param {number} canvasH
     * @returns {boolean}
     */
    isOutOfBounds(canvasW, canvasH) {
        const { x, y } = this.head;
        return x < 0 || x >= canvasW || y < 0 || y >= canvasH;
    }


    /**
     * Détecte une auto collision si la tête touche un des autres segments.
     * @returns {boolean}
     */
    hitSelf() {
        const [h, ...body] = this._segments;
        return body.some(seg => seg.x === h.x && seg.y === h.y);
    }


    /* ==================================
       ==         Aide au rendu        ==
       ================================== */

    /**
     * Donne un angle pour dessiner la tête orientée.
     * Pour UI.drawHead(...)
     * @returns {number}
     */
    headAngle() {
        switch (this._dir) {
            case Direction.UP:    return 0;
            case Direction.RIGHT: return Math.PI / 2;
            case Direction.DOWN:  return Math.PI;
            case Direction.LEFT:  return -Math.PI / 2;
            default:              return 0;
        }
    }
}

/* ==============================
   ==      Fonctions util      ==
   ============================== */

function isValidDirection(dir) {
    return dir === Direction.UP || dir === Direction.DOWN || dir === Direction.LEFT || dir === Direction.RIGHT;
}

function isOpposite(a, b) {
    return (
        (a === Direction.UP && b === Direction.DOWN) ||
        (a === Direction.DOWN && b === Direction.UP) ||
        (a === Direction.LEFT && b === Direction.RIGHT) ||
        (a === Direction.RIGHT && b === Direction.LEFT)
    );
}