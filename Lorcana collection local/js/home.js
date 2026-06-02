document.addEventListener("DOMContentLoaded", async()=>{
  await LORCANA.init();
  updateStats();
  renderFeatured();
  if(LORCANA.sets.length) status.textContent="Saved set list loaded.";
  pullSetsBtn.onclick = async()=>{
    try{
      status.textContent="Pulling Lorcana set list...";
      await LORCANA.pullSets(msg=>status.textContent=msg);
      await LORCANA.loadSaved();
      updateStats();
      renderFeatured();
      status.textContent="Lorcana sets loaded.";
      Util.toast("Sets loaded");
    }catch(e){console.error(e);status.textContent=e.message||"Could not pull sets.";}
  };
  loadAllBtn.onclick = async()=>{
    if(!confirm("Load every Lorcana set? This may take a little bit and uses browser storage.")) return;
    try{
      loadPanel.hidden=false;
      loadStatus.textContent="Starting...";
      loadBar.style.width="5%";
      await loadAllSets((msg, done, total)=>{
        status.textContent=msg;
        loadStatus.textContent=total ? `${msg} (${done}/${total})` : msg;
        if(total) loadBar.style.width=Math.max(5, Math.round(done/total*100))+"%";
      });
      await LORCANA.loadSaved();
      updateStats();
      renderFeatured();
      loadStatus.textContent="Done loading all sets.";
      loadBar.style.width="100%";
      Util.toast("All sets loaded");
      setTimeout(()=>loadPanel.hidden=true,3000);
    }catch(e){
      console.error(e);
      status.textContent=e.message||"Could not load all sets.";
      loadStatus.textContent=status.textContent;
    }
  };
});
function renderFeatured(){
  if(!LORCANA.sets.length){featuredSets.innerHTML="<section class='empty'>Click Pull Lorcana Sets to show set storybooks.</section>";return;}
  featuredSets.innerHTML=LORCANA.sets.slice(0,8).map(setCardHTML).join("");
}
function setCardHTML(s){
  const cards=LORCANA.cardsForSet(s.code), owned=ownedCount(cards), pct=cards.length?Math.round(owned/cards.length*100):0, cover=s.coverImage||cards[0]?.image||"";
  return `<article class="set-card"><div class="set-card-cover">${cover?`<img src="${Util.escape(cover)}">`:`<div class="rune">✦</div>`}</div><div class="set-card-body"><p class="eyebrow">${Util.escape(String(s.code).toUpperCase())} ${s.year?`• ${Util.escape(s.year)}`:""}</p><h3>${Util.escape(s.name)}</h3><p>${cards.length?`${owned} / ${cards.length} owned • ${pct}%`:`${s.card_count||"?"} cards listed`}</p><div class="bar"><div style="width:${pct}%"></div></div><div class="actions" style="margin-top:12px"><button class="primary" onclick="openSet('${Util.escape(s.code)}')">${cards.length?"Open Set":"Load Set"}</button></div></div></article>`;
}
async function openSet(code){
  if(LORCANA.cardsForSet(code).length){location.href="pages/set.html?set="+encodeURIComponent(code);return;}
  try{status.textContent="Loading set cards...";await LORCANA.loadSetCards(code,msg=>status.textContent=msg);location.href="pages/set.html?set="+encodeURIComponent(code);}catch(e){console.error(e);status.textContent=e.message||"Could not load set.";}
}
