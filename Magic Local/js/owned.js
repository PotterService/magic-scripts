const state = { q:"", setQ:"", set:"", color:"", sort:"name", setSort:"name", page:1, pageSize: APP_CONFIG.cardsPerPage || 80 };

document.addEventListener("DOMContentLoaded", async () => {
  await MTG.init();
  status.textContent = MTG.cards.length ? "Owned cards loaded" : "No downloaded cards yet.";
  hydrate();
  bind();
  renderSetGrid();
  renderOwnedStats(allOwnedCards());
});

function hydrate(){
  colorFilter.innerHTML='<option value="">All Colors</option>';
  ["W","U","B","R","G","C"].forEach(c=>colorFilter.add(new Option(colorName(c),c)));
}

function bind(){
  setSearch.oninput=()=>{state.setQ=setSearch.value.toLowerCase();renderSetGrid();};
  setSort.onchange=()=>{state.setSort=setSort.value;renderSetGrid();};
  search.oninput=()=>{state.q=search.value.toLowerCase();state.page=1;renderCards();};
  colorFilter.onchange=()=>{state.color=colorFilter.value;state.page=1;renderCards();};
  sortFilter.onchange=()=>{state.sort=sortFilter.value;state.page=1;renderCards();};
  prevPageBtn.onclick=()=>{state.page=Math.max(1,state.page-1);renderCards();};
  nextPageBtn.onclick=()=>{state.page++;renderCards();};
  showAllBtn.onclick=()=>showCards("");
  backToSetsBtn.onclick=()=>{ownedCardsPanel.hidden=true;ownedSetsPanel.hidden=false;state.set="";};
  exportOwnedQuickBtn.onclick=exportOwnedQuick;
}

function allOwnedCards(){
  return MTG.cards.filter(c => Number(getEntry(c.id).owned||0)>0 || Number(getEntry(c.id).foil||0)>0);
}

function ownedSetRows(){
  let rows = MTG.sets.map(s=>{
    const cards = MTG.cardsForSet(s.code).filter(c=>Number(getEntry(c.id).owned||0)>0 || Number(getEntry(c.id).foil||0)>0);
    const qty = cards.reduce((sum,c)=>sum+Number(getEntry(c.id).owned||0),0);
    return {set:s,cards,qty,value:collectionValue(cards)};
  }).filter(r=>r.cards.length);

  if(state.setQ) rows = rows.filter(r=>(r.set.name+" "+r.set.code).toLowerCase().includes(state.setQ));
  rows.sort((a,b)=>{
    if(state.setSort==="qty") return b.qty-a.qty;
    if(state.setSort==="value") return b.value-a.value;
    return a.set.name.localeCompare(b.set.name);
  });
  return rows;
}

function renderSetGrid(){
  const rows = ownedSetRows();
  ownedSetGrid.innerHTML = rows.map(r=>{
    const s=r.set, cards=r.cards, owned=cards.length, cover=s.coverImage || cards[0]?.image || "";
    return `<article class="set-card">
      <div class="set-card-cover">${cover?`<img src="${Util.escape(cover)}">`:`<div class="rune">✦</div>`}</div>
      <div class="set-card-body">
        <p class="eyebrow">${Util.escape(s.code.toUpperCase())}</p>
        <h3>${Util.escape(s.name)}</h3>
        <p>${owned} owned cards • Qty ${r.qty}</p>
        <p><b>${Util.money(r.value)}</b> est. value</p>
        <div class="actions" style="margin-top:12px"><button class="primary" onclick="showCards('${Util.escape(s.code)}')">View Owned</button></div>
      </div>
    </article>`;
  }).join("") || "<section class='empty'>No owned sets found.</section>";
}

function showCards(setCode){
  state.set=setCode;
  state.page=1;
  ownedSetsPanel.hidden=true;
  ownedCardsPanel.hidden=false;
  const s=MTG.sets.find(x=>x.code===setCode);
  cardsTitle.textContent = s ? s.name + " — Owned Cards" : "All Owned Cards";
  cardsEyebrow.textContent = s ? s.code.toUpperCase() : "Owned Cards";
  renderCards();
}

