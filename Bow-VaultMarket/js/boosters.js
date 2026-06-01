document.addEventListener("DOMContentLoaded", async () => {
  await BCVData.load("../");
  const U = BCVUtils;
  const box = document.getElementById("boosterGrid");
  const search = document.getElementById("search");
  const typeFilter = document.getElementById("typeFilter");

  function render() {
    let products = [...BCVData.boosters];
    const q = search.value.toLowerCase();
    if (q) products = products.filter(p => JSON.stringify(p).toLowerCase().includes(q));
    if (typeFilter.value) products = products.filter(p => p.type === typeFilter.value);

    box.innerHTML = products.map(p => {
      const isPack = p.type === "booster-pack";
      const imagePath = "../" + p.image;
      const stockBadge = p.outOfStock ? `<span class="badge out">Out of Stock</span>` : `<span class="badge auth">Available</span>`;
      return `<article class="card ${p.outOfStock ? "out-card" : ""}">
        <img class="card-img" src="${U.escape(imagePath)}" onerror="this.src='../assets/placeholders/booster-placeholder.svg'">
        <div class="card-body">
          <div class="meta"><span class="badge warn">${isPack ? "Booster Pack" : "Booster Box"}</span>${stockBadge}</div>
          <h3>${U.escape(p.name)}</h3>
          <p>${U.escape(p.description || "")}</p>
          <p><b>${U.money(p.price)}</b></p>
          <div class="card-actions">
            ${p.outOfStock 
              ? `<button disabled>Out of Stock</button>`
              : isPack 
                ? `<button onclick="addRandomPack('${U.escape(p.id)}')">Add to Cart</button><a class="light" href="booster-builder.html?set=${encodeURIComponent(p.setName)}">Customize</a>`
                : `<button onclick="addBoosterBox('${U.escape(p.id)}')">Add to Cart</button>`
            }
          </div>
        </div>
      </article>`;
    }).join("") || "<section class='empty'>No booster products found.</section>";
  }

  search.oninput = render;
  typeFilter.onchange = render;
  render();
});

function addRandomPack(id) {
  BCVCart.add(id, "random-booster-pack");
}

function addBoosterBox(id) {
  BCVCart.add(id, "booster-box");
}
