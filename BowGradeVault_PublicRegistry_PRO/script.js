const state = { cards: [], filtered: [], hasSearched: false };

const $ = (id) => document.getElementById(id);
const els = {
  searchInput: $('searchInput'), searchBtn: $('searchBtn'), categoryFilter: $('categoryFilter'), gradeFilter: $('gradeFilter'), slabFilter: $('slabFilter'),
  cardsGrid: $('cardsGrid'), emptyState: $('emptyState'), showAllBtn: $('showAllBtn'), registryStatus: $('registryStatus'), modal: $('cardModal'), modalContent: $('modalContent'), closeModal: $('closeModal')
};

function val(card, keys, fallback = '') {
  for (const key of keys) {
    const found = key.split('.').reduce((obj, part) => obj && obj[part], card);
    if (found !== undefined && found !== null && String(found).trim() !== '') return found;
  }
  return fallback;
}
function boolVal(card, keys) {
  const v = val(card, keys, false);
  return v === true || String(v).toLowerCase() === 'true' || String(v).toLowerCase() === 'yes' || String(v).toLowerCase() === 'on';
}
function esc(str) { return String(str ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function img(card) { return val(card, ['cardImageUrl','imageUrl','frontImageUrl','images.card','images.front','photoUrl','cardImage'], ''); }
function grade(card) { return val(card, ['finalGrade','grade','overallGrade','grading.finalGrade'], 'N/A'); }
function name(card) { return val(card, ['cardName','name','title'], 'Untitled Card'); }
function category(card) { return val(card, ['category','cardCategory','type','cardType'], 'Uncategorized'); }
function slabbed(card) { return boolVal(card, ['isSlabbed','slabbed','bowSlab.isSlabbed']); }
function selfPulled(card) { return boolVal(card, ['selfPulled','acquisition.selfPulled']); }
function authentic(card) { return val(card, ['authenticityStatus','authenticity.status'], 'Not listed'); }
function currentOwner(card) { return val(card, ['currentOwner','ownership.currentOwner','owner'], 'Not listed publicly'); }
function ownerHistory(card) { return card.ownerHistory || card.owners || card.ownershipHistory || card.ownership?.history || []; }
function publicCards(cards) { return cards.filter(c => !('showPublic' in c) || c.showPublic === true || String(c.showPublic).toLowerCase() === 'true'); }

async function loadCards() {
  try {
    const res = await fetch('public-cards.json?cache=' + Date.now());
    if (!res.ok) throw new Error('Could not load public-cards.json');
    const data = await res.json();
    const cards = Array.isArray(data) ? data : (data.cards || []);
    state.cards = publicCards(cards);
    state.filtered = [];
    fillFilters(); updateStats();
    els.registryStatus.textContent = `${state.cards.length} public card record(s) loaded.`;
  } catch (err) {
    console.error(err);
    els.registryStatus.textContent = 'Could not load public-cards.json. Use Live Server/local server and make sure the file is beside index.html.';
  }
}

function fillFilters() {
  const cats = [...new Set(state.cards.map(category).filter(Boolean))].sort();
  const grades = [...new Set(state.cards.map(grade).filter(Boolean))].sort((a,b)=>String(b).localeCompare(String(a), undefined, {numeric:true}));
  els.categoryFilter.innerHTML = '<option value="">All categories</option>' + cats.map(c=>`<option>${esc(c)}</option>`).join('');
  els.gradeFilter.innerHTML = '<option value="">All grades</option>' + grades.map(g=>`<option>${esc(g)}</option>`).join('');
}
function updateStats() {
  $('statTotal').textContent = state.cards.length;
  $('statSlabbed').textContent = state.cards.filter(slabbed).length;
  $('statVerified').textContent = state.cards.filter(c => /verified authentic/i.test(authentic(c))).length;
  $('statCategories').textContent = new Set(state.cards.map(category)).size;
}
function searchableText(card) {
  return [
    name(card), category(card), grade(card), currentOwner(card), authentic(card),
    val(card, ['certNumber','bowCertNumber','slabCertNumber','bowSlab.certNumber']),
    val(card, ['acquiredFrom','acquisition.acquiredFrom','acquiredPlace','placeAcquired']),
    val(card, ['howAcquired','acquisition.howAcquired']),
    val(card, ['verifiedBy','authenticity.verifiedBy']),
    JSON.stringify(ownerHistory(card))
  ].join(' ').toLowerCase();
}
function applyFilters(showAll=false) {
  const q = els.searchInput.value.trim().toLowerCase();
  const cat = els.categoryFilter.value;
  const grd = els.gradeFilter.value;
  const slab = els.slabFilter.value;
  state.hasSearched = true;
  state.filtered = state.cards.filter(card => {
    if (q && !searchableText(card).includes(q)) return false;
    if (cat && category(card) !== cat) return false;
    if (grd && grade(card) !== grd) return false;
    if (slab === 'slabbed' && !slabbed(card)) return false;
    if (slab === 'raw' && slabbed(card)) return false;
    return true;
  });
  if (showAll && !q && !cat && !grd && !slab) state.filtered = [...state.cards];
  renderCards();
}
function renderCards() {
  els.emptyState.classList.add('hidden'); els.cardsGrid.classList.remove('hidden');
  if (!state.filtered.length) {
    els.cardsGrid.innerHTML = '<div class="empty-state"><h3>No matching cards found</h3><p>Try a different card name, category, cert number, owner, or acquisition place.</p></div>'; return;
  }
  els.cardsGrid.innerHTML = state.filtered.map((card, i) => `
    <article class="card-tile" data-index="${i}">
      <div class="thumb">${img(card) ? `<img src="${esc(img(card))}" alt="${esc(name(card))}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'fallback',textContent:'No Image'}))">` : '<div class="fallback">No Image</div>'}</div>
      <div class="card-body">
        <div class="grade-badge"><small>GRADE</small>${esc(grade(card))}</div>
        <h3 class="card-title">${esc(name(card))}</h3>
        <p class="card-meta">${esc(category(card))}<br>Owner: ${esc(currentOwner(card))}</p>
        <div class="chip-row">
          ${slabbed(card) ? '<span class="chip good">Bow Slabbed</span>' : '<span class="chip">Raw</span>'}
          ${selfPulled(card) ? '<span class="chip warn">Self pulled</span>' : ''}
          <span class="chip">${esc(authentic(card))}</span>
        </div>
      </div>
    </article>`).join('');
  [...document.querySelectorAll('.card-tile')].forEach(tile => tile.addEventListener('click', () => openCard(state.filtered[Number(tile.dataset.index)])));
}
function row(label, value) { return `<div class="data-row"><span>${esc(label)}</span><strong>${esc(value || 'Not listed')}</strong></div>`; }
function link(url, label) { return url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>` : ''; }
function listOwners(card) {
  const hist = ownerHistory(card);
  if (!Array.isArray(hist) || !hist.length) return '<p class="muted">No public owner history listed.</p>';
  return `<ol class="owner-list">${hist.map(o => `<li><strong>${esc(o.owner || o.name || o.to || 'Owner')}</strong>${o.date ? ` — ${esc(o.date)}` : ''}${o.notes ? `<br><span>${esc(o.notes)}</span>` : ''}</li>`).join('')}</ol>`;
}
function openCard(card) {
  const cardImg = img(card);
  const slabImg = val(card, ['slabImageUrl','slabFrontImageUrl','bowSlab.imageUrl','bowSlab.frontImageUrl'], '');
  els.modalContent.innerHTML = `
    <section class="detail-hero">
      <div class="detail-img">${cardImg ? `<img src="${esc(cardImg)}" alt="${esc(name(card))}">` : '<div class="fallback">No Image</div>'}</div>
      <div class="detail-main">
        <p class="eyebrow">Bow Grade Vault Record</p>
        <h2>${esc(name(card))}</h2>
        <div class="chip-row"><span class="chip">${esc(category(card))}</span><span class="chip good">Grade ${esc(grade(card))}</span>${slabbed(card)?'<span class="chip good">Bow Slabbed</span>':'<span class="chip">Raw Card</span>'}</div>
        <p class="muted">Last updated in system: ${esc(val(card, ['lastUpdated','updatedAt','system.lastUpdated'], 'Not listed'))}</p>
        <div class="links">
          ${link(val(card,['pricingUrl','valueUrl','tcgUrl','links.pricing']),'Pricing / Value')}
          ${link(val(card,['officialInfoUrl','cardInfoUrl','links.official']),'Official Card Info')}
          ${link(val(card,['extraReferenceUrl','referenceUrl','links.reference']),'Reference Link')}
        </div>
      </div>
    </section>
    <section class="detail-grid">
      <div class="info-box"><h3>Card Information</h3>
        ${row('Set / Series', val(card,['setName','series']))}
        ${row('Card Number', val(card,['cardNumber','number']))}
        ${row('Rarity', val(card,['rarity']))}
        ${row('Year', val(card,['year']))}
        ${row('Language', val(card,['language']))}
        ${row('Variant', val(card,['variant']))}
      </div>
      <div class="info-box"><h3>Grade Breakdown</h3>
        ${row('Final Grade', grade(card))}
        ${row('Centering', val(card,['centeringScore','grading.centering']))}
        ${row('Corners', val(card,['cornersScore','grading.corners']))}
        ${row('Edges', val(card,['edgesScore','grading.edges']))}
        ${row('Surface', val(card,['surfaceScore','grading.surface']))}
        ${row('Grade Notes', val(card,['gradeNotes','grading.notes']))}
      </div>
      <div class="info-box"><h3>Acquisition</h3>
        ${row('How Acquired', val(card,['howAcquired','acquisition.howAcquired']))}
        ${row('Self Pulled', selfPulled(card) ? 'Yes' : 'No')}
        ${row('Acquired From / Place', val(card,['acquiredFrom','acquisition.acquiredFrom','acquiredPlace','placeAcquired']))}
        ${row('Acquired Date', val(card,['acquiredDate','acquisition.date']))}
      </div>
      <div class="info-box"><h3>Authenticity</h3>
        ${row('Status', authentic(card))}
        ${row('Verified By', val(card,['verifiedBy','authenticity.verifiedBy']))}
        ${row('Verified Date', val(card,['verifiedDate','authenticity.verifiedDate']))}
        ${row('Notes', val(card,['authenticityNotes','authenticity.notes']))}
      </div>
      <div class="info-box"><h3>Bow Slab Info</h3>
        ${row('Slabbed', slabbed(card) ? 'Card is slabbed by Bow Grade Vault' : 'Not slabbed')}
        ${row('Slabbed By', val(card,['slabbedBy','bowSlab.slabbedBy'], slabbed(card) ? 'Bow Grade Vault' : 'Not listed'))}
        ${row('Bow Slab / Cert Number', val(card,['bowCertNumber','slabCertNumber','bowSlab.certNumber']))}
        ${row('Slab Date', val(card,['slabDate','bowSlab.date']))}
        ${row('Slab Notes', val(card,['slabNotes','bowSlab.notes']))}
        ${slabImg ? `<div class="thumb" style="height:230px;border-radius:14px;margin-top:12px"><img src="${esc(slabImg)}" alt="Slab image"></div>` : ''}
      </div>
      <div class="info-box"><h3>Ownership & Location</h3>
        ${row('Current Owner', currentOwner(card))}
        ${row('Current Location', val(card,['currentLocation','location.current']))}
        ${row('Marked Lost', boolVal(card,['isLost','lost','location.isLost']) ? 'Yes' : 'No')}
        ${row('Lost Notes', val(card,['lostNotes','location.lostNotes']))}
        <h3 style="margin-top:16px">Owner History</h3>${listOwners(card)}
      </div>
    </section>`;
  els.modal.showModal();
}

els.searchBtn.addEventListener('click', () => applyFilters(false));
els.searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyFilters(false); });
[els.categoryFilter, els.gradeFilter, els.slabFilter].forEach(el => el.addEventListener('change', () => applyFilters(false)));
els.showAllBtn.addEventListener('click', () => applyFilters(true));
els.closeModal.addEventListener('click', () => els.modal.close());
els.modal.addEventListener('click', e => { if (e.target === els.modal) els.modal.close(); });
loadCards();
