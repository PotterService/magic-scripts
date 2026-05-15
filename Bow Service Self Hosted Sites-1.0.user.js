// ==UserScript==
// @name         Bow Service Self Hosted Sites
// @namespace    https://github.com/PotterService/magic-scripts
// @version      1.0
// @description  Adds Open Sites button inside Magic Scripts popup.
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
    // CREATE BUTTON IN POPUP
    // =========================

    function injectOpenSitesButton() {

        // Prevent duplicates

        if (document.getElementById("bowOpenSitesBtn")) {
            return;
        }

        // Try finding your popup container

        const popup =
            document.querySelector(".magic-popup") ||
            document.querySelector(".popup") ||
            document.querySelector(".menu") ||
            document.body;

        // Create button

        const btn = document.createElement("button");

        btn.id = "bowOpenSitesBtn";

        btn.textContent = "Open Sites";

        btn.style.width = "100%";
        btn.style.padding = "14px";
        btn.style.marginTop = "12px";
        btn.style.border = "none";
        btn.style.borderRadius = "12px";
        btn.style.background = "#8b5cf6";
        btn.style.color = "white";
        btn.style.fontSize = "16px";
        btn.style.fontWeight = "bold";
        btn.style.cursor = "pointer";

        btn.addEventListener("mouseenter", () => {
            btn.style.background = "#7c3aed";
        });

        btn.addEventListener("mouseleave", () => {
            btn.style.background = "#8b5cf6";
        });

        btn.addEventListener("click", openLauncher);

        popup.appendChild(btn);
    }

    // =========================
    // OPEN LAUNCHER
    // =========================

    function openLauncher() {

        const launcher = window.open("", "_blank");

        launcher.document.write(`
<!DOCTYPE html>
<html>
<head>
<title>Bow Service Self Hosted Sites</title>

<style>

body{
    margin:0;
    font-family:Arial,sans-serif;
    background:linear-gradient(135deg,#111827,#312e81);
    color:white;
    min-height:100vh;
    overflow:hidden;
}

.topbar{
    width:100%;
    padding:22px;
    text-align:center;
    font-size:30px;
    font-weight:bold;
    background:rgba(0,0,0,0.35);
}

.center{
    display:flex;
    justify-content:center;
    align-items:center;
    height:calc(100vh - 80px);
}

.box{
    width:90%;
    max-width:650px;
    background:rgba(255,255,255,0.1);
    padding:40px;
    border-radius:20px;
    text-align:center;
}

.title{
    font-size:30px;
    margin-bottom:20px;
}

input{
    width:90%;
    padding:16px;
    border:none;
    border-radius:12px;
    font-size:20px;
    outline:none;
    text-align:center;
}

button{
    margin-top:20px;
    padding:14px 28px;
    border:none;
    border-radius:12px;
    background:#8b5cf6;
    color:white;
    font-size:18px;
    font-weight:bold;
    cursor:pointer;
}

button:hover{
    background:#7c3aed;
}

.hint{
    margin-top:18px;
    opacity:0.8;
    font-size:14px;
}

.error{
    margin-top:18px;
    color:#fecaca;
    font-weight:bold;
}

/* Loading */

.loading{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.9);
    display:none;
    justify-content:center;
    align-items:center;
    flex-direction:column;
    z-index:999999;
}

.spinner{
    width:90px;
    height:90px;
    border:6px solid rgba(255,255,255,0.2);
    border-top:6px solid #facc15;
    border-radius:50%;
    animation:spin 1s linear infinite;
    margin-bottom:20px;
}

.loadingText{
    font-size:28px;
}

.loadingSub{
    margin-top:10px;
    opacity:0.8;
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
            Example:
            Bow-Sites/mysite.bow/index.html
        </div>

        <div id="error" class="error"></div>

    </div>

</div>

<div id="loading" class="loading">

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

function openSite(){

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
            "Enter a full domain like mysite.bow";

        return;
    }

    document
        .getElementById("loading")
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

    setTimeout(() => {

        window.location.href = finalUrl;

    },1500);

}

document
    .getElementById("openBtn")
    .addEventListener("click",openSite);

document
    .getElementById("domainInput")
    .addEventListener("keydown",function(e){

        if(e.key === "Enter"){

            openSite();

        }

});

</script>

</body>
</html>
        `);

        launcher.document.close();
    }

    // =========================
    // START
    // =========================

    window.addEventListener("load", () => {

        setTimeout(injectOpenSitesButton, 1000);

    });

})();
