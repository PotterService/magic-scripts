function cardHTML(c){
  const e=getEntry(c.id), owned=Number(e.owned||0), foil=Number(e.foil||0);
  return `<article class="card">
    <img class="card-img" onclick="openImageModal(\`${Util.escape(c.large||c.image)}\`)" src="${Util.escape(c.image)}" onerror="this.src='../${APP_CONFIG.defaultImage}'">
    <div class="card-body">
      <div class="meta">
        ${c.ink?`<span class="badge">${Util.escape(c.ink)}</span>`:""}
        ${c.rarity?`<span class="badge">${Util.escape(c.rarity)}</span>`:""}
        <span class="badge ${owned>0?"owned":"missing"}">${owned>0?"Owned":"Missing"}</span>
        ${foil?`<span class="badge extra">Foil ${foil}</span>`:""}
        ${e.want?`<span class="badge want">Want</span>`:""}
      </div>
      <h3>${Util.escape(c.fullName||c.name)}</h3>
      <p>${Util.escape(c.setName)} • #${Util.escape(c.collector_number)}</p>
      <p>${Util.escape(c.type_line||"")} ${c.cost!==""?`• Cost ${Util.escape(c.cost)}`:""}</p>
      <p><b>Normal:</b> ${Util.money(price(c,false))} • <b>Foil:</b> ${Util.money(price(c,true))}</p>
      <p><b>Your value:</b> ${Util.money(cardValue(c))}</p>
      <div class="controls">
        <label>Owned<div class="qty-row"><button onclick="changeQty('${c.id}','owned',-1)">−</button><strong>${owned}</strong><button onclick="changeQty('${c.id}','owned',1)">+</button></div></label>
        <label>Foil<div class="qty-row"><button onclick="changeQty('${c.id}','foil',-1)">−</button><strong>${foil}</strong><button onclick="changeQty('${c.id}','foil',1)">+</button></div></label>
      </div>
      <div class="actions" style="margin-top:10px">
        <button class="secondary" onclick="toggleWant('${c.id}')">${e.want?"Remove Want":"Want Card"}</button>
        <a class="secondary" target="_blank" rel="noopener" href="${Util.escape(cardInfoUrl(c))}">Card Info / Prices</a>
      </div>
    </div>
  </article>`;
}

async function changeQty(id,field,delta){
  const e=getEntry(id);
  e[field]=Math.max(0,Number(e[field]||0)+delta);
  if(field==="foil"&&Number(e.foil||0)>Number(e.owned||0))e.owned=e.foil;
  if(field==="owned"&&Number(e.foil||0)>Number(e.owned||0))e.foil=e.owned;
  await saveEntry(id);
  if(typeof render==="function") render();
}

async function toggleWant(id){
  const e=getEntry(id); e.want=!e.want; await saveEntry(id);
  if(typeof render==="function") render();
}
