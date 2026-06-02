window.DB={
  db:null,
  open(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(APP_CONFIG.dbName, APP_CONFIG.dbVersion);
      req.onupgradeneeded=e=>{
        const db=e.target.result;
        if(!db.objectStoreNames.contains(APP_CONFIG.cardsStore)){
          const cards=db.createObjectStore(APP_CONFIG.cardsStore,{keyPath:"id"});
          cards.createIndex("setCode","setCode",{unique:false});
          cards.createIndex("character","character",{unique:false});
        }
        if(!db.objectStoreNames.contains(APP_CONFIG.setsStore)){
          db.createObjectStore(APP_CONFIG.setsStore,{keyPath:"code"});
        }
        if(!db.objectStoreNames.contains(APP_CONFIG.collectionStore)){
          db.createObjectStore(APP_CONFIG.collectionStore,{keyPath:"id"});
        }
        if(!db.objectStoreNames.contains(APP_CONFIG.metaStore)){
          db.createObjectStore(APP_CONFIG.metaStore,{keyPath:"key"});
        }
      };
      req.onsuccess=e=>{this.db=e.target.result;resolve(this.db)};
      req.onerror=()=>reject(req.error);
    });
  },
  tx(store,mode="readonly"){return this.db.transaction(store,mode).objectStore(store)},
  put(store,value){return new Promise((resolve,reject)=>{const r=this.tx(store,"readwrite").put(value);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})},
  get(store,key){return new Promise((resolve,reject)=>{const r=this.tx(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})},
  all(store){return new Promise((resolve,reject)=>{const r=this.tx(store).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})},
  clear(store){return new Promise((resolve,reject)=>{const r=this.tx(store,"readwrite").clear();r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})},
  async bulkPut(store,items,chunk=300){
    for(let i=0;i<items.length;i+=chunk){
      await new Promise((resolve,reject)=>{
        const tx=this.db.transaction(store,"readwrite");
        const os=tx.objectStore(store);
        items.slice(i,i+chunk).forEach(item=>os.put(item));
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error);
      });
    }
  }
};
