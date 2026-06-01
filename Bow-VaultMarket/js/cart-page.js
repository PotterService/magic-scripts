document.addEventListener("DOMContentLoaded", async () => {
  await BCVData.load("../");
  renderCart();

  document.getElementById("sendRequest").onclick = () => {
    const sections = [];

    sections.push("Bow Card Vault Request");
    sections.push("");
    sections.push("NOTICE:");
    sections.push("At the current moment, no order requests are being accepted during the building phase of the platform. This request is for testing and planning only.");
    sections.push("");
    sections.push("REQUESTED ITEMS");
    sections.push("===============");

    BCVCart.items.forEach((line, index) => {
      const item = itemById(line.id) || boosterById(line.id) || line;
      const name = item.name || line.name || line.id;

      sections.push("");
      sections.push(`${index + 1}. ${name}`);
      sections.push(`   Type: ${line.type}`);
      sections.push(`   Quantity: ${line.qty || 1}`);

      if (line.setName) sections.push(`   Set: ${line.setName}`);

      if (line.selectedCards?.length) {
        sections.push("");
        sections.push("   Selected Cards:");
        line.selectedCards.forEach((entry, cardIndex) => {
          const cardId = typeof entry === "string" ? entry : entry.id;
          const qty = typeof entry === "string" ? 1 : Number(entry.qty || 1);
          const card = itemById(cardId);
          sections.push(`   ${cardIndex + 1}) ${qty}x ${card ? card.name : cardId}`);
          if (card) {
            sections.push(`      Card ID: ${card.id}`);
            sections.push(`      Set: ${card.setName || ""}`);
            sections.push(`      Image: ${card.image || ""}`);
          }
        });
      }
    });

    sections.push("");
    sections.push("CUSTOMER INFO");
    sections.push("=============");
    sections.push("Name: " + (document.getElementById("customerName")?.value || ""));
    sections.push("Phone: " + (document.getElementById("customerPhone")?.value || ""));
    sections.push("Email: " + (document.getElementById("customerEmail")?.value || ""));
    sections.push("");
    sections.push("NOTES / REQUEST DETAILS");
    sections.push("=======================");
    sections.push(document.getElementById("customerNotes")?.value || "No notes provided.");

    location.href = `mailto:${BCV_CONFIG.contactEmail || ""}?subject=Bow Card Vault Request&body=${encodeURIComponent(sections.join("\n"))}`;
  };
});

function selectedCardRows(line, cartIndex) {
  if (!line.selectedCards?.length) return "";
  const U = BCVUtils;
  return `<div class="pack-expanded" id="pack-${cartIndex}" hidden>
    <h4>Selected Cards</h4>
    <div class="mini-card-grid">
      ${line.selectedCards.map((entry, subIndex) => {
        const cardId = typeof entry === "string" ? entry : entry.id;
        const qty = typeof entry === "string" ? 1 : Number(entry.qty || 1);
        const card = itemById(cardId);
        if (!card) return "";
        return `<div class="mini-card">
          <img src="${U.escape(card.image)}" onerror="this.src='../assets/placeholders/card-placeholder.svg'">
          <div>
            <strong>${U.escape(card.name)}</strong>
            <span>${qty}x</span>
            <small>${U.escape(card.setName || "")}</small>
            <button class="danger small-danger" onclick="removeCardFromPack(${cartIndex},${subIndex})">Remove Card</button>
          </div>
        </div>`;
      }).join("")}
    </div>
  </div>`;
}

function renderCart() {
  const U = BCVUtils;
  const box = document.getElementById("cartList");

  box.innerHTML = BCVCart.items.length ? BCVCart.items.map((line, i) => {
    const item = itemById(line.id) || boosterById(line.id) || line;
    const name = item.name || line.name || line.id;
    let img = item.image || line.image || "../assets/placeholders/card-placeholder.svg";
    if (line.type === "custom-booster-pack" && !line.image && line.setName) {
      img = "boosterpack/" + String(line.setName || "").replace(/[\\/:*?"<>|]/g, "").trim() + " Booster Pack.png";
    }
    if (img && !/^https?:\/\//i.test(img) && !img.startsWith("../")) {
      img = "../" + img;
    }
    const hasPack = !!line.selectedCards?.length;
    const editBtn = line.type === "custom-booster-pack"
      ? `<a class="secondary" href="booster-builder.html?set=${encodeURIComponent(line.setName || "")}&edit=${i}">Edit Pack</a>`
      : "";
    const expandBtn = hasPack ? `<button class="secondary" onclick="togglePack(${i})">Expand Pack</button>` : "";

    return `<div class="cart-row cart-row-wide">
      <img src="${U.escape(img)}" onerror="this.src='${line.type && line.type.includes("booster") ? "../assets/placeholders/booster-placeholder.svg" : "../assets/placeholders/card-placeholder.svg"}'">
      <div>
        <strong>${U.escape(name)}</strong>
        <p>${U.escape(line.type)} • Qty ${line.qty || 1}</p>
        ${hasPack ? `<p>${line.selectedCards.length} selected card entries</p>` : ""}
        <div class="row-actions">${expandBtn}${editBtn}<button class="danger" onclick="BCVCart.remove(${i})">Remove</button></div>
      </div>
      ${selectedCardRows(line, i)}
    </div>`;
  }).join("") : "<section class='empty'>Your cart is empty.</section>";
}

function togglePack(index) {
  const el = document.getElementById("pack-" + index);
  if (el) el.hidden = !el.hidden;
}

function removeCardFromPack(cartIndex, subIndex) {
  const line = BCVCart.items[cartIndex];
  if (!line?.selectedCards) return;
  line.selectedCards.splice(subIndex, 1);
  BCVCart.save();
  renderCart();
}
