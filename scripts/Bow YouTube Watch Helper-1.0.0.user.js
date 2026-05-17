// ==UserScript==
// @name         Bow YouTube Watch Helper
// @namespace    bow.youtube.watch.helper
// @version      1.0.0
// @description  Hide Shorts and hide videos from channels you do not follow on YouTube.
// @match        https://www.youtube.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    "use strict";

    const SETTINGS_KEY = "bow_yt_watch_helper_settings";
    const FOLLOWED_KEY = "bow_yt_watch_helper_followed";
    const REFRESH_FLAG = "bow_yt_watch_helper_refresh_followed";

    function getSettings() {
        return Object.assign({
            hideNonFollowed: false,
            hideShorts: false
        }, GM_getValue(SETTINGS_KEY, {}));
    }

    function saveSettings(settings) {
        GM_setValue(SETTINGS_KEY, settings);
    }

    function getFollowed() {
        return GM_getValue(FOLLOWED_KEY, {});
    }

    function saveFollowed(data) {
        GM_setValue(FOLLOWED_KEY, data);
    }

    function cleanText(text) {
        return (text || "").replace(/\s+/g, " ").trim();
    }

    function makeButton(text) {
        const btn = document.createElement("button");
        btn.textContent = text;
        btn.style.padding = "10px 12px";
        btn.style.background = "#2a2a2a";
        btn.style.color = "white";
        btn.style.border = "1px solid #555";
        btn.style.borderRadius = "10px";
        btn.style.cursor = "pointer";
        btn.style.fontWeight = "bold";
        return btn;
    }

    function makeToggle(labelText, checked) {
        const row = document.createElement("label");

        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.gap = "10px";
        row.style.padding = "10px";
        row.style.marginBottom = "8px";
        row.style.background = "#242424";
        row.style.borderRadius = "10px";
        row.style.cursor = "pointer";

        const text = document.createElement("span");
        text.textContent = labelText;

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = checked;

        row.appendChild(text);
        row.appendChild(input);

        return { row, input };
    }

    function createTopButton() {
        if (document.querySelector("#bow-watch-helper-button")) return;

        const topRight = document.querySelector("#end");
        if (!topRight) return;

        const btn = document.createElement("button");
        btn.id = "bow-watch-helper-button";
        btn.textContent = "Watch Helper";

        btn.style.padding = "8px 14px";
        btn.style.marginRight = "10px";
        btn.style.background = "#222";
        btn.style.color = "white";
        btn.style.border = "1px solid #555";
        btn.style.borderRadius = "20px";
        btn.style.cursor = "pointer";
        btn.style.fontWeight = "bold";

        btn.onclick = openPopupMenu;

        topRight.prepend(btn);
    }

    function openPopupMenu() {
        document.querySelector("#bow-watch-helper-popup")?.remove();

        const settings = getSettings();
        const followed = getFollowed();

        const popup = document.createElement("div");
        popup.id = "bow-watch-helper-popup";

        popup.style.position = "fixed";
        popup.style.top = "60px";
        popup.style.right = "20px";
        popup.style.width = "340px";
        popup.style.background = "#181818";
        popup.style.color = "white";
        popup.style.border = "1px solid #444";
        popup.style.borderRadius = "14px";
        popup.style.padding = "14px";
        popup.style.zIndex = "99999999";
        popup.style.boxShadow = "0 0 25px rgba(0,0,0,0.7)";
        popup.style.fontFamily = "Arial, sans-serif";

        const title = document.createElement("h2");
        title.textContent = "Watch Helper";
        title.style.margin = "0 0 8px 0";
        popup.appendChild(title);

        const count = document.createElement("p");
        count.textContent = `Followed channels saved: ${Object.keys(followed).length}`;
        count.style.color = "#aaa";
        count.style.margin = "0 0 12px 0";
        popup.appendChild(count);

        const refreshBtn = makeButton("Refresh Follow List");
        refreshBtn.style.width = "100%";
        refreshBtn.style.marginBottom = "12px";

        refreshBtn.onclick = () => {
            GM_setValue(REFRESH_FLAG, true);
            location.href = "https://www.youtube.com/feed/channels";
        };

        popup.appendChild(refreshBtn);

        const hideNonFollowed = makeToggle("Hide channels I don't follow", settings.hideNonFollowed);

        hideNonFollowed.input.onchange = () => {
            settings.hideNonFollowed = hideNonFollowed.input.checked;
            saveSettings(settings);
            hideVideos();
        };

        popup.appendChild(hideNonFollowed.row);

        const hideShorts = makeToggle("Hide Shorts", settings.hideShorts);

        hideShorts.input.onchange = () => {
            settings.hideShorts = hideShorts.input.checked;
            saveSettings(settings);
            hideVideos();
        };

        popup.appendChild(hideShorts.row);

        const closeBtn = makeButton("Close");
        closeBtn.style.width = "100%";
        closeBtn.style.marginTop = "8px";
        closeBtn.onclick = () => popup.remove();

        popup.appendChild(closeBtn);
        document.body.appendChild(popup);
    }

    function showSavingBox() {
        if (document.querySelector("#bow-saving-followed-box")) return;

        const box = document.createElement("div");
        box.id = "bow-saving-followed-box";
        box.textContent = "Please allow a few moments while your follow list is saved...";

        box.style.position = "fixed";
        box.style.top = "80px";
        box.style.left = "50%";
        box.style.transform = "translateX(-50%)";
        box.style.background = "#181818";
        box.style.color = "white";
        box.style.padding = "16px 22px";
        box.style.border = "1px solid #555";
        box.style.borderRadius = "14px";
        box.style.zIndex = "99999999";
        box.style.fontSize = "18px";
        box.style.boxShadow = "0 0 25px rgba(0,0,0,0.7)";

        document.body.appendChild(box);
    }

    function scanFollowedChannelsPage() {
        if (!location.pathname.startsWith("/feed/channels")) return;
        if (!GM_getValue(REFRESH_FLAG, false)) return;

        showSavingBox();

        let tries = 0;

        const timer = setInterval(() => {
            tries++;

            window.scrollTo(0, document.documentElement.scrollHeight);

            const found = {};

            const channelLinks = document.querySelectorAll(`
                ytd-channel-renderer a[href^="/@"],
                ytd-grid-channel-renderer a[href^="/@"],
                ytd-rich-item-renderer a[href^="/@"],
                a#main-link[href^="/@"],
                a[href^="/@"]
            `);

            channelLinks.forEach(link => {
                const name =
                    cleanText(link.querySelector("#text")?.innerText) ||
                    cleanText(link.getAttribute("title")) ||
                    cleanText(link.innerText);

                if (!name) return;

                const card =
                    link.closest("ytd-channel-renderer") ||
                    link.closest("ytd-grid-channel-renderer") ||
                    link.closest("ytd-rich-item-renderer") ||
                    link.parentElement;

                const img = card?.querySelector("img");
                const icon = img?.src || "";

                found[name.toLowerCase()] = {
                    name,
                    url: new URL(link.getAttribute("href"), location.origin).href,
                    icon
                };
            });

            if (Object.keys(found).length > 0) {
                saveFollowed(found);
            }

            if (tries >= 8) {
                clearInterval(timer);
                GM_setValue(REFRESH_FLAG, false);

                document.querySelector("#bow-saving-followed-box")?.remove();
                showSavedPopup(Object.keys(getFollowed()).length);
            }
        }, 1200);
    }

    function showSavedPopup(count) {
        const popup = document.createElement("div");

        popup.style.position = "fixed";
        popup.style.top = "50%";
        popup.style.left = "50%";
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.background = "#181818";
        popup.style.color = "white";
        popup.style.padding = "22px";
        popup.style.border = "1px solid #555";
        popup.style.borderRadius = "16px";
        popup.style.zIndex = "99999999";
        popup.style.textAlign = "center";
        popup.style.boxShadow = "0 0 30px rgba(0,0,0,0.8)";

        const title = document.createElement("h2");
        title.textContent = "Your list is saved";
        popup.appendChild(title);

        const text = document.createElement("p");
        text.textContent = `Saved followed channels: ${count}`;
        popup.appendChild(text);

        const homeBtn = makeButton("Go Back To Home Page");

        homeBtn.onclick = () => {
            location.href = "https://www.youtube.com/";
        };

        popup.appendChild(homeBtn);
        document.body.appendChild(popup);
    }

    function getCardChannelName(card) {
        const selectors = [
            "ytd-channel-name a",
            "#channel-name a",
            "a[href^='/@']"
        ];

        for (const selector of selectors) {
            const el = card.querySelector(selector);
            const text = cleanText(el?.innerText || el?.textContent);
            if (text) return text;
        }

        return "";
    }

    function isShortsCard(card) {
        const shortsLink = card.querySelector("a[href*='/shorts/']");
        if (shortsLink) return true;

        const text = cleanText(card.innerText).toLowerCase();
        if (text.includes("shorts")) return true;

        return false;
    }

    function hideVideos() {
        const settings = getSettings();
        const followed = getFollowed();

        const cards = document.querySelectorAll(`
            ytd-rich-item-renderer,
            ytd-video-renderer,
            ytd-grid-video-renderer,
            ytd-compact-video-renderer,
            ytd-playlist-video-renderer,
            ytd-reel-item-renderer,
            ytd-reel-shelf-renderer,
            ytd-rich-shelf-renderer
        `);

        cards.forEach(card => {
            const channelName = getCardChannelName(card);
            let hide = false;

            if (settings.hideShorts && isShortsCard(card)) {
                hide = true;
            }

            if (settings.hideNonFollowed && channelName) {
                if (!followed[channelName.toLowerCase()]) {
                    hide = true;
                }
            }

            card.style.display = hide ? "none" : "";
        });
    }

    function start() {
        scanFollowedChannelsPage();

        setInterval(() => {
            createTopButton();
            hideVideos();
            scanFollowedChannelsPage();
        }, 2000);

        document.addEventListener("yt-navigate-finish", () => {
            setTimeout(() => {
                createTopButton();
                hideVideos();
                scanFollowedChannelsPage();
            }, 1000);
        });
    }

    start();

})();
