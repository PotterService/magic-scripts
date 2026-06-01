document.addEventListener("DOMContentLoaded", async () => {
  const wrap = document.getElementById("cardPage");
  await BCVData.load("../");
  const id = new URLSearchParams(location.search).get("id");
  const c = itemById(id) || BCVData.all[0];
  const U = BCVUtils;

  if (!c) {
    wrap.innerHTML = "<main class='page'><section class='empty'>Card not found.</section></main>";
    return;
  }

  const imgs = [c.image, c.backImage, c.altImage].filter(Boolean);
  const unavailableReason = printUnavailableReason(c);
  const action = c.source === "grade"
    ? (isBowOwner(c)
      ? `<button class="primary" onclick="addToCart('${U.escape(c.id)}','grade-buy')">Request to Buy</button>`
      : `<a class="secondary" href="ownership.html?id=${encodeURIComponent(c.id)}">Request Ownership Transfer</a>`)
    : (unavailableReason
      ? `<button class="primary" disabled>Print Unavailable</button>`
      : `<button class="primary" onclick="addToCart('${U.escape(c.id)}','creator-print')">Request Print</button>`);

  wrap.innerHTML = `<main class="page">
    <section class="detail">
      <div class="gallery">
        <img id="mainImg" class="main-img" src="${U.escape(imgs[0] || "../assets/placeholders/card-placeholder.svg")}">
        <div class="thumbs">${imgs.map(src => `<img src="${U.escape(src)}" onclick="document.getElementById('mainImg').src=this.src">`).join("")}</div>
      </div>
      <div class="info">
        <p class="eyebrow">${c.source === "grade" ? "Grade Vault" : "Creator Vault"}</p>
        <h1>${U.escape(c.name)}</h1>
        <div class="meta">
          <span class="badge ${c.source === "grade" ? "grade" : "creator"}">${c.source === "grade" ? "Grade Vault" : "Creator Vault"}</span>
          ${c.authStatus ? `<span class="badge auth">${U.escape(c.authStatus)}</span>` : ""}
          ${c.currentOwner ? `<span class="badge warn">Owner: ${U.escape(c.currentOwner)}</span>` : ""}
        </div>
        <div class="kv">
          <b>ID</b><span>${U.escape(c.id)}</span>
          <b>Set</b><span>${U.escape(c.setName)}</span>
          <b>Card Number</b><span>${U.escape(c.cardNumber)}</span>
          <b>Rarity</b><span>${U.escape(c.rarity)}</span>
          ${c.source === "grade" ? `
            <b>Grade</b><span>${U.escape(c.finalGrade || "Not listed")}</span>
            <b>Slab Cert</b><span>${U.escape(c.slabCert || "Not listed")}</span>
            <b>Current Owner</b><span>${U.escape(c.currentOwner || "Not listed")}</span>
            <b>Estimated Value</b><span>${U.money(c.estimatedValue)}</span>
          ` : `
            <b>Card Type</b><span>${U.escape(c.cardType || "")}</span>
            <b>Edition</b><span>${U.escape(c.edition || "")}</span>
          `}
        </div>
        <div class="history">
          ${unavailableReason ? `<h3>Print Request Unavailable</h3><p>${U.escape(unavailableReason)}</p>` : ""}
          ${c.rulesText ? `<h3>Rules Text</h3><p>${U.escape(c.rulesText)}</p>` : ""}
          ${c.flavorText ? `<h3>Flavor Text</h3><p>${U.escape(c.flavorText)}</p>` : ""}
          ${c.gradingNotes ? `<h3>Grading Notes</h3><p>${U.escape(c.gradingNotes)}</p>` : ""}
          ${c.ownerHistory?.length ? `<h3>Owner History</h3>${c.ownerHistory.map(h => `<p><b>${U.escape(h.owner)}</b> — ${U.escape(h.date)}<br>${U.escape(h.notes)}</p>`).join("")}` : ""}
        </div>
        <div class="links">
          ${action}
          ${c.source === "grade" && isBowOwner(c) ? `<a class="secondary" href="ownership.html?id=${encodeURIComponent(c.id)}">Ownership Transfer</a>` : ""}
          ${c.pricingUrl ? `<a href="${U.escape(c.pricingUrl)}" target="_blank">Pricing</a>` : ""}
        </div>
      </div>
    </section>
  </main>`;
});
