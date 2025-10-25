"use strict";
export const BONUS_CATALOG = {
    gold: {
        color: "gold",
        lifetimeMs: 5000,
        name: "Pomme dorée",
        effect: "+5 points instantanément",
        isMalus: false,
        effectMs: 0
    },
    exp: {
        color: "blue",
        lifetimeMs: 5000,
        name: "XP Boost",
        effect: "XP doublée pendant un temps limité",
        isMalus: false,
        effectMs: 5000
    },
    malus: {
        color: "black",
        lifetimeMs: 5000,
        name: "Malus aléatoire",
        effect: "Un effet négatif te tombe dessus 😈",
        isMalus: true,
        effectMs: 5000
    },
    poison: {
        color: "purple",
        lifetimeMs: 5000,
        name: "Poison",
        effect: "Tu perds de la vie / points",
        isMalus: true,
        effectMs: 5000
    },
    freeze: {
        color: "cyan",
        lifetimeMs: 5000,
        name: "Gel",
        effect: "Tu ne peux plus bouger",
        isMalus: true,
        effectMs: 4000
    },
    reverse: {
        color: "green",
        lifetimeMs: 5000,
        name: "Contrôles inversés",
        effect: "↔ Les touches sont inversés",
        isMalus: true,
        effectMs: 5000
    },
};


// Probabilités par mode (ajuste à tes goûts)
export const BONUS_PROBABILITIES = {
    default: { gold: 0.10, exp: 0.25, malus: 0.25, freeze: 0.40 }, // classic/chrono/lives
    hardcore: { malus: 0.40, poison: 0.20, freeze: 0.15, reverse: 0.15, exp: 0.08, gold: 0.02 },
};
