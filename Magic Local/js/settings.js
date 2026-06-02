document.addEventListener("DOMContentLoaded", async () => {
  await MTG.init();
  refreshStats();

  exportOwnedBtn.onclick = exportOwned;
  importOwnedFile.onchange = importOwned;
  removeNotOwnedBtn.onclick = removeNotOwnedCards;
  clearCardsBtn.onclick = clearCardsSets;
  clearCollectionBtn.onclick = clearCollection;
  clearAllBtn.onclick = clearEverything;
});

async function refreshStats() {
  const cards = await DB.all(APP_CONFIG.cardsStore);
  const sets = await DB.all(APP_CONFIG.setsStore);
  const collection = await DB.all(APP_CONFIG.collectionStore);
  cardStat.textContent = cards.length;
  setStat.textContent = sets.length;
  ownedStat.textContent = collection.filter(isSavedEntry).length;
  status.textContent = "Ready";
}

function isSavedEntry(e) {
  return Number(e.owned || 0) > 0 || Number(e.foil || 0) > 0 || e.notes || e.condition;
}

async function exportOwned() {
  const collection = await DB.all(APP_CONFIG.collectionStore);
  const cards = await DB.all(APP_CONFIG.cardsStore);
  const saved = collection.filter(isSavedEntry);
  const savedIds = new Set(saved.map(x => x.id));
  const cardRows = cards.filter(c => savedIds.has(c.id));
  const backup = {
    app: APP_CONFIG.appName,
    exportedAt: new Date().toISOString(),
    type: "owned-saved-cards",
    collection: saved,
    cards: cardRows
  };
  download("mtg-owned-saved-cards-backup.json", JSON.stringify(backup, null, 2), "application/json");
}

async function importOwned(e) {
  const file = e.target.files[0];
  if (!file) return;
  const data = JSON.parse(await file.text());

  const collection = Array.isArray(data.collection) ? data.collection : [];
  const cards = Array.isArray(data.cards) ? data.cards : [];

  if (cards.length) await DB.bulkPut(APP_CONFIG.cardsStore, cards, 300);
  if (collection.length) await DB.bulkPut(APP_CONFIG.collectionStore, collection, 300);

  await MTG.loadSaved();
  refreshStats();
  Util.toast("Imported owned/saved cards");
}

async function removeNotOwnedCards() {
  if (!confirm("Remove downloaded cards that are not owned? Owned/saved cards will stay.")) return;

  const cards = await DB.all(APP_CONFIG.cardsStore);
  const collection = await DB.all(APP_CONFIG.collectionStore);
  const savedIds = new Set(collection.filter(isSavedEntry).map(x => x.id));
  const keep = cards.filter(c => savedIds.has(c.id));
  const removed = cards.filter(c => !savedIds.has(c.id));
  const affectedSets = new Set(removed.map(c => c.set).filter(Boolean));

  await DB.clear(APP_CONFIG.cardsStore);
  if (keep.length) await DB.bulkPut(APP_CONFIG.cardsStore, keep, 300);

  const sets = await DB.all(APP_CONFIG.setsStore);
  for (const set of sets) {
    if (affectedSets.has(set.code)) {
      set.trimmed = true;
      set.downloaded = false;
      await DB.put(APP_CONFIG.setsStore, set);
    }
  }

  await MTG.loadSaved();
  refreshStats();
  Util.toast("Removed not-owned cards. Affected sets can be redownloaded.");
}

async function clearCardsSets() {
  if (!confirm("Clear downloaded cards and set list? Your owned entries stay.")) return;
  await DB.clear(APP_CONFIG.cardsStore);
  await DB.clear(APP_CONFIG.setsStore);
  await MTG.loadSaved();
  refreshStats();
  Util.toast("Cleared cards and sets");
}

async function clearCollection() {
  if (!confirm("Clear owned counts, foil counts, condition, and notes?")) return;
  await DB.clear(APP_CONFIG.collectionStore);
  await MTG.loadSaved();
  refreshStats();
  Util.toast("Collection cleared");
}

async function clearEverything() {
  if (!confirm("Clear EVERYTHING from this browser for this app?")) return;
  await DB.clear(APP_CONFIG.cardsStore);
  await DB.clear(APP_CONFIG.setsStore);
  await DB.clear(APP_CONFIG.collectionStore);
  await DB.clear(APP_CONFIG.metaStore);
  await MTG.loadSaved();
  refreshStats();
  Util.toast("Everything cleared");
}

function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}
