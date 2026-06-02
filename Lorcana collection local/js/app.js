const state = {
  cards: [],
  sets: [],
  collection: {},
  q: "",
  set: "",
  ink: "",
  owned: ""
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheEls();
  loadCollection();
  loadCachedCards();
  bind();
  hydrateFilters();
  renderAll();
});

function cacheEls() {
  [
    "loadBtn","checkNewBtn","exportBtn","importFile","clearBtn",
    "search","setFilter","inkFilter","ownedFilter","status",
    "totalCards","ownedCards","missingCards","totalValue",
    "setProgress","grid"
  ].forEach(id => els[id] = document.getElementById(id));
}

function bind() {
  els.loadBtn.addEventListener("click", () => loadCards(true));
  els.checkNewBtn.addEventListener("click", checkForNewSets);
  els.exportBtn.addEventListener("click", exportCollection);
  els.importFile.addEventListener("change", importCollection);
  els.clearBtn.addEventListener("click", clearCollection);

  els.search.addEventListener("input", () => { state.q = els.search.value.toLowerCase(); renderCards(); });
  els.setFilter.addEventListener("change", () => { state.set = els.setFilter.value; renderCards(); });
  els.inkFilter.addEventListener("change", () => { state.ink = els.inkFilter.value; renderCards(); });
  els.ownedFilter.addEventListener("change", () => { state.owned = els.ownedFilter.value; renderCards(); });
}

function loadCollection() {
  state.collection = JSON.parse(localStorage.getItem(APP_CONFIG.collectionKey) || "{}");
}

function loadCachedCards() {
  const cached = localStorage.getItem(APP_CONFIG.cacheKey);
  if (!cached) return;
  try {
    const parsed = JSON.parse(cached);
    state.cards = parsed.cards || [];
    state.sets = parsed.sets || [];
    if (state.cards.length) els.status.textContent = "Loaded saved card cache. Click refresh to update.";
  } catch (e) {}
}

function saveCollection() {
  localStorage.setItem(APP_CONFIG.collectionKey, JSON.stringify(state.collection));
  renderStats();
  renderProgress();
}

async function loadCards(force = false) {
  els.status.textContent = "Loading sets...";
  els.loadBtn.disabled = true;

  try {
    const cached = localStorage.getItem(APP_CONFIG.cacheKey);
    if (!force && cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.time < APP_CONFIG.cacheHours * 60 * 60 * 1000) {
        state.cards = parsed.cards || [];
        state.sets = parsed.sets || [];
        hydrateFilters();
        renderAll();
        els.status.textContent = "Loaded from local cache";
        return;
      }
    }

    const setsRes = await fetch(APP_CONFIG.apiBase + "/sets", { cache: "no-store" });
    if (!setsRes.ok) throw new Error("Sets request failed: " + setsRes.status);
    const setsJson = await setsRes.json();
    state.sets = setsJson.results || [];

    const cards = [];
    let loaded = 0;

    for (const set of state.sets) {
      loaded++;
      els.status.textContent = `Loading ${loaded}/${state.sets.length}: ${set.name}`;

      // Primary call follows Lorcast docs: /cards/search?q=set:1&unique=prints
      let results = await fetchCardsForSet(set.code);

      // Fallback using set id if code does not return results.
      if (!results.length && set.id) {
        results = await fetchCardsForSet(set.id);
      }

      cards.push(...results);
      await sleep(120);
    }

    state.cards = dedupe(cards);
    localStorage.setItem(APP_CONFIG.cacheKey, JSON.stringify({ time: Date.now(), sets: state.sets, cards: state.cards }));
    hydrateFilters();
    renderAll();
    els.status.textContent = `Loaded ${state.cards.length} cards from ${state.sets.length} sets`;
  } catch (e) {
    console.error(e);
    els.status.textContent = "Could not load cards. Open DevTools Console for details. If opened from file://, try a local server.";
    Util.toast("Card load failed");
  } finally {
    els.loadBtn.disabled = false;
  }
}

async function fetchCardsForSet(setCodeOrId) {
  const query = "set:" + setCodeOrId;
  const url = APP_CONFIG.apiBase + "/cards/search?q=" + encodeURIComponent(query) + "&unique=prints";
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.results || [];
  } catch (e) {
    console.warn("Set card fetch failed", setCodeOrId, e);
    return [];
  }
}

