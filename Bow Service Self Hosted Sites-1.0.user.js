// ==UserScript==
// @name         Bow Service Self Hosted Sites
// @namespace    https://github.com/PotterService/magic-scripts
// @version      1.0
// @description  Adds an Open Sites button to Magic Scripts manager.
// @match        *://*/manager.html*
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
    // OPEN LAUNCHER
    // =========================

    function openLauncher() {

        const launcherWindow = window.open("", "_blank");

        launcherWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
<title>Bow Service Self Hosted Sites</title>

<style>

body{
    margin:0;
    padding:0;
    font-family:Arial,sans-serif;
    background:linear-gradient(135deg,#111827,#312e81);
    color:white;
    min-height:100vh;
    overflow:hidden;
}

/* Top Bar */

.topbar{
    width:100%;
    padding:22px;
    text-align:center;
    font-size:30px;
    font-weight:bold;
    background:rgba(0,0,0,0.35);
    box-shadow:0 4px 18px rgba(0,0,0,0.35);
}

/* Center */

.center{
    display:flex;
    justify-content:center;
    align-items:center;
    height:calc(100vh - 90px);
}

/* Main Box */

.box{
    width:90%;
    max-width:650px;
    background:rgba(255,255,255,0.1);
    padding:40px;
    border-radius:22px;
    text-align:center;
    box-shadow:0 15px 40px rgba(0,0,0,0.45);
}

/* Title */

.title{
    font-size:32px;
    margin-bottom:15px;
}

/* Input */

input{
    width:90%;
    padding:16px;
    border:none;
    border-radius:14px;
    font-size:20px;
    outline:none;
    text-align:center;
    margin-top:15px;
}

/* Button */

button{
    margin-top:22px;
    padding:14px 30px;
    border:none;
    border-radius:14px;
    background:#8b5cf6;
    color:white;
    font-size:18px;
    font-weight:bold;
    cursor:pointer;
    transition:0.2s;
}

button:hover{
    background:#7c3aed;
    transform:scale(1.03);
}

/* Hint */

.hint{
    margin-top:18px;
    opacity:0.75;
    font-size:14px;
}

/* Error */

.error{
    margin-top:18px;
    color:#fecaca;
    font-weight:bold;
}

/* Loading Overlay */

.loadingOverlay{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.9);
    display:none;
    justify-content:center;
    align-items:center;
    flex-direction:column;
    z-index:999999;
}

/* Spinner */

.spinner{
    width:90px;
    height:90px;
    border:6px solid rgba(255,255,255,0.2);
    border-top:6px solid #facc15;
    border-radius:50%;
    animation:spin 1s linear infinite;
    margin-bottom:25px;
}

.loadingText{
    font-size:28px;
    margin-bottom:10px;
}

.loadingSub{
    opacity:0.8;
    font-size:18px;
}

@keyframes spin{
    from{
        transform:rotate(0deg);
    }
    to{
        transform:rotate(360deg);
    }
}

</style>

</head>

<body>

<div class="topbar">
    Bow Service Self Hosted Sites
</div>

<div class="center">

    <div class="box">

        <div class="title">
            Enter domain or URL below
        </div>

        <input
            id="domainInput"
            placeholder="example: mysite.bow"
            autofocus
        >

        <br>

        <button id="openBtn">
            Open Site
        </button>

        <div class="hint">
            Example folder:
            Bow-Sites/mysite.bow/index.html
        </div>

        <div id="error" class="error"></div>

    </div>

</div>

<!-- Loading -->

<div id="loadingOverlay" class="loadingOverlay">

    <div class="spinner"></div>

    <div class="loadingText">
        The magical service of Bow is loading
    </div>

    <div class="loadingSub">
        Please wait...
    </div>

</div>

<script>

const GITHUB_USER = "${GITHUB_USER}";
const REPO_NAME = "${REPO_NAME}";
const BOW_SITES_PATH = "${BOW_SITES_PATH}";

function openBowSite(){

    const input =
        document
        .getElementById("domainInput")
        .value
        .trim();

    const error =
        document
        .getElementById("error");

    error.textContent = "";

    if(!input){

        error.textContent =
            "Please enter a domain.";

        return;
    }

    let clean =
        input
        .toLowerCase()
        .replace(/^https?:\\/\\//,"")
        .replace(/^www\\./,"")
        .replace(/\\/$/,"");

    if(!clean.includes(".")){

        error.textContent =
            "Enter a full custom domain like mysite.bow";

        return;
    }

    // Show Loading

    document
        .getElementById("loadingOverlay")
        .style
        .display = "flex";

    const finalUrl =
        "https://" +
        GITHUB_USER +
        ".github.io/" +
        REPO_NAME +
        "/" +
        BOW_SITES_PATH +
        "/" +
        clean +
        "/";

    // Delay For Animation

    setTimeout(() => {

        window.location.href = finalUrl;

    },1500);

}

document
    .getElementById("openBtn")
    .addEventListener("click",openBowSite);

document
    .getElementById("domainInput")
    .addEventListener("keydown",function(e){

        if(e.key === "Enter"){

            openBowSite();
        }

});

</script>

</body>
</html>
        `);

        launcherWindow.document.close();
    }

    // =========================
    // ADD BUTTON TO MANAGER
    // =========================

    function addOpenSitesButton() {

        // Prevent duplicates

        if(document.getElementById("bowSitesButton")){
            return;
        }

        const btn = document.createElement("button");

        btn.id = "bowSitesButton";

        btn.textContent = "Open Sites";

        btn.style.position = "fixed";
        btn.style.bottom = "20px";
        btn.style.right = "20px";
        btn.style.zIndex = "999999";
        btn.style.padding = "14px 22px";
        btn.style.border = "none";
        btn.style.borderRadius = "14px";
        btn.style.background = "#8b5cf6";
        btn.style.color = "white";
        btn.style.fontSize = "16px";
        btn.style.fontWeight = "bold";
        btn.style.cursor = "pointer";
        btn.style.boxShadow = "0 8px 25px rgba(0,0,0,0.35)";

        btn.addEventListener("mouseenter", () => {

            btn.style.background = "#7c3aed";

        });

        btn.addEventListener("mouseleave", () => {

            btn.style.background = "#8b5cf6";

        });

        btn.addEventListener("click", openLauncher);

        document.body.appendChild(btn);
    }

    // =========================
    // START
    // =========================

    window.addEventListener("load", () => {

        setTimeout(addOpenSitesButton, 1000);

    });

})();