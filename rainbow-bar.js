// ==UserScript==
// @name         Amazon Rainbow Quick Links Bar with Countdown
// @namespace    https://crap.agency/tampermonkey/amazon
// @version      1.4
// @description  Adds a rainbow quick-access bar above Amazon's nav-main header with a Vine launch countdown
// @match        https://www.amazon.com*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (document.getElementById('crap-rainbow-bar')) return;

    const barHeight = 36;

    const bar = document.createElement('div');
    bar.id = 'crap-rainbow-bar';
    bar.innerHTML = `
        <span class="crap-brand">Amazon By Bow</span>
        <a href="https://www.amazon.com">Home</a>
        <a href="https://www.amazon.com/vine">Vine</a>
        <a href="https://www.amazon.com/haul">Haul</a>
        <a href="https://www.amazon.com/outlet">Outlet</a>
        <a href="https://www.amazon.com/books-used-books-textbooks/b/?node=283155">Books</a>
        <a href="https://www.amazon.com/Prime-Video/b/?node=2676882011">Video</a>
        <a href="https://www.amazon.com/amazonprime">Memberships</a>
        <span id="vine-countdown" style="margin-left:auto; font-weight:bold;">Vine Launch: --:--:--</span>
    `;

    Object.assign(bar.style, {
        height: `${barHeight}px`,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '0 16px',
        fontSize: '13px',
        fontWeight: 'bold',
        background: 'linear-gradient(90deg, red, orange, yellow, green, cyan, blue, violet)',
        color: '#fff',
        zIndex: '9999'
    });

    const brand = bar.querySelector('.crap-brand');
    Object.assign(brand.style, {
        marginRight: '12px',
        paddingRight: '14px',
        borderRight: '2px solid rgba(255,255,255,0.6)',
        fontSize: '14px',
        letterSpacing: '0.5px',
        whiteSpace: 'nowrap'
    });

    [...bar.querySelectorAll('a')].forEach(link => {
        link.style.color = '#fff';
        link.style.textDecoration = 'none';
        link.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
        link.addEventListener('mouseenter', () => link.style.textDecoration = 'underline');
        link.addEventListener('mouseleave', () => link.style.textDecoration = 'none');
    });

    function insertBar() {
        const navMain = document.getElementById('nav-main');
        if (!navMain) return false;

        navMain.parentNode.insertBefore(bar, navMain);
        navMain.style.marginTop = `${barHeight}px`;
        return true;
    }

    const interval = setInterval(() => {
        if (insertBar()) clearInterval(interval);
    }, 100);

    // -------------------------------
    // Countdown logic
    // -------------------------------
    const countdownElem = bar.querySelector('#vine-countdown');

    function updateCountdown() {
        const now = new Date();
        const target = new Date();
        target.setHours(3, 0, 0, 0); // 3:00 AM today
        if (now > target) target.setDate(target.getDate() + 1); // next day if passed

        const diff = target - now; // milliseconds
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        countdownElem.textContent = `Vine Launch: ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
    }

    setInterval(updateCountdown, 1000);
    updateCountdown();

})();
