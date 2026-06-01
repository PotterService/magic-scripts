Bow Card Vault Shop + Registry

This site pulls live data from GitHub:
- BowCreatorVault/creator-cards.json
- BowGradeVault_PublicRegistry_PRO/public-cards.json

Image folders:
- BowCreatorVault/images for creator cards
- BowGradeVault_PublicRegistry_PRO/Images for grade vault cards
- Local boosterpack/ and boosterbox/ folders for booster product images

What users can do:
- Request prints from Creator Vault cards
- Request to buy cards from Grade Vault
- Request ownership transfer with proof instructions
- Add booster packs, booster boxes, or custom booster requests to cart

Important:
- This static version creates email requests.
- File attachments cannot be automatically attached to mailto emails; the page reminds the user to attach proof/photo after their email opens.
- To fully process uploads online, you would need a backend or Google Form / Apps Script later.


V4 CHANGES
----------
- Added localStorage caching to speed up GitHub-loaded JSON.
- Grade Vault Request Buy only appears when currentOwner is Bow.
- Non-Bow owner cards point to Ownership Transfer Request.
- Booster products are generated for every set in the vault.
- Booster pack images folder: boosterpack/
- Booster box images folder: boosterbox/
- Image naming examples:
  Myth & Mischief Booster Pack.png
  Myth & Mischief Booster Box.png
- Booster packs use Add Cards / Customize.
- Booster builder lets users select cards from that set only.
- Max cards is controlled in config.js with maxBoosterPackCards.
- Removed the custom booster request form from boosters.html.
- Cart page now has a building-phase no-order notice.


V5 BOOSTER CART WORKFLOW
------------------------
- Booster packs now show Add to Cart for randomized packs.
- Booster packs also show Customize to build a pack.
- Custom booster builder now has quantity controls.
- Public builder page no longer mentions config.js.
- Cart can expand booster packs and show selected card names/photos.
- Cart can edit custom booster packs.
- Cart can remove cards directly from custom packs.
- Email request now includes selected card names and quantities.
- Added unavailable stock files:
  data/unavailable_booster_packs.json
  data/unavailable_booster_boxes.json
- Added README files in boosterpack/ and boosterbox/.


V6 TRANSFER + EMAIL FORMAT
--------------------------
- Email request format is cleaner and less packed together.
- Booster pack selected card names, quantities, IDs, sets, and image URLs are included in the email.
- Ownership transfer no longer uses file inputs because mailto cannot attach files.
- Ownership page reminds user to manually attach proof and item photo before sending.
- Ownership form now uses New Owner and New Email.
- Added Transfer PIN and New Transfer PIN fields.
- Added previous-owner tip for faster transfer verification.


V7 REQUEST RULES
----------------
- Cart request form now asks for Name, Phone Number, Email, and Notes / Request Details.
- Email request includes customer information.
- Added data/unavailable_print_cards.json for Creator Vault print restrictions.
- Unavailable print cards show the reason on the card detail page.
- Print request buttons are disabled for unavailable print cards.
- Removed public page wording that mentions the live data host by name.


V8 OWNERSHIP LINK FIX
---------------------
- Fixed Request Ownership links from homepage/listing cards.
- Ownership links now use the correct folder prefix.
- Ownership form now accepts id, card, cardId, slab, or slabCert URL parameters.
- Ownership form shows selected card name when possible.


V9 BOOSTER CART IMAGE FIX
-------------------------
- Cart page now fixes relative paths for boosterpack/ and boosterbox/ images.
- Booster items now use the booster placeholder if their image is missing.


V10 CUSTOM PACK IMAGE FIX
-------------------------
- Custom booster packs now save the booster pack image path into the cart.
- Older custom packs without an image will auto-generate the boosterpack image path from the set name.
