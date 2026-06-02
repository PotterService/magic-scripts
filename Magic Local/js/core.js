window.MTG = {
  cards: [],
  collection: {},
  sets: [],
  globalStats: { asOf: '', collectionCount: 0, totalCards: 0 },
  coverMap: {},

  async init() {
    if (!DB.db) await DB.open();
    await this.loadCoverMap();
    await this.loadSaved();
  },

  async loadCoverMap() {
    try {
      const res = await fetch(APP_CONFIG.setCoverMapPath || "data/set-covers.json", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        delete json._README;
        this.coverMap = json || {};
      }
    } catch (e) {
      this.coverMap = {};
    }
  },

  async loadSaved() {
    this.cards = await DB.all(APP_CONFIG.cardsStore);
    this.sets = await DB.all(APP_CONFIG.setsStore);
    const entries = await DB.all(APP_CONFIG.collectionStore);
    this.collection = {};
    entries.forEach(e => this.collection[e.id] = e);
    const savedStats = await DB.get(APP_CONFIG.metaStore, "globalStats");
    if (savedStats?.value) this.globalStats = savedStats.value;
  },

  async loadMagicSets() {
    await this.loadCoverMap();
    const res = await fetch(APP_CONFIG.mtgjsonBase + "/SetList.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load Magic set list from MTGJSON.");
    const json = await res.json();
    const rows = json.data || [];
    this.sets = rows
      .filter(s => !s.isOnlineOnly)
      .map(s => {
        const code = String(s.code || "").toLowerCase();
        return {
          code,
          mtgjsonCode: s.code,
          name: s.name,
          type: s.type || s.set_type || "",
          releaseDate: s.releaseDate || "",
          year: String(s.releaseDate || "").slice(0,4),
          card_count: s.totalSetSize || s.baseSetSize || 0,
          coverImage: this.coverMap[code] || "",
          downloaded: false
        };
      })
      .filter(s => s.code && s.name);

    this.globalStats = {
      asOf: new Date().toLocaleDateString(),
      collectionCount: this.sets.length,
      totalCards: this.sets.reduce((sum, s) => sum + Number(s.card_count || 0), 0)
    };

    await DB.clear(APP_CONFIG.setsStore);
    await DB.bulkPut(APP_CONFIG.setsStore, this.sets, 200);
    await DB.put(APP_CONFIG.metaStore, { key: "globalStats", value: this.globalStats });
    return this.sets;
  },

  async loadSetFromMTGJSON(code, progressFn) {
    const set = this.sets.find(s => s.code === code);
    if (!set) throw new Error("Set not found.");

    progressFn?.("Loading " + set.name + " from MTGJSON...", 30);
    const url = APP_CONFIG.mtgjsonBase + "/" + encodeURIComponent(set.mtgjsonCode || code.toUpperCase()) + ".json";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load set file: " + url);

    progressFn?.("Reading cards...", 60);
    const json = await res.json();
    const rawCards = json.data?.cards || [];

    progressFn?.("Preparing cards...", 75);
    const cards = rawCards.map(c => normalizeMTGJSONCard(c, set)).filter(c => c.id);

    progressFn?.("Saving cards locally...", 90);
    await DB.bulkPut(APP_CONFIG.cardsStore, cards, 300);

    this.cards = [...this.cards.filter(c => c.set !== code), ...cards];

    if (cards[0]) {
      const firstImage = cards.find(c => c.image && !c.image.includes("card-placeholder"))?.image || cards[0].image;
      set.coverImage = set.coverImage || this.coverMap[code] || firstImage;
      set.downloaded = true;
      set.trimmed = false;
      set.card_count = cards.length;
      await DB.put(APP_CONFIG.setsStore, set);
    }

    progressFn?.("Done", 100);
    return cards;
  },

  async loadPrices(progressFn) {
    if (!this.cards.length) throw new Error("Load at least one set before loading prices.");

    progressFn?.("Downloading current price file...", 8);
    const url = APP_CONFIG.mtgjsonBase + "/" + APP_CONFIG.pricesFile;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      throw new Error("Could not load MTGJSON price file: " + APP_CONFIG.pricesFile);
    }

    progressFn?.("Reading price data...", 35);
    const text = await res.text();
    if (!text.trim()) throw new Error("Price file was empty.");

    progressFn?.("Parsing prices...", 50);
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error("Price file could not be parsed. Try again.");
    }

    const prices = json.data || {};
    let changed = 0;
    let checked = 0;
    const total = this.cards.length;

    for (const card of this.cards) {
      checked++;
      if (checked % 50 === 0) {
        const pct = 50 + Math.round((checked / total) * 35);
        progressFn?.("Applying prices " + checked + " / " + total, pct);
      }

      const keys = [
        card.id,
        card.uuid,
        card.scryfallId,
        card.oracle_id
      ].filter(Boolean);

      let priceEntry = null;
      for (const key of keys) {
        if (prices[key]) {
          priceEntry = prices[key];
          break;
        }
      }

      if (!priceEntry) continue;

      const normal = findLatestRetailPrice(priceEntry, "normal");
      const foil = findLatestRetailPrice(priceEntry, "foil");

      if (normal || foil) {
        card.usd = normal ? String(normal) : card.usd;
        card.usd_foil = foil ? String(foil) : card.usd_foil;
        changed++;
      }
    }

    progressFn?.("Saving matched prices...", 92);
    await DB.bulkPut(APP_CONFIG.cardsStore, this.cards, 300);

    progressFn?.("Prices applied to " + changed + " cards.", 100);
    return changed;
  },

  cardsForSet(code) {
    return this.cards.filter(c => c.set === code);
  },

  isSetComplete(code) {
    const set = this.sets.find(s => s.code === code);
    const count = this.cardsForSet(code).length;
    return !!set && !!set.downloaded && !set.trimmed && count > 0 && (!set.card_count || count >= Math.min(set.card_count, count));
  },

  async markSetTrimmed(code) {
    const set = this.sets.find(s => s.code === code);
    if (set) {
      set.trimmed = true;
      set.downloaded = false;
      await DB.put(APP_CONFIG.setsStore, set);
    }
  }
};

