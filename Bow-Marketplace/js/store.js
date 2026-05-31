window.BowStore = {
  items: [],
  cart: JSON.parse(localStorage.getItem("bow_cart") || "[]"),
  wishlist: JSON.parse(localStorage.getItem("bow_wishlist") || "[]"),

  async fetchItems() {
    const cfg = window.STORE_CONFIG;
    const url = `https://opensheet.elk.sh/${encodeURIComponent(cfg.sheetId)}/${encodeURIComponent(cfg.sheetName)}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load Google Sheet data.");
    const rows = await response.json();
    this.items = rows.map((row, index) => this.normalize(row, index)).filter(item => item.name);
    return this.items;
  },

  normalize(row, index) {
    const U = window.BowUtils;
    const F = (name) => U.field(row, name);

    const salePriceRaw = U.text(F("Sale Price"));
    const itemValueRaw = U.text(F("Item Value"));
    const price = U.number(salePriceRaw || itemValueRaw);
    const itemValue = U.number(itemValueRaw);
    const images = U.splitImages(F("Image URLs"));
    const id = U.text(F("Item ID")) || U.text(F("Internal Code")) || `item-${index + 1}`;
    const availableStatus = U.text(F("Available"));
    const isSold = availableStatus.trim().toLowerCase() === "sold";

    return {
      raw: row,
      id,
      itemId: U.text(F("Item ID")),
      name: U.text(F("Item Name")),
      category: U.text(F("Category")) || "Uncategorized",
      itemValue,
      description: U.text(F("Description")),
      salePrice: price,
      salePriceRaw,
      internalCode: U.text(F("Internal Code")),
      available: !isSold,
      availableStatus,
      images,
      amazonLink: U.text(F("Amazon Link")),
      dateAdded: U.text(F("Date Added")),
      lastUpdated: U.text(F("Last Updated")),
      notes: U.text(F("Notes")),
      discount: U.text(F("Discount")),
      onEbay: U.truthy(F("On Ebay")),
      ebayLink: U.text(F("Ebay Link")),
      az: U.text(F("Az") || F("AZ")),
      searchText: Object.values(row).join(" ").toLowerCase()
    };
  },

  save() {
    localStorage.setItem("bow_cart", JSON.stringify(this.cart));
    localStorage.setItem("bow_wishlist", JSON.stringify(this.wishlist));
  },

  addToCart(id) {
    const found = this.cart.find(x => x.id === id);
    if (found) found.qty += 1;
    else this.cart.push({ id, qty: 1 });
    this.save();
  },

  removeFromCart(id) {
    this.cart = this.cart.filter(x => x.id !== id);
    this.save();
  },

  toggleWishlist(id) {
    if (this.wishlist.includes(id)) this.wishlist = this.wishlist.filter(x => x !== id);
    else this.wishlist.push(id);
    this.save();
  },

  itemById(id) {
    return this.items.find(x => x.id === id);
  }
};
