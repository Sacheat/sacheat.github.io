"use strict";

/**
 * Définition de tous les modes de jeu disponibles.
 * - Chaque mode contient un titre, une description, et des règles (affichées dans le menu).
 * - On peut y rajouter plus tard des paramètres spécifiques.
 */

export const GAME_MODES = {
    classic: {
        title: "Mode Classique 🎯",
        description: "Le Snake traditionnel sans limite de temps.",
        rules: [
            "Chaque pomme = +10 points",
            "Bonus et malus standards",
            "Mort instantanée en cas de collision"
        ],
    },

    chrono: {
        title: "Mode Chrono ⏱",
        description: "Faites le meilleur score avant la fin du temps imparti.",
        rules: [
            "Temps limité à 120 secondes",
            "Chaque pomme = +10 points",
            "Fin de partie quand le temps atteint 0"
        ],
    },

    lives: {
        title: "Mode avec Vies ❤️",
        description: "Profitez de plusieurs vies pour prolonger la partie.",
        rules: [
            "3 vies disponibles",
            "Chaque pomme = +10 points",
            "Collision = perte d’une vie"
        ],
    },

    hardcore: {
        title: "Mode Hardcore ⚡",
        description: "Un défi extrême réservé aux joueurs expérimentés.",
        rules: [
            "Vitesse initiale plus rapide (70ms)",
            "Les bords du terrain sont mortels",
            "Bonus plus rares, malus plus fréquents"
        ],
    },

    "reverse-timer": {
        title: "Timer Inversé 🔄",
        description: "Le temps descend, mangez des pommes pour prolonger la partie.",
        rules: [
            "Temps initial : 60 secondes",
            "Chaque pomme = +10 points et +5 secondes",
            "Fin de partie quand le temps est écoulé"
        ],
    },
};

/** Retourne la liste des modes sous forme d’array pratique */
export const GAME_MODE_LIST = Object.keys(GAME_MODES);
