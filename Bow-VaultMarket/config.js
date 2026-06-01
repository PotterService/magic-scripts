window.BCV_CONFIG = {
  siteName: "Bow Card Vault",
  siteSubtitle: "Creator Vault prints, Grade Vault cards, slabs, boosters, and ownership requests",

  github: {
    creatorCardsJson: "https://raw.githubusercontent.com/PotterService/magic-scripts/main/BowCreatorVault/creator-cards.json",
    gradeVaultJson: "https://raw.githubusercontent.com/PotterService/magic-scripts/main/BowGradeVault_PublicRegistry_PRO/public-cards.json",
    creatorImageBase: "https://raw.githubusercontent.com/PotterService/magic-scripts/main/BowCreatorVault/",
    gradeImageBase: "https://raw.githubusercontent.com/PotterService/magic-scripts/main/BowGradeVault_PublicRegistry_PRO/"
  },

  local: {
    creatorCardsJson: "data/creator-cards.local.json",
    gradeVaultJson: "data/public-cards.local.json",
    boosterProductsJson: "data/booster-products.json"
  },

  cartKey: "bow_card_vault_cart",
  defaultCardImage: "assets/placeholders/card-placeholder.svg",
  defaultBoosterImage: "assets/placeholders/booster-placeholder.svg",
  contactEmail: "",
  maxBoosterPackCards: 15,
  cacheMinutes: 30
};
