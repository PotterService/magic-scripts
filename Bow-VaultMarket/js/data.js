window.BCVData = {
  creator: [],
  grade: [],
  boosters: [],
  unavailablePacks: [],
  unavailableBoxes: [],
  unavailablePrintCards: [],
  all: [],

  async load(prefix = "") {
    const cfg = BCV_CONFIG;

    const loadJson = async (live, local, cacheKey) => {
      const cacheMinutes = Number(cfg.cacheMinutes || 30);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.time < cacheMinutes * 60 * 1000 && Array.isArray(parsed.data)) {
            return parsed.data;
          }
        } catch (e) {}
      }
      try {
        const r = await fetch(live, { cache: "force-cache" });
        if (r.ok) {
          const data = await r.json();
          localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data }));
          return data;
        }
      } catch (e) {}
      try {
        const r = await fetch(prefix + local, { cache: "no-store" });
        if (r.ok) return await r.json();
      } catch (e) {}
      return [];
    };

    const loadLocal = async (path) => {
      try {
        const r = await fetch(prefix + path, { cache: "no-store" });
        if (r.ok) return await r.json();
      } catch (e) {}
      return [];
    };

    const [creatorRows, gradeRows, boosterRows, unavailablePacks, unavailableBoxes, unavailablePrintCards] = await Promise.all([
      loadJson(cfg.github.creatorCardsJson, cfg.local.creatorCardsJson, "bcv_creator_cache"),
      loadJson(cfg.github.gradeVaultJson, cfg.local.gradeVaultJson, "bcv_grade_cache"),
      loadLocal(cfg.local.boosterProductsJson),
      loadLocal("data/unavailable_booster_packs.json"),
      loadLocal("data/unavailable_booster_boxes.json"),
      loadLocal("data/unavailable_print_cards.json")
    ]);

    this.unavailablePacks = unavailablePacks.map(x => String(x).trim().toLowerCase());
    this.unavailableBoxes = unavailableBoxes.map(x => String(x).trim().toLowerCase());
    this.unavailablePrintCards = unavailablePrintCards.map(x => ({
      id: String(x.id || "").trim().toLowerCase(),
      cardName: String(x.cardName || x.name || "").trim().toLowerCase(),
      reason: String(x.reason || "This card is currently unavailable for print requests.").trim()
    }));

    this.creator = creatorRows.map(x => this.normCreator(x)).filter(x => x.name);
    this.grade = gradeRows.map(x => this.normGrade(x)).filter(x => x.name);
    this.all = [...this.creator, ...this.grade];

    const autoBoosters = buildBoostersFromSets(this.all);
    this.boosters = [...autoBoosters, ...boosterRows].map(p => ({
      ...p,
      outOfStock: isProductOutOfStock(p)
    }));

    return this.all;
  },

  normCreator(row) {
    const U = BCVUtils, F = n => U.field(row, n);
    const img = U.text(F("frontImage") || F("frontImageUrl"));
    return {
      source: "creator",
      id: U.text(F("id")),
      name: U.text(F("cardName")),
      category: U.text(F("category")) || "Creator Cards",
      setName: U.text(F("setName")) || "No Set",
      cardNumber: U.text(F("cardNumber")),
      rarity: U.text(F("rarity")),
      edition: U.text(F("edition")),
      status: U.text(F("status")),
      image: resolveImg(img, "creator"),
      backImage: resolveImg(U.text(F("backImage")), "creator"),
      altImage: resolveImg(U.text(F("altImage")), "creator"),
      cardType: U.text(F("cardType")),
      rulesText: U.text(F("rulesText")),
      flavorText: U.text(F("flavorText")),
      creatorNotes: U.text(F("creatorNotes")),
      printRun: U.text(F("printRun")),
      knownCopies: U.text(F("knownCopies")),
      currentOwner: U.text(F("currentOwner")),
      currentLocation: U.text(F("currentLocation")),
      dateAdded: U.text(F("dateAdded")),
      lastUpdated: U.text(F("lastUpdated")),
      search: Object.values(row).join(" ").toLowerCase(),
      raw: row
    };
  },

  normGrade(row) {
    const U = BCVUtils, F = n => U.field(row, n);
    const front = U.text(F("slabFrontImageUrl") || F("frontImageUrl") || F("frontImage"));
    return {
      source: "grade",
      id: U.text(F("id")),
      name: U.text(F("cardName")),
      category: U.text(F("category")) || "Grade Vault",
      setName: U.text(F("setName")) || "No Set",
      cardNumber: U.text(F("cardNumber")),
      rarity: U.text(F("rarity")),
      year: U.text(F("year")),
      language: U.text(F("language")),
      image: resolveImg(front, "grade"),
      backImage: resolveImg(U.text(F("slabBackImageUrl") || F("backImageUrl")), "grade"),
      altImage: resolveImg(U.text(F("altImageUrl")), "grade"),
      finalGrade: U.text(F("finalGrade")),
      gradeConfidence: U.text(F("gradeConfidence")),
      gradingNotes: U.text(F("gradingNotes")),
      authStatus: U.text(F("authStatus")),
      isSlabbed: U.bool(F("isSlabbed")),
      slabbedBy: U.text(F("slabbedBy")),
      slabCert: U.text(F("slabCert")),
      slabDate: U.text(F("slabDate")),
      currentOwner: U.text(F("currentOwner")),
      currentLocation: U.text(F("currentLocation")),
      pricingUrl: U.text(F("pricingUrl")),
      officialInfoUrl: U.text(F("officialInfoUrl")),
      extraReferenceUrl: U.text(F("extraReferenceUrl")),
      estimatedValue: U.text(F("estimatedValue")),
      lastPriceChecked: U.text(F("lastPriceChecked")),
      ownerHistory: U.history(F("ownerHistory")),
      lastUpdated: U.text(F("lastUpdated")),
      search: Object.values(row).join(" ").toLowerCase(),
      raw: row
    };
  }
};