function filteredCards(){
  let cards = allOwnedCards();
  if(state.set) cards = cards.filter(c=>c.set===state.set);
  if(state.q) cards = cards.filter(c=>c.search.includes(state.q));
  if(state.color){
    if(state.color==="C") cards = cards.filter(c=>!c.colors?.length);
    else cards = cards.filter(c=>c.colors?.includes(state.color));
  }
  cards.sort((a,b)=>{
    if(state.sort==="set") return (a.set_name+a.collector_number).localeCompare(b.set_name+b.collector_number);
    if(state.sort==="qty") return Number(getEntry(b.id).owned||0)-Number(getEntry(a.id).owned||0);
    if(state.sort==="value") return cardValue(b)-cardValue(a);
    return a.name.localeCompare(b.name);
  });
  return cards;
}

function renderCards(){
  const cards=filteredCards();
  renderOwnedStats(cards);
  const totalPages=Math.max(1,Math.ceil(cards.length/state.pageSize));
  if(state.page>totalPages) state.page=totalPages;
  const pageCards=cards.slice((state.page-1)*state.pageSize,state.page*state.pageSize);
  pageInfo.textContent=`Page ${state.page} of ${totalPages} • ${cards.length} owned cards`;
  grid.innerHTML=pageCards.map(cardHTML).join("")||"<section class='empty'>No owned cards found.</section>";
}

function renderOwnedStats(cards){
  const totalQty=cards.reduce((s,c)=>s+Number(getEntry(c.id).owned||0),0);
  const totalFoil=cards.reduce((s,c)=>s+Number(getEntry(c.id).foil||0),0);
  totalCards.textContent=cards.length;
  ownedCards.textContent=totalQty;
  missingCards.textContent=totalFoil;
  totalValue.textContent=Util.money(collectionValue(cards));
}

function cardHTML(c){
  const e=getEntry(c.id), owned=Number(e.owned||0), foil=Number(e.foil||0);
  return `<article class="card"><img class="card-img" onclick="openImageModal(\`${Util.escape(c.image)}\`)" src="${Util.escape(c.image)}" onerror="this.src='../${APP_CONFIG.defaultImage}'"><div class="card-body"><div class="meta">${c.colors?.map(x=>`<span class="badge">${x}</span>`).join("")||`<span class="badge">C</span>`}<span class="badge owned">Owned ${owned}</span>${foil?`<span class="badge extra">Foil ${foil}</span>`:""}${e.want?`<span class="badge wish">Want</span>`:""}</div><h3>${Util.escape(c.name)}</h3><p>${Util.escape(c.set_name)} • #${Util.escape(c.collector_number)}</p><p>${Util.escape(c.rarity)} • ${Util.escape(c.type_line)}</p><p><b>Your value:</b> ${Util.money(cardValue(c))}</p><div class="controls"><label>Owned<div class="qty-row"><button onclick="changeQty('${c.id}','owned',-1)">−</button><strong>${owned}</strong><button onclick="changeQty('${c.id}','owned',1)">+</button></div></label><label>Foil<div class="qty-row"><button onclick="changeQty('${c.id}','foil',-1)">−</button><strong>${foil}</strong><button onclick="changeQty('${c.id}','foil',1)">+</button></div></label></div><div class="actions" style="margin-top:10px"><button class="secondary" onclick="toggleWant('${c.id}')">${e.want?"Remove Want":"Want Card"}</button></div></div></article>`;
}

async function changeQty(id,field,delta){
  const e=getEntry(id); e[field]=Math.max(0,Number(e[field]||0)+delta);
  if(field==="foil"&&Number(e.foil||0)>Number(e.owned||0))e.owned=e.foil;
  if(field==="owned"&&Number(e.foil||0)>Number(e.owned||0))e.foil=e.owned;
  await saveEntry(id); renderCards(); renderSetGrid();
}
async function toggleWant(id){const e=getEntry(id);e.want=!e.want;await saveEntry(id);renderCards();}
async function exportOwnedQuick(){
  const collection=await DB.all(APP_CONFIG.collectionStore);
  const cards=allOwnedCards();
  const ids=new Set(cards.map(c=>c.id));
  const saved=collection.filter(e=>ids.has(e.id));
  download("mtg-owned-cards.json",JSON.stringify({app:APP_CONFIG.appName,exportedAt:new Date().toISOString(),collection:saved,cards},null,2),"application/json");
}
function download(name,content,type){const blob=new Blob([content],{type});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();}
function openImageModal(src){let modal=document.getElementById("imageModal");if(!modal){modal=document.createElement("div");modal.id="imageModal";modal.className="image-modal";modal.innerHTML=`<div class="image-modal-inner"><img id="imageModalImg"><button class="secondary" onclick="document.getElementById('imageModal').hidden=true">Close</button></div>`;document.body.appendChild(modal);}document.getElementById("imageModalImg").src=src;modal.hidden=false;}
