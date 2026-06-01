Stock control files:

unavailable_booster_packs.json
- Put booster pack product names here to mark them Out of Stock.

unavailable_booster_boxes.json
- Put booster box product names here to mark them Out of Stock.

Example:
[
  "Cosmic Guardians Booster Box",
  "Myth & Mischief Booster Box"
]


unavailable_print_cards.json
- Use this file to mark Creator Vault cards that cannot be requested as single prints.
- You can match by cardName or id.
- The reason will show on the card view page.

Example:
[
  {
    "cardName": "Auravelle, Prism Overlord of Infinity",
    "reason": "Only obtainable from packs."
  }
]
