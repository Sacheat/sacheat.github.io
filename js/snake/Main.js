"use strict";

import UI from "./UI.js";
import Leaderboard from "./Leaderboard.js";
import AudioManager from "./AudioManager.js";

import Game from "./Game.js";

import { GAME_MODES, GAME_MODE_LIST } from "./Mode.js";
import { BONUS_CATALOG } from "./Bonus.js";

((mode, userName) => {
    // --- Instances système
    const ui = new UI(document);
    const audio = new AudioManager({
        volume: 1.0,
        sounds: {
            gameOver: "Sounds/gameOver.mp3",
            appleEated: "Sounds/appleEated.mp3",
        },
    });
    const leaderboard = new Leaderboard();

    // --- Jeu
    const game = new Game({ ui, leaderboard, audio });

    // --- Username (persist)
    const storedName = localStorage.getItem("snakeUsername") || "";
    if (storedName) {
        ui.usernameInput.value = storedName;
        ui.setPlayerName(storedName);
    }
    ui.usernameInput.addEventListener("input", () => {
        const name = ui.usernameInput.value.trim();
        localStorage.setItem("snakeUsername", name);
        ui.setPlayerName(name);
    });

    // --- Accueil : affiche la liste des bonus
    ui.renderBonusList(BONUS_CATALOG);

    // --- Accueil : règles + leaderboard au survol d’un bouton de mode
    const modeFromBtn = (btn) => {
        // Si tu peux, mets plutôt data-mode="classic" dans le HTML.
        // Ici on tolère l’existant avec onclick="startGame('mode')"
        const m = btn.getAttribute("onclick")?.match(/'(.*?)'/);
        return btn.dataset.mode || (m ? m[1] : "classic");
    };

    ui.modeButtons.forEach((btn) => {
        btn.addEventListener("mouseenter", () => {
            const mode = modeFromBtn(btn);
            ui.renderRules(GAME_MODES[mode]);
            const top5 = leaderboard.topN(mode, 5);
            ui.renderLeaderboardHome(top5, GAME_MODES[mode].title);
        });
        btn.addEventListener("click", () => {
            const mode = modeFromBtn(btn);
            const name = ui.usernameInput.value.trim() || "Invité";
            localStorage.setItem("snakeUsername", name);
            ui.setPlayerName(name);

            // Lance la partie
            game.start(mode, name);
        });
    });

    // --- Carrousel leaderboard (accueil)
    let idx = 0;
    const renderHomeBoard = () => {
        const mode = GAME_MODE_LIST[idx];
        const top5 = leaderboard.topN(mode, 5);
        ui.renderLeaderboardHome(top5, GAME_MODES[mode].title);
    };
    ui.prevModeBtn.addEventListener("click", () => {
        idx = (idx - 1 + GAME_MODE_LIST.length) % GAME_MODE_LIST.length;
        renderHomeBoard();
    });
    ui.nextModeBtn.addEventListener("click", () => {
        idx = (idx + 1) % GAME_MODE_LIST.length;
        renderHomeBoard();
    });
    // rendu initial
    renderHomeBoard();
    // et règles par défaut (classic)
    ui.renderRules(GAME_MODES[GAME_MODE_LIST[0]]);

    // --- Boutons en jeu
    ui.pauseBtn.addEventListener("click", () => {
        game.pauseToggle();
        ui.pauseBtn.textContent = game.isPaused ? "▶ Reprendre" : "⏸ Pause";
    });

    ui.muteBtn.addEventListener("click", () => {
        const muted = audio.toggleMuted();
        ui.muteBtn.textContent = muted ? "🔇 Muet" : "🔊 Son";
    });

    // Retour menu (en jeu + header + game over)
    const goMenu = () => game.toMenu();
    ui.menuBtnInGame.addEventListener("click", goMenu);
    ui.menuBtnGameOver.addEventListener("click", goMenu);
    ui.headerMenuBtn.addEventListener("click", goMenu);

    // Bouton “Rejouer”
    document.getElementById("replayBtn")?.addEventListener("click", () => game.restart());

    window.startGame = function(mode) {
        // appelle ta logique du jeu ici
        const game = new Game(mode);
        game.start(mode, userName);
    };

})();
