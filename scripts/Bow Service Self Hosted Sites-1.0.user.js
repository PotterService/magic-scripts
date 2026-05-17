// ==UserScript==
// @name         Bow Service Self Hosted Sites
// @namespace    https://github.com/PotterService/magic-scripts
// @version      2.0
// @description  Enables Bow Sites integration for Magic Scripts popup.
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // =========================
    // CONFIG
    // =========================

    const GITHUB_USER = "PotterService";
    const REPO_NAME = "magic-scripts";
    const BOW_SITES_PATH = "Bow-Sites";

    // =========================
    // REMOVE OLD BUTTON
    // =========================

    function removeOldButtons() {

        const oldButton =
            document.getElementById("bowOpenSitesBtn");

        if (oldButton) {

            oldButton.remove();

            console.log(
                "Removed old Bow Open Sites button."
            );

        }

    }

    // =========================
    // START
    // =========================

    window.addEventListener("load", () => {

        removeOldButtons();

    });

    // Extra protection if page changes later

    setInterval(removeOldButtons, 1000);

    // =========================
    // LOG
    // =========================

    console.log(
        "Bow Service Self Hosted Sites enabled."
    );

})();
