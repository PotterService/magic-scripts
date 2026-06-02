const state = { q:"", set:"", color:"", owned:"", page:1, pageSize: APP_CONFIG.cardsPerPage || 80, fixedSet:"" };
document.addEventListener("DOMContentLoaded", async () => {
  await MTG.init();
  status.textContent = MTG.cards.length ? "Downloaded cards loaded" : "No cards loaded yet.";
  hydrate();
  bind();
  updateTopStats(state.fixedSet ? MTG.cardsForSet(state.fixedSet) : MTG.cards);
  render();
});
function hydrate(){
  const setFilter=document.getElementById("setFilter");
  if(setFilter){
    setFilter.innerHTML='<option value="">All Downloaded Sets</option>';
    MTG.sets.filter(s=>MTG.cardsForSet(s.code).length).forEach(s=>setFilter.add(new Option(s.name+" ("+s.code.toUpperCase()+")",s.code)));
  }
  colorFilter.innerHTML='<option value="">All Colors</option>';
  ["W","U","B","R","G","C"].forEach(c=>colorFilter.add(new Option(colorName(c),c)));
}
function bind(){
  search.oninput=()=>{state.q=search.value.toLowerCase();state.page=1;render();};
  if(document.getElementById("setFilter")) setFilter.onchange=()=>{state.set=setFilter.value;state.page=1;render();};
  colorFilter.onchange=()=>{state.color=colorFilter.value;state.page=1;render();};
  ownedFilter.onchange=()=>{state.owned=ownedFilter.value;state.page=1;render();};
  prevPageBtn.onclick=()=>{state.page=Math.max(1,state.page-1);render();};
  nextPageBtn.onclick=()=>{state.page++;render();};
}
function filtered(){
  let cards=[...MTG.cards];
  const setCode=state.fixedSet||state.set;
  if(state.q)cards=cards.filter(c=>c.search.includes(state.q));
  if(setCode)cards=cards.filter(c=>c.set===setCode);
  if(state.color){ if(state.color==="C")cards=cards.filter(c=>!c.colors?.length); else cards=cards.filter(c=>c.colors?.includes(state.color));}
  if(state.owned==="owned")cards=cards.filter(c=>Number(getEntry(c.id).owned||0)>0);
  if(state.owned==="missing")cards=cards.filter(c=>Number(getEntry(c.id).owned||0)===0);
  if(state.owned==="extra")cards=cards.filter(c=>Number(getEntry(c.id).owned||0)>1);
  return cards;
}
function render(){
  const cards=filtered();
  const totalPages=Math.max(1,Math.ceil(cards.length/state.pageSize));
  if(state.page>totalPages)state.page=totalPages;
  const pageCards=cards.slice((state.page-1)*state.pageSize,state.page*state.pageSize);
  pageInfo.textContent=`Page ${state.page} of ${totalPages} • ${cards.length} cards`;
  grid.innerHTML=pageCards.map(cardHTML).join("")||"<section class='empty'>No cards found.</section>";
  updateTopStats(state.fixedSet ? MTG.cardsForSet(state.fixedSet) : MTG.cards);
}
function cardHTML(c){
  const e=getEntry(c.id),owned=Number(e.owned||0),foil=Number(e.foil||0);
  return `<article class="card"><img class="card-img" onclick="openImageModal(\`${Util.escape(c.image)}\`, \`${Util.escape(c.name)}\`)" src="${Util.escape(c.image)}" onerror="this.src='../${APP_CONFIG.defaultImage}'"><div class="card-body"><div class="meta">${c.colors?.map(x=>`<span class="badge">${x}</span>`).join("")||`<span class="badge">C</span>`}<span class="badge ${owned>0?"owned":"missing"}">${owned>0?"Owned":"Missing"}</span>${owned>1?`<span class="badge extra">Extra ${owned-1}</span>`:""}${e.want?`<span class="badge wish">Want</span>`:""}</div><h3>${Util.escape(c.name)}</h3><p>${Util.escape(c.set_name)} • #${Util.escape(c.collector_number)}</p><p>${Util.escape(c.rarity)} • ${Util.escape(c.type_line)}</p><p><b>Normal:</b> ${Util.money(price(c,false))} • <b>Foil:</b> ${Util.money(price(c,true))}</p><p class="price-note">${price(c,false)||price(c,true) ? "Price loaded from MTGJSON AllPricesToday." : "No price match yet. Try Load Price Data on Home."}</p><div class="controls"><label>Owned<div class="qty-row"><button onclick="changeQty('${c.id}','owned',-1)">−</button><strong>${owned}</strong><button onclick="changeQty('${c.id}','owned',1)">+</button></div></label><label>Foil<div class="qty-row"><button onclick="changeQty('${c.id}','foil',-1)">−</button><strong>${foil}</strong><button onclick="changeQty('${c.id}','foil',1)">+</button></div></label></div><div class="actions" style="margin-top:10px"><button class="secondary" onclick="toggleWant(\'${c.id}\')">${e.want ? "Remove Want" : "Want Card"}</button>${cardInfoUrl(c)?`<a class="secondary" target="_blank" rel="noopener" href="${Util.escape(cardInfoUrl(c))}">Card Info / Prices</a>`:""}</div><div class="controls"><label>Condition<select onchange="setField('${c.id}','condition',this.value)">${["Near Mint","Lightly Played","Moderately Played","Heavily Played","Damaged"].map(v=>`<option ${e.condition===v?"selected":""}>${v}</option>`).join("")}</select></label><label>Notes<input value="${Util.escape(e.notes||"")}" onchange="setField('${c.id}','notes',this.value)" placeholder="Notes"></label></div></div></article>`;
}
async function changeQty(id,field,delta){const e=getEntry(id);e[field]=Math.max(0,Number(e[field]||0)+delta);if(field==="foil"&&Number(e.foil||0)>Number(e.owned||0))e.owned=e.foil;if(field==="owned"&&Number(e.foil||0)>Number(e.owned||0))e.foil=e.owned;await saveEntry(id);render();}
async function setField(id,field,value){const e=getEntry(id);e[field]=value;await saveEntry(id);updateTopStats(state.fixedSet ? MTG.cardsForSet(state.fixedSet) : MTG.cards);}


function openImageModal(src, title) {
  let modal = document.getElementById("imageModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "imageModal";
    modal.className = "image-modal";
    modal.innerHTML = `<div class="image-modal-inner"><img id="imageModalImg"><button class="secondary" onclick="document.getElementById('imageModal').hidden=true">Close</button></div>`;
    document.body.appendChild(modal);
  }
  document.getElementById("imageModalImg").src = src;
  modal.hidden = false;
}


async function toggleWant(id){
  const e=getEntry(id);
  e.want = !e.want;
  await saveEntry(id);
  render();
}


function cardInfoUrl(c){
  return c.scryfall_uri || (c.scryfallId ? "https://scryfall.com/card/" + c.scryfallId : "");
}
