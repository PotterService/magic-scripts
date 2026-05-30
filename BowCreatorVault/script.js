const state = { cards: [], filtered: [] };
const $ = (id) => document.getElementById(id);

const fallbackSvg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#17213a"/><stop offset="1" stop-color="#5b2458"/></linearGradient></defs><rect width="600" height="800" rx="38" fill="url(#g)"/><text x="300" y="380" text-anchor="middle" font-family="Arial" font-size="64" fill="rgba(255,255,255,.38)" font-weight="900">BCV</text><text x="300" y="440" text-anchor="middle" font-family="Arial" font-size="24" fill="rgba(255,255,255,.52)">Image coming soon</text></svg>`);
const fallbackImg = `data:image/svg+xml,${fallbackSvg}`;

async function loadCards(){
  try{
    const res = await fetch('creator-cards.json', { cache: 'no-store' });
    if(!res.ok) throw new Error('Could not load creator-cards.json');
    const data = await res.json();
    state.cards = Array.isArray(data) ? data : (data.cards || []);
  }catch(err){
    console.warn(err);
    state.cards = sampleCards;
  }
  state.cards = state.cards.filter(c => c.public !== false);
  setupFilters();
  updateStats();
  renderFeatured();
  applyFilters();
}

function unique(key){
  return [...new Set(state.cards.map(c => clean(c[key])).filter(Boolean))].sort();
}
function clean(v){ return (v ?? '').toString().trim(); }
function boolText(v){ return v ? 'Yes' : 'No'; }
function imageOf(card){
  return clean(
    card.frontImage ||
    card.frontImageUrl ||
    card.cardImage ||
    card.cardImageUrl ||
    card.image ||
    card.imageUrl
  ) || fallbackImg;
}

function backImageOf(card){
  return clean(card.backImage || card.backImageUrl || card.cardBackImage || card.cardBackImageUrl);
}

function altImageOf(card){
  return clean(card.altImage || card.altImageUrl || card.alternateImage || card.alternateImageUrl);
}

