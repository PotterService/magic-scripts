document.addEventListener("DOMContentLoaded", async () => {
  await MTG.init();
  exportBtn.onclick=exportCollection;
  importFile.onchange=importCollection;
  clearBtn.onclick=clearCollection;
});
async function exportCollection(){
  const entries=await DB.all(APP_CONFIG.collectionStore);
  const meta=await DB.all(APP_CONFIG.metaStore);
  download("mtg-collection-backup.json",JSON.stringify({app:APP_CONFIG.appName,exportedAt:new Date().toISOString(),collection:entries,meta},null,2),"application/json");
}
async function importCollection(e){
  const file=e.target.files[0];if(!file)return;
  const data=JSON.parse(await file.text());
  const rows=Array.isArray(data.collection)?data.collection:Object.values(data.collection||{});
  await DB.clear(APP_CONFIG.collectionStore);
  await DB.bulkPut(APP_CONFIG.collectionStore,rows,400);
  await MTG.loadSaved();
  Util.toast("Backup imported");
}
async function clearCollection(){
  if(!confirm("Clear your local MTG collection?"))return;
  await DB.clear(APP_CONFIG.collectionStore);
  await MTG.loadSaved();
  Util.toast("Collection cleared");
}
function download(name,content,type){const blob=new Blob([content],{type});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();}
