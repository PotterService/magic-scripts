let homeFilter = { q:"", year:"", type:"", downloaded:"" };

document.addEventListener("DOMContentLoaded", async () => {
  await MTG.init();
  updateTopStats();
  updateGlobalStatsDisplay();
  hydrateHomeFilters();
  renderSets();
  status.textContent = MTG.sets.length ? "Saved Magic sets loaded" : "Click Pull Magic Sets";

  loadSetsBtn.onclick = async () => {
    try {
      status.textContent = "Pulling Magic set list...";
      await MTG.loadMagicSets();
      hydrateHomeFilters();
      updateGlobalStatsDisplay();
      renderSets();
      status.textContent = "Magic sets loaded";
      Util.toast("Magic sets loaded");
    } catch(e) {
      status.textContent = e.message || "Could not pull Magic sets";
      console.error(e);
    }
  };

  loadPricesBtn.onclick = async () => {
    try {
      if (!MTG.cards.length) {
        Util.toast("Load at least one set first");
        status.textContent = "Load at least one set first, then prices can match downloaded cards.";
        return;
      }

      loadPricesBtn.disabled = true;
      pricePanel.hidden = false;
      priceStatus.textContent = "Starting price load...";
      priceBar.style.width = "5%";
      status.textContent = "Loading price data...";

      const count = await MTG.loadPrices((msg, pct = 10) => {
        status.textContent = msg;
        priceStatus.textContent = msg;
        priceBar.style.width = Math.max(5, Math.min(100, pct)) + "%";
      });

      await MTG.loadSaved();
      updateTopStats();
      renderSets();
      Util.toast("Prices applied to " + count + " cards");
      priceStatus.textContent = "Done. Prices applied to " + count + " cards.";
      priceBar.style.width = "100%";
      setTimeout(() => pricePanel.hidden = true, 3500);
    } catch(e) {
      status.textContent = e.message || "Could not load price data";
      priceStatus.textContent = e.message || "Could not load price data";
      priceBar.style.width = "100%";
      console.error(e);
      Util.toast("Price load failed");
    } finally {
      loadPricesBtn.disabled = false;
    }
  };

  setSearch.oninput = () => { homeFilter.q = setSearch.value.toLowerCase(); renderSets(); };
  yearFilter.onchange = () => { homeFilter.year = yearFilter.value; renderSets(); };
  typeFilter.onchange = () => { homeFilter.type = typeFilter.value; renderSets(); };
  downloadFilter.onchange = () => { homeFilter.downloaded = downloadFilter.value; renderSets(); };
});

function hydrateHomeFilters() {
  yearFilter.innerHTML = '<option value="">All Years</option>';
  typeFilter.innerHTML = '<option value="">All Set Types</option>';

  [...new Set(MTG.sets.map(s => s.year || String(s.releaseDate || "").slice(0,4)).filter(Boolean))]
    .sort((a,b)=>b.localeCompare(a))
    .forEach(y => yearFilter.add(new Option(y, y)));

  [...new Set(MTG.sets.map(s => s.type).filter(Boolean))]
    .sort()
    .forEach(t => typeFilter.add(new Option(t, t)));
}

function filteredSets() {
  let sets = [...MTG.sets];
  if (homeFilter.q) sets = sets.filter(s => (s.name + " " + s.code).toLowerCase().includes(homeFilter.q));
  if (homeFilter.year) sets = sets.filter(s => (s.year || String(s.releaseDate || "").slice(0,4)) === homeFilter.year);
  if (homeFilter.type) sets = sets.filter(s => s.type === homeFilter.type);
  if (homeFilter.downloaded === "downloaded") sets = sets.filter(s => MTG.cardsForSet(s.code).length);
  if (homeFilter.downloaded === "not") sets = sets.filter(s => !MTG.cardsForSet(s.code).length);
  return sets;
}

function renderSets() {
  if (!MTG.sets.length) {
    setGrid.innerHTML = "<section class='empty'>No sets loaded yet. Click Pull Magic Sets.</section>";
    return;
  }

  const sets = filteredSets();
  setGrid.innerHTML = sets.map(s => {
    const cards = MTG.cardsForSet(s.code);
    const owned = ownedCardCount(cards);
    const pct = cards.length ? Math.round((owned / cards.length) * 100) : 0;
    const cover = s.coverImage || (cards[0]?.image || '');
    const needsRedownload = cards.length && (s.trimmed || (s.card_count && cards.length < s.card_count));
    return `<article class="set-card">
      <div class="set-card-cover">${cover ? `<img src="${Util.escape(cover)}" onerror="this.parentElement.innerHTML='<div class=&quot;rune&quot;>✦</div>'">` : `<div class="rune">✦</div>`}</div>
      <div class="set-card-body">
        <p class="eyebrow">${Util.escape(s.code.toUpperCase())} ${s.year ? "• " + Util.escape(s.year) : ""}</p>
        <h3>${Util.escape(s.name)}</h3>
        <p>${cards.length ? `${owned} / ${cards.length} owned • ${pct}%` : `${s.card_count || 0} cards listed`}</p>
        <p>${s.type ? Util.escape(s.type) : "Magic set"}</p>
        <p><b>${Util.money(collectionValue(cards))}</b> est. value</p>
        <div class="bar"><div style="width:${pct}%"></div></div>
        <div class="actions" style="margin-top:12px">
          <button class="primary" onclick="openSet('${Util.escape(s.code)}')">${cards.length ? "Open Set" : "Load Cards"}</button>
          ${needsRedownload ? `<button class="secondary" onclick="redownloadSet('${Util.escape(s.code)}')">Redownload Set</button>` : ""}
        </div>
      </div>
    </article>`;
  }).join("") || "<section class='empty'>No sets match your filters.</section>";
}

async function openSet(code) {
  const cards = MTG.cardsForSet(code);
  if (cards.length) {
    location.href = "pages/set.html?set=" + encodeURIComponent(code);
    return;
  }
  await redownloadSet(code, true);
}

async function redownloadSet(code, goToSet = false) {
  try {
    status.textContent = "Downloading full set again...";
    await MTG.loadSetFromMTGJSON(code, (message) => status.textContent = message);
    await MTG.loadSaved();
    hydrateHomeFilters();
    renderSets();
    updateTopStats();
    if (goToSet) location.href = "pages/set.html?set=" + encodeURIComponent(code);
    else Util.toast("Set redownloaded");
  } catch(e) {
    status.textContent = e.message || "Could not redownload set cards";
    console.error(e);
  }
}