function setupFilters(){
  fillSelect('setFilter', unique('setName'));
  fillSelect('typeFilter', unique('cardType'));
  fillSelect('rarityFilter', unique('rarity'));
  fillSelect('statusFilter', unique('releaseStatus'));
  ['searchInput','setFilter','typeFilter','rarityFilter','statusFilter'].forEach(id => $(id).addEventListener('input', applyFilters));
  $('clearFilters').addEventListener('click', () => {
    ['searchInput','setFilter','typeFilter','rarityFilter','statusFilter'].forEach(id => $(id).value='');
    applyFilters();
  });
  $('closeDialog').addEventListener('click', () => $('cardDialog').close());
  $('year').textContent = new Date().getFullYear();
}
function fillSelect(id, values){
  const select = $(id);
  const first = select.options[0].outerHTML;
  select.innerHTML = first + values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
}
function updateStats(){
  $('totalCards').textContent = state.cards.length;
  $('totalSets').textContent = unique('setName').length;
  $('publicCards').textContent = state.cards.filter(c => c.public !== false).length;
  $('printedCards').textContent = state.cards.filter(c => /printed|released|published/i.test(clean(c.releaseStatus))).length;
}
function renderFeatured(){
  const card = state.cards.find(c => c.featured) || state.cards[0];
  if(!card) return;
  $('featuredCard').innerHTML = `
    <img class="feature-image" src="${escapeAttr(imageOf(card))}" alt="${escapeAttr(clean(card.cardName) || 'Featured card')}" onerror="this.src='${fallbackImg}'">
    <div class="feature-content">
      <p class="mini-label">Featured Card</p>
      <h3>${escapeHtml(clean(card.cardName) || 'Untitled Card')}</h3>
      <p>${escapeHtml(clean(card.shortDescription || card.lore || card.creatorNotes) || 'A featured card from the Bow Creator Vault.')}</p>
    </div>`;
  $('featuredCard').onclick = () => openCard(card);
}
function applyFilters(){
  const q = clean($('searchInput').value).toLowerCase();
  const set = $('setFilter').value;
  const type = $('typeFilter').value;
  const rarity = $('rarityFilter').value;
  const status = $('statusFilter').value;
  state.filtered = state.cards.filter(card => {
    const hay = [card.cardName, card.setName, card.cardType, card.subType, card.rarity, card.characterName, card.keywords, card.lore, card.abilityText, card.rulesText, card.flavorText, card.creatorNotes, card.cardNumber, card.cost, card.stats].map(clean).join(' ').toLowerCase();
    return (!q || hay.includes(q)) && (!set || clean(card.setName)===set) && (!type || clean(card.cardType)===type) && (!rarity || clean(card.rarity)===rarity) && (!status || clean(card.releaseStatus)===status);
  });
  renderCards();
}
function renderCards(){
  const grid = $('cardsGrid');
  $('emptyState').hidden = state.filtered.length > 0;
  grid.innerHTML = state.filtered.map((card, i) => `
    <article class="card-tile" data-index="${i}">
      <img class="card-img" src="${escapeAttr(imageOf(card))}" alt="${escapeAttr(clean(card.cardName) || 'Card image')}" onerror="this.src='${fallbackImg}'">
      <div class="card-body">
        <h3>${escapeHtml(clean(card.cardName) || 'Untitled Card')}</h3>
        <div class="badges">
          ${badge(card.rarity, 'gold')}
          ${badge(card.cardType)}
          ${badge(card.releaseStatus)}
        </div>
        <p class="meta">${escapeHtml(clean(card.setName) || 'No set listed')} ${clean(card.cardNumber) ? '• #' + escapeHtml(clean(card.cardNumber)) : ''}</p>
      </div>
    </article>`).join('');
  grid.querySelectorAll('.card-tile').forEach(tile => tile.addEventListener('click', () => openCard(state.filtered[Number(tile.dataset.index)])));
}
function badge(value, cls=''){
  return clean(value) ? `<span class="badge ${cls}">${escapeHtml(clean(value))}</span>` : '';
}
function openCard(card){
  $('dialogContent').innerHTML = `
    <section class="detail">
      <div class="detail-media">
        <img src="${escapeAttr(imageOf(card))}" alt="${escapeAttr(clean(card.cardName) || 'Card image')}" onerror="this.src='${fallbackImg}'">
        ${backImageOf(card) ? `<div class="detail-section"><h3>Back Image</h3><img src="${escapeAttr(backImageOf(card))}" alt="Card back" onerror="this.style.display='none'"></div>` : ''}
        ${altImageOf(card) ? `<div class="detail-section"><h3>Alternate Image</h3><img src="${escapeAttr(altImageOf(card))}" alt="Alternate card image" onerror="this.style.display='none'"></div>` : ''}
      </div>
      <div class="detail-info">
        <span class="eyebrow">Bow Creator Vault</span>
        <h2>${escapeHtml(clean(card.cardName) || 'Untitled Card')}</h2>
        <div class="badges">${badge(card.rarity,'gold')}${badge(card.cardType)}${badge(card.releaseStatus)}${badge(card.edition)}</div>
        ${section('Card Identity', [
          ['Set', card.setName], ['Card Number', card.cardNumber], ['Year', card.year], ['Language', card.language], ['Variant', card.variant], ['Character', card.characterName]
        ])}
        ${section('Game Info', [
          ['Cost', card.cost], ['Stats', card.stats], ['Subtype', card.subType]
        ])}
        ${textSection('Card Text / Lore', [card.rulesText || card.abilityText, card.flavorText, card.lore])}
        ${section('Creation / Release', [
          ['Created By', card.createdBy || 'Bow'], ['Artist', card.artist], ['Created Date', card.createdDate], ['First Released', card.firstReleasedDate], ['Print Run', card.printRun], ['Version', card.version]
        ])}
        ${section('Copies / Ownership', [
          ['Copies Printed', card.copiesPrinted], ['Known Owners', card.knownOwners], ['Signed Copies', boolText(card.signedCopies)], ['Gifted/Sold/Traded', card.copyStatus]
        ])}
        ${textSection('Creator Notes', [card.creatorNotes])}
        ${linksSection(card)}
      </div>
    </section>`;
  $('cardDialog').showModal();
}
function section(title, rows){
  const items = rows.filter(([_,v]) => clean(v)).map(([k,v]) => `<div class="info-box"><span>${escapeHtml(k)}</span><strong>${escapeHtml(clean(v))}</strong></div>`).join('');
  if(!items) return '';
  return `<div class="detail-section"><h3>${escapeHtml(title)}</h3><div class="detail-grid">${items}</div></div>`;
}
function textSection(title, parts){
  const text = parts.map(clean).filter(Boolean).join('\n\n');
  if(!text) return '';
  return `<div class="detail-section"><h3>${escapeHtml(title)}</h3><p class="meta">${escapeHtml(text).replace(/\n/g,'<br>')}</p></div>`;
}
function linksSection(card){
  const links = [
    ['Card Page', card.cardPageUrl || card.publicUrl], ['Shop', card.shopUrl], ['Reference', card.referenceUrl], ['Print File', card.printFileUrl], ['Preview', card.previewUrl], ['Set Page', card.setPageUrl]
  ].filter(([_,url]) => clean(url));
  if(!links.length) return '';
  return `<div class="detail-section"><h3>Links</h3><div class="links">${links.map(([label,url]) => `<a class="link-pill" href="${escapeAttr(clean(url))}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`).join('')}</div></div>`;
}
function escapeHtml(str){
  return clean(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function escapeAttr(str){ return escapeHtml(str); }

const sampleCards = [
  {
    public:true, featured:true,
    cardName:'Moonlit Unicorn Guardian', cardType:'Myth & Mischief', setName:'Starter Dreams', cardNumber:'MM-001', rarity:'Legendary', releaseStatus:'Prototype', edition:'First Draft', year:'2026', language:'English', variant:'Holo Concept', characterName:'Luna', createdBy:'Bow', artist:'Bow', createdDate:'2026-05-29', version:'1.0', printRun:'Not printed yet', copiesPrinted:'0', signedCopies:false,
    frontImageUrl:'images/sample-card-front.png',
    shortDescription:'A prototype guardian card from Bow’s magical card universe.',
    abilityText:'When this card enters play, protect one friendly creature from the next source of chaos damage.',
    flavorText:'“A little moonlight can calm even the wildest spell.”',
    lore:'Created as an early concept card for a unicorn-themed magical card game.',
    creatorNotes:'Sample public entry. Replace this with your real created card data.',
    cardPageUrl:''
  },
  {
    public:true,
    cardName:'Snack Heist', cardType:'Family Custom Card', setName:'Myth & Mischief Family', cardNumber:'FM-007', rarity:'Rare', releaseStatus:'Released', edition:'Family Edition', year:'2026', language:'English', variant:'Standard', createdBy:'Bow', artist:'Bow', createdDate:'2026-04-30', firstReleasedDate:'2026-05-01', printRun:'Personal print', copiesPrinted:'1+', signedCopies:false,
    frontImageUrl:'',
    shortDescription:'A playful custom family card created for fun.',
    abilityText:'Choose one snack. Every sibling contests it.',
    flavorText:'Nobody saw anything. Especially not the dog.',
    creatorNotes:'Example entry for family/custom cards.'
  }
];

loadCards();
