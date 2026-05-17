// ==UserScript==
// @name         YouTube Watch Time Tracker Pro Plus Bow
// @namespace    yt-channel-watch-counter
// @version      10.1
// @match        *://*.youtube.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = "ytChannelStatsSafe";
    const VIDEO_KEY = "ytVideoWatchStatsSafe";

    let currentVideoId = "";
    let currentVideoTitle = "";
    let currentChannel = "Waiting...";
    let currentChannelUrl = "";
    let currentChannelLogo = "";
    let sessionSeconds = 0;
    let countedVideo = false;
    let popupOpen = false;
    let trackerVisible = false;
    let settingsOpen = false;

    function getJson(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || "{}");
        } catch {
            return {};
        }
    }

    function saveJson(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function getStats() {
        return getJson(STORAGE_KEY);
    }

    function saveStats(stats) {
        saveJson(STORAGE_KEY, stats);
    }

    function getVideoStats() {
        return getJson(VIDEO_KEY);
    }

    function saveVideoStats(stats) {
        saveJson(VIDEO_KEY, stats);
    }

    function getVideoId() {
        return new URL(location.href).searchParams.get("v") || "";
    }

    function getVideoTitle() {
        const el =
            document.querySelector("h1.ytd-watch-metadata") ||
            document.querySelector("ytd-watch-metadata h1") ||
            document.querySelector("h1.title");

        return el ? el.textContent.trim().replace(/\s+/g, " ") : "Unknown Video";
    }

    function getChannelInfo() {
        const selectors = [
            "ytd-watch-metadata #owner ytd-channel-name a",
            "ytd-watch-metadata ytd-channel-name a",
            "#owner #channel-name a",
            "#owner ytd-channel-name a",
            "ytd-video-owner-renderer #channel-name a",
            "ytd-video-owner-renderer ytd-channel-name a",
            "#upload-info #channel-name a"
        ];

        let name = "Channel not found yet";
        let url = "";

        for (const selector of selectors) {
            const el = document.querySelector(selector);

            if (el && el.textContent.trim()) {
                name = el.textContent.trim();
                url = el.href || "";
                break;
            }
        }

        const logoEl =
            document.querySelector("ytd-watch-metadata #owner img") ||
            document.querySelector("#owner img") ||
            document.querySelector("ytd-video-owner-renderer img");

        return {
            name,
            url,
            logo: logoEl ? logoEl.src : ""
        };
    }

    function refreshChannelAfterNavigation() {
        let tries = 0;

        const timer = setInterval(() => {
            tries++;

            const info = getChannelInfo();

            if (info.name && !info.name.includes("not found")) {
                currentChannel = info.name;
                currentChannelUrl = info.url;
                currentChannelLogo = info.logo;

                updateBox();
                updateTitleCounter();

                if (popupOpen) updatePopup();

                clearInterval(timer);
            }

            if (tries >= 12) {
                clearInterval(timer);
            }
        }, 500);
    }

    function formatTime(sec) {
        sec = Math.floor(sec || 0);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;

        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }

    function clearElement(el) {
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
    }

    function addText(parent, text, tag = "div", bold = false) {
        const el = document.createElement(tag);
        el.textContent = text;
        if (bold) el.style.fontWeight = "bold";
        parent.appendChild(el);
        return el;
    }

    function createButton(text, onclick) {
        const btn = document.createElement("button");
        btn.textContent = text;
        btn.onclick = onclick;
        btn.style.cssText = `
            padding: 8px 10px;
            cursor: pointer;
            border-radius: 8px;
            border: 1px solid #00ff66;
            background: #000;
            color: #00ff66;
            font-weight: bold;
        `;
        return btn;
    }

    function getShareText() {
        const stats = getStats();

        const channels = Object.entries(stats)
            .map(([name, data]) => ({
                name,
                videos: data.videos || 0,
                seconds: data.seconds || 0
            }))
            .sort((a, b) => b.seconds - a.seconds);

        const totalSeconds = channels.reduce((sum, ch) => sum + ch.seconds, 0);
        const totalVideos = channels.reduce((sum, ch) => sum + ch.videos, 0);

        const top = channels.slice(0, 5)
            .map((ch, i) => `${i + 1}. ${ch.name} - ${formatTime(ch.seconds)} - ${ch.videos} videos`)
            .join("\n");

        return `My YouTube Watch Stats

Total Watch Time: ${formatTime(totalSeconds)}
Total Videos Watched: ${totalVideos}

Top Channels:
${top || "No stats yet"}

Tracked locally with a script designed and deployed by Bow.
No data is uploaded, saved online, or shared automatically.`;
    }

    function openTerms() {
        alert(
`Terms & Conditions of Usage

Designed and deployed by Bow.

This tracker is for personal use only.

All watch data is saved locally in your browser using localStorage.

No information is uploaded, sold, shared, or saved to any outside server.

If you clear your browser data, uninstall the script, or reset stats, your tracker data may be deleted.

You are responsible for how you use, export, import, or share your own stats.`
        );
    }

    function shareStats() {
        const text = getShareText();

        if (navigator.share) {
            navigator.share({
                title: "My YouTube Watch Stats",
                text: text
            }).catch(() => {});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                alert("Stats copied! You can paste them on Facebook or anywhere else.");
            });
        } else {
            alert(text);
        }
    }

    function createBox() {
        let box = document.getElementById("yt-safe-tracker-box");

        if (!box) {
            box = document.createElement("div");
            box.id = "yt-safe-tracker-box";
            box.style.cssText = `
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                background: #000 !important;
                color: #00ff66 !important;
                padding: 10px !important;
                z-index: 999999999 !important;
                font-size: 13px !important;
                font-family: Arial, sans-serif !important;
                border: 2px solid #00ff66 !important;
                border-radius: 12px !important;
                min-width: 190px !important;
                line-height: 1.4 !important;
                box-shadow: 0 0 12px #000 !important;
                display: none;
            `;
            document.body.appendChild(box);
        }

        return box;
    }

    function updateBox() {
        const box = createBox();
        box.style.display = trackerVisible ? "block" : "none";
        clearElement(box);

        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.justifyContent = "space-between";

        addText(header, "📺 Tracker", "span", true);

        const minBtn = createButton("–", function () {
            trackerVisible = false;
            popupOpen = false;
            box.style.display = "none";
            const popup = document.getElementById("yt-safe-tracker-popup");
            if (popup) popup.style.display = "none";
        });

        minBtn.style.width = "26px";
        minBtn.style.padding = "2px";

        header.appendChild(minBtn);
        box.appendChild(header);

        const stats = getStats();
        const videoStats = getVideoStats();

        const saved = stats[currentChannel] || { videos: 0, seconds: 0 };
        const v = videoStats[currentVideoId] || { watches: 0, seconds: 0 };

        addText(box, "Channel: " + currentChannel);
        addText(box, "Session: " + formatTime(sessionSeconds));
        addText(box, "Channel saved: " + formatTime(saved.seconds || 0));
        addText(box, "Channel videos: " + (saved.videos || 0));
        addText(box, "This video watched: " + (v.watches || 0) + "x");

        const statsBtn = createButton("Open Leaderboard", function () {
            popupOpen = true;
            settingsOpen = false;
            updatePopup();
        });

        statsBtn.style.marginTop = "8px";
        statsBtn.style.width = "100%";
        box.appendChild(statsBtn);
    }

    function createPopup() {
        let popup = document.getElementById("yt-safe-tracker-popup");

        if (!popup) {
            popup = document.createElement("div");
            popup.id = "yt-safe-tracker-popup";
            popup.style.cssText = `
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                width: 600px !important;
                max-width: 92vw !important;
                max-height: 82vh !important;
                overflow-y: auto !important;
                background: #111 !important;
                color: white !important;
                padding: 18px !important;
                z-index: 999999999 !important;
                border: 2px solid #00ff66 !important;
                border-radius: 14px !important;
                font-family: Arial, sans-serif !important;
                box-shadow: 0 0 40px #000 !important;
                display: none;
            `;
            document.body.appendChild(popup);
        }

        return popup;
    }

    function updatePopup() {
        const popup = createPopup();
        clearElement(popup);

        const top = document.createElement("div");
        top.style.display = "flex";
        top.style.justifyContent = "space-between";
        top.style.alignItems = "center";
        top.style.gap = "10px";

        addText(top, settingsOpen ? "⚙️ Settings" : "📊 YouTube Watch Stats", "div", true);

        const topBtns = document.createElement("div");
        topBtns.style.display = "flex";
        topBtns.style.gap = "6px";

        const settingsBtn = createButton("⚙", function () {
            settingsOpen = !settingsOpen;
            updatePopup();
        });

        const resetBtn = createButton("Reset", function () {
            if (confirm("Reset all YouTube watch stats?")) {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(VIDEO_KEY);
                sessionSeconds = 0;
                countedVideo = false;
                updateBox();
                updatePopup();
            }
        });

        resetBtn.style.fontSize = "11px";
        resetBtn.style.padding = "4px 7px";
        resetBtn.style.background = "#300";
        resetBtn.style.color = "white";
        resetBtn.style.border = "1px solid #733";

        topBtns.appendChild(settingsBtn);
        topBtns.appendChild(resetBtn);
        top.appendChild(topBtns);
        popup.appendChild(top);

        const privacy = document.createElement("div");
        privacy.textContent = "Designed and deployed by Bow • All information is saved locally only • No information is saved online or shared automatically";
        privacy.style.cssText = `
            margin-top: 8px;
            margin-bottom: 10px;
            font-size: 11px;
            color: #aaa;
            text-align: center;
        `;
        popup.appendChild(privacy);

        if (settingsOpen) {
            renderSettings(popup);
        } else {
            renderLeaderboard(popup);
        }

        popup.style.display = popupOpen ? "block" : "none";
    }

    function renderSettings(popup) {
        addText(popup, "Export or import your saved YouTube tracker data.");
        addText(popup, " ");

        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.gap = "10px";
        row.style.marginTop = "12px";

        row.appendChild(createButton("Export Data", function () {
            const data = {
                channels: getStats(),
                videos: getVideoStats(),
                exportedAt: new Date().toISOString(),
                credit: "Designed and deployed by Bow"
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json"
            });

            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "youtube-watch-stats.json";
            a.click();
            URL.revokeObjectURL(a.href);
        }));

        row.appendChild(createButton("Import Data", function () {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "application/json";

            input.onchange = function () {
                const file = input.files[0];
                if (!file) return;

                const reader = new FileReader();

                reader.onload = function () {
                    try {
                        const data = JSON.parse(reader.result);

                        if (data.channels) saveStats(data.channels);
                        if (data.videos) saveVideoStats(data.videos);

                        alert("Import complete!");
                        updateBox();
                        updatePopup();
                    } catch (err) {
                        alert("Import failed: " + err.message);
                    }
                };

                reader.readAsText(file);
            };

            input.click();
        }));

        popup.appendChild(row);
        addBottomButtons(popup);
    }

    function renderLeaderboard(popup) {
        const stats = getStats();

        const channels = Object.entries(stats)
            .map(([name, data]) => ({
                name,
                videos: data.videos || 0,
                seconds: data.seconds || 0,
                url: data.url || "",
                logo: data.logo || ""
            }))
            .sort((a, b) => b.seconds - a.seconds);

        const totalSeconds = channels.reduce((sum, ch) => sum + ch.seconds, 0);
        const totalVideos = channels.reduce((sum, ch) => sum + ch.videos, 0);

        addText(popup, "Total YouTube Time: " + formatTime(totalSeconds));
        addText(popup, "Total Videos Watched: " + totalVideos);
        addText(popup, "Current Channel: " + currentChannel);
        addText(popup, " ");

        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.color = "white";
        table.style.marginTop = "10px";

        const header = document.createElement("tr");
        ["#", "Channel", "Videos", "Time"].forEach(text => {
            const th = document.createElement("th");
            th.textContent = text;
            th.style.border = "1px solid #444";
            th.style.padding = "6px";
            th.style.background = "#222";
            header.appendChild(th);
        });

        table.appendChild(header);

        if (channels.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.textContent = "No data yet";
            td.colSpan = 4;
            td.style.padding = "10px";
            td.style.textAlign = "center";
            td.style.border = "1px solid #444";
            tr.appendChild(td);
            table.appendChild(tr);
        } else {
            channels.forEach((ch, index) => {
                const tr = document.createElement("tr");
                tr.style.cursor = ch.url ? "pointer" : "default";
                tr.title = ch.url ? "Open channel" : "";

                tr.onclick = function () {
                    if (ch.url) window.open(ch.url, "_blank");
                };

                [String(index + 1), ch.name, String(ch.videos), formatTime(ch.seconds)].forEach((text, i) => {
                    const td = document.createElement("td");
                    td.textContent = text;
                    td.style.border = "1px solid #444";
                    td.style.padding = "6px";
                    if (i === 2) td.style.textAlign = "center";
                    if (i === 3) td.style.textAlign = "right";
                    tr.appendChild(td);
                });

                table.appendChild(tr);
            });
        }

        popup.appendChild(table);
        addBottomButtons(popup);
    }

    function addBottomButtons(popup) {
        const pageBtn = createButton("View Stats Page", openStatsPage);
        pageBtn.style.marginTop = "12px";
        pageBtn.style.width = "100%";
        popup.appendChild(pageBtn);

        const shareBtn = createButton("Share Stats", shareStats);
        shareBtn.style.marginTop = "8px";
        shareBtn.style.width = "100%";
        popup.appendChild(shareBtn);

        const termsBtn = createButton("Terms & Conditions", openTerms);
        termsBtn.style.marginTop = "8px";
        termsBtn.style.width = "100%";
        popup.appendChild(termsBtn);

        const closeBtn = createButton("Close", function () {
            popupOpen = false;
            settingsOpen = false;
            popup.style.display = "none";
        });

        closeBtn.style.marginTop = "8px";
        closeBtn.style.width = "100%";
        popup.appendChild(closeBtn);

        const credit = document.createElement("div");
        credit.textContent = "Designed and deployed by Bow • Local-only tracking";
        credit.style.cssText = `
            margin-top: 10px;
            font-size: 11px;
            color: #aaa;
            text-align: center;
        `;
        popup.appendChild(credit);
    }

    function openStatsPage() {
        const stats = getStats();

        const channels = Object.entries(stats)
            .map(([name, data]) => ({
                name,
                videos: data.videos || 0,
                seconds: data.seconds || 0,
                url: data.url || "",
                logo: data.logo || ""
            }))
            .sort((a, b) => b.seconds - a.seconds);

        const totalSeconds = channels.reduce((sum, ch) => sum + ch.seconds, 0);
        const totalVideos = channels.reduce((sum, ch) => sum + ch.videos, 0);

        const win = window.open("", "_blank");
        if (!win) {
            alert("Popup blocked. Allow popups for YouTube.");
            return;
        }

        const doc = win.document;
        doc.title = "YouTube Watch Stats";

        const style = doc.createElement("style");
        style.textContent = `
            body {
                margin: 0;
                background: #0f0f0f;
                color: white;
                font-family: Arial, sans-serif;
                padding: 30px;
            }
            h1 { color: #00ff66; }
            .summary {
                display: flex;
                gap: 16px;
                margin-bottom: 24px;
                flex-wrap: wrap;
            }
            .card {
                background: #181818;
                border: 1px solid #333;
                border-radius: 14px;
                padding: 18px;
                min-width: 220px;
            }
            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                gap: 16px;
            }
            .channel {
                background: #181818;
                border: 1px solid #333;
                border-radius: 14px;
                padding: 16px;
                cursor: pointer;
            }
            .channel:hover {
                border-color: #00ff66;
            }
            img {
                width: 54px;
                height: 54px;
                border-radius: 50%;
                object-fit: cover;
                background: #333;
            }
            .row {
                display: flex;
                gap: 12px;
                align-items: center;
            }
            .name {
                font-weight: bold;
                font-size: 17px;
            }
            .small {
                color: #aaa;
                margin-top: 6px;
            }
            .footer {
                margin-top: 30px;
                color: #aaa;
                font-size: 12px;
                text-align: center;
            }
        `;

        doc.head.appendChild(style);

        const h1 = doc.createElement("h1");
        h1.textContent = "📊 YouTube Watch Stats";
        doc.body.appendChild(h1);

        const privacy = doc.createElement("p");
        privacy.textContent = "Designed and deployed by Bow. All information is saved locally only. No information is saved online or shared automatically.";
        privacy.style.color = "#aaa";
        doc.body.appendChild(privacy);

        const summary = document.createElement("div");
        summary.className = "summary";

        const totalCard = doc.createElement("div");
        totalCard.className = "card";
        totalCard.textContent = "Total Time: " + formatTime(totalSeconds);

        const videoCard = doc.createElement("div");
        videoCard.className = "card";
        videoCard.textContent = "Total Videos: " + totalVideos;

        const channelCard = doc.createElement("div");
        channelCard.className = "card";
        channelCard.textContent = "Channels Tracked: " + channels.length;

        summary.appendChild(totalCard);
        summary.appendChild(videoCard);
        summary.appendChild(channelCard);
        doc.body.appendChild(summary);

        const grid = doc.createElement("div");
        grid.className = "grid";

        channels.forEach((ch, index) => {
            const card = doc.createElement("div");
            card.className = "channel";

            if (ch.url) {
                card.onclick = function () {
                    win.open(ch.url, "_blank");
                };
            }

            const row = doc.createElement("div");
            row.className = "row";

            const img = doc.createElement("img");
            if (ch.logo) img.src = ch.logo;

            const info = doc.createElement("div");

            const name = doc.createElement("div");
            name.className = "name";
            name.textContent = `${index + 1}. ${ch.name}`;

            const time = doc.createElement("div");
            time.className = "small";
            time.textContent = "Time: " + formatTime(ch.seconds);

            const videos = doc.createElement("div");
            videos.className = "small";
            videos.textContent = "Videos watched: " + ch.videos;

            info.appendChild(name);
            info.appendChild(time);
            info.appendChild(videos);

            row.appendChild(img);
            row.appendChild(info);
            card.appendChild(row);
            grid.appendChild(card);
        });

        doc.body.appendChild(grid);

        const footer = doc.createElement("div");
        footer.className = "footer";
        footer.textContent = "Designed and deployed by Bow • Local-only YouTube watch tracking";
        doc.body.appendChild(footer);
    }

    function createTitleCounter() {
        let counter = document.getElementById("yt-video-title-counter");

        if (!counter) {
            counter = document.createElement("span");
            counter.id = "yt-video-title-counter";
            counter.style.cssText = `
                display: inline-block !important;
                margin-right: 10px !important;
                padding: 3px 8px !important;
                background: #000 !important;
                color: #00ff66 !important;
                border: 1px solid #00ff66 !important;
                border-radius: 8px !important;
                font-size: 13px !important;
                font-family: Arial, sans-serif !important;
                vertical-align: middle !important;
                cursor: pointer !important;
            `;

            counter.title = "Click to show tracker";
            counter.onclick = function (e) {
                e.stopPropagation();
                trackerVisible = true;
                updateBox();
            };
        }

        return counter;
    }

    function updateTitleCounter() {
        const videoId = getVideoId();
        if (!videoId) return;

        const titleEl =
            document.querySelector("h1.ytd-watch-metadata") ||
            document.querySelector("ytd-watch-metadata h1") ||
            document.querySelector("h1.title");

        if (!titleEl) return;

        const videoStats = getVideoStats();
        const currentVideo = videoStats[currentVideoId] || { watches: 0, seconds: 0 };

        const stats = getStats();
        const saved = stats[currentChannel] || { videos: 0, seconds: 0 };

        const counter = createTitleCounter();
        counter.textContent = `Video watched ${currentVideo.watches || 0}x • Channel ${formatTime((saved.seconds || 0) + sessionSeconds)}`;

        if (titleEl.firstChild !== counter) {
            titleEl.insertBefore(counter, titleEl.firstChild);
        }
    }

    function createTopStatsButton() {
        let btn = document.getElementById("yt-top-view-stats-btn");

        if (!btn) {
            btn = createButton("View Stats", function () {
                popupOpen = true;
                settingsOpen = false;
                updatePopup();
            });

            btn.id = "yt-top-view-stats-btn";
            btn.style.marginLeft = "10px";
            btn.style.borderRadius = "18px";
        }

        const searchArea =
            document.querySelector("#center") ||
            document.querySelector("ytd-searchbox") ||
            document.querySelector("#search");

        if (searchArea && !document.getElementById("yt-top-view-stats-btn")) {
            searchArea.appendChild(btn);
        }
    }

    function saveSessionTime() {
        if (!currentChannel) return;
        if (currentChannel === "Waiting...") return;
        if (currentChannel === "Open a YouTube video") return;
        if (currentChannel === "Loading channel...") return;
        if (currentChannel.includes("not found")) return;
        if (sessionSeconds <= 0) return;

        const stats = getStats();

        if (!stats[currentChannel]) {
            stats[currentChannel] = { videos: 0, seconds: 0, url: "", logo: "" };
        }

        stats[currentChannel].seconds += sessionSeconds;
        stats[currentChannel].url = currentChannelUrl;
        stats[currentChannel].logo = currentChannelLogo;

        const videoStats = getVideoStats();

        if (currentVideoId) {
            if (!videoStats[currentVideoId]) {
                videoStats[currentVideoId] = {
                    title: currentVideoTitle,
                    channel: currentChannel,
                    seconds: 0,
                    watches: 0
                };
            }

            videoStats[currentVideoId].seconds += sessionSeconds;
            videoStats[currentVideoId].title = currentVideoTitle;
            videoStats[currentVideoId].channel = currentChannel;
        }

        sessionSeconds = 0;
        saveStats(stats);
        saveVideoStats(videoStats);
    }

    function countVideoOnce() {
        if (countedVideo) return;
        if (!currentChannel) return;
        if (currentChannel === "Loading channel...") return;
        if (currentChannel.includes("not found")) return;
        if (currentChannel === "Open a YouTube video") return;

        const stats = getStats();

        if (!stats[currentChannel]) {
            stats[currentChannel] = { videos: 0, seconds: 0, url: "", logo: "" };
        }

        stats[currentChannel].videos += 1;
        stats[currentChannel].url = currentChannelUrl;
        stats[currentChannel].logo = currentChannelLogo;

        const videoStats = getVideoStats();

        if (!videoStats[currentVideoId]) {
            videoStats[currentVideoId] = {
                title: currentVideoTitle,
                channel: currentChannel,
                seconds: 0,
                watches: 0
            };
        }

        videoStats[currentVideoId].watches += 1;
        videoStats[currentVideoId].title = currentVideoTitle;
        videoStats[currentVideoId].channel = currentChannel;

        countedVideo = true;
        saveStats(stats);
        saveVideoStats(videoStats);
    }

    function tick() {
        try {
            createBox();
            createTopStatsButton();

            const videoId = getVideoId();
            const video = document.querySelector("video");

            if (!videoId) {
                saveSessionTime();
                currentVideoId = "";
                currentVideoTitle = "";
                currentChannel = "Open a YouTube video";
                currentChannelUrl = "";
                currentChannelLogo = "";
                sessionSeconds = 0;
                countedVideo = false;
                updateBox();
                if (popupOpen) updatePopup();
                return;
            }

            const info = getChannelInfo();

            if (videoId !== currentVideoId) {
                saveSessionTime();

                currentVideoId = videoId;
                currentVideoTitle = getVideoTitle();
                currentChannel = "Loading channel...";
                currentChannelUrl = "";
                currentChannelLogo = "";
                sessionSeconds = 0;
                countedVideo = false;
                trackerVisible = false;

                refreshChannelAfterNavigation();

            } else {
                if (info.name && !info.name.includes("not found")) {
                    currentChannel = info.name;
                    currentChannelUrl = info.url;
                    currentChannelLogo = info.logo;
                }

                currentVideoTitle = getVideoTitle();
            }

            if (video && !video.paused && !video.ended) {
                countVideoOnce();
                sessionSeconds++;
            }

            updateBox();
            updateTitleCounter();

            if (popupOpen) updatePopup();

        } catch (err) {
            const box = createBox();
            clearElement(box);
            trackerVisible = true;
            box.style.display = "block";
            addText(box, "❌ Script Error", "div", true);
            addText(box, err.message);
        }
    }

    window.addEventListener("yt-navigate-finish", function () {
        setTimeout(() => {
            refreshChannelAfterNavigation();
            tick();
        }, 800);
    });

    window.addEventListener("yt-page-data-updated", function () {
        setTimeout(() => {
            refreshChannelAfterNavigation();
            tick();
        }, 800);
    });

    setInterval(tick, 1000);
    setTimeout(tick, 1000);
    window.addEventListener("beforeunload", saveSessionTime);
})();
