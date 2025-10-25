"use strict";

/**
 * Constantes globales du jeu Snake
 * (taille grille, vitesses, points, limites)
 */

// Taille d'une case (px)
export const BOX = 20;

// Vitesse de base (intervalle en ms)
export const DEFAULT_SPEED = 100;

// Vitesse spécifique pour le mode hardcore
export const HARDCORE_SPEED = 70;

// Vitesse minimale autorisée (limite de scaling)
export const MIN_SPEED = 50;

// Points obtenus par pomme
export const APPLE_BASE_POINTS = 10;

// Durée du chrono de base (mode chrono)
export const CHRONO_DURATION = 120;

// Durée du reverse timer de base (mode reverse-timer)
export const REVERSE_TIMER_DURATION = 60;

// Gain de temps par pomme en reverse timer
export const REVERSE_TIMER_BONUS = 5;

// Nombre de vies de départ (mode lives)
export const START_LIVES = 3;