function findLatestRetailPrice(entry, finish) {
  const values = [];

  function walk(obj, path = "") {
    if (obj == null) return;
    const lower = path.toLowerCase();

    if (typeof obj === "number") {
      if (lower.includes("retail") && lower.includes(finish) && !lower.includes("buylist")) {
        values.push(obj);
      }
      return;
    }

    if (typeof obj === "string") {
      const n = Number(obj);
      if (Number.isFinite(n) && n > 0 && lower.includes("retail") && lower.includes(finish) && !lower.includes("buylist")) {
        values.push(n);
      }
      return;
    }

    if (typeof obj === "object") {
      for (const [k, v] of Object.entries(obj)) {
        walk(v, path + "." + k);
      }
    }
  }

  walk(entry);
  const clean = values.filter(n => Number.isFinite(n) && n > 0 && n < 100000);
  return clean.length ? clean[clean.length - 1] : 0;
}

function normalizeMTGJSONCard(c, set) {
  const scryfallId = c.identifiers?.scryfallId || "";
  const image = scryfallId ? scryfallImage(scryfallId, "normal") : APP_CONFIG.defaultImage;
  const small = scryfallId ? scryfallImage(scryfallId, "small") : APP_CONFIG.defaultImage;
  const colors = c.colors || [];
  return {
    id: c.uuid || scryfallId || (set.code + "-" + c.number + "-" + c.name),
    uuid: c.uuid || "",
    oracle_id: c.identifiers?.scryfallOracleId || "",
    scryfallId,
    name: c.name || "",
    set: set.code,
    set_name: set.name,
    collector_number: c.number || "",
    rarity: c.rarity || "",
    colors,
    color_identity: c.colorIdentity || [],
    type_line: c.type || "",
    mana_cost: c.manaCost || "",
    image,
    small,
    usd: "",
    usd_foil: "",
    scryfall_uri: scryfallId ? "https://scryfall.com/card/" + scryfallId : "",
    released_at: set.releaseDate || "",
    search: [
      c.name, set.name, set.code, c.number, c.rarity, c.type, c.manaCost,
      (colors || []).join(""), (c.colorIdentity || []).join("")
    ].join(" ").toLowerCase()
  };
}

function scryfallImage(id, size) {
  const clean = String(id || "").toLowerCase();
  if (!clean || clean.length < 2) return APP_CONFIG.defaultImage;
  return "https://cards.scryfall.io/" + size + "/front/" + clean[0] + "/" + clean[1] + "/" + clean + ".jpg";
}

function getEntry(id) {
  if (!MTG.collection[id]) MTG.collection[id] = { id, owned: 0, foil: 0, condition: "Near Mint", notes: "" };
  return MTG.collection[id];
}

async function saveEntry(id) {
  await DB.put(APP_CONFIG.collectionStore, getEntry(id));
}

function price(card, foil = false) {
  const n = Number(foil ? card.usd_foil : card.usd);
  return Number.isFinite(n) ? n : 0;
}

function cardValue(card) {
  const e = getEntry(card.id);
  const foil = Number(e.foil || 0);
  const owned = Number(e.owned || 0);
  const normal = Math.max(0, owned - foil);
  return normal * price(card, false) + foil * price(card, true);
}

function collectionValue(cards = MTG.cards) {
  return cards.reduce((sum, c) => sum + cardValue(c), 0);
}

function ownedCardCount(cards = MTG.cards) {
  return cards.filter(c => Number(getEntry(c.id).owned || 0) > 0).length;
}

function updateTopStats(cards = MTG.cards) {
  const total = document.getElementById("totalCards");
  const owned = document.getElementById("ownedCards");
  const missing = document.getElementById("missingCards");
  const value = document.getElementById("totalValue");
  if (total) total.textContent = cards.length;
  if (owned) owned.textContent = ownedCardCount(cards);
  if (missing) missing.textContent = Math.max(0, cards.length - ownedCardCount(cards));
  if (value) value.textContent = Util.money(collectionValue(cards));
}

function updateGlobalStatsDisplay() {
  const asOf = document.getElementById("asOfDate");
  const collections = document.getElementById("globalCollections");
  const total = document.getElementById("globalTotalCards");
  if (asOf) asOf.textContent = MTG.globalStats?.asOf || "Pull Magic Sets";
  if (collections) collections.textContent = Number(MTG.globalStats?.collectionCount || 0).toLocaleString();
  if (total) total.textContent = Number(MTG.globalStats?.totalCards || 0).toLocaleString();
}

function colorName(c) {
  return {W:"White",U:"Blue",B:"Black",R:"Red",G:"Green",C:"Colorless"}[c] || c;
}
