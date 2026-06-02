document.addEventListener("DOMContentLoaded", async () => {
  await MTG.init();
  status.textContent = MTG.cards.length ? "Downloaded cards loaded" : "No cards loaded yet.";
  updateTopStats();
  renderProgress();
});
function renderProgress(){
  if(!MTG.sets.length){setProgress.innerHTML="<section class='empty'>Pull Magic sets from the main page first.</section>";return;}
  setProgress.innerHTML=MTG.sets.map(s=>{
    const cards=MTG.cardsForSet(s.code);
    const owned=ownedCardCount(cards), pct=cards.length?Math.round((owned/cards.length)*100):0, value=collectionValue(cards);
    return `<a class="progress-card link-card" href="${cards.length ? 'set.html?set='+encodeURIComponent(s.code) : '../index.html'}"><strong>${Util.escape(s.name)}</strong><p>${cards.length ? `${owned} / ${cards.length} owned • ${pct}%` : 'Set cards not loaded yet'}</p><p><b>${Util.money(value)}</b> est. value</p><div class="bar"><div style="width:${pct}%"></div></div></a>`;
  }).join("");
}