async function checkForNewSets() {
  els.checkNewBtn.disabled = true;
  try {
    if (!state.sets.length) {
      await loadCards(true);
      return;
    }

    const oldCodes = new Set(state.sets.map(s => s.code));
    const res = await fetch(APP_CONFIG.apiBase + "/sets", { cache: "no-store" });
    if (!res.ok) throw new Error("New set check failed: " + res.status);
    const json = await res.json();
    const liveSets = json.results || [];
    const newSets = liveSets.filter(s => !oldCodes.has(s.code));

    if (!newSets.length) {
      Util.toast("No new sets found");
      return;
    }

    Util.toast("Found " + newSets.length + " new set(s)");
    state.sets = liveSets;

    for (const set of newSets) {
      els.status.textContent = "Loading new set: " + set.name;
      let results = await fetchCardsForSet(set.code);
      if (!results.length && set.id) results = await fetchCardsForSet(set.id);
      state.cards.push(...results);
      await sleep(120);
    }

    state.cards = dedupe(state.cards);
    localStorage.setItem(APP_CONFIG.cacheKey, JSON.stringify({ time: Date.now(), sets: state.sets, cards: state.cards }));
    hydrateFilters();
    renderAll();
    els.status.textContent = "New sets added";
  } catch(e) {
    console.error(e);
    els.status.textContent = "Could not check for new sets.";
  } finally {
    els.checkNewBtn.disabled = false;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function dedupe(cards) {
  const seen = new Set();
  const out = [];
  for (const c of cards) {
    const key = c.id || `${c.set?.code}-${c.collector_number}-${c.name}-${c.version || ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}

function hydrateFilters() {
  els.setFilter.innerHTML = '<option value="">All Sets</option>';
  els.inkFilter.innerHTML = '<option value="">All Ink</option>';

  state.sets.forEach(s => els.setFilter.add(new Option(s.name, s.code)));
  [...new Set(state.cards.map(c => c.ink).filter(Boolean))].sort().forEach(i => els.inkFilter.add(new Option(i, i)));
}

function cardImage(c) {
  return c?.image_uris?.digital?.normal || c?.image_uris?.digital?.small || APP_CONFIG.defaultImage;
}

function cardName(c) {
  return c.name + (c.version ? " - " + c.version : "");
}

function getEntry(id) {
  if (!state.collection[id]) {
    state.collection[id] = { owned: 0, foil: 0, condition: "Near Mint", notes: "" };
  }
  return state.collection[id];
}

function cardPrice(card, foil = false) {
  const raw = foil ? card?.prices?.usd_foil : card?.prices?.usd;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function cardValue(card) {
  const e = getEntry(card.id);
  const normalOwned = Math.max(0, Number(e.owned || 0) - Number(e.foil || 0));
  const foilOwned = Number(e.foil || 0);
  return normalOwned * cardPrice(card, false) + foilOwned * cardPrice(card, true);
}

function renderAll() {
  renderStats();
  renderProgress();
  renderCards();
}

function renderStats() {
  els.totalCards.textContent = state.cards.length;
  const owned = state.cards.filter(c => Number(getEntry(c.id).owned || 0) > 0).length;
  els.ownedCards.textContent = owned;
  els.missingCards.textContent = Math.max(0, state.cards.length - owned);
  els.totalValue.textContent = money(state.cards.reduce((sum, c) => sum + cardValue(c), 0));
}

function renderProgress() {
  if (!state.sets.length) {
    els.setProgress.innerHTML = "<section class='empty'>Click Load / Refresh Cards to see set progress.</section>";
    return;
  }

  els.setProgress.innerHTML = state.sets.map(set => {
    const cards = state.cards.filter(c => c.set?.code === set.code);
    const owned = cards.filter(c => Number(getEntry(c.id).owned || 0) > 0).length;
    const value = cards.reduce((sum, c) => sum + cardValue(c), 0);
    const pct = cards.length ? Math.round((owned / cards.length) * 100) : 0;
    return `<div class="progress-card">
      <strong>${Util.escape(set.name)}</strong>
      <p>${owned} / ${cards.length} owned • ${pct}%</p>
      <p><b>${money(value)}</b> est. value</p>
      <div class="bar"><div style="width:${pct}%"></div></div>
    </div>`;
  }).join("");
}

function filteredCards() {
  let cards = [...state.cards];
  if (state.q) cards = cards.filter(c => JSON.stringify(c).toLowerCase().includes(state.q));
  if (state.set) cards = cards.filter(c => c.set?.code === state.set);
  if (state.ink) cards = cards.filter(c => c.ink === state.ink);
  if (state.owned === "owned") cards = cards.filter(c => Number(getEntry(c.id).owned || 0) > 0);
  if (state.owned === "missing") cards = cards.filter(c => Number(getEntry(c.id).owned || 0) === 0);
  if (state.owned === "extra") cards = cards.filter(c => Number(getEntry(c.id).owned || 0) > 1);
  return cards;
}

function renderCards() {
  const cards = filteredCards().slice(0, 600);

  if (!state.cards.length) {
    els.grid.innerHTML = "<section class='empty'>Click Load / Refresh Cards to begin.</section>";
    return;
  }

  els.grid.innerHTML = cards.map(c => {
    const e = getEntry(c.id);
    const owned = Number(e.owned || 0);
    const foil = Number(e.foil || 0);
    const normalPrice = cardPrice(c, false);
    const foilPrice = cardPrice(c, true);
    return `<article class="card">
      <img class="card-img" src="${Util.escape(cardImage(c))}" onerror="this.src='${APP_CONFIG.defaultImage}'">
      <div class="card-body">
        <div class="meta">
          ${c.ink ? `<span class="badge">${Util.escape(c.ink)}</span>` : ""}
          <span class="badge ${owned > 0 ? "owned" : "missing"}">${owned > 0 ? "Owned" : "Missing"}</span>
          ${owned > 1 ? `<span class="badge extra">Extra ${owned - 1}</span>` : ""}
        </div>
        <h3>${Util.escape(cardName(c))}</h3>
        <p>${Util.escape(c.set?.name || "")} • #${Util.escape(c.collector_number || "")}</p>
        <p>${Util.escape(c.rarity || "")}</p>
        <p><b>Normal:</b> ${money(normalPrice)} • <b>Foil:</b> ${money(foilPrice)}</p>
        <p><b>Your value:</b> ${money(cardValue(c))}</p>

        <div class="controls">
          <label>Owned
            <div class="qty-row">
              <button onclick="changeQty('${Util.escape(c.id)}','owned',-1)">−</button>
              <strong>${owned}</strong>
              <button onclick="changeQty('${Util.escape(c.id)}','owned',1)">+</button>
            </div>
          </label>
          <label>Foil
            <div class="qty-row">
              <button onclick="changeQty('${Util.escape(c.id)}','foil',-1)">−</button>
              <strong>${foil}</strong>
              <button onclick="changeQty('${Util.escape(c.id)}','foil',1)">+</button>
            </div>
          </label>
        </div>

        <div class="controls">
          <label>Condition
            <select onchange="setField('${Util.escape(c.id)}','condition',this.value)">
              ${["Near Mint","Lightly Played","Moderately Played","Heavily Played","Damaged"].map(v => `<option ${e.condition === v ? "selected" : ""}>${v}</option>`).join("")}
            </select>
          </label>
          <label>Notes
            <input value="${Util.escape(e.notes || "")}" onchange="setField('${Util.escape(c.id)}','notes',this.value)" placeholder="Notes">
          </label>
        </div>
      </div>
    </article>`;
  }).join("") || "<section class='empty'>No cards found.</section>";
}

function changeQty(id, field, delta) {
  const e = getEntry(id);
  e[field] = Math.max(0, Number(e[field] || 0) + delta);
  if (field === "foil" && Number(e.foil || 0) > Number(e.owned || 0)) e.owned = e.foil;
  if (field === "owned" && Number(e.foil || 0) > Number(e.owned || 0)) e.foil = e.owned;
  saveCollection();
  renderCards();
}

function setField(id, field, value) {
  const e = getEntry(id);
  e[field] = value;
  saveCollection();
}

function exportCollection() {
  const backup = {
    app: APP_CONFIG.appName,
    exportedAt: new Date().toISOString(),
    collection: state.collection
  };
  download("lorcana-collection-backup.json", JSON.stringify(backup, null, 2), "application/json");
}

async function importCollection(e) {
  const file = e.target.files[0];
  if (!file) return;
  const data = JSON.parse(await file.text());
  state.collection = data.collection || data;
  saveCollection();
  renderAll();
  Util.toast("Backup imported");
}

function clearCollection() {
  if (!confirm("Clear your local collection?")) return;
  state.collection = {};
  localStorage.removeItem(APP_CONFIG.collectionKey);
  renderAll();
}

function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}