function resolveImg(path, source) {
  path = String(path || "").trim();
  if (!path) return BCV_CONFIG.defaultCardImage;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("images/") || path.startsWith("Images/") || path.startsWith("photos/") || path.startsWith("assets/")) {
    return source === "grade" ? BCV_CONFIG.github.gradeImageBase + path : BCV_CONFIG.github.creatorImageBase + path;
  }
  return source === "grade" ? BCV_CONFIG.github.gradeImageBase + "Images/" + path : BCV_CONFIG.github.creatorImageBase + "images/" + path;
}

function safeFileName(name) {
  return String(name || "").replace(/[\\/:*?"<>|]/g, "").trim();
}

function buildBoostersFromSets(cards) {
  const sets = [...new Set(cards.map(c => c.setName).filter(Boolean))].sort();
  return sets.flatMap(setName => [
    {
      id: "PACK-" + setName,
      name: setName + " Booster Pack",
      type: "booster-pack",
      setName,
      image: "boosterpack/" + safeFileName(setName) + " Booster Pack.png",
      price: "Contact for pricing",
      description: "Randomized booster pack or custom selected cards from this set.",
      available: true
    },
    {
      id: "BOX-" + setName,
      name: setName + " Booster Box",
      type: "booster-box",
      setName,
      image: "boosterbox/" + safeFileName(setName) + " Booster Box.png",
      price: "Contact for pricing",
      description: "Request a booster box for this set.",
      available: true
    }
  ]);
}

function isProductOutOfStock(p) {
  const name = String(p.name || "").trim().toLowerCase();
  if (p.type === "booster-pack") return BCVData.unavailablePacks.includes(name);
  if (p.type === "booster-box") return BCVData.unavailableBoxes.includes(name);
  return false;
}

function isBowOwner(card) {
  return String(card?.currentOwner || "").trim().toLowerCase() === "bow";
}

function itemById(id) {
  return BCVData.all.find(x => x.id === id);
}

function boosterById(id) {
  return BCVData.boosters.find(x => x.id === id);
}


function printUnavailableReason(card) {
  if (!card || card.source !== "creator") return "";
  const id = String(card.id || "").trim().toLowerCase();
  const name = String(card.name || "").trim().toLowerCase();
  const match = BCVData.unavailablePrintCards.find(x => (x.id && x.id === id) || (x.cardName && x.cardName === name));
  return match ? match.reason : "";
}

function cardActionHtml(c, prefix = "pages/") {
  const U = BCVUtils;
  if (c.source === "grade") {
    if (isBowOwner(c)) return `<button onclick="addToCart('${U.escape(c.id)}','grade-buy')">Request Buy</button>`;
    return `<a class="light" href="${prefix}ownership.html?id=${encodeURIComponent(c.id)}">Request Ownership</a>`;
  }
  const unavailableReason = printUnavailableReason(c);
  if (unavailableReason) return `<button disabled title="${U.escape(unavailableReason)}">Print Unavailable</button>`;
  return `<button onclick="addToCart('${U.escape(c.id)}','creator-print')">Request Print</button>`;
}

function cardHtml(c, prefix = "pages/") {
  const U = BCVUtils;
  return `<article class="card">
    ${c.finalGrade ? `<div class="grade">Grade ${U.escape(c.finalGrade)}</div>` : ""}
    <img class="card-img" src="${U.escape(c.image)}" onerror="this.src='${prefix ? "../assets/placeholders/card-placeholder.svg" : "assets/placeholders/card-placeholder.svg"}'">
    <div class="card-body">
      <div class="meta">
        <span class="badge ${c.source === "grade" ? "grade" : "creator"}">${c.source === "grade" ? "Grade Vault" : "Creator Vault"}</span>
        ${c.authStatus ? `<span class="badge auth">${U.escape(c.authStatus)}</span>` : ""}
        ${c.source === "grade" && c.currentOwner ? `<span class="badge warn">Owner: ${U.escape(c.currentOwner)}</span>` : ""}
        ${printUnavailableReason(c) ? `<span class="badge out">Print Unavailable</span>` : ""}
      </div>
      <h3>${U.escape(c.name)}</h3>
      <p>${U.escape(c.setName || "")} ${c.cardNumber ? `• ${U.escape(c.cardNumber)}` : ""}</p>
      <p><b>${c.source === "grade" ? U.money(c.estimatedValue) : "Request print"}</b></p>
      <div class="card-actions">
        <a href="${prefix}card.html?id=${encodeURIComponent(c.id)}">View</a>
        ${cardActionHtml(c, prefix)}
      </div>
    </div>
  </article>`;
}
