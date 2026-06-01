function safeBoosterImageName(name) {
  return String(name || "").replace(/[\\/:*?"<>|]/g, "").trim();
}

function boosterPackImageForSet(setName) {
  return "boosterpack/" + safeBoosterImageName(setName) + " Booster Pack.png";
}

document.addEventListener("DOMContentLoaded", async () => {
  await BCVData.load("../");
  const U = BCVUtils;
  const setName = new URLSearchParams(location.search).get("set") || "";
  const editIndexRaw = new URLSearchParams(location.search).get("edit");
  const editIndex = editIndexRaw !== null ? Number(editIndexRaw) : null;
  const max = Number(BCV_CONFIG.maxBoosterPackCards || 15);
  const selected = {};

  if (editIndex !== null && BCVCart.items[editIndex]?.selectedCards) {
    BCVCart.items[editIndex].selectedCards.forEach(entry => {
      if (typeof entry === "string") selected[entry] = (selected[entry] || 0) + 1;
      else selected[entry.id] = Number(entry.qty || 1);
    });
  }

  document.getElementById("builderTitle").textContent = setName ? setName + " Booster Pack" : "Customize Booster Pack";
  document.getElementById("builderLimit").textContent = "Select cards for this booster pack.";

  const grid = document.getElementById("cardSelectGrid");
  const search = document.getElementById("search");
  const count = document.getElementById("selectedCount");

  let cards = BCVData.all.filter(c => c.setName === setName);

  function totalSelected() {
    return Object.values(selected).reduce((a, b) => a + Number(b || 0), 0);
  }

  function updateCount() {
    count.textContent = totalSelected() + " selected";
  }

  function changeQty(id, delta) {
    const current = Number(selected[id] || 0);
    const next = Math.max(0, current + delta);
    if (delta > 0 && totalSelected() >= max) {
      BCVUtils.toast("This booster pack is full");
      return;
    }
    if (next === 0) delete selected[id];
    else selected[id] = next;
    updateCount();
    render();
  }

  window.changeBoosterQty = changeQty;

  function render() {
    let items = [...cards];
    const q = search.value.toLowerCase();
    if (q) items = items.filter(c => c.search.includes(q));

    grid.innerHTML = items.map(c => {
      const qty = Number(selected[c.id] || 0);
      return `<article class="card ${qty ? "selected-card" : ""}">
        <img class="card-img" src="${U.escape(c.image)}" onerror="this.src='../assets/placeholders/card-placeholder.svg'">
        <div class="card-body">
          <span class="badge ${c.source === "grade" ? "grade" : "creator"}">${c.source === "grade" ? "Grade Vault" : "Creator Vault"}</span>
          <h3>${U.escape(c.name)}</h3>
          <p>${U.escape(c.cardNumber || "")} ${c.rarity ? "• " + U.escape(c.rarity) : ""}</p>
          <div class="qty-control">
            <button onclick="changeBoosterQty('${U.escape(c.id)}',-1)">−</button>
            <strong>${qty}</strong>
            <button onclick="changeBoosterQty('${U.escape(c.id)}',1)">+</button>
          </div>
        </div>
      </article>`;
    }).join("") || "<section class='empty'>No cards found for this set.</section>";
  }

  document.getElementById("addSelected").addEventListener("click", () => {
    if (!totalSelected()) {
      BCVUtils.toast("Select at least one card first");
      return;
    }

    const selectedCards = Object.entries(selected).map(([id, qty]) => ({ id, qty }));
    const pack = {
      id: editIndex !== null ? BCVCart.items[editIndex].id : "CUSTOM-PACK-" + Date.now(),
      type: "custom-booster-pack",
      qty: 1,
      name: setName + " Custom Booster Pack",
      setName,
      image: boosterPackImageForSet(setName),
      selectedCards
    };

    if (editIndex !== null) BCVCart.items[editIndex] = pack;
    else BCVCart.items.push(pack);

    BCVCart.save();
    BCVUtils.toast(editIndex !== null ? "Booster pack updated" : "Custom booster pack added to cart");
    window.location.href = "cart.html";
  });

  search.oninput = render;
  updateCount();
  render();
});
