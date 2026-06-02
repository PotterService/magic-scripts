window.LORCANA = {
  cards: [],
  sets: [],
  collection: {},
  globalStats: { asOf:"", setCount:0, totalCards:0 },

  async init(){
    if(!DB.db) await DB.open();
    await this.loadSaved();
  },

  async loadSaved(){
    this.cards = await DB.all(APP_CONFIG.cardsStore);
    this.sets = await DB.all(APP_CONFIG.setsStore);
    const entries = await DB.all(APP_CONFIG.collectionStore);
    this.collection = {};
    entries.forEach(e=>this.collection[e.id]=e);
    const stats = await DB.get(APP_CONFIG.metaStore,"globalStats");
    if(stats?.value) this.globalStats = stats.value;
  },

  async pullSets(statusFn){
    statusFn?.("Opening the storybook and pulling set list...");
    const res = await fetch(APP_CONFIG.apiBase + "/sets", {cache:"no-store"});
    if(!res.ok) throw new Error("Could not load Lorcana sets.");
    const json = await res.json();
    const rows = json.results || [];
    this.sets = rows.map(s=>normalizeSet(s)).filter(s=>s.code);
    this.globalStats = {
      asOf: new Date().toLocaleDateString(),
      setCount: this.sets.length,
      totalCards: this.sets.reduce((sum,s)=>sum+Number(s.card_count||s.cardCount||0),0)
    };
    await DB.clear(APP_CONFIG.setsStore);
    await DB.bulkPut(APP_CONFIG.setsStore,this.sets,100);
    await DB.put(APP_CONFIG.metaStore,{key:"globalStats",value:this.globalStats});
    return this.sets;
  },

  async loadSetCards(code,statusFn){
    const set = this.sets.find(s=>s.code===code);
    if(!set) throw new Error("Set not found.");
    statusFn?.("Summoning cards from " + set.name + "...");
    let cards = await fetchCardsForSet(code);
    if(!cards.length && set.id) cards = await fetchCardsForSet(set.id);
    const normalized = cards.map(c=>normalizeCard(c,set)).filter(c=>c.id);
    await DB.bulkPut(APP_CONFIG.cardsStore, normalized, 200);
    this.cards = [...this.cards.filter(c=>c.setCode!==code), ...normalized];
    set.downloaded = true;
    set.trimmed = false;
    set.card_count = normalized.length || set.card_count;
    if(!set.coverImage && normalized[0]) set.coverImage = normalized.find(c=>c.image)?.image || "";
    await DB.put(APP_CONFIG.setsStore,set);
    this.globalStats.totalCards = this.sets.reduce((sum,s)=>sum+Number(s.card_count||0),0);
    await DB.put(APP_CONFIG.metaStore,{key:"globalStats",value:this.globalStats});
    return normalized;
  },

  cardsForSet(code){return this.cards.filter(c=>c.setCode===code);},

  async markSetTrimmed(code){
    const set=this.sets.find(s=>s.code===code);
    if(set){set.trimmed=true;set.downloaded=false;await DB.put(APP_CONFIG.setsStore,set);}
  }
};

async function fetchCardsForSet(code){
  const url = APP_CONFIG.apiBase + "/cards/search?q=" + encodeURIComponent("set:" + code) + "&unique=prints";
  const res = await fetch(url,{cache:"no-store"});
  if(!res.ok) return [];
  const json = await res.json();
  await Util.sleep(APP_CONFIG.requestDelayMs || 90);
  return json.results || [];
}

function normalizeSet(s){
  const code = String(s.code || s.id || "").toLowerCase();
  return {
    id: s.id || "",
    code,
    name: s.name || code,
    released_at: s.released_at || s.prereleased_at || "",
    year: String(s.released_at || s.prereleased_at || "").slice(0,4),
    card_count: Number(s.card_count || s.cardCount || s.cards_count || 0),
    coverImage: "",
    downloaded: false,
    trimmed: false
  };
}

function normalizeCard(c,set){
  const image = cardImage(c);
  const character = characterName(c);
  const setCode = (c.set?.code || set.code || "").toLowerCase();
  return {
    id: c.id || `${setCode}-${c.collector_number||c.number||c.name}`,
    name: c.name || "",
    version: c.version || "",
    fullName: cardName(c),
    character,
    setCode,
    setName: c.set?.name || set.name || "",
    collector_number: c.collector_number || c.number || "",
    rarity: c.rarity || "",
    ink: c.ink || c.color || "",
    cost: c.cost ?? "",
    type_line: c.type || c.type_line || c.classifications?.join(" ") || "",
    image,
    small: c?.image_uris?.digital?.small || image,
    large: c?.image_uris?.digital?.large || image,
    prices: c.prices || {},
    released_at: c.released_at || set.released_at || "",
    url: c.lorcast_uri || c.uri || "",
    search: JSON.stringify(c).toLowerCase()
  };
}

function cardImage(c){
  return c?.image_uris?.digital?.normal || c?.image_uris?.digital?.large || c?.image_uris?.digital?.small || APP_CONFIG.defaultImage;
}

function cardName(c){return (c.name || "") + (c.version ? " - " + c.version : "");}

function characterName(c){
  const name = c.name || "";
  return name.split(" - ")[0].split(" — ")[0].split(" / ")[0].trim() || name;
}

function getEntry(id){
  if(!LORCANA.collection[id]) LORCANA.collection[id]={id,owned:0,foil:0,condition:"Near Mint",notes:"",want:false};
  return LORCANA.collection[id];
}

async function saveEntry(id){await DB.put(APP_CONFIG.collectionStore,getEntry(id));}

function price(card,foil=false){
  const p = foil ? (card.prices?.usd_foil || card.prices?.foil || card.prices?.foil_price) : (card.prices?.usd || card.prices?.normal || card.prices?.price);
  const n = Number(p);
  return Number.isFinite(n) ? n : 0;
}

function cardValue(card){
  const e=getEntry(card.id);
  const foil=Number(e.foil||0), owned=Number(e.owned||0), normal=Math.max(0,owned-foil);
  return normal*price(card,false)+foil*price(card,true);
}

function collectionCards(){
  const ids = new Set(Object.values(LORCANA.collection).filter(e=>Number(e.owned||0)>0||Number(e.foil||0)>0).map(e=>e.id));
  return LORCANA.cards.filter(c=>ids.has(c.id));
}

function wantedCards(){return LORCANA.cards.filter(c=>getEntry(c.id).want);}

function ownedCount(cards=LORCANA.cards){return cards.filter(c=>Number(getEntry(c.id).owned||0)>0).length;}
function totalOwnedQty(cards=LORCANA.cards){return cards.reduce((s,c)=>s+Number(getEntry(c.id).owned||0),0);}
function totalFoils(cards=LORCANA.cards){return cards.reduce((s,c)=>s+Number(getEntry(c.id).foil||0),0);}
function collectionValue(cards=collectionCards()){return cards.reduce((s,c)=>s+cardValue(c),0);}

function updateStats(cards=LORCANA.cards){
  const el = id=>document.getElementById(id);
  if(el("totalCards")) el("totalCards").textContent = Number(cards.length||0).toLocaleString();
  if(el("ownedCards")) el("ownedCards").textContent = Number(ownedCount(cards)||0).toLocaleString();
  if(el("missingCards")) el("missingCards").textContent = Math.max(0,cards.length-ownedCount(cards)).toLocaleString();
  if(el("totalValue")) el("totalValue").textContent = Util.money(collectionValue(collectionCards()));
  if(el("asOfDate")) el("asOfDate").textContent = LORCANA.globalStats.asOf || "Pull Sets";
  if(el("globalSets")) el("globalSets").textContent = Number(LORCANA.globalStats.setCount||LORCANA.sets.length||0).toLocaleString();
  if(el("globalCards")) el("globalCards").textContent = Number(LORCANA.globalStats.totalCards||0).toLocaleString();
}


async function loadAllSets(statusFn){
  if(!LORCANA.sets.length) await LORCANA.pullSets(msg=>statusFn?.(msg,0,0));
  let done = 0;
  const total = LORCANA.sets.length;
  for(const s of LORCANA.sets){
    done++;
    if(LORCANA.cardsForSet(s.code).length){
      statusFn?.("Skipping already loaded: " + s.name, done, total);
      continue;
    }
    statusFn?.("Loading " + s.name, done, total);
    try{
      await LORCANA.loadSetCards(s.code, msg=>statusFn?.(msg, done, total));
    }catch(e){
      console.warn("Could not load set", s.code, e);
    }
    await Util.sleep(APP_CONFIG.requestDelayMs || 90);
  }
  await LORCANA.loadSaved();
}

function cardInfoUrl(c){
  return c.url || "https://lorcast.com/cards/" + encodeURIComponent(c.id);
}

function openImageModal(src){
  let modal=document.getElementById("imageModal");
  if(!modal){
    modal=document.createElement("div");
    modal.id="imageModal";
    modal.className="image-modal";
    modal.innerHTML=`<div class="image-modal-inner"><img id="imageModalImg"><button class="secondary" onclick="document.getElementById('imageModal').hidden=true">Close</button></div>`;
    document.body.appendChild(modal);
  }
  document.getElementById("imageModalImg").src=src;
  modal.hidden=false;
}
